import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { QRCodeSVG } from '../utils/qr';
import { 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Clock, 
  GraduationCap, 
  Ticket, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check,
  AlertCircle
} from 'lucide-react';

export const DigitalPassModal: React.FC = () => {
  const { activePassGuestId, closeDigitalPass, guests, events, showToast } = useApp();
  const [selectedTokenIdx, setSelectedTokenIdx] = useState(0);
  const [copiedToken, setCopiedToken] = useState(false);

  if (!activePassGuestId) return null;

  const guest = guests.find(g => g.id === activePassGuestId);
  if (!guest) return null;

  const event = events.find(e => e.id === guest.eventId) || {
    name: 'Campus Event',
    date: '2026-09-28',
    startTime: '18:00',
    endTime: '21:00',
    venue: 'Main Auditorium',
    location: 'Campus Ground',
    tokenSettings: { prefix: 'EP-PASS' }
  };

  // Multiple Tokens Support (e.g. 15 tokens per user)
  const tokensList = guest.tokenList && guest.tokenList.length > 0
    ? guest.tokenList
    : (guest.tokens && guest.tokens.length > 0
        ? guest.tokens.map((t, idx) => ({
            tokenCode: t,
            index: idx + 1,
            status: (guest.status === 'checkedin' ? 'used' : 'valid') as 'valid' | 'used',
            checkInTime: guest.checkInTime,
            scannedBy: guest.scannedBy
          }))
        : [{
            tokenCode: guest.token || `${event.tokenSettings?.prefix || 'EP-PASS'}-1001`,
            index: 1,
            status: (guest.status === 'checkedin' ? 'used' : 'valid') as 'valid' | 'used',
            checkInTime: guest.checkInTime,
            scannedBy: guest.scannedBy
          }]);

  const totalTokens = tokensList.length;
  const safeIdx = Math.min(selectedTokenIdx, totalTokens - 1);
  const currentTokenItem = tokensList[safeIdx] || tokensList[0];
  const usedCount = tokensList.filter(t => t.status === 'used').length;
  const remainingCount = totalTokens - usedCount;

  // Extract extra answers filled by guest (excluding standard keys)
  const standardKeys = ['Full Name', 'Email Address', 'Mobile Number', 'College / Institute', 'Department / Branch', 'Student Roll Number', 'ID Proof', 'capturedAvatar'];
  const extraAnswers = guest.answers 
    ? Object.entries(guest.answers).filter(([key, val]) => !standardKeys.includes(key) && typeof val === 'string' && val.trim().length > 0 && !val.includes('Attached'))
    : [];

  const handleCopyCurrentToken = () => {
    if (!currentTokenItem?.tokenCode) return;
    navigator.clipboard.writeText(currentTokenItem.tokenCode);
    setCopiedToken(true);
    showToast(`✓ Copied Token: ${currentTokenItem.tokenCode}`, 'success');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="modal-overlay active" onClick={closeDigitalPass}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '92%', background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}>
        <div className="digital-pass-card" style={{ maxWidth: 480 }}>
          {/* Pass Header */}
          <div className="pass-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#FFFFFF' }}>
                <Sparkles size={18} color="#93C5FD" />
                DIGITAL EVENT PASS
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 800, 
                padding: '0.2rem 0.6rem', 
                borderRadius: '999px',
                background: guest.status === 'approved' ? '#DCFCE7' : guest.status === 'checkedin' ? '#DBEAFE' : '#FEF3C7',
                color: guest.status === 'approved' ? '#15803D' : guest.status === 'checkedin' ? '#1D4ED8' : '#B45309',
                border: '1px solid rgba(255, 255, 255, 0.4)'
              }}>
                {guest.status.toUpperCase()}
              </span>
              <button 
                type="button" 
                onClick={closeDigitalPass}
                style={{ background: 'rgba(255, 255, 255, 0.25)', border: 'none', color: '#FFFFFF', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Pass Body (QR Scanner & Event Info Only) */}
          <div className="pass-body" style={{ padding: '1.25rem 1rem', background: '#FFFFFF' }}>
            {/* Event Header Banner */}
            <div style={{ background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid #E2E8F0', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>EVENT</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', marginTop: 1, wordBreak: 'break-word' }}>{event.name}</div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginTop: '0.5rem', borderTop: '1px dashed #E2E8F0', paddingTop: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Calendar size={12} color="#2563EB" /> DATE & TIME
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {event.date} • {event.startTime}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={12} color="#2563EB" /> VENUE
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: 2, wordBreak: 'break-word' }}>
                    {event.venue}
                  </div>
                </div>
              </div>
            </div>

            {/* Large QR Code Scanner Box */}
            <div 
              className="pass-qr-box" 
              draggable={false}
              onDragStart={e => e.preventDefault()}
              onTouchMove={e => e.stopPropagation()}
              style={{ 
                padding: '1.5rem 1rem', 
                background: '#FFFFFF', 
                borderRadius: 'var(--radius-xl)', 
                margin: '0 0 1rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                border: '2px solid #E2E8F0', 
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none'
              }}
            >
              <QRCodeSVG value={currentTokenItem?.tokenCode || guest.token || guest.passId} size={220} />
              
              <div style={{ marginTop: '1rem', textAlign: 'center', userSelect: 'none', WebkitUserSelect: 'none' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  GATE SCAN TOKEN
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#2563EB', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', marginTop: 2, userSelect: 'text' }}>
                  {currentTokenItem?.tokenCode}
                </div>
              </div>
            </div>

            {/* Multi-Token Allocation Switcher (if > 1 token exists) */}
            {totalTokens > 1 && (
              <div style={{ background: '#F8FAFC', borderRadius: 'var(--radius-lg)', padding: '0.85rem', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Ticket size={16} color="#2563EB" />
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>
                      Passes: <strong style={{ color: '#2563EB' }}>{totalTokens} Tokens</strong>
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: remainingCount > 0 ? '#15803D' : '#DC2626' }}>
                    {remainingCount} Available • {usedCount} Used
                  </div>
                </div>

                {/* Token Pills (Select Token 1..N) */}
                <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.4rem', WebkitOverflowScrolling: 'touch', marginBottom: '0.65rem' }}>
                  {tokensList.map((t, idx) => {
                    const isSelected = safeIdx === idx;
                    const isUsed = t.status === 'used';
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedTokenIdx(idx)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                          background: isSelected ? '#2563EB' : isUsed ? '#FEE2E2' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : isUsed ? '#DC2626' : '#475569',
                          boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isUsed ? `✕ #${t.index || idx + 1}` : `Pass #${t.index || idx + 1}`}
                      </button>
                    );
                  })}
                </div>

                {/* Prev/Next Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0' }}>
                  <button
                    type="button"
                    disabled={safeIdx <= 0}
                    onClick={() => setSelectedTokenIdx(prev => Math.max(0, prev - 1))}
                    style={{ background: 'transparent', border: 'none', color: safeIdx <= 0 ? '#CBD5E1' : '#475569', cursor: safeIdx <= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', color: currentTokenItem?.status === 'used' ? '#DC2626' : '#15803D', fontWeight: 800 }}>
                      {currentTokenItem?.status === 'used' ? `✕ Admitted (${currentTokenItem.checkInTime || 'Used'})` : `✓ Active Pass (${safeIdx + 1} of ${totalTokens})`}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={safeIdx >= totalTokens - 1}
                    onClick={() => setSelectedTokenIdx(prev => Math.min(totalTokens - 1, prev + 1))}
                    style={{ background: 'transparent', border: 'none', color: safeIdx >= totalTokens - 1 ? '#CBD5E1' : '#475569', cursor: safeIdx >= totalTokens - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {currentTokenItem?.status === 'used' ? (
              <div style={{ textAlign: 'center', color: '#DC2626', fontSize: '0.825rem', fontWeight: 800, margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: '#FEF2F2', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #FECACA' }}>
                <AlertCircle size={15} /> Pass #{currentTokenItem.index || safeIdx + 1} Already Checked In at {currentTokenItem.checkInTime || 'Earlier'}
              </div>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginTop: '0.25rem' }}>
                Present this QR code at the event gate to check in.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
