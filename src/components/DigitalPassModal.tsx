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
                <Sparkles size={18} color="#818CF8" />
                EVENTPASS
              </div>
              <span className="badge badge-role" style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem' }}>VIP PASS</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge badge-${guest.status}`}>
                {guest.status.toUpperCase()}
              </span>
              <button 
                type="button" 
                onClick={closeDigitalPass}
                style={{ background: 'rgba(255, 255, 255, 0.15)', border: 'none', color: '#FFFFFF', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Pass Body */}
          <div className="pass-body" style={{ padding: '1.25rem 1rem' }}>
            {/* Guest Profile Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.85rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap' }}>
              <img 
                src={guest.avatar} 
                className="pass-guest-img" 
                style={{ width: 'clamp(92px, 26vw, 125px)', height: 'clamp(92px, 26vw, 125px)', borderRadius: 'var(--radius-xl)', objectFit: 'cover', border: '3.5px solid #38BDF8', boxShadow: '0 6px 20px rgba(56, 189, 248, 0.4)', flexShrink: 0 }}
                alt={guest.name} 
              />
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: '0 0 0.2rem', fontWeight: 800, wordBreak: 'break-word' }}>
                  {guest.name}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <GraduationCap size={14} color="#818CF8" />
                  <span>{guest.college || 'Attendee'}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2, display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {guest.branch && <span>{guest.branch}</span>}
                  {guest.rollNo && <span>• Roll: <strong style={{ color: '#F8FAFC' }}>{guest.rollNo}</strong></span>}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: 3, display: 'flex', gap: '0.4rem', flexWrap: 'wrap', wordBreak: 'break-all' }}>
                  {guest.email && <span>✉️ {guest.email}</span>}
                  {guest.mobile && <span>• 📱 {guest.mobile}</span>}
                </div>
              </div>
            </div>

            {/* Event Details Section */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'grid', gap: '0.45rem', fontSize: '0.8rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>EVENT NAME</div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#FFFFFF', marginTop: 1, wordBreak: 'break-word' }}>{event.name}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginTop: 2, borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '0.45rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Calendar size={12} color="#38BDF8" /> DATE & TIME
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8FAFC', marginTop: 2 }}>
                    {event.date} • {event.startTime}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={12} color="#38BDF8" /> VENUE
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8FAFC', marginTop: 2, wordBreak: 'break-word' }}>
                    {event.venue}
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Token Allocation Switcher (e.g. 15 Tokens) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-lg)', padding: '0.85rem', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Ticket size={16} color="#38BDF8" />
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#FFFFFF' }}>
                    Allocated Passes: <strong style={{ color: '#38BDF8' }}>{totalTokens} Tokens</strong>
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: remainingCount > 0 ? '#10B981' : '#EF4444' }}>
                  {remainingCount} Available • {usedCount} Used
                </div>
              </div>

              {/* Token Pills (Select Token 1..15) */}
              {totalTokens > 1 && (
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
                          border: isSelected ? '1.5px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.15)',
                          background: isSelected ? 'rgba(56, 189, 248, 0.25)' : isUsed ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: isSelected ? '#38BDF8' : isUsed ? '#FCA5A5' : '#E2E8F0',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isUsed ? `✕ #${t.index || idx + 1}` : `Pass #${t.index || idx + 1}`}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Current Active Token Info & Prev/Next */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 0, 0, 0.3)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <button
                  type="button"
                  disabled={safeIdx <= 0}
                  onClick={() => setSelectedTokenIdx(prev => Math.max(0, prev - 1))}
                  style={{ background: 'transparent', border: 'none', color: safeIdx <= 0 ? 'rgba(255,255,255,0.2)' : '#FFFFFF', cursor: safeIdx <= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronLeft size={18} />
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                    {currentTokenItem?.tokenCode}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: currentTokenItem?.status === 'used' ? '#EF4444' : '#10B981', fontWeight: 700 }}>
                    {currentTokenItem?.status === 'used' ? `✕ Admitted (${currentTokenItem.checkInTime || 'Used'})` : `✓ Active Entry Pass (${safeIdx + 1} of ${totalTokens})`}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={safeIdx >= totalTokens - 1}
                  onClick={() => setSelectedTokenIdx(prev => Math.min(totalTokens - 1, prev + 1))}
                  style={{ background: 'transparent', border: 'none', color: safeIdx >= totalTokens - 1 ? 'rgba(255,255,255,0.2)' : '#FFFFFF', cursor: safeIdx >= totalTokens - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Large QR Code for Selected Token */}
            <div className="pass-qr-box" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: 'var(--radius-lg)', margin: '0 0 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              <QRCodeSVG value={currentTokenItem?.tokenCode || guest.token || guest.passId} size={190} />
            </div>

            {currentTokenItem?.status === 'used' ? (
              <div style={{ textAlign: 'center', color: '#EF4444', fontSize: '0.825rem', fontWeight: 800, margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'rgba(239, 68, 68, 0.15)', padding: '0.45rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <AlertCircle size={15} /> Pass #{currentTokenItem.index || safeIdx + 1} Already Checked In at {currentTokenItem.checkInTime || 'Earlier'}
              </div>
            ) : (
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                Present this QR code at the event gate to check in.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
