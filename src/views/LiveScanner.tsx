import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, getFormattedTimestamp } from '../context/AppContext';
import { GuestRegistration } from '../types';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { 
  ArrowLeft,
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Ticket, 
  QrCode, 
  ShieldCheck,
  ShieldAlert,
  Lock,
  Camera,
  Sparkles,
  X,
  User
} from 'lucide-react';

export const LiveScanner: React.FC = () => {
  const { 
    user, 
    guests, 
    events, 
    staff, 
    updateGuestStatus, 
    checkInSingleToken,
    openDigitalPass,
    addNotification, 
    addScanLog, 
    showToast,
    navigate
  } = useApp();

  const [scanResult, setScanResult] = useState<{
    type: 'verified' | 'already_checkedin' | 'pending' | 'invited' | 'rejected' | 'invalid';
    title: string;
    message: string;
    guest?: GuestRegistration;
    scannedTokenCode?: string;
    tokenIndex?: number;
    totalTokens?: number;
    remainingTokens?: number;
    scanTime: string;
  } | null>(null);

  const [checkInSuccessGuest, setCheckInSuccessGuest] = useState<{ 
    guest: GuestRegistration; 
    time: string;
    tokenIndex?: number;
    totalTokens?: number;
    remainingTokens?: number;
    scannedTokenCode?: string;
  } | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check scanner authorization for current user
  const matchedStaff = staff.find(s => 
    (s.email && user.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
    (s.phone && user.mobile && s.phone.replace(/\D/g, '') === user.mobile.replace(/\D/g, ''))
  );

  const isManager = user.role === 'manager';
  const isStaffScanner = user.role === 'scanner' || (!!matchedStaff && matchedStaff.status === 'active' && matchedStaff.permissions?.canScan !== false);
  const isAuthorizedScanner = isManager || isStaffScanner;

  const canCheckIn = isManager || (matchedStaff ? matchedStaff.permissions?.canCheckIn !== false : true);
  const canApprove = isManager || (matchedStaff ? !!matchedStaff.permissions?.canApprove : false);

  const assignedEvent = matchedStaff?.assignedEventId && matchedStaff.assignedEventId !== 'all'
    ? events.find(e => e.id === matchedStaff.assignedEventId)
    : null;

  const activeStaffName = `${user.name} (${matchedStaff?.designation || (isManager ? 'Event Manager' : 'Authorized Gate Staff')})`;
  const checkedInGuests = guests.filter(g => g.status === 'checkedin');

  const verifyToken = useCallback((code: string) => {
    if (scanCooldown || scanResult || checkInSuccessGuest) return;

    const q = code.trim().toUpperCase();
    const currentTimestamp = getFormattedTimestamp();
    const guest = guests.find(g => 
      (g.token && g.token.toUpperCase() === q) || 
      (g.tokens && g.tokens.some(t => t.toUpperCase() === q)) ||
      (g.tokenList && g.tokenList.some(t => t.tokenCode.toUpperCase() === q)) ||
      (g.passId && g.passId.toUpperCase() === q) ||
      (g.id && g.id.toUpperCase() === q) ||
      (g.name && g.name.toUpperCase().includes(q) && q.length > 3)
    );

    const eventName = guest ? (events.find(e => e.id === guest.eventId)?.name || 'Event') : 'Unknown Event';

    setScanCooldown(true);
    setTimeout(() => setScanCooldown(false), 1200);

    if (!guest) {
      sound.play('error');
      addScanLog({
        guestName: 'Unregistered / Unknown',
        token: code,
        passId: 'N/A',
        eventName: 'N/A',
        status: 'invalid',
        scannerStaff: activeStaffName
      });

      setScanResult({
        type: 'invalid',
        title: 'Invalid QR Pass ❌',
        message: `No active VIP pass record found for "${code}". Please ensure the QR pass was issued officially by EVENTPASS.`,
        scannedTokenCode: code,
        scanTime: currentTimestamp
      });
      return;
    }

    if (assignedEvent && guest.eventId !== assignedEvent.id) {
      sound.play('error');
      setScanResult({
        type: 'invalid',
        title: 'Unauthorized Event Gate ⚠️',
        message: `You are authorized to scan passes for "${assignedEvent.name}", but this guest's pass is for "${eventName}".`,
        guest,
        scannedTokenCode: code,
        scanTime: currentTimestamp
      });
      return;
    }

    const totalTokens = guest.tokenCount || guest.tokens?.length || (guest.tokenList?.length) || 1;
    const matchingTokenItem = guest.tokenList?.find(t => t.tokenCode.toUpperCase() === q) ||
      (guest.tokens?.includes(q) ? { 
        tokenCode: q, 
        index: guest.tokens.indexOf(q) + 1, 
        status: guest.status === 'checkedin' ? ('used' as const) : ('valid' as const), 
        checkInTime: guest.checkInTime 
      } : null);

    const tokenIdx = matchingTokenItem?.index || (guest.tokens ? Math.max(1, guest.tokens.indexOf(q) + 1) : 1);
    const usedTokensCount = guest.usedTokens || (guest.tokenList ? guest.tokenList.filter(t => t.status === 'used').length : (guest.status === 'checkedin' ? totalTokens : 0));
    const isSpecificTokenUsed = matchingTokenItem ? matchingTokenItem.status === 'used' : (guest.status === 'checkedin');
    const remainingCount = Math.max(0, totalTokens - usedTokensCount);

    addScanLog({
      guestName: guest.name,
      token: code || guest.token || 'N/A',
      passId: guest.passId || 'N/A',
      eventName: eventName,
      status: guest.status,
      scannerStaff: activeStaffName
    });

    if (guest.status === 'rejected') {
      sound.play('error');
      setScanResult({
        type: 'rejected',
        title: 'Registration Rejected ❌',
        message: 'This application was rejected during the registration approval phase.',
        guest,
        scannedTokenCode: code,
        tokenIndex: tokenIdx,
        totalTokens,
        remainingTokens: remainingCount,
        scanTime: currentTimestamp
      });
      return;
    }

    if (guest.status === 'invited') {
      sound.play('warning');
      setScanResult({
        type: 'invited',
        title: 'Invitation Not Completed ⏳',
        message: 'This guest received an invitation link but has not completed their registration details yet.',
        guest,
        scannedTokenCode: code,
        tokenIndex: tokenIdx,
        totalTokens,
        remainingTokens: remainingCount,
        scanTime: currentTimestamp
      });
      return;
    }

    if (guest.status === 'pending') {
      sound.play('warning');
      setScanResult({
        type: 'pending',
        title: 'Pass Pending Manager Approval ⏳',
        message: 'Registration details were submitted but are still awaiting Manager approval.',
        guest,
        scannedTokenCode: code,
        tokenIndex: tokenIdx,
        totalTokens,
        remainingTokens: remainingCount,
        scanTime: currentTimestamp
      });
      return;
    }

    if (isSpecificTokenUsed) {
      sound.play('duplicate');
      setScanResult({
        type: 'already_checkedin',
        title: totalTokens > 1 ? `TOKEN #${tokenIdx} ALREADY USED ⚠️` : 'PASS EXPIRED / ENTRY ALREADY USED ⚠️',
        message: totalTokens > 1
          ? `Pass Token #${tokenIdx} of ${totalTokens} (${code}) was already checked in. Remaining unused passes for this guest: ${remainingCount} of ${totalTokens}.`
          : `This single-entry VIP pass was already used to check in at ${guest.checkInTime || 'earlier'}. Re-entry with this QR code is strictly blocked.`,
        guest,
        scannedTokenCode: code,
        tokenIndex: tokenIdx,
        totalTokens,
        remainingTokens: remainingCount,
        scanTime: currentTimestamp
      });
      return;
    }

    if (guest.status === 'approved' || (guest.status === 'checkedin' && !isSpecificTokenUsed)) {
      sound.play('success');
      setScanResult({
        type: 'verified',
        title: totalTokens > 1 ? `✓ VALID TOKEN (#${tokenIdx} OF ${totalTokens})` : '✓ APPROVED VALID VIP PASS',
        message: totalTokens > 1
          ? `Pass Token #${tokenIdx} of ${totalTokens} is valid. ${remainingCount} of ${totalTokens} passes remaining for ${guest.name}. Ready to admit.`
          : 'Pass is valid and approved. Ready to grant party entry and expire QR code upon check-in.',
        guest,
        scannedTokenCode: code,
        tokenIndex: tokenIdx,
        totalTokens,
        remainingTokens: remainingCount,
        scanTime: currentTimestamp
      });
    }
  }, [guests, events, scanCooldown, scanResult, checkInSuccessGuest, activeStaffName, addScanLog, assignedEvent]);

  // Real-time Camera Feed & QR Frame Decoder
  useEffect(() => {
    let isMounted = true;
    let animId: number;

    const startCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && videoRef.current) {
        try {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'environment', 
              width: { ideal: 1280 }, 
              height: { ideal: 720 } 
            }
          });

          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play().catch(() => {});
            setCameraActive(true);
          }
        } catch (err) {
          console.warn('Camera stream error or permission denied:', err);
          setCameraActive(false);
        }
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const scanLoop = () => {
        if (!isMounted) return;

        if (videoRef.current && videoRef.current.readyState >= 2 && !scanResult && !checkInSuccessGuest) {
          const video = videoRef.current;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              try {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'attemptBoth'
                });
                if (decoded && decoded.data && decoded.data.trim().length > 0) {
                  verifyToken(decoded.data.trim());
                }
              } catch {}
            }
          }
        }

        animId = requestAnimationFrame(scanLoop);
      };

      animId = requestAnimationFrame(scanLoop);
    };

    startCamera();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [verifyToken, scanResult, checkInSuccessGuest]);

  // Perform Check-In
  const handleCheckIn = (g: GuestRegistration, tokenCode?: string) => {
    const checkInTimestamp = getFormattedTimestamp();
    const eventName = events.find(e => e.id === g.eventId)?.name || 'Event';
    const targetCode = tokenCode || scanResult?.scannedTokenCode || g.token;
    
    const checkinRes = checkInSingleToken(g.id, targetCode, activeStaffName);
    
    addScanLog({
      guestName: g.name,
      token: targetCode,
      passId: g.passId,
      eventName: eventName,
      status: 'checkedin',
      scannerStaff: activeStaffName
    });

    setScanResult(null);
    setCheckInSuccessGuest({ 
      guest: g, 
      time: checkInTimestamp,
      tokenIndex: checkinRes.tokenIndex,
      totalTokens: checkinRes.totalTokens,
      remainingTokens: checkinRes.remaining,
      scannedTokenCode: targetCode
    });

    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {}

    sound.play('checkin');
    const msg = checkinRes.totalTokens > 1
      ? `${g.name} admitted with Pass #${checkinRes.tokenIndex} of ${checkinRes.totalTokens}. Remaining passes: ${checkinRes.remaining}.`
      : `${g.name} admitted & checked into "${eventName}" at ${checkInTimestamp}. Pass expired.`;

    addNotification({
      title: checkinRes.totalTokens > 1 ? `Pass #${checkinRes.tokenIndex} Checked In ✅` : 'Party Check-in Completed ✅',
      message: msg,
      type: 'success'
    });
    showToast(`✓ Check-in Confirmed! ${g.name} admitted to party.`, 'success');
  };

  // If user is restricted
  if (!isAuthorizedScanner) {
    return (
      <div className="animate-fade" style={{ maxWidth: 480, margin: '2rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <div 
          style={{ 
            padding: '2.5rem 1.75rem', 
            background: '#FFFFFF', 
            border: '1.5px solid #E2E8F0', 
            borderRadius: 24,
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
          }}
        >
          <div 
            style={{ 
              width: 68, 
              height: 68, 
              borderRadius: '50%', 
              background: '#FEF2F2', 
              border: '2px solid #FCA5A5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.25rem',
              color: '#DC2626'
            }}
          >
            <Lock size={32} />
          </div>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FEF2F2', color: '#B91C1C', padding: '0.2rem 0.75rem', borderRadius: 100, fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem', border: '1px solid #FECACA' }}>
            <ShieldAlert size={14} /> SCANNER ACCESS RESTRICTED
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem 0' }}>
            Gate Scanner Permission Required
          </h2>

          <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.5, maxWidth: 420, margin: '0 auto 1.5rem' }}>
            Only staff members, security crew, and event organizers who have scanner access can scan and admit attendees.
          </p>

          <button 
            className="btn btn-primary"
            onClick={() => navigate('guest_home')}
            style={{ fontWeight: 800, padding: '0.75rem 1.5rem', borderRadius: 12 }}
          >
            Go Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '0 0.5rem 5rem' }}>
      
      {/* ========================================================
          TOP HEADER BAR (MATCHING SCREENSHOT WITH BACK BUTTON)
          ======================================================== */}
      <div 
        style={{ 
          background: '#0B0D14', 
          borderRadius: '24px 24px 0 0',
          padding: '1.25rem 1.25rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Back Button Circle */}
        <button
          type="button"
          onClick={() => navigate(user.role === 'manager' ? 'dashboard' : 'guest_home')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)'
          }}
          aria-label="Go Back"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Title: Scan Guest Pass */}
        <h1 
          style={{ 
            fontSize: '1.25rem', 
            fontWeight: 800, 
            color: '#FFFFFF', 
            margin: 0,
            letterSpacing: '-0.01em'
          }}
        >
          Scan Guest Pass
        </h1>

        {/* Empty Spacer to balance Back button */}
        <div style={{ width: 40 }} />
      </div>

      {/* ========================================================
          IMMERSIVE CAMERA SCANNER VIEWPORT WITH CYAN CORNER BRACKETS
          ======================================================== */}
      <div 
        style={{
          position: 'relative',
          background: '#07080C',
          overflow: 'hidden',
          aspectRatio: '3/4',
          maxHeight: 520,
          width: '100%',
          borderRadius: '0 0 24px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Live Camera Video Feed */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {/* Dark Vignette Overlay for scanner focus */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, transparent 40%, rgba(7, 8, 12, 0.8) 85%)',
            pointerEvents: 'none'
          }}
        />

        {/* Fallback Camera Placeholder when camera is initializing or off */}
        {!cameraActive && (
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(180deg, #111420 0%, #080A10 100%)',
              color: '#94A3B8',
              padding: '2rem',
              textAlign: 'center'
            }}
          >
            <Camera size={44} color="#38BDF8" style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
              Initializing Camera...
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: 280, margin: '0 0 1rem' }}>
              Align the attendee's QR Pass inside the glowing frame.
            </p>
          </div>
        )}

        {/* ========================================================
            EXACT SCANNER TARGET FRAME WITH CYAN GLOWING CORNERS
            ======================================================== */}
        <div 
          style={{
            position: 'relative',
            width: 250,
            height: 250,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          {/* Top-Left Corner Bracket */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 44,
              height: 44,
              borderTop: '4px solid #38BDF8',
              borderLeft: '4px solid #38BDF8',
              borderTopLeftRadius: 18,
              filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))'
            }}
          />

          {/* Top-Right Corner Bracket */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 44,
              height: 44,
              borderTop: '4px solid #38BDF8',
              borderRight: '4px solid #38BDF8',
              borderTopRightRadius: 18,
              filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))'
            }}
          />

          {/* Bottom-Left Corner Bracket */}
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 44,
              height: 44,
              borderBottom: '4px solid #38BDF8',
              borderLeft: '4px solid #38BDF8',
              borderBottomLeftRadius: 18,
              filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))'
            }}
          />

          {/* Bottom-Right Corner Bracket */}
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 44,
              height: 44,
              borderBottom: '4px solid #38BDF8',
              borderRight: '4px solid #38BDF8',
              borderBottomRightRadius: 18,
              filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))'
            }}
          />

          {/* Animated Laser Scanning Line */}
          <div 
            className="scanner-laser" 
            style={{
              position: 'absolute',
              left: '5%',
              width: '90%',
              height: 2,
              background: 'linear-gradient(90deg, transparent, #38BDF8, #22D3EE, #38BDF8, transparent)',
              boxShadow: '0 0 14px 2px #38BDF8',
              borderRadius: 2
            }}
          />
        </div>

        {/* Viewport Floating Status Badge */}
        <div 
          style={{
            position: 'absolute',
            bottom: 16,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 100,
            padding: '0.35rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            color: '#38BDF8',
            zIndex: 15
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
          Point Camera at QR Pass
        </div>
      </div>

      {/* ========================================================
          1. VERIFICATION RESULT MODAL (MATCHING SCREENSHOT 1)
          ======================================================== */}
      {scanResult && (
        <div 
          style={modalBackdropStyle}
          onClick={() => setScanResult(null)}
        >
          <div 
            style={{
              ...modalCardStyle,
              position: 'relative',
              overflow: 'hidden',
              padding: '1.75rem 1.5rem 1.5rem',
              maxWidth: 400
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Green Top Accent Bar */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                background: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
              }}
            />

            {/* Top Badge: Verified */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', marginTop: '0.25rem' }}>
              <div 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.95rem',
                  background: '#DCFCE7',
                  color: '#15803D',
                  borderRadius: 100,
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}
              >
                <CheckCircle2 size={16} color="#15803D" /> Verified
              </div>
            </div>

            {scanResult.guest && (() => {
              const guest = scanResult.guest;
              const matchedEvt = events.find(e => e.id === guest.eventId) || assignedEvent;

              return (
                <>
                  {/* Centered Circular Attendee Avatar Photo */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    {guest.avatar && !guest.avatar.includes('unsplash.com') ? (
                      <img 
                        src={guest.avatar} 
                        alt={guest.name} 
                        style={{
                          width: 96,
                          height: 96,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3.5px solid #F8FAFC',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 96,
                          height: 96,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                          border: '3.5px solid #38BDF8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2563EB',
                          boxShadow: '0 8px 24px rgba(56, 189, 248, 0.25)'
                        }}
                      >
                        <User size={46} strokeWidth={2.2} />
                      </div>
                    )}
                  </div>

                  {/* Name & Party / Event Name */}
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.25rem' }}>
                      {guest.name}
                    </h2>
                    <div style={{ fontSize: '1rem', color: '#475569', fontWeight: 700, marginBottom: '0.35rem' }}>
                      {matchedEvt?.name || 'Exclusive Event'}
                    </div>

                    {/* Event Date & Time & Venue */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                      {matchedEvt?.date && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          📅 {matchedEvt.date}
                        </span>
                      )}
                      {matchedEvt?.startTime && (
                        <span>• ⏰ {matchedEvt.startTime}{matchedEvt.endTime ? ` - ${matchedEvt.endTime}` : ''}</span>
                      )}
                      {matchedEvt?.venue && (
                        <span>• 📍 {matchedEvt.venue}</span>
                      )}
                    </div>
                  </div>

                  {/* Details Box: Token No & Pass ID */}
                  <div 
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: 18,
                      padding: '1rem 1.15rem',
                      marginBottom: '1.25rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      {/* Left: Token No. */}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: 2 }}>Token No.</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 6, wordBreak: 'break-all' }}>
                          {scanResult.scannedTokenCode || guest.token || 'N/A'}
                        </div>
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            background: '#DCFCE7',
                            color: '#16A34A',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: '1px solid #BBF7D0'
                          }}
                        >
                          ✿ Approved
                        </span>
                      </div>

                      {/* Right: Pass ID */}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: 2 }}>Pass ID</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 6, wordBreak: 'break-all' }}>
                          #{guest.passId}
                        </div>
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            background: guest.status === 'checkedin' ? '#DCFCE7' : '#EFF6FF',
                            color: guest.status === 'checkedin' ? '#166534' : '#2563EB',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 100,
                            border: guest.status === 'checkedin' ? '1px solid #BBF7D0' : '1px solid #BFDBFE'
                          }}
                        >
                          ❖ {guest.status === 'checkedin' ? 'Checked In' : 'Not Checked In'}
                        </span>
                      </div>
                    </div>

                    {/* All Attendee Filled Registration Details */}
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed #CBD5E1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                        Attendee Submission Details
                      </div>

                      {guest.email && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Email:</span>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.email}</span>
                        </div>
                      )}

                      {guest.mobile && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Mobile:</span>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.mobile}</span>
                        </div>
                      )}

                      {guest.college && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>College:</span>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.college}</span>
                        </div>
                      )}

                      {guest.branch && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Branch:</span>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.branch}</span>
                        </div>
                      )}

                      {guest.rollNo && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Roll No:</span>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.rollNo}</span>
                        </div>
                      )}

                      {guest.registrationDate && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: '#64748B', fontWeight: 600 }}>Registered On:</span>
                          <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.registrationDate}</span>
                        </div>
                      )}

                      {/* Dynamic Custom Answers */}
                      {guest.answers && Object.entries(guest.answers).map(([key, val]) => {
                        if (!val || typeof val !== 'string' || val.startsWith('data:image') || val.startsWith('http') || ['Email Address', 'Mobile Number', 'Full Name', 'Invited Email', 'Invited Phone', 'College / Institute', 'Department / Branch', 'Student Roll Number'].includes(key)) return null;
                        return (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>{key}:</span>
                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{val}</span>
                          </div>
                        );
                      })}

                      {/* Attached Documents Preview */}
                      {guest.documents && guest.documents.length > 0 && (
                        <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid #F1F5F9' }}>
                          <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
                            Attached Documents ({guest.documents.length}):
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {guest.documents.map((doc, idx) => (
                              <span 
                                key={idx}
                                style={{
                                  fontSize: '0.725rem',
                                  fontWeight: 700,
                                  background: '#EFF6FF',
                                  color: '#1D4ED8',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: 6,
                                  border: '1px solid #BFDBFE'
                                }}
                              >
                                📎 {doc.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Button: Check In Guest */}
                  {canCheckIn ? (
                    <button 
                      type="button"
                      onClick={() => handleCheckIn(guest)}
                      style={{
                        width: '100%',
                        padding: '0.95rem 1.5rem',
                        background: '#2563EB',
                        color: '#FFFFFF',
                        fontSize: '1rem',
                        fontWeight: 800,
                        borderRadius: 100,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Check In Guest
                    </button>
                  ) : (
                    <div style={{ padding: '0.75rem', background: '#F1F5F9', borderRadius: 12, color: '#64748B', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }}>
                      View Pass Only (Permission Restricted)
                    </div>
                  )}

                  {/* Caption below button */}
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.65rem', fontWeight: 600 }}>
                    Make sure the guest is present at the venue.
                  </div>
                </>
              );
            })()}

            {/* Status fallback if already checked in / invalid / pending */}
            {!scanResult.guest && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#EF4444', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem' }}>
                  <XCircle size={32} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.25rem' }}>
                  {scanResult.title}
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '0 0 1.25rem' }}>
                  {scanResult.message}
                </p>
                <button 
                  type="button"
                  onClick={() => setScanResult(null)}
                  style={{
                    background: '#2563EB',
                    color: '#FFF',
                    fontWeight: 700,
                    padding: '0.75rem',
                    borderRadius: 100,
                    width: '100%',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Dismiss / Scan Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          2. CHECK-IN SUCCESSFUL MODAL (EXACTLY MATCHING SCREENSHOT)
          ======================================================== */}
      {checkInSuccessGuest && (
        <div 
          style={modalBackdropStyle}
          onClick={() => setCheckInSuccessGuest(null)}
        >
          <div 
            style={{
              ...modalCardStyle,
              position: 'relative',
              overflow: 'hidden',
              padding: '2.5rem 1.65rem 1.75rem',
              maxWidth: 380,
              background: '#FFFFFF',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.24)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Subtle Decorative Confetti Particles */}
            <div style={{ position: 'absolute', top: 18, left: 24, width: 8, height: 8, background: '#F43F5E', borderRadius: 2, transform: 'rotate(25deg)', opacity: 0.7 }} />
            <div style={{ position: 'absolute', top: 38, left: 52, width: 6, height: 12, background: '#3B82F6', borderRadius: 2, transform: 'rotate(-40deg)', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 60, left: 30, width: 7, height: 7, background: '#10B981', borderRadius: '50%', opacity: 0.7 }} />
            <div style={{ position: 'absolute', top: 22, right: 36, width: 8, height: 10, background: '#F59E0B', borderRadius: 2, transform: 'rotate(35deg)', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 54, right: 28, width: 6, height: 14, background: '#EC4899', borderRadius: 2, transform: 'rotate(-20deg)', opacity: 0.7 }} />
            <div style={{ position: 'absolute', top: 75, right: 62, width: 7, height: 7, background: '#8B5CF6', borderRadius: '50%', opacity: 0.6 }} />

            <div style={{ textAlign: 'center' }}>
              
              {/* Green Circle Checkmark Icon */}
              <div 
                style={{ 
                  width: 72, 
                  height: 72, 
                  borderRadius: '50%', 
                  background: '#10B981', 
                  color: '#FFFFFF', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 1.25rem', 
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)' 
                }}
              >
                <CheckCircle2 size={44} color="#FFFFFF" strokeWidth={2.8} />
              </div>

              {/* Title: Check-in Successful! */}
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.45rem', letterSpacing: '-0.01em' }}>
                Check-in Successful!
              </h2>

              {/* Guest Name & Party Name */}
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.2rem' }}>
                {checkInSuccessGuest.guest.name}
              </div>
              <div style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 600, marginBottom: '1.5rem' }}>
                {events.find(e => e.id === checkInSuccessGuest.guest.eventId)?.name || assignedEvent?.name || 'Music Fest'}
              </div>

              {/* Details Box */}
              <div 
                style={{ 
                  background: '#FFFFFF', 
                  border: '1.5px solid #F1F5F9', 
                  borderRadius: 20, 
                  padding: '1.25rem 1.4rem', 
                  textAlign: 'left', 
                  marginBottom: '1.5rem',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.785rem', color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>Check-in Time</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    {checkInSuccessGuest.time || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.785rem', color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>Token No.</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', wordBreak: 'break-all' }}>
                    {checkInSuccessGuest.scannedTokenCode || checkInSuccessGuest.guest.token || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Action Buttons: View Details & Done (Matching Image) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  type="button"
                  onClick={() => {
                    const gid = checkInSuccessGuest.guest.id;
                    setCheckInSuccessGuest(null);
                    openDigitalPass(gid);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.95rem 1.5rem',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: 100,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  View Details
                </button>

                <button 
                  type="button"
                  onClick={() => setCheckInSuccessGuest(null)}
                  style={{
                    width: '100%',
                    padding: '0.9rem 1.5rem',
                    background: '#FFFFFF',
                    color: '#2563EB',
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: 100,
                    border: '2px solid #93C5FD',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Reusable styling helpers
const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem'
};

const modalCardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 24,
  maxWidth: 420,
  width: '100%',
  padding: '1.5rem',
  boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)',
  animation: 'scaleIn 0.2s ease-out'
};

