import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp, getFormattedTimestamp } from '../context/AppContext';
import { GuestRegistration } from '../types';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import { 
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
  PartyPopper,
  Calendar
} from 'lucide-react';

export const LiveScanner: React.FC = () => {
  const { 
    user, 
    guests, 
    events, 
    staff,
    updateGuestStatus, 
    checkInSingleToken,
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
  const canViewDetails = isManager || (matchedStaff ? matchedStaff.permissions?.canViewDetails !== false : true);
  const canApprove = isManager || (matchedStaff ? !!matchedStaff.permissions?.canApprove : false);
  const canReject = isManager || (matchedStaff ? !!matchedStaff.permissions?.canReject : false);

  // Assigned Event (if restricted to a specific event)
  const assignedEvent = matchedStaff?.assignedEventId && matchedStaff.assignedEventId !== 'all'
    ? events.find(e => e.id === matchedStaff.assignedEventId)
    : null;

  // Active staff member performing scan
  const activeStaffName = `${user.name} (${matchedStaff?.designation || (isManager ? 'Event Manager' : 'Authorized Gate Staff')})`;

  // Checked in guests
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

    // Check Event-Specific Gate Access: if staff is assigned to a specific event
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

    // Determine specific token information for multi-token support
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

    // Add audit log record
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

    // Check if this specific token was already used
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


  // Real-time camera & jsQR frame decoder
  useEffect(() => {
    let isMounted = true;
    let animId: number;

    const startCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && videoRef.current) {
        try {
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

      // Fast frame scanning canvas
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

  // Perform Check-In (Party Entry)
  const handleCheckIn = (g: GuestRegistration, tokenCode?: string) => {
    const checkInTimestamp = getFormattedTimestamp();
    const eventName = events.find(e => e.id === g.eventId)?.name || 'Event';
    const targetCode = tokenCode || scanResult?.scannedTokenCode || g.token;
    
    const checkinRes = checkInSingleToken(g.id, targetCode, activeStaffName);
    
    // Add checkedin entry to scan log
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

    // Fire Confetti
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


  // If user is a regular attendee/guest without scanner authorization
  if (!isAuthorizedScanner) {
    return (
      <div className="animate-fade" style={{ maxWidth: 620, margin: '2rem auto', textAlign: 'center' }}>
        <div 
          className="glass-panel" 
          style={{ 
            padding: '2.5rem 1.75rem', 
            background: '#FFFFFF', 
            border: '2px solid #E2E8F0', 
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          }}
        >
          <div 
            style={{ 
              width: 72, 
              height: 72, 
              borderRadius: '50%', 
              background: '#FEF2F2', 
              border: '2.5px solid #FCA5A5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.25rem',
              color: '#DC2626'
            }}
          >
            <Lock size={34} />
          </div>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FEF2F2', color: '#B91C1C', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.75rem', border: '1px solid #FECACA' }}>
            <ShieldAlert size={14} /> SCANNER ACCESS RESTRICTED
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem 0' }}>
            Gate Scanner Permission Required
          </h2>

          <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 1.5rem', fontWeight: 500 }}>
            Only staff members, security crew, and event directors who have been granted scanner access can scan and admit attendees.
          </p>

          <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#334155', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Your Current Account:</div>
            <div>👤 <strong>{user.name}</strong> ({user.email || user.mobile})</div>
            <div style={{ color: '#64748B', fontSize: '0.78rem', marginTop: '0.35rem' }}>
              * If you are a volunteer or gate staff member, please ask the Event Manager to grant scanner access to your email (<strong>{user.email}</strong>) in the Staff Access section.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('guest_home')}
              style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Ticket size={16} /> View My Passes & Invites
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('dashboard')}
              style={{ fontWeight: 700 }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Active Scanner Permission Info Badge */}
      <div 
        style={{ 
          background: '#EFF6FF', 
          border: '1.5px solid #BFDBFE', 
          borderRadius: 'var(--radius-lg)', 
          padding: '0.75rem 1rem', 
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="#2563EB" />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E40AF' }}>
            Authorized Scanner: {activeStaffName}
          </span>
        </div>
        <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#1D4ED8', background: '#DBEAFE', padding: '0.2rem 0.65rem', borderRadius: '999px' }}>
          {assignedEvent ? `🎯 Gate Assigned: ${assignedEvent.name}` : '🌐 All Active Events'}
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ textAlign: 'center', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <QrCode size={26} color="var(--accent-primary)" /> Live Gate QR Scanner
        </h1>
        <p>Hold attendee VIP QR Pass in front of camera to automatically scan, verify details, and admit guest.</p>
      </div>

      {/* Live Camera Viewport */}
      <div 
        className="scanner-viewport-box" 
        style={{ 
          border: '2.5px solid rgba(56, 189, 248, 0.6)', 
          borderRadius: 'var(--radius-xl)', 
          position: 'relative', 
          overflow: 'hidden', 
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          background: '#0F172A'
        }}
      >
        <video ref={videoRef} className="scanner-video" autoPlay playsInline muted />
        <div className="scanner-target-frame" style={{ borderColor: 'rgba(56, 189, 248, 0.85)', width: 220, height: 220 }} />
        <div className="scanner-laser" style={{ background: '#38BDF8', boxShadow: '0 0 16px #38BDF8' }} />

        {/* Viewport Top Indicator */}
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', gap: 5, zIndex: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
          Live Camera QR Active
        </div>
      </div>

      {/* Recent Checked-In Attendees (With Photo, Date & Time) */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.5rem', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={20} color="#10B981" />
            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800, color: '#0F172A' }}>Recent Admitted Check-Ins</h3>
          </div>
          <span style={{ fontSize: '0.775rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '999px', background: '#D1FAE5', color: '#047857' }}>
            {checkedInGuests.length} Admitted
          </span>
        </div>

        {checkedInGuests.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: '#64748B', textAlign: 'center', padding: '1.5rem 0', fontWeight: 600 }}>
            No attendees checked in yet. Scanned passes will appear here with entry timestamps.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {checkedInGuests.map(g => (
              <div 
                key={g.id}
                style={{ 
                  background: '#F8FAFC', 
                  padding: '0.85rem 1rem', 
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img 
                    src={g.avatar} 
                    alt={g.name} 
                    style={{ width: 110, height: 110, minWidth: 110, borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '3px solid #FFFFFF', boxShadow: '0 4px 14px rgba(0,0,0,0.14)' }} 
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>{g.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 600 }}>{g.college || 'Attendee'} {g.branch ? `• ${g.branch}` : ''}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>Roll: <strong style={{ color: '#0F172A' }}>{g.rollNo || 'N/A'}</strong></div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                    <Clock size={13} /> {g.checkInTime}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#F1F5F9', color: '#475569', display: 'inline-block', marginTop: 4, border: '1px solid #CBD5E1' }}>
                    PASS EXPIRED (1-TIME ENTRY)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Result Modal */}
      {scanResult && (
        <div className="modal-overlay active" onClick={() => setScanResult(null)}>
          <div className="modal-content animate-fade" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, background: '#FFFFFF', borderRadius: 'var(--radius-xl)', overflowY: 'auto', maxHeight: '88vh', padding: 0 }}>
            {/* 1. VERIFIED & APPROVED GUEST (Ready to check-in to party) */}
            {scanResult.type === 'verified' && scanResult.guest && (
              <div style={{ padding: '1.5rem 1.35rem', textAlign: 'center' }}>
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#10B981', color: '#FFFFFF', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)' }}>
                  ✓
                </div>
                <span className="badge badge-approved" style={{ fontSize: '0.875rem', padding: '0.35rem 0.9rem', fontWeight: 800 }}>
                  {scanResult.title}
                </span>

                {/* Attendee Photo & Details Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0', textAlign: 'left', background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                  <img 
                    src={scanResult.guest.avatar} 
                    style={{ width: 'clamp(120px, 32vw, 160px)', height: 'clamp(120px, 32vw, 160px)', borderRadius: 'var(--radius-xl)', objectFit: 'cover', border: '3.5px solid #FFFFFF', boxShadow: '0 6px 20px rgba(0,0,0,0.18)', flexShrink: 0 }} 
                    alt={scanResult.guest.name} 
                  />
                  <div style={{ flex: '1 1 170px', minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.15rem', color: '#0F172A', margin: '0 0 0.2rem', fontWeight: 800, wordBreak: 'break-word' }}>{scanResult.guest.name}</h3>
                    <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>{scanResult.guest.college || 'Campus Attendee'}</div>
                    <div style={{ fontSize: '0.775rem', color: '#64748B', fontWeight: 600, marginTop: 3 }}>
                      {scanResult.guest.branch && <span>{scanResult.guest.branch} • </span>}
                      Roll: <strong style={{ color: '#0F172A' }}>{scanResult.guest.rollNo || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '0.75rem 0.9rem', textAlign: 'left', fontSize: '0.8rem', marginBottom: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'grid', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Scan Timestamp:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{scanResult.scanTime}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Pass Status:</span>
                    <span style={{ color: '#047857', fontWeight: 800 }}>VALID (1-TIME ENTRY)</span>
                  </div>
                </div>

                {/* Primary Action: CHECK IN GUEST TO PARTY */}
                {canCheckIn ? (
                  <button 
                    className="btn btn-primary btn-block" 
                    style={{ 
                      fontSize: '0.98rem', 
                      padding: '0.85rem', 
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      borderColor: '#059669',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
                    }}
                    onClick={() => handleCheckIn(scanResult.guest!)}
                  >
                    <Ticket size={18} /> Check-In Guest / Party Entry
                  </button>
                ) : (
                  <div style={{ padding: '0.75rem', background: '#F1F5F9', borderRadius: 'var(--radius-md)', color: '#64748B', fontWeight: 700, fontSize: '0.85rem' }}>
                    🔒 View Pass Only (Check-in Permission Not Delegated)
                  </div>
                )}
              </div>
            )}

            {/* 2. ALREADY CHECKED IN / PASS EXPIRED (STRICT 1-TIME SINGLE ENTRY) */}
            {scanResult.type === 'already_checkedin' && scanResult.guest && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1.15rem' }}>
                <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#EF4444', color: '#FFFFFF', fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem', boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)' }}>
                  <AlertTriangle size={30} />
                </div>
                <h3 style={{ color: '#DC2626', marginBottom: '0.35rem', fontSize: '1.15rem', fontWeight: 800 }}>{scanResult.title}</h3>
                <p style={{ fontSize: '0.825rem', color: '#7F1D1D', marginBottom: '1rem', fontWeight: 600 }}>{scanResult.message}</p>

                <div className="glass-panel" style={{ padding: '0.95rem', textAlign: 'left', marginBottom: '1rem', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
                    <img src={scanResult.guest.avatar} style={{ width: 'clamp(68px, 20vw, 100px)', height: 'clamp(68px, 20vw, 100px)', borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '3px solid #FFFFFF', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }} alt={scanResult.guest.name} />
                    <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1E293B', wordBreak: 'break-word' }}>{scanResult.guest.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{scanResult.guest.college || 'Attendee'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 800 }}>
                    First Admitted: {scanResult.guest.checkInTime}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#B91C1C', marginTop: 2, fontWeight: 600 }}>
                    Duplicate Scan Attempted: {scanResult.scanTime}
                  </div>
                </div>

                <button 
                  className="btn btn-secondary btn-block" 
                  onClick={() => setScanResult(null)}
                  style={{ fontWeight: 800, padding: '0.75rem' }}
                >
                  Close / Scan Next Attendee
                </button>
              </div>
            )}

            {/* 3. PENDING / INVITED / REJECTED / INVALID */}
            {['pending', 'invited', 'rejected', 'invalid'].includes(scanResult.type) && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1.15rem' }}>
                <div style={{ width: 58, height: 58, borderRadius: '50%', background: scanResult.type === 'invalid' || scanResult.type === 'rejected' ? '#EF4444' : '#F59E0B', color: '#FFFFFF', fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                  {scanResult.type === 'invalid' || scanResult.type === 'rejected' ? <XCircle size={30} /> : <AlertTriangle size={30} />}
                </div>
                <h3 style={{ color: '#0F172A', marginBottom: '0.35rem', fontWeight: 800, fontSize: '1.15rem' }}>{scanResult.title}</h3>
                <p style={{ fontSize: '0.825rem', color: '#475569', marginBottom: '1rem', fontWeight: 600 }}>{scanResult.message}</p>
                <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginBottom: '1rem' }}>
                  Recorded at: {scanResult.scanTime}
                </div>

                {scanResult.type === 'pending' && scanResult.guest && canApprove && (
                  <button 
                    className="btn btn-primary btn-block" 
                    style={{ marginBottom: '0.5rem', fontWeight: 800, background: '#2563EB' }}
                    onClick={() => {
                      updateGuestStatus(scanResult.guest!.id, 'approved', activeStaffName);
                      showToast(`✓ Registration approved for ${scanResult.guest!.name}`, 'success');
                      setScanResult(null);
                    }}
                  >
                    <CheckCircle2 size={16} /> Approve Pass Registration
                  </button>
                )}

                <button 
                  className="btn btn-secondary btn-block" 
                  onClick={() => setScanResult(null)}
                  style={{ fontWeight: 800, padding: '0.75rem' }}
                >
                  Dismiss / Scan Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-in Success Modal */}
      {checkInSuccessGuest && (
        <div className="modal-overlay active" onClick={() => setCheckInSuccessGuest(null)}>
          <div className="modal-content animate-fade" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, background: '#FFFFFF', borderRadius: 'var(--radius-xl)', overflowY: 'auto', maxHeight: '88vh', padding: 0 }}>
            <div style={{ textAlign: 'center', padding: '1.75rem 1.25rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#10B981', color: '#FFFFFF', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}>
                ✓
              </div>
              <h2 style={{ fontSize: '1.3rem', color: '#0F172A', marginBottom: '0.25rem', fontWeight: 800 }}>CHECK-IN SUCCESSFUL</h2>
              {checkInSuccessGuest.totalTokens && checkInSuccessGuest.totalTokens > 1 ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.75rem', borderRadius: '999px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', display: 'inline-block' }}>
                  PASS #{checkInSuccessGuest.tokenIndex} OF {checkInSuccessGuest.totalTokens} USED • {checkInSuccessGuest.remainingTokens} REMAINING
                </span>
              ) : (
                <span style={{ fontSize: '0.725rem', fontWeight: 800, padding: '0.15rem 0.65rem', borderRadius: '999px', background: '#F1F5F9', color: '#334155', border: '1px solid #CBD5E1', display: 'inline-block' }}>
                  PASS HAS NOW EXPIRED (SINGLE ENTRY COMPLETE)
                </span>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0', background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-lg)', textAlign: 'left', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                <img src={checkInSuccessGuest.guest.avatar} alt={checkInSuccessGuest.guest.name} style={{ width: 'clamp(72px, 22vw, 110px)', height: 'clamp(72px, 22vw, 110px)', borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: '3px solid #FFFFFF', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.14)' }} />
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', wordBreak: 'break-word' }}>{checkInSuccessGuest.guest.name}</div>
                  <div style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 600 }}>{checkInSuccessGuest.guest.college || 'Attendee'}</div>
                  <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: 2 }}>{checkInSuccessGuest.guest.branch || ''}</div>
                  {checkInSuccessGuest.scannedTokenCode && (
                    <div style={{ fontSize: '0.75rem', color: '#2563EB', fontFamily: 'var(--font-mono)', fontWeight: 800, marginTop: 4 }}>
                      Token: {checkInSuccessGuest.scannedTokenCode}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#047857', fontSize: '0.825rem', marginBottom: '1.25rem', fontWeight: 700 }}>
                <Clock size={15} color="#10B981" />
                <span>Admitted to Party: <strong>{checkInSuccessGuest.time}</strong></span>
              </div>

              <button 
                className="btn btn-primary btn-block" 
                style={{ fontWeight: 800, padding: '0.8rem', fontSize: '0.95rem' }} 
                onClick={() => setCheckInSuccessGuest(null)}
              >
                Scan Next Attendee
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
