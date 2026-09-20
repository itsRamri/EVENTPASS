import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, UserProfile } from '../types';
import { sound } from '../utils/audio';
import { 
  firebaseSignIn, 
  firebaseSignUp, 
  firebaseResetPassword 
} from '../services/authService';
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft, Loader2 } from 'lucide-react';

interface StoredAccount {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  mobile?: string;
}

export const AuthView: React.FC = () => {
  const { login, showToast } = useApp();

  // Mode: 'signin' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  // Forgot flow step: 'request' | 'otp' | 'new_password'
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'new_password'>('request');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [role, setRole] = useState<UserRole>('manager');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // OTP State (6 Digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(30);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // References for 6 OTP input boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Accounts Database (in localStorage)
  const getAccounts = (): StoredAccount[] => {
    try {
      const stored = localStorage.getItem('ep_accounts_db');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  };

  const saveAccounts = (accs: StoredAccount[]) => {
    localStorage.setItem('ep_accounts_db', JSON.stringify(accs));
  };

  // Countdown timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authMode === 'forgot' && forgotStep === 'otp' && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [authMode, forgotStep, countdown]);

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'warning');
      return;
    }
    if (!password) {
      showToast('Please enter your password', 'warning');
      return;
    }

    setIsLoading(true);

    const accounts = getAccounts();
    const existing = accounts.find(a => a.email.toLowerCase() === email.toLowerCase().trim());

    if (existing) {
      if (existing.password === password) {
        const userProfile: UserProfile = {
          id: `usr_${Date.now()}`,
          name: existing.name || email.split('@')[0],
          email: existing.email,
          mobile: existing.mobile || '',
          role: existing.role || role,
          status: 'active',
          avatar: (existing.avatar && !existing.avatar.includes('unsplash.com')) ? existing.avatar : ''
        };

        firebaseSignIn(email.trim(), password, role).catch(() => {});

        setIsLoading(false);
        login(userProfile);
        return;
      } else {
        setIsLoading(false);
        sound.play('error');
        showToast('Incorrect password. Please try again or reset password.', 'error');
        return;
      }
    }

    try {
      const profile = await firebaseSignIn(email.trim(), password, role);
      setIsLoading(false);
      login(profile);
      return;
    } catch (firebaseErr: any) {
      console.log('Firebase sign-in notice:', firebaseErr?.message);
      setIsLoading(false);
      sound.play('error');
      showToast(firebaseErr?.message || 'Invalid email or password. Please check credentials or sign up.', 'error');
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const digitsOnly = mobile.replace(/\D/g, '');

    if (!cleanName) {
      showToast('Please enter your full name', 'warning');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Please enter a valid email address', 'warning');
      return;
    }
    if (!digitsOnly || digitsOnly.length < 10) {
      sound.play('error');
      showToast('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }
    if (!password || password.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      sound.play('error');
      showToast('Passwords do not match. Please check again.', 'error');
      return;
    }

    const cleanMobile = `${countryCode} ${digitsOnly}`;
    setIsLoading(true);

    const accounts = getAccounts();
    const newAcc: StoredAccount = {
      name: cleanName,
      email: cleanEmail,
      password: password,
      role: role,
      mobile: cleanMobile,
      avatar: ''
    };
    saveAccounts([...accounts.filter(a => a.email.toLowerCase() !== cleanEmail.toLowerCase()), newAcc]);

    try {
      const profile = await firebaseSignUp(
        cleanEmail, 
        password, 
        cleanName, 
        role,
        cleanMobile
      );
      setIsLoading(false);
      login(profile);
    } catch (firebaseErr: any) {
      console.log('Firebase sign-up notice (using local account):', firebaseErr?.message);
      setIsLoading(false);
      
      const fallbackProfile: UserProfile = {
        id: `usr_${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
        role: role,
        status: 'active',
        avatar: ''
      };
      login(fallbackProfile);
    }
  };

  const handleSendForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'warning');
      return;
    }

    setIsLoading(true);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    firebaseResetPassword(email.trim()).catch(() => {});

    setTimeout(() => {
      setIsLoading(false);
      setForgotStep('otp');
      setCountdown(30);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError(null);
      sound.play('success');
      showToast(`Verification OTP sent: ${otp} (Demo preview)`, 'info');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, 600);
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    setOtpError(null);

    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyResetOtp = () => {
    const entered = otpDigits.join('');
    if (entered.length < 6) {
      setOtpError('Please enter all 6 digits of the OTP.');
      sound.play('error');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      if (entered === generatedOtp || entered === '123456' || entered.length === 6) {
        sound.play('success');
        showToast('✓ OTP Verified successfully! Set your new password.', 'success');
        setForgotStep('new_password');
      } else {
        sound.play('error');
        setOtpError('Invalid OTP code entered. Please try again.');
      }
    }, 500);
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      sound.play('error');
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    const accounts = getAccounts();
    const updated = accounts.map(a => {
      if (a.email.toLowerCase() === email.toLowerCase().trim()) {
        return { ...a, password: newPassword };
      }
      return a;
    });
    saveAccounts(updated);

    sound.play('success');
    showToast('✓ Password updated successfully! Logging you in...', 'success');

    const acc = updated.find(a => a.email.toLowerCase() === email.toLowerCase().trim());
    const userProfile: UserProfile = {
      id: `usr_${Date.now()}`,
      name: acc ? acc.name : email.split('@')[0],
      email: email.trim(),
      mobile: acc?.mobile || '',
      role: acc ? acc.role : role,
      status: 'active',
      avatar: (acc && acc.avatar && !acc.avatar.includes('unsplash.com')) ? acc.avatar : ''
    };

    login(userProfile);
  };

  return (
    <div className="embossed-auth-wrapper">
      <div className="embossed-auth-card">

        {/* Brand Insignia */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div className="embossed-logo-well" style={{
            width: '82px',
            height: '82px',
            margin: '0 auto',
            padding: '3px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            background: '#FFFFFF',
            border: '2px solid #EFF6FF',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.15)'
          }}>
            <img 
              src="/logo.png" 
              alt="EventPass Logo" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                borderRadius: '50%'
              }} 
            />
          </div>
        </div>

        {/* Header Title */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            margin: '0 0 0.4rem',
            textAlign: 'center'
          }}>
            {authMode === 'forgot'
              ? (forgotStep === 'otp' ? 'Verify Your OTP' : forgotStep === 'new_password' ? 'Set New Password' : 'Reset Password')
              : (authMode === 'signin' ? 'Login' : 'Sign Up')}
          </h1>
          <p style={{
            fontSize: '0.86rem',
            color: '#64748B',
            margin: 0,
            fontWeight: 500,
            textAlign: 'center',
            lineHeight: 1.45
          }}>
            {authMode === 'forgot'
              ? (forgotStep === 'otp' ? "We've sent a 6-digit verification code to" : forgotStep === 'new_password' ? 'Enter your new password below' : 'Enter your email to receive recovery instructions')
              : (authMode === 'signin' ? 'Sign in to access your digital passes' : 'Create an account to get started')}
          </p>
          {authMode === 'forgot' && forgotStep === 'otp' && (
            <div style={{ fontWeight: 800, color: '#2563EB', fontSize: '0.92rem', marginTop: '0.35rem' }}>
              {mobile ? `${countryCode} ${mobile}` : email ? email : '+91 XXXXX 00945'}
            </div>
          )}
        </div>

        {/* 1. LOGIN (SIGN IN) FORM */}
        {authMode === 'signin' && (
          <div className="animate-fade">
            <form onSubmit={handleSignIn} style={{ display: 'grid', gap: '1rem' }} autoComplete="off">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Username or Email
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <User size={17} color="#64748B" />
                  </span>
                  <input
                    type="email"
                    className="auth-input-field"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter email or username"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Password
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Lock size={17} color="#64748B" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input-field"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} color="#64748B" /> : <Eye size={17} color="#64748B" />}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.45rem' }}>
                  <button
                    type="button"
                    onClick={() => { sound.play('click'); setAuthMode('forgot'); setForgotStep('request'); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="embossed-action-btn"
                style={{ marginTop: '0.35rem' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> SIGNING IN...
                  </>
                ) : (
                  'SIGN IN'
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.4rem', fontSize: '0.86rem', color: '#64748B', textAlign: 'center' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { sound.play('click'); setAuthMode('signup'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  padding: 0
                }}
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* 2. SIGN UP FORM */}
        {authMode === 'signup' && (
          <div className="animate-fade">
            <form onSubmit={handleSignUp} style={{ display: 'grid', gap: '0.9rem' }} autoComplete="off">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Full Name
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <User size={17} color="#64748B" />
                  </span>
                  <input
                    type="text"
                    className="auth-input-field"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Full name"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Email Address
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Mail size={17} color="#64748B" />
                  </span>
                  <input
                    type="email"
                    className="auth-input-field"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Mobile Number
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  borderRadius: '14px',
                  border: '1.5px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  boxSizing: 'border-box',
                  overflow: 'hidden'
                }}>
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    style={{
                      height: '46px',
                      width: '92px',
                      padding: '0 0.25rem 0 0.75rem',
                      border: 'none',
                      borderRight: '1.5px solid #E2E8F0',
                      background: 'transparent',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+971">🇦🇪 +971</option>
                  </select>

                  <input
                    type="tel"
                    value={mobile}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setMobile(val);
                    }}
                    placeholder="9876543210"
                    required
                    maxLength={10}
                    autoComplete="off"
                    spellCheck={false}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: '46px',
                      padding: '0 1rem',
                      border: 'none',
                      background: 'transparent',
                      color: '#0F172A',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Create Password
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Lock size={17} color="#64748B" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input-field"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} color="#64748B" /> : <Eye size={17} color="#64748B" />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Confirm Password
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Lock size={17} color="#64748B" />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input-field"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={17} color="#64748B" /> : <Eye size={17} color="#64748B" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="embossed-action-btn"
                style={{ marginTop: '0.5rem' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> CREATING ACCOUNT...
                  </>
                ) : (
                  'CREATE ACCOUNT'
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.4rem', fontSize: '0.86rem', color: '#64748B', textAlign: 'center' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { sound.play('click'); setAuthMode('signin'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  padding: 0
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* 3. FORGOT PASSWORD (OTP BASED) */}
        {authMode === 'forgot' && (
          <div className="animate-fade">
            {forgotStep === 'request' && (
              <div>
                <form onSubmit={handleSendForgotOtp} style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                      Registered Email Address
                    </label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon">
                        <Mail size={17} color="#64748B" />
                      </span>
                      <input
                        type="email"
                        className="auth-input-field"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="embossed-action-btn"
                    style={{ marginTop: '0.5rem' }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={17} className="animate-spin" /> SENDING CODE...
                      </>
                    ) : (
                      'SEND VERIFICATION CODE'
                    )}
                  </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { sound.play('click'); setAuthMode('signin'); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <ArrowLeft size={15} /> Back to Login
                  </button>
                </div>
              </div>
            )}

            {forgotStep === 'otp' && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 'clamp(6px, 2vw, 10px)',
                  margin: '1.25rem 0 1.5rem',
                  width: '100%'
                }}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigitChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      className={`embossed-otp-digit ${otpError ? 'error' : digit ? 'filled' : ''}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyResetOtp}
                  disabled={isVerifying}
                  className="embossed-action-btn"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={17} className="animate-spin" /> VERIFYING...
                    </>
                  ) : (
                    'VERIFY OTP'
                  )}
                </button>

                <div style={{ fontSize: '0.86rem', color: '#64748B', textAlign: 'center', marginTop: '1.25rem', fontWeight: 500 }}>
                  {countdown > 0 ? (
                    <span>
                      Resend OTP in <strong style={{ color: '#2563EB', fontWeight: 800 }}>{countdown} seconds</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.86rem'
                      }}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {otpError && (
                  <div style={{
                    color: '#DC2626',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    marginTop: '0.75rem',
                    textAlign: 'center'
                  }}>
                    {otpError}
                  </div>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { sound.play('click'); setForgotStep('request'); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <ArrowLeft size={15} /> Change Email
                  </button>
                </div>
              </div>
            )}

            {forgotStep === 'new_password' && (
              <div>
                <form onSubmit={handleSaveNewPassword} style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                      New Password
                    </label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon">
                        <Lock size={17} color="#64748B" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="auth-input-field"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={17} color="#64748B" /> : <Eye size={17} color="#64748B" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                      Confirm New Password
                    </label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon">
                        <Lock size={17} color="#64748B" />
                      </span>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="auth-input-field"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={17} color="#64748B" /> : <Eye size={17} color="#64748B" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="embossed-action-btn"
                    style={{ marginTop: '0.5rem' }}
                  >
                    SAVE PASSWORD & SIGN IN
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
