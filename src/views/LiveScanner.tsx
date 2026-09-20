import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, getFormattedTimestamp } from '../context/AppContext';
import { GuestRegistration } from '../types';
import { sound } from '../utils/audio';
import { fetchGuestFromDbByToken } from '../services/dbService';
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
    saveGuest,
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
  const userCleanEmail = (user.email || '').toLowerCase().trim();
  const userCleanMobile = (user.mobile || '').replace(/\D/g, '');

  const matchedStaff = staff.find(s => {
    const sEmail = (s.email || '').toLowerCase().trim();
    const sPhone = (s.phone || '').replace(/\D/g, '');
    return (
      (sEmail && userCleanEmail && sEmail === userCleanEmail) ||
      (sPhone && userCleanMobile && sPhone === userCleanMobile)
    );
  });

  const isManager = user.role === 'manager';
  const isStaffScanner = user.role === 'scanner' || (!!matchedStaff && matchedStaff.status === 'active' && matchedStaff.permissions?.canScan !== false);
  const isAuthorizedScanner = isManager || isStaffScanner;

  const canCheckIn = true; // Always allow check in
  const canApprove = isManager || (matchedStaff ? !!matchedStaff.permissions?.canApprove : false);

  const assignedEvent = matchedStaff?.assignedEventId && matchedStaff.assignedEventId !== 'all'
    ? events.find(e => e.id === matchedStaff.assignedEventId)
    : null;

  const activeStaffName = `${user.name} (${matchedStaff?.designation || (isManager ? 'Event Manager' : 'Authorized Gate Staff')})`;
  const checkedInGuests = guests.filter(g => g.status === 'checkedin');

  const verifyToken = useCallback(async (code: string) => {
    if (scanCooldown || scanResult || checkInSuccessGuest) return;

    const raw = (code || '').trim();
    if (!raw) return;
    const q = raw.toUpperCase();
    const currentTimestamp = getFormattedTimestamp();

    // Extract code if JSON or URL parameter
    let extractedCode = q;
    try {
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed = JSON.parse(raw);
        extractedCode = (parsed.token || parsed.passId || parsed.code || parsed.id || parsed.guestId || q).toUpperCase();
      } else if (raw.includes('?')) {
        const urlParams = new URLSearchParams(raw.split('?')[1]);
        const paramToken = urlParams.get('token') || urlParams.get('pass') || urlParams.get('passId') || urlParams.get('guestId') || urlParams.get('id') || urlParams.get('code') || urlParams.get('t');
        if (paramToken) extractedCode = paramToken.toUpperCase();
      }
    } catch {}

    const baseExtracted = extractedCode.replace(/-\d+$/, '');
    const baseQ = q.replace(/-\d+$/, '');

    // 1. Search in local guests array
    let guest = guests.find(g => 
      (g.token && g.token.toUpperCase() === extractedCode) || 
      (g.token && g.token.toUpperCase() === baseExtracted) ||
      (g.tokens && g.tokens.some(t => t.toUpperCase() === extractedCode || t.toUpperCase() === baseExtracted)) ||
      (g.tokenList && g.tokenList.some(t => (t.tokenCode || '').toUpperCase() === extractedCode || (t.tokenCode || '').toUpperCase() === baseExtracted)) ||
      (g.passId && (g.passId.toUpperCase() === extractedCode || g.passId.toUpperCase() === baseExtracted)) ||
      (g.id && (g.id.toUpperCase() === extractedCode || g.id.toUpperCase() === baseExtracted)) ||
      (g.token && g.token.toUpperCase() === q) || 
      (g.token && g.token.toUpperCase() === baseQ) ||
      (g.tokens && g.tokens.some(t => t.toUpperCase() === q || t.toUpperCase() === baseQ)) ||
      (g.tokenList && g.tokenList.some(t => (t.tokenCode || '').toUpperCase() === q || (t.tokenCode || '').toUpperCase() === baseQ)) ||
      (g.passId && (g.passId.toUpperCase() === q || g.passId.toUpperCase() === baseQ)) ||
      (g.id && (g.id.toUpperCase() === q || g.id.toUpperCase() === baseQ)) ||
      (g.token && (extractedCode.startsWith(g.token.toUpperCase()) || g.token.toUpperCase().startsWith(extractedCode))) ||
      (g.passId && (extractedCode.startsWith(g.passId.toUpperCase()) || g.passId.toUpperCase().startsWith(extractedCode))) ||
      (g.id && (extractedCode.startsWith(g.id.toUpperCase()) || g.id.toUpperCase().startsWith(extractedCode))) ||
      (g.name && g.name.toUpperCase().includes(q) && q.length > 3)
    );

    // 2. If not found in local memory, search directly in Firestore database
    if (!guest) {
      try {
        const dbGuest = await fetchGuestFromDbByToken(extractedCode) || await fetchGuestFromDbByToken(baseExtracted) || await fetchGuestFromDbByToken(q);
        if (dbGuest) {
          guest = dbGuest;
          saveGuest(dbGuest);
        }
      } catch (err) {
        console.warn('LiveScanner db lookup notice:', err);
      }
    }

    const eventName = guest ? (events.find(e => e.id === guest.eventId)?.name || 'Event') : 'Unknown Event';

    setScanCooldown(true);
    setTimeout(() => setScanCooldown(false), 1200);

    if (!guest) {
      sound.play('error');
      addScanLog({
        guestName: 'Unregistered / Unknown',
        token: raw,
        passId: 'N/A',
        eventName: 'N/A',
        status: 'invalid',
        scannerStaff: activeStaffName
      });

      setScanResult({
        type: 'invalid',
        title: 'Invalid QR Pass ❌',
        message: `No active pass record found for "${raw}". Please verify the pass was issued officially.`,
        scannedTokenCode: raw,
        scanTime: currentTimestamp
      });
      return;
    }

    // Check scanner authorization for this specific event and user role
    const evtObj = events.find(e => e.id === guest.eventId);
    const isCreator = Boolean(
      (user.id && evtObj?.creatorId && user.id === evtObj.creatorId) ||
      (userCleanEmail && evtObj?.creatorEmail && userCleanEmail === evtObj.creatorEmail.toLowerCase().trim()) ||
      (userCleanMobile && evtObj?.creatorMobile && userCleanMobile === evtObj.creatorMobile.replace(/\D/g, ''))
    );

    const isAuthorizedForThisEvent = 
      isManager || 
      isCreator || 
      (matchedStaff && matchedStaff.status === 'active' && matchedStaff.permissions?.canScan !== false && (!matchedStaff.assignedEventId || matchedStaff.assignedEventId === 'all' || matchedStaff.assignedEventId === guest.eventId));

    if (!isAuthorizedForThisEvent) {
      sound.play('error');
      addScanLog({
        guestName: 'Protected / Restricted Scan',
        token: extractedCode,
        passId: 'N/A',
        eventName: eventName,
        status: 'invalid',
        scannerStaff: activeStaffName
      });

      setScanResult({
        type: 'invalid',
        title: user.role === 'guest' ? 'Guest Access Restricted 🔒' : 'Unauthorized Event Gate ⚠️',
        message: user.role === 'guest'
          ? 'Guests cannot scan or view other attendees\' passes. Only authorized gate staff and organizers can scan.'
          : `You do not have scan authorization for "${eventName}". Guest details and photo are protected.`,
        scannedTokenCode: extractedCode,
        scanTime: currentTimestamp
      });
      return;
    }

    const totalTokens = guest.tokenCount || guest.tokens?.length || (guest.tokenList?.length) || 1;
    const matchingTokenItem = guest.tokenList?.find(t => (t.tokenCode || '').toUpperCase() === extractedCode || (t.tokenCode || '').toUpperCase() === q) ||
      (guest.tokens?.includes(extractedCode) ? { 
        tokenCode: extractedCode, 
        index: guest.tokens.indexOf(extractedCode) + 1, 
        status: guest.status === 'checkedin' ? ('used' as const) : ('valid' as const), 
        checkInTime: guest.checkInTime 
      } : null);

    const tokenIdx = matchingTokenItem?.index || (guest.tokens ? Math.max(1, guest.tokens.indexOf(extractedCode) + 1) : 1);
    const usedTokensCount = guest.usedTokens || (guest.tokenList ? guest.tokenList.filter(t => t.status === 'used').length : (guest.status === 'checkedin' ? totalTokens : 0));
    const isSpecificTokenUsed = matchingTokenItem ? matchingTokenItem.status === 'used' : (guest.status === 'checkedin');
    const remainingCount = Math.max(0, totalTokens - usedTokensCount);

    addScanLog({
      guestName: guest.name,
      token: extractedCode || guest.token || 'N/A',
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
        title: 'Aapka QR Expire Ho Chuka Hai ⚠️',
        message: totalTokens > 1
          ? `Pass Token #${tokenIdx} of ${totalTokens} (${code}) already check-in ho chuka hai aur expire ho gaya hai. Remaining passes: ${remainingCount} of ${totalTokens}.`
          : `Yeh VIP Pass already ${guest.checkInTime || 'pehle'} check-in ho chuka hai aur expire ho gaya hai. Dobara entry block hai.`,
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
  }, [guests, events, scanCooldown, scanResult, checkInSuccessGuest, activeStaffName, addScanLog, assignedEvent, isManager, saveGuest]);

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
      type: 'success',
      recipientEmail: (g.email || '').toLowerCase().trim(),
      recipientPhone: (g.mobile || '').replace(/\D/g, ''),
      recipientRole: 'guest'
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
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        background: '#000000',
        overflow: 'hidden',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* 1. Full-Screen Live Camera Video Feed */}
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
          objectFit: 'cover',
          zIndex: 1
        }}
      />

      {/* 2. Soft Radial Vignette Overlay for Focus */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.8) 100%)',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />

      {/* 3. Fallback when Camera is starting or permission pending */}
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
            textAlign: 'center',
            zIndex: 3
          }}
        >
          <Camera size={52} color="#38BDF8" style={{ marginBottom: '1rem', opacity: 0.85 }} />
          <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.4rem' }}>
            Starting Camera...
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', maxWidth: 300, margin: '0 0 1.25rem' }}>
            Point your device camera at the attendee's QR Pass to scan.
          </p>
        </div>
      )}

      {/* 4. Top Header with Upper-Left Back Button */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 'max(1rem, env(safe-area-inset-top, 1rem)) 1.25rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)'
        }}
      >
        {/* Upper-Left Back Arrow Button */}
        <button
          type="button"
          onClick={() => navigate(user.role === 'manager' ? 'dashboard' : 'guest_home')}
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF',
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.15s ease'
          }}
          aria-label="Go Back"
          title="Back to previous page"
        >
          <ArrowLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
        </button>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1 
            style={{ 
              fontSize: '1.1rem', 
              fontWeight: 800, 
              color: '#FFFFFF', 
              margin: 0,
              letterSpacing: '0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)'
            }}
          >
            Scan QR Pass
          </h1>
          <div style={{ fontSize: '0.725rem', color: '#38BDF8', fontWeight: 700, marginTop: 1, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            Gate Entry Scanner
          </div>
        </div>

        {/* Empty Spacer to balance */}
        <div style={{ width: 44 }} />
      </div>

      {/* 5. Center Rectangular QR Scanning Target Box */}
      <div 
        style={{
          position: 'relative',
          width: 'clamp(260px, 72vw, 320px)',
          height: 'clamp(260px, 72vw, 320px)',
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
            width: 48,
            height: 48,
            borderTop: '4px solid #38BDF8',
            borderLeft: '4px solid #38BDF8',
            borderTopLeftRadius: 20,
            filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.9))'
          }}
        />

        {/* Top-Right Corner Bracket */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 48,
            height: 48,
            borderTop: '4px solid #38BDF8',
            borderRight: '4px solid #38BDF8',
            borderTopRightRadius: 20,
            filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.9))'
          }}
        />

        {/* Bottom-Left Corner Bracket */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 48,
            height: 48,
            borderBottom: '4px solid #38BDF8',
            borderLeft: '4px solid #38BDF8',
            borderBottomLeftRadius: 20,
            filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.9))'
          }}
        />

        {/* Bottom-Right Corner Bracket */}
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 48,
            height: 48,
            borderBottom: '4px solid #38BDF8',
            borderRight: '4px solid #38BDF8',
            borderBottomRightRadius: 20,
            filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.9))'
          }}
        />

        {/* Animated Laser Scanning Line */}
        <div 
          className="scanner-laser" 
          style={{
            position: 'absolute',
            left: '6%',
            width: '88%',
            height: 2.5,
            background: 'linear-gradient(90deg, transparent, #38BDF8, #22D3EE, #38BDF8, transparent)',
            boxShadow: '0 0 14px 3px #38BDF8',
            borderRadius: 2
          }}
        />
      </div>

      {/* 6. Floating Status Helper Text Below Viewfinder */}
      <div 
        style={{
          position: 'absolute',
          bottom: 'clamp(2.5rem, 8vh, 4.5rem)',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: 100,
          padding: '0.55rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 700,
          color: '#38BDF8',
          fontSize: '0.85rem',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          zIndex: 15
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
        Scan Guest QR Ticket
      </div>

      {/* ========================================================
          1. VERIFICATION RESULT MODAL (EXACTLY MATCHING IMAGE 2)
          ======================================================== */}
      {scanResult && (
        <div 
          style={modalBackdropStyle}
          onClick={() => setScanResult(null)}
        >
          {/* Top Clean Header Bar */}
          <div style={{ width: '100%', maxWidth: 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingTop: '0.25rem' }}>
            <button 
              type="button"
              onClick={() => setScanResult(null)}
              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #E2E8F0', color: '#0F172A', padding: '0.45rem 0.95rem', borderRadius: 100, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
            >
              ← Back to Scanner
            </button>
            <button 
              type="button"
              onClick={() => setScanResult(null)}
              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #E2E8F0', color: '#0F172A', width: 34, height: 34, borderRadius: '50%', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
            >
              ✕
            </button>
          </div>

          <div 
            style={{
              ...modalCardStyle,
              position: 'relative',
              overflow: 'hidden',
              padding: 0,
              maxWidth: 400,
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 28,
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.1)',
              border: '1.5px solid #E2E8F0'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Rounded Cap Accent Bar */}
            <div 
              style={{
                height: 24,
                background: scanResult.type === 'already_checkedin'
                  ? 'linear-gradient(90deg, #F87171 0%, #EF4444 100%)'
                  : scanResult.type === 'verified' || scanResult.guest?.status === 'approved'
                  ? 'linear-gradient(90deg, #34D399 0%, #10B981 100%)'
                  : scanResult.type === 'rejected'
                  ? 'linear-gradient(90deg, #F87171 0%, #EF4444 100%)'
                  : 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 100%)',
                width: '100%'
              }}
            />

            <div style={{ padding: '1.25rem 1.25rem 1.5rem' }}>
              {scanResult.guest ? (() => {
                const guest = scanResult.guest;
                const matchedEvt = events.find(e => e.id === guest.eventId) || assignedEvent;
                
                // Guest photo lookup (profile photo / live photo / document)
                const guestPhoto = (guest.avatar && !guest.avatar.includes('unsplash.com') ? guest.avatar : '') ||
                  (guest.answers?.['Live Photo'] || guest.answers?.['Profile Photo'] || guest.answers?.['Photo'] || guest.answers?.['live_photo'] || guest.answers?.['profile_photo'] || guest.answers?.['Student Photo'] || '') ||
                  (guest.documents?.find(d => d.type === 'image' || (d.url && (d.url.startsWith('data:image') || d.url.includes('firebasestorage'))))?.url || '') ||
                  (guest.avatar ? guest.avatar : '');

                const isAlreadyCheckedIn = scanResult.type === 'already_checkedin' || guest.status === 'checkedin';
                const tokenNo = scanResult.scannedTokenCode || guest.token || 'N/A';
                const passIdVal = guest.passId ? (guest.passId.startsWith('#') ? guest.passId : `#${guest.passId}`) : '#EP20251234';

                return (
                  <>
                    {/* Inner Box with Dynamic Border Color */}
                    <div 
                      style={{
                        border: isAlreadyCheckedIn ? '1.5px solid #FCA5A5' : '1.5px solid #86EFAC',
                        borderRadius: 22,
                        padding: '1.25rem 1.15rem 1.15rem',
                        background: '#FFFFFF',
                        marginBottom: '1.25rem',
                        boxShadow: isAlreadyCheckedIn ? '0 2px 8px rgba(239, 68, 68, 0.04)' : '0 2px 8px rgba(16, 185, 129, 0.04)'
                      }}
                    >
                      {/* Top Center Badge */}
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0.85rem' }}>
                        {isAlreadyCheckedIn ? (
                          <div 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              color: '#DC2626',
                              fontWeight: 800,
                              fontSize: '1.1rem',
                              letterSpacing: '-0.01em'
                            }}
                          >
                            <AlertTriangle size={22} color="#DC2626" strokeWidth={2.8} />
                            <span>Aapka QR Expire Ho Chuka Hai</span>
                          </div>
                        ) : (
                          <div 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              color: '#10B981',
                              fontWeight: 800,
                              fontSize: '1.15rem',
                              letterSpacing: '-0.01em'
                            }}
                          >
                            <CheckCircle2 size={22} color="#10B981" strokeWidth={2.8} />
                            <span>Verified</span>
                          </div>
                        )}
                      </div>

                      {/* Centered Rectangular Photo */}
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
                        {guestPhoto ? (
                          <img 
                            src={guestPhoto} 
                            alt={guest.name} 
                            style={{
                              width: 105,
                              height: 125,
                              borderRadius: 18,
                              objectFit: 'cover',
                              border: isAlreadyCheckedIn ? '2.5px solid #FEE2E2' : '2.5px solid #FFFFFF',
                              boxShadow: '0 6px 18px rgba(15, 23, 42, 0.1)',
                              background: '#F1F5F9'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 105,
                              height: 125,
                              borderRadius: 18,
                              background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
                              border: '2px dashed #CBD5E1',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#64748B'
                            }}
                          >
                            <User size={42} strokeWidth={1.8} color="#64748B" />
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 4, color: '#94A3B8' }}>No Photo</span>
                          </div>
                        )}
                      </div>

                      {/* Guest Name & Event Name */}
                      <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.2rem', letterSpacing: '-0.01em' }}>
                          {guest.name}
                        </h2>
                        <div style={{ fontSize: '0.925rem', color: '#64748B', fontWeight: 600 }}>
                          {matchedEvt?.name || 'Music Fest 2025'}
                        </div>
                      </div>

                      {/* 2-Column Grid: Token No & Pass ID */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.85rem', borderTop: '1px solid #F1F5F9' }}>
                        {/* Left: Token No. */}
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: 2 }}>Token No.</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 6, wordBreak: 'break-all' }}>
                            {tokenNo}
                          </div>
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: isAlreadyCheckedIn ? '#FEE2E2' : '#DCFCE7',
                              color: isAlreadyCheckedIn ? '#DC2626' : '#16A34A',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 100,
                              border: isAlreadyCheckedIn ? '1px solid #FCA5A5' : '1px solid #BBF7D0'
                            }}
                          >
                            {isAlreadyCheckedIn ? '✕ Expired' : '✿ Approved'}
                          </span>
                        </div>

                        {/* Right: Pass ID */}
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: 2 }}>Pass ID</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 6, wordBreak: 'break-all' }}>
                            {passIdVal}
                          </div>
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: isAlreadyCheckedIn ? '#FEE2E2' : '#EFF6FF',
                              color: isAlreadyCheckedIn ? '#DC2626' : '#2563EB',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 100,
                              border: isAlreadyCheckedIn ? '1px solid #FCA5A5' : '1px solid #BFDBFE'
                            }}
                          >
                            ❖ {isAlreadyCheckedIn ? 'Already Checked In' : 'Not Checked In'}
                          </span>
                        </div>
                      </div>

                      {/* Expired Re-entry Warning Notice */}
                      {isAlreadyCheckedIn && (
                        <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, color: '#991B1B', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>
                          ⚠️ Yeh QR Code already check-in ho chuka hai at {guest.checkInTime || 'earlier'}. Re-entry allow nahi hai.
                        </div>
                      )}
                    </div>

                    {/* Primary Button: Check In Guest OR Expired Dismiss Button */}
                    {!isAlreadyCheckedIn ? (
                      <>
                        <button 
                          type="button"
                          onClick={() => handleCheckIn(guest)}
                          style={{
                            width: '100%',
                            padding: '0.95rem 1.5rem',
                            background: '#2563EB',
                            color: '#FFFFFF',
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            borderRadius: 100,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            letterSpacing: '0.01em'
                          }}
                        >
                          Check In Guest
                        </button>

                        <div style={{ textAlign: 'center', fontSize: '0.785rem', color: '#64748B', marginTop: '0.85rem', fontWeight: 500 }}>
                          Make sure the guest is present at the venue.
                        </div>
                      </>
                    ) : (
                      <>
                        <button 
                          type="button"
                          onClick={() => setScanResult(null)}
                          style={{
                            width: '100%',
                            padding: '0.95rem 1.5rem',
                            background: '#DC2626',
                            color: '#FFFFFF',
                            fontSize: '1.025rem',
                            fontWeight: 800,
                            borderRadius: 100,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 6px 18px rgba(220, 38, 38, 0.35)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            letterSpacing: '0.01em'
                          }}
                        >
                          QR Expired — Scan Next Guest
                        </button>

                        <div style={{ textAlign: 'center', fontSize: '0.785rem', color: '#DC2626', marginTop: '0.85rem', fontWeight: 600 }}>
                          Duplicate entry strictly blocked.
                        </div>
                      </>
                    )}
                  </>
                );
              })() : (
                /* Status fallback if guest not found or rejected */
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
                      padding: '0.85rem',
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
        </div>
      )}

      {/* ========================================================
          2. CHECK-IN SUCCESSFUL MODAL (EXACTLY MATCHING IMAGE 2)
          ======================================================== */}
      {checkInSuccessGuest && (
        <div 
          style={modalBackdropStyle}
          onClick={() => setCheckInSuccessGuest(null)}
        >
          {/* Top Clean Header Bar */}
          <div style={{ width: '100%', maxWidth: 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingTop: '0.25rem' }}>
            <button 
              type="button"
              onClick={() => setCheckInSuccessGuest(null)}
              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #E2E8F0', color: '#0F172A', padding: '0.45rem 0.95rem', borderRadius: 100, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
            >
              ← Back to Scanner
            </button>
            <button 
              type="button"
              onClick={() => setCheckInSuccessGuest(null)}
              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #E2E8F0', color: '#0F172A', width: 34, height: 34, borderRadius: '50%', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
            >
              ✕
            </button>
          </div>

          <div 
            style={{
              ...modalCardStyle,
              position: 'relative',
              overflow: 'hidden',
              padding: '2.25rem 1.5rem 1.75rem',
              maxWidth: 400,
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 28,
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.1)',
              border: '1.5px solid #E2E8F0'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Decorative Confetti Elements (Matching Image 2) */}
            <div style={{ position: 'absolute', top: 16, left: 20, width: 7, height: 7, background: '#10B981', borderRadius: 2, transform: 'rotate(25deg)', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 32, left: 110, width: 6, height: 10, background: '#3B82F6', borderRadius: 2, transform: 'rotate(-35deg)', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 75, left: 45, width: 6, height: 12, background: '#EC4899', borderRadius: 2, transform: 'rotate(45deg)', opacity: 0.75 }} />
            <div style={{ position: 'absolute', top: 100, left: 105, width: 5, height: 8, background: '#10B981', borderRadius: 1, transform: 'rotate(-20deg)', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 24, right: 40, width: 6, height: 10, background: '#3B82F6', borderRadius: 2, transform: 'rotate(40deg)', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 44, right: 110, width: 6, height: 10, background: '#EC4899', borderRadius: 2, transform: 'rotate(-25deg)', opacity: 0.75 }} />
            <div style={{ position: 'absolute', top: 68, right: 60, width: 6, height: 6, background: '#F59E0B', borderRadius: '50%', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 155, right: 55, width: 6, height: 10, background: '#38BDF8', borderRadius: 2, transform: 'rotate(30deg)', opacity: 0.75 }} />
            <div style={{ position: 'absolute', top: 160, left: 60, width: 5, height: 5, background: '#38BDF8', borderRadius: '50%', opacity: 0.7 }} />

            <div style={{ textAlign: 'center' }}>
              
              {/* Green Circle Checkmark Icon */}
              <div 
                style={{ 
                  width: 68, 
                  height: 68, 
                  borderRadius: '50%', 
                  background: '#10B981', 
                  color: '#FFFFFF', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 1.15rem', 
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)' 
                }}
              >
                <CheckCircle2 size={42} color="#FFFFFF" strokeWidth={2.8} />
              </div>

              {/* Title: Check-in Successful! */}
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem', letterSpacing: '-0.01em' }}>
                Check-in Successful!
              </h2>

              {/* Guest Name & Party Name */}
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0F172A', marginBottom: '0.2rem' }}>
                {checkInSuccessGuest.guest.name}
              </div>
              <div style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 600, marginBottom: '1.35rem' }}>
                {events.find(e => e.id === checkInSuccessGuest.guest.eventId)?.name || assignedEvent?.name || 'Music Fest 2025'}
              </div>

              {/* Details Box: Check-in Time & Token No (Exactly Matching Image 2) */}
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

              {/* Action Buttons Stack (Exactly Matching Image 2) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* 1. View Details Button (Solid Blue) */}
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

                {/* 2. Done Button (Outlined White) */}
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
  width: '100vw',
  height: '100dvh',
  background: 'linear-gradient(180deg, #EBF3FA 0%, #F4F8FB 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  zIndex: 10000,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  padding: 'max(0.75rem, env(safe-area-inset-top, 0.75rem)) 0.75rem 2rem'
};

const modalCardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 28,
  maxWidth: 400,
  width: '100%',
  padding: 0,
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.09)',
  border: '1.5px solid #E2E8F0',
  margin: '0 auto'
};

