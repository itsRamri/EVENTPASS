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
          1. VERIFICATION RESULT MODAL (MATCHING SCREENSHOT)
          ======================================================== */}
      {scanResult && (
        <div 
          style={modalBackdropStyle}
          onClick={() => setScanResult(null)}
        >
          {/* Top Clean Header Bar */}
          <div style={{ width: '100%', maxWidth: 440, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingTop: '0.25rem' }}>
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
              maxWidth: 440,
              background: '#FFFFFF',
              borderRadius: 28,
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
              border: '1.5px solid #E2E8F0'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Teal/Green Header Rounded Banner Accent */}
            <div 
              style={{
                height: 28,
                background: scanResult.type === 'verified' || scanResult.guest?.status === 'approved' || scanResult.guest?.status === 'checkedin'
                  ? 'linear-gradient(90deg, #34D399 0%, #10B981 100%)'
                  : scanResult.type === 'rejected'
                  ? 'linear-gradient(90deg, #F87171 0%, #EF4444 100%)'
                  : 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 100%)',
                width: '100%'
              }}
            />

            <div style={{ padding: '1.5rem 1.5rem 1.75rem' }}>
              {/* Top Center Badge: Verified */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    color: scanResult.type === 'verified' || scanResult.guest?.status === 'approved' ? '#10B981' : scanResult.type === 'rejected' ? '#EF4444' : '#F59E0B',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {scanResult.type === 'verified' || scanResult.guest?.status === 'approved' ? (
                    <>
                      <CheckCircle2 size={24} color="#10B981" strokeWidth={2.8} />
                      <span>Verified</span>
                    </>
                  ) : scanResult.type === 'already_checkedin' ? (
                    <>
                      <CheckCircle2 size={24} color="#2563EB" strokeWidth={2.8} />
                      <span>Already Admitted</span>
                    </>
                  ) : scanResult.type === 'rejected' ? (
                    <>
                      <XCircle size={24} color="#EF4444" strokeWidth={2.8} />
                      <span>Rejected</span>
                    </>
                  ) : (
                    <>
                      <Clock size={24} color="#F59E0B" strokeWidth={2.8} />
                      <span>{scanResult.title}</span>
                    </>
                  )}
                </div>
              </div>

              {scanResult.guest && (() => {
                const guest = scanResult.guest;
                const matchedEvt = events.find(e => e.id === guest.eventId) || assignedEvent;
                
                // Guest photo lookup (profile photo / live photo / document)
                const guestPhoto = (guest.avatar && !guest.avatar.includes('unsplash.com') ? guest.avatar : '') ||
                  (guest.answers?.['Live Photo'] || guest.answers?.['Profile Photo'] || guest.answers?.['Photo'] || guest.answers?.['live_photo'] || guest.answers?.['profile_photo'] || guest.answers?.['Student Photo'] || '') ||
                  (guest.documents?.find(d => d.type === 'image' || (d.url && (d.url.startsWith('data:image') || d.url.includes('firebasestorage'))))?.url || '') ||
                  (guest.avatar ? guest.avatar : '');

                const isCheckedIn = guest.status === 'checkedin';
                const isApproved = guest.status === 'approved';
                const tokenNo = scanResult.scannedTokenCode || guest.token || 'N/A';
                const passIdVal = guest.passId ? (guest.passId.startsWith('#') ? guest.passId : `#${guest.passId}`) : '#EP20251234';

                return (
                  <>
                    {/* Centered Rectangular Attendee Photo (as explicitly requested) */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                      {guestPhoto ? (
                        <img 
                          src={guestPhoto} 
                          alt={guest.name} 
                          style={{
                            width: 110,
                            height: 132,
                            borderRadius: 18,
                            objectFit: 'cover',
                            border: '3px solid #FFFFFF',
                            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                            background: '#F1F5F9'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 110,
                            height: 132,
                            borderRadius: 18,
                            background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
                            border: '2px dashed #CBD5E1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B',
                            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.06)'
                          }}
                        >
                          <User size={46} strokeWidth={1.8} color="#64748B" />
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 4, color: '#94A3B8' }}>No Photo</span>
                        </div>
                      )}
                    </div>

                    {/* Guest Name & Event Name */}
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.25rem', letterSpacing: '-0.01em' }}>
                        {guest.name}
                      </h2>
                      <div style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 600 }}>
                        {matchedEvt?.name || 'Music Fest 2025'}
                      </div>
                    </div>

                    {/* Details Box: Token No, Pass ID, and All Submitted Form Details */}
                    <div 
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: 18,
                        padding: '1.15rem',
                        marginBottom: '1.35rem',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      {/* 2-Column Grid: Token No & Pass ID */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                        {/* Left: Token No. */}
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: 3 }}>Token No.</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 8, wordBreak: 'break-all' }}>
                            {tokenNo}
                          </div>
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#DCFCE7',
                              color: '#16A34A',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: 100,
                              border: '1px solid #BBF7D0'
                            }}
                          >
                            ✿ Approved
                          </span>
                        </div>

                        {/* Right: Pass ID */}
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: 3 }}>Pass ID</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 8, wordBreak: 'break-all' }}>
                            {passIdVal}
                          </div>
                          <span 
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: isCheckedIn ? '#DCFCE7' : '#F1F5F9',
                              color: isCheckedIn ? '#166534' : '#475569',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: 100,
                              border: isCheckedIn ? '1px solid #BBF7D0' : '1px solid #E2E8F0'
                            }}
                          >
                            ❖ {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                          </span>
                        </div>
                      </div>

                      {/* Attendee Submitted Registration Details */}
                      <div style={{ marginTop: '0.95rem', paddingTop: '0.85rem', borderTop: '1px dashed #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                          Guest Form Details
                        </div>

                        {guest.email && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>Email:</span>
                            <span style={{ color: '#0F172A', fontWeight: 700, maxWidth: '65%', textAlign: 'right', wordBreak: 'break-all' }}>{guest.email}</span>
                          </div>
                        )}

                        {guest.mobile && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>Mobile:</span>
                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.mobile}</span>
                          </div>
                        )}

                        {guest.college && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>College:</span>
                            <span style={{ color: '#0F172A', fontWeight: 700, maxWidth: '65%', textAlign: 'right' }}>{guest.college}</span>
                          </div>
                        )}

                        {guest.branch && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>Branch / Dept:</span>
                            <span style={{ color: '#0F172A', fontWeight: 700, maxWidth: '65%', textAlign: 'right' }}>{guest.branch}</span>
                          </div>
                        )}

                        {guest.rollNo && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>Roll No:</span>
                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.rollNo}</span>
                          </div>
                        )}

                        {guest.registrationDate && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>Registered On:</span>
                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{guest.registrationDate}</span>
                          </div>
                        )}

                        {/* All Custom Form Answers */}
                        {guest.answers && Object.entries(guest.answers).map(([key, val]) => {
                          if (!val || typeof val !== 'string' || val.startsWith('data:image') || val.startsWith('http') || ['Email Address', 'Mobile Number', 'Full Name', 'Invited Email', 'Invited Phone', 'College / Institute', 'Department / Branch', 'Student Roll Number', 'Live Photo', 'Profile Photo', 'Photo', 'live_photo', 'profile_photo'].includes(key)) return null;
                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>{key}:</span>
                              <span style={{ color: '#0F172A', fontWeight: 700, maxWidth: '65%', textAlign: 'right' }}>{val}</span>
                            </div>
                          );
                        })}

                        {/* Uploaded Documents */}
                        {guest.documents && guest.documents.length > 0 && (
                          <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #F1F5F9' }}>
                            <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 600, marginBottom: 4 }}>
                              Uploaded Documents ({guest.documents.length}):
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
                                    padding: '0.2rem 0.55rem',
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

                    {/* Primary Button: Check In Guest (Matching blue button in screenshot) */}
                    {canCheckIn ? (
                      <button 
                        type="button"
                        onClick={() => handleCheckIn(guest)}
                        style={{
                          width: '100%',
                          padding: '1rem 1.5rem',
                          background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                          color: '#FFFFFF',
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          borderRadius: 100,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          letterSpacing: '0.01em'
                        }}
                      >
                        Check In Guest
                      </button>
                    ) : (
                      <div style={{ padding: '0.85rem', background: '#F1F5F9', borderRadius: 100, color: '#64748B', fontWeight: 700, fontSize: '0.875rem', textAlign: 'center' }}>
                        View Pass Only (Permission Restricted)
                      </div>
                    )}

                    {/* Caption below button (Exact text from screenshot) */}
                    <div style={{ textAlign: 'center', fontSize: '0.785rem', color: '#64748B', marginTop: '0.85rem', fontWeight: 500 }}>
                      Make sure the guest is present at the venue.
                    </div>
                  </>
                );
              })()}

              {/* Status fallback if guest record not loaded or invalid */}
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
          2. CHECK-IN SUCCESSFUL MODAL (WITH TICK, DETAILS & DONE)
          ======================================================== */}
      {checkInSuccessGuest && (
        <div 
          style={modalBackdropStyle}
          onClick={() => setCheckInSuccessGuest(null)}
        >
          {/* Top Clean Header Bar */}
          <div style={{ width: '100%', maxWidth: 440, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingTop: '0.25rem' }}>
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
              padding: 0,
              maxWidth: 440,
              background: '#FFFFFF',
              borderRadius: 28,
              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
              border: '1.5px solid #E2E8F0'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Green Accent Banner */}
            <div 
              style={{
                height: 28,
                background: 'linear-gradient(90deg, #34D399 0%, #10B981 100%)',
                width: '100%'
              }}
            />

            <div style={{ padding: '1.5rem 1.5rem 1.75rem', textAlign: 'center' }}>
              
              {/* Green Circle Tick / Checkmark Icon */}
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
                  margin: '0 auto 0.85rem', 
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)' 
                }}
              >
                <CheckCircle2 size={42} color="#FFFFFF" strokeWidth={2.8} />
              </div>

              {/* Title: Check-in Successful! */}
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.25rem', letterSpacing: '-0.01em' }}>
                Check-in Successful!
              </h2>

              {/* Guest Photo (Rectangular) */}
              {(() => {
                const guest = checkInSuccessGuest.guest;
                const matchedEvt = events.find(e => e.id === guest.eventId) || assignedEvent;
                const guestPhoto = (guest.avatar && !guest.avatar.includes('unsplash.com') ? guest.avatar : '') ||
                  (guest.answers?.['Live Photo'] || guest.answers?.['Profile Photo'] || guest.answers?.['Photo'] || guest.answers?.['live_photo'] || guest.answers?.['profile_photo'] || guest.answers?.['Student Photo'] || '') ||
                  (guest.documents?.find(d => d.type === 'image' || (d.url && (d.url.startsWith('data:image') || d.url.includes('firebasestorage'))))?.url || '') ||
                  (guest.avatar ? guest.avatar : '');

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.85rem 0' }}>
                      {guestPhoto ? (
                        <img 
                          src={guestPhoto} 
                          alt={guest.name} 
                          style={{
                            width: 100,
                            height: 120,
                            borderRadius: 16,
                            objectFit: 'cover',
                            border: '3px solid #FFFFFF',
                            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)',
                            background: '#F1F5F9'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 100,
                            height: 120,
                            borderRadius: 16,
                            background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
                            border: '2px dashed #CBD5E1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B'
                          }}
                        >
                          <User size={40} strokeWidth={1.8} color="#64748B" />
                        </div>
                      )}
                    </div>

                    {/* Guest Name & Party/Event Name */}
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0F172A', marginBottom: '0.15rem' }}>
                      {guest.name}
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#64748B', fontWeight: 600, marginBottom: '1.15rem' }}>
                      {matchedEvt?.name || 'Music Fest 2025'}
                    </div>

                    {/* Details Box */}
                    <div 
                      style={{ 
                        background: '#FFFFFF', 
                        border: '1.5px solid #E2E8F0', 
                        borderRadius: 18, 
                        padding: '1.1rem', 
                        textAlign: 'left', 
                        marginBottom: '1.25rem',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
                      }}
                    >
                      {/* Check-in Time & Token No Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 600, marginBottom: 2 }}>Check-in Time</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#10B981' }}>
                            {checkInSuccessGuest.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 600, marginBottom: 2 }}>Token No.</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0F172A', wordBreak: 'break-all' }}>
                            {checkInSuccessGuest.scannedTokenCode || guest.token || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Guest Submission Details */}
                      <div style={{ paddingTop: '0.65rem', borderTop: '1px dashed #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {guest.email && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ color: '#64748B', fontWeight: 600 }}>Email:</span>
                            <span style={{ color: '#0F172A', fontWeight: 700, maxWidth: '65%', textAlign: 'right', wordBreak: 'break-all' }}>{guest.email}</span>
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
                            <span style={{ color: '#0F172A', fontWeight: 700, maxWidth: '65%', textAlign: 'right' }}>{guest.college}</span>
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

                        {/* Custom Answers */}
                        {guest.answers && Object.entries(guest.answers).map(([key, val]) => {
                          if (!val || typeof val !== 'string' || val.startsWith('data:image') || val.startsWith('http') || ['Email Address', 'Mobile Number', 'Full Name', 'Invited Email', 'Invited Phone', 'College / Institute', 'Department / Branch', 'Student Roll Number', 'Live Photo', 'Profile Photo', 'Photo', 'live_photo', 'profile_photo'].includes(key)) return null;
                          return (
                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <span style={{ color: '#64748B', fontWeight: 600 }}>{key}:</span>
                              <span style={{ color: '#0F172A', fontWeight: 700, maxWidth: '65%', textAlign: 'right' }}>{val}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Action Button: Done (Closes popup and ready for next scan) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button 
                  type="button"
                  onClick={() => setCheckInSuccessGuest(null)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.5rem',
                    background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                    color: '#FFFFFF',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    borderRadius: 100,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.01em'
                  }}
                >
                  Done
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    const gid = checkInSuccessGuest.guest.id;
                    setCheckInSuccessGuest(null);
                    openDigitalPass(gid);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1.5rem',
                    background: '#FFFFFF',
                    color: '#2563EB',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    borderRadius: 100,
                    border: '1.5px solid #BFDBFE',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  View Details
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
  padding: 'max(1rem, env(safe-area-inset-top, 1rem)) 1rem 2.5rem'
};

const modalCardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 28,
  maxWidth: 440,
  width: '100%',
  padding: 0,
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.09)',
  border: '1.5px solid #E2E8F0',
  margin: 'auto 0'
};

