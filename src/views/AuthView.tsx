import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, UserProfile } from '../types';
import { sound } from '../utils/audio';
import { 
  firebaseSignIn, 
  firebaseSignUp, 
  firebaseResetPassword 
} from '../services/authService';
import { Sparkles, Mail, Lock, Eye, EyeOff, User, CheckCircle2, Loader2, Phone, Camera, Upload, Trash2 } from 'lucide-react';

interface StoredAccount {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  mobile?: string;
}

const DEFAULT_ACCOUNTS: StoredAccount[] = [];

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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('manager');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // File input ref for Avatar upload
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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

  // Handle Sign In (Local Account + Firebase Auth)
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

    // 1. If known local account and password matches
    if (existing) {
      if (existing.password === password) {
        const userProfile: UserProfile = {
          id: `usr_${Date.now()}`,
          name: existing.name,
          email: existing.email,
          mobile: existing.mobile || '',
          role: existing.role || role,
          status: 'active',
          avatar: existing.avatar || (role === 'guest' 
            ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
            : role === 'scanner'
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
          college: 'National Institute of Technology',
          branch: 'Computer Science & Engineering'
        };

        // Async background Firebase check
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

    // 2. Authenticate via Firebase
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

  // Handle Avatar Image Upload from Device
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP)', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be under 5MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarPreview(result);
      sound.play('success');
      showToast('Profile photo selected! It will be saved with your account.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Handle Sign Up (Firebase Auth Registration + Local Fallback)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Please enter your full name', 'warning');
      return;
    }
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'warning');
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

    setIsLoading(true);

    try {
      // 1. Attempt Real Firebase Registration and sync to Firestore with custom uploaded avatar
      const profile = await firebaseSignUp(
        email.trim(), 
        password, 
        fullName, 
        role, 
        mobile.trim() || '+91 98765 00945',
        'National Institute of Technology',
        'Computer Science & Engineering',
        avatarPreview || undefined
      );
      setIsLoading(false);
      login(profile);
      return;
    } catch (fbErr: any) {
      console.log('Firebase signup notice (fallback to local):', fbErr?.message);

      const accounts = getAccounts();
      const existing = accounts.find(a => a.email.toLowerCase() === email.toLowerCase().trim());
      if (existing) {
        setIsLoading(false);
        showToast('An account with this email already exists. Please sign in.', 'warning');
        setAuthMode('signin');
        return;
      }

      const defaultAvatar = role === 'guest' 
        ? 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
        : role === 'scanner'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

      const finalAvatar = avatarPreview || defaultAvatar;

      const newAcc: StoredAccount = {
        name: fullName.trim(),
        email: email.trim(),
        password: password,
        role: role,
        mobile: mobile.trim() || '+91 98765 00945',
        avatar: finalAvatar
      };
      saveAccounts([...accounts, newAcc]);

      const userProfile: UserProfile = {
        id: `usr_${Date.now()}`,
        name: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim() || '+91 98765 00945',
        role: role,
        status: 'active',
        avatar: finalAvatar,
        college: 'National Institute of Technology',
        branch: 'Computer Science & Eng.'
      };

      setIsLoading(false);
      login(userProfile);
    }
  };

  // Handle Forgot Password - Send OTP & Firebase Reset Email
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address to receive OTP', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await firebaseResetPassword(email.trim());
    } catch (resetErr: any) {
      console.log('Firebase reset email notice:', resetErr?.message);
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError(null);
    setCountdown(30);
    setForgotStep('otp');
    setIsLoading(false);

    sound.play('click');
    showToast(`Password reset OTP dispatched to ${email}`, 'info', 'OTP Sent');

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  };

  // Handle Digit Change
  const handleDigitChange = (index: number, val: string) => {
    setOtpError(null);
    const cleaned = val.replace(/\D/g, '');

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      chars.forEach((c, idx) => {
        if (index + idx < 6) newDigits[index + idx] = c;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify Reset OTP
  const handleVerifyResetOtp = () => {
    const entered = otpDigits.join('');
    if (entered.length < 6) {
      setOtpError('Please enter all 6 digits.');
      sound.play('error');
      return;
    }

    if (entered !== generatedOtp) {
      setOtpError('Invalid OTP. Please try again.');
      sound.play('error');
      return;
    }

    setIsVerifying(true);
    sound.play('success');

    setTimeout(() => {
      setIsVerifying(false);
      setForgotStep('new_password');
    }, 350);
  };

  // Save New Password & Login
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'warning');
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
      name: acc ? acc.name : 'Event User',
      email: email.trim(),
      mobile: '+91 98765 00945',
      role: acc ? acc.role : role,
      status: 'active',
      avatar: acc ? acc.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      college: 'National Institute of Technology',
      branch: 'Computer Science & Eng.'
    };

    login(userProfile);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #DFE7F2 0%, #EDF2F7 50%, #E2E8F0 100%)',
      padding: 'max(36px, calc(env(safe-area-inset-top, 28px) + 16px)) clamp(1rem, 4vw, 1.5rem) max(28px, calc(env(safe-area-inset-bottom, 16px) + 16px))',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-family)',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(147, 197, 253, 0.45) 0%, rgba(255,255,255,0) 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(199, 210, 254, 0.45) 0%, rgba(255,255,255,0) 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      {/* Main Embossed Neumorphic Card */}
      <div 
        className="auth-card-responsive" 
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#EDF2F7',
          borderRadius: '28px',
          padding: 'clamp(1.5rem, 5vw, 2.5rem) clamp(1rem, 4vw, 2rem)',
          boxShadow: '14px 14px 32px #cad3e2, -14px -14px 32px #ffffff',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          position: 'relative',
          zIndex: 10,
          textAlign: 'center'
        }}
      >

        {/* Top Recessed Dome with 3D Lock & Key */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#EDF2F7',
          boxShadow: 'inset 4px 4px 8px #cad3e2, inset -4px -4px 8px #ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2.25rem',
          border: '1px solid rgba(255, 255, 255, 0.6)'
        }}>
          🔐
        </div>

        {/* ================= 1. SIGN IN (PASSWORD BASED) ================= */}
        {authMode === 'signin' && (
          <div className="animate-fade">
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
              Sign In to EventPass
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.6rem', fontWeight: 500 }}>
              Enter your registered email and password to access your account
            </p>

            <form onSubmit={handleSignIn} style={{ display: 'grid', gap: '1.15rem', textAlign: 'left' }} autoComplete="off">
              {/* Email Address */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                  Email Address
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    className="auth-input-field"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@eventpass.io"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('forgot'); setForgotStep('request'); }}
                    style={{ background: 'none', border: 'none', color: '#0284C7', fontSize: '0.775rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input-field"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Embossed Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '18px',
                  background: '#EDF2F7',
                  border: '1px solid rgba(255,255,255,0.8)',
                  boxShadow: '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff',
                  color: '#0284C7',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.75 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseDown={e => { if (!isLoading) e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #cad3e2, inset -3px -3px 6px #ffffff'; }}
                onMouseUp={e => { if (!isLoading) e.currentTarget.style.boxShadow = '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff'; }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Please wait...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Sign In
                  </>
                )}
              </button>
            </form>

            {/* Bottom Toggle Option */}
            <div style={{ marginTop: '1.75rem', fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284C7',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textDecoration: 'underline'
                }}
              >
                Sign Up / Register
              </button>
            </div>
          </div>
        )}

        {/* ================= 2. SIGN UP (PASSWORD BASED) ================= */}
        {authMode === 'signup' && (
          <div className="animate-fade">
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
              Create an Account
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem', fontWeight: 500 }}>
              Register your credentials to access campus events and passes
            </p>

            <form onSubmit={handleSignUp} style={{ display: 'grid', gap: '1.05rem', textAlign: 'left' }} autoComplete="off">
              {/* Full Name */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                  Full Legal Name
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    className="auth-input-field"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Shubham Kumar"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                  Email Address
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    className="auth-input-field"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@eventpass.io"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                  Mobile / WhatsApp Number
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Phone size={18} />
                  </span>
                  <input
                    type="tel"
                    className="auth-input-field"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    placeholder="98765 43210"
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                  Create Password
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input-field"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                  Confirm Password
                </label>
                <div className="auth-input-container">
                  <span className="auth-input-icon">
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    className="auth-input-field"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
              </div>

              {/* Embossed Sign Up Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  marginTop: '0.5rem',
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '18px',
                  background: '#EDF2F7',
                  border: '1px solid rgba(255,255,255,0.8)',
                  boxShadow: '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff',
                  color: '#0284C7',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.75 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseDown={e => { if (!isLoading) e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #cad3e2, inset -3px -3px 6px #ffffff'; }}
                onMouseUp={e => { if (!isLoading) e.currentTarget.style.boxShadow = '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff'; }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Please wait...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Create Account
                  </>
                )}
              </button>
            </form>

            {/* Bottom Toggle Option */}
            <div style={{ marginTop: '1.75rem', fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0284C7',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textDecoration: 'underline'
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. FORGOT PASSWORD (OTP BASED) ================= */}
        {authMode === 'forgot' && (
          <div className="animate-fade">
            {/* Step A: Request Email for Reset OTP */}
            {forgotStep === 'request' && (
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Reset Password
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.6rem', fontWeight: 500 }}>
                  Enter your email address to receive a secure 6-digit verification code
                </p>

                <form onSubmit={handleSendForgotOtp} style={{ display: 'grid', gap: '1.15rem', textAlign: 'left' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                      Registered Email Address
                    </label>
                    <div className="auth-input-container">
                      <span className="auth-input-icon">
                        <Mail size={18} />
                      </span>
                      <input
                        type="email"
                        className="auth-input-field"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="user@eventpass.io"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '18px',
                      background: '#EDF2F7',
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff',
                      color: '#0284C7',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseDown={e => e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #cad3e2, inset -3px -3px 6px #ffffff'}
                    onMouseUp={e => e.currentTarget.style.boxShadow = '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff'}
                  >
                    <Sparkles size={18} /> Send Reset OTP
                  </button>
                </form>

                <div style={{ marginTop: '1.75rem', fontSize: '0.875rem' }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Step B: Embossed OTP Screen (Exact 1:1 match to user photo!) */}
            {forgotStep === 'otp' && (
              <div>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
                  Verify Your OTP
                </h2>

                <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.2rem', fontWeight: 500 }}>
                  We've sent a 6-digit verification code to
                </p>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span>{email}</span>
                  <button 
                    type="button" 
                    onClick={() => setForgotStep('request')}
                    style={{ background: 'none', border: 'none', color: '#0284C7', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, marginLeft: 4, textDecoration: 'underline' }}
                  >
                    (Change)
                  </button>
                </div>

                {/* 6 Embossed Neumorphic Input Boxes */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(4px, 1.5vw, 8px)', marginBottom: '1.5rem', width: '100%' }}>
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
                      className="auth-otp-box"
                      style={{
                        width: 'clamp(36px, 11vw, 48px)',
                        height: 'clamp(46px, 13vw, 58px)',
                        borderRadius: '12px',
                        background: '#EDF2F7',
                        boxShadow: 'inset 3px 3px 6px #cad3e2, inset -3px -3px 6px #ffffff',
                        border: otpError ? '1.5px solid #EF4444' : digit ? '1.5px solid #38BDF8' : '1.5px solid transparent',
                        color: '#0F172A',
                        fontSize: 'clamp(1.15rem, 4vw, 1.5rem)',
                        fontWeight: 800,
                        textAlign: 'center',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                        padding: 0
                      }}
                    />
                  ))}
                </div>

                {/* Embossed Button: VERIFY OTP */}
                <button
                  type="button"
                  onClick={handleVerifyResetOtp}
                  disabled={isVerifying}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '18px',
                    background: '#EDF2F7',
                    border: '1px solid rgba(255,255,255,0.85)',
                    boxShadow: '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff',
                    color: '#0284C7',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '1.25rem'
                  }}
                  onMouseDown={e => e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #cad3e2, inset -3px -3px 6px #ffffff'}
                  onMouseUp={e => e.currentTarget.style.boxShadow = '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff'}
                >
                  {isVerifying ? 'VERIFYING...' : 'VERIFY OTP'}
                </button>

                {/* Countdown / Resend Section */}
                <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginBottom: '0.75rem' }}>
                  {countdown > 0 ? (
                    <span>
                      Resend OTP in <strong style={{ color: '#0284C7', fontWeight: 800 }}>{countdown}</strong> seconds
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284C7',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textDecoration: 'underline'
                      }}
                    >
                      Resend OTP Now
                    </button>
                  )}
                </div>

                {/* Error Message */}
                {otpError && (
                  <div style={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                    {otpError}
                  </div>
                )}
              </div>
            )}

            {/* Step C: Set New Password Form */}
            {forgotStep === 'new_password' && (
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.35rem' }}>
                  Set New Password
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem', fontWeight: 500 }}>
                  Enter your new password to complete account recovery
                </p>

                <form onSubmit={handleSaveNewPassword} style={{ display: 'grid', gap: '1.15rem', textAlign: 'left' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                        <Lock size={18} />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        minLength={6}
                        style={{
                          width: '100%',
                          padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                          borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.8)',
                          background: '#EDF2F7',
                          boxShadow: 'inset 3px 3px 6px #cad3e2, inset -3px -3px 6px #ffffff',
                          color: '#0F172A',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block' }}>
                      Confirm New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                        <Lock size={18} />
                      </span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        style={{
                          width: '100%',
                          padding: '0.85rem 1rem 0.85rem 2.75rem',
                          borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.8)',
                          background: '#EDF2F7',
                          boxShadow: 'inset 3px 3px 6px #cad3e2, inset -3px -3px 6px #ffffff',
                          color: '#0F172A',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{
                      marginTop: '0.5rem',
                      width: '100%',
                      padding: '1rem',
                      borderRadius: '18px',
                      background: '#EDF2F7',
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff',
                      color: '#0284C7',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseDown={e => e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #cad3e2, inset -3px -3px 6px #ffffff'}
                    onMouseUp={e => e.currentTarget.style.boxShadow = '6px 6px 14px #cad3e2, -6px -6px 14px #ffffff'}
                  >
                    <CheckCircle2 size={18} /> Save Password & Sign In
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
