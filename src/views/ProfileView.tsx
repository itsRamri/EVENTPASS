import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  Ticket, 
  FileText, 
  Bell, 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown,
  LogOut, 
  User, 
  Mail, 
  ShieldCheck, 
  Phone,
  Volume2,
  Smartphone,
  Camera,
  CheckCircle2,
  Trash2,
  RefreshCw,
  MessageCircle,
  ExternalLink,
  Lock,
  Search,
  Info,
  Sparkles,
  Check
} from 'lucide-react';

// Helper to get initials from user name or email
const getInitials = (name?: string, email?: string): string => {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    const clean = email.trim().split('@')[0];
    return clean.slice(0, 2).toUpperCase();
  }
  return 'EP';
};

export const ProfileView: React.FC = () => {
  const { 
    user, 
    updateUser,
    logout, 
    navigate, 
    guests, 
    events, 
    openDigitalPass,
    profileSubpage, 
    setProfileSubpage,
    addNotification
  } = useApp();

  const userEmail = (user.email || '').toLowerCase().trim();
  const userMobile = (user.mobile || '').replace(/\D/g, '');
  const userName = (user.name || '').toLowerCase().trim();

  // Local Settings State
  const [soundBeep, setSoundBeep] = useState(() => localStorage.getItem('ep_sound_beep') !== 'false');
  const [vibration, setVibration] = useState(() => localStorage.getItem('ep_vibration') !== 'false');
  const [highPerfCam, setHighPerfCam] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);

  // Support FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [faqSearch, setFaqSearch] = useState('');

  // Toggle helpers
  const handleToggleSound = () => {
    const next = !soundBeep;
    setSoundBeep(next);
    localStorage.setItem('ep_sound_beep', String(next));
  };

  const handleToggleVibration = () => {
    const next = !vibration;
    setVibration(next);
    localStorage.setItem('ep_vibration', String(next));
  };

  // Events joined / registered by the logged-in user
  const myRegistrations = guests.filter(g => {
    if (g.status === 'invited') return false;
    const gEmail = (g.email || '').toLowerCase().trim();
    const gMobile = (g.mobile || '').replace(/\D/g, '');
    const gName = (g.name || '').toLowerCase().trim();

    if (user.id && g.userId && g.userId === user.id) return true;
    if (userEmail && gEmail && gEmail === userEmail) return true;
    if (userMobile && gMobile && gMobile === userMobile) return true;
    if (userName && gName && gName === userName && gName !== 'pending guest submission') return true;
    return false;
  });

  // SUBPAGE 1: FULL PAGE MY TICKETS
  if (profileSubpage === 'my_tickets') {
    return (
      <div className="animate-fade" style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '0.5rem 1rem 5rem' }}>
        {myRegistrations.length === 0 ? (
          <div 
            style={{ 
              textAlign: 'center', 
              padding: '3rem 1.5rem', 
              background: '#FFFFFF', 
              borderRadius: 24, 
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#2563EB' }}>
              <Ticket size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
              No Tickets Found
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: 360, margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              You haven't registered or RSVP'd for any event tickets yet. Explore upcoming active events!
            </p>
            <button
              type="button"
              onClick={() => {
                setProfileSubpage(null);
                navigate('guest_home');
              }}
              style={{
                background: 'var(--accent-gradient)',
                color: '#FFF',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: 999,
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              Explore Active Events
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {myRegistrations.map((reg) => {
              const evt = events.find(e => e.id === reg.eventId);
              const coverPhoto = evt?.coverImage && evt.coverImage.trim() !== ''
                ? evt.coverImage 
                : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80';

              return (
                <div 
                  key={reg.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    border: '1.5px solid #E2E8F0',
                    padding: '1.25rem',
                    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div 
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 16,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#EFF6FF',
                        border: '1px solid #DBEAFE'
                      }}
                    >
                      <img 
                        src={coverPhoto} 
                        alt={evt?.name || 'Event Cover'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.25rem' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {evt?.name || 'Exclusive Event'}
                        </h4>
                        <span 
                          style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: 6,
                            textTransform: 'uppercase',
                            background: reg.status === 'approved' || reg.status === 'checkedin' ? '#DCFCE7' : '#FEF3C7',
                            color: reg.status === 'approved' || reg.status === 'checkedin' ? '#15803D' : '#92400E',
                            border: reg.status === 'approved' || reg.status === 'checkedin' ? '1px solid #BBF7D0' : '1px solid #FCD34D'
                          }}
                        >
                          {reg.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{evt?.date || 'Date TBD'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{evt?.venue || 'Venue TBD'}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDigitalPass(reg.id)}
                    style={{
                      background: 'var(--accent-gradient)',
                      color: '#FFF',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: 100,
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Ticket size={16} /> View Digital Pass
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // SUBPAGE 2: SETTINGS
  if (profileSubpage === 'settings') {
    return (
      <div className="animate-fade" style={{ maxWidth: 540, margin: '0 auto', width: '100%', padding: '0 0.75rem 5rem' }}>
        {/* Scanner & Audio Preferences Card */}
        <div 
          style={{ 
            background: '#FFFFFF',
            borderRadius: 24,
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)',
            padding: '1.5rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={iconBoxStyle}>
              <Camera size={18} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Scanner & Gate Feedback</h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Customize sound, haptics & camera behavior</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Sound Toggle */}
            <div style={toggleRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Volume2 size={18} color={soundBeep ? '#2563EB' : '#94A3B8'} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Scan Beep Sound</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Play audio chime upon successful pass check-in</div>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={soundBeep} 
                onChange={handleToggleSound}
                style={switchStyle}
              />
            </div>

            {/* Vibration Toggle */}
            <div style={toggleRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Smartphone size={18} color={vibration ? '#2563EB' : '#94A3B8'} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Haptic Vibration</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Vibrate device when QR code is captured</div>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={vibration} 
                onChange={handleToggleVibration}
                style={switchStyle}
              />
            </div>

            {/* High Performance Mode */}
            <div style={toggleRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Camera size={18} color={highPerfCam ? '#2563EB' : '#94A3B8'} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>High-FPS Camera Scanner</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Optimized scanning for fast gate admissions</div>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={highPerfCam} 
                onChange={() => setHighPerfCam(!highPerfCam)}
                style={switchStyle}
              />
            </div>
          </div>
        </div>

        {/* Notifications & Offline Preferences Card */}
        <div 
          style={{ 
            background: '#FFFFFF',
            borderRadius: 24,
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)',
            padding: '1.5rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={iconBoxStyle}>
              <Bell size={18} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Alerts & Offline Sync</h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Manage notification channels and local caching</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={toggleRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Bell size={18} color={pushNotifs ? '#2563EB' : '#94A3B8'} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Push Notifications</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Receive instant approval & event updates</div>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={pushNotifs} 
                onChange={() => setPushNotifs(!pushNotifs)}
                style={switchStyle}
              />
            </div>

            <div style={toggleRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Mail size={18} color={emailAlerts ? '#2563EB' : '#94A3B8'} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Email Check-in Receipts</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Get digital pass confirmations via email</div>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={emailAlerts} 
                onChange={() => setEmailAlerts(!emailAlerts)}
                style={switchStyle}
              />
            </div>

            <div style={toggleRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <RefreshCw size={18} color={offlineSync ? '#2563EB' : '#94A3B8'} />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Background Cloud Sync</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Automatically sync check-ins when reconnected</div>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={offlineSync} 
                onChange={() => setOfflineSync(!offlineSync)}
                style={switchStyle}
              />
            </div>
          </div>
        </div>

        {/* Storage & System Info */}
        <div 
          style={{ 
            background: '#FFFFFF',
            borderRadius: 24,
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)',
            padding: '1.5rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={iconBoxStyle}>
              <Info size={18} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Storage & System Info</h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>EventPass Client Build & Memory Status</p>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '0.9rem', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
              <span>Application Version:</span>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>v2.4.0 (Latest Release)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
              <span>Cloud Connectivity:</span>
              <span style={{ fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                Connected
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
              <span>Security Token Mode:</span>
              <span style={{ fontWeight: 700, color: '#2563EB' }}>Anti-Duplication Guard Active</span>
            </div>
          </div>
        </div>

        {/* Back to Profile Button */}
        <button
          type="button"
          onClick={() => setProfileSubpage(null)}
          style={{
            background: '#F1F5F9',
            color: '#334155',
            border: '1px solid #CBD5E1',
            borderRadius: 12,
            padding: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            width: '100%',
            cursor: 'pointer'
          }}
        >
          ← Back to Profile Overview
        </button>
      </div>
    );
  }

  // SUBPAGE 3: HELP & SUPPORT
  if (profileSubpage === 'support') {
    const faqs = [
      {
        q: 'How do I scan attendee QR passes at the entrance?',
        a: 'Open the "Gate QR Scanner" tab from the bottom navigation or quick menu. Point your device camera directly at the attendee\'s QR code. The app instantly verifies their credentials, displays their portrait photo and party name, and presents the "Check In Guest" button for single-tap admission.'
      },
      {
        q: 'What happens if a QR code is scanned more than once?',
        a: 'EventPass has built-in double-entry prevention. If an already checked-in QR pass is scanned again, the scanner immediately triggers an alert: "Aapka QR Expire Ho Chuka Hai ⚠️", displaying the original check-in timestamp and gate name to prevent unauthorized re-entry.'
      },
      {
        q: 'How can attendees view and download their Digital Pass?',
        a: 'From the Profile screen, tap "My Passes & Tickets". Select any registered or approved event to open the high-definition Digital Pass. Guests can view their unique Token No., Pass ID, and live QR code anytime.'
      },
      {
        q: 'Can gate scanning function offline in poor connectivity?',
        a: 'Yes! EventPass automatically caches approved attendee lists locally on your device. Scans performed offline are securely queued and synced to the cloud as soon as internet connection is re-established.'
      },
      {
        q: 'How do event organizers approve guest registrations?',
        a: 'Event organizers can visit the "Guests & Approvals" section to review registration requests, verify submitted details, and grant access tokens with custom quotas.'
      },
      {
        q: 'How do I add security staff and scanner volunteers?',
        a: 'Navigate to "Staff Access" in the navigation drawer. You can create dedicated staff credentials with limited gate-scanning permissions.'
      }
    ];

    const filteredFaqs = faqs.filter(
      f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase())
    );

    return (
      <div className="animate-fade" style={{ maxWidth: 580, margin: '0 auto', width: '100%', padding: '0 0.75rem 5rem' }}>
        {/* Support Hero Banner */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)',
            borderRadius: 24,
            padding: '1.75rem 1.5rem',
            color: '#FFFFFF',
            boxShadow: '0 10px 30px rgba(37, 99, 235, 0.25)',
            marginBottom: '1.25rem',
            textAlign: 'center'
          }}
        >
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', backdropFilter: 'blur(8px)' }}>
            <HelpCircle size={28} color="#FFFFFF" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.01em' }}>
            How can we help you?
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#DBEAFE', margin: 0, maxWidth: 360, marginInline: 'auto' }}>
            Find answers to common questions or reach out to our dedicated support email.
          </p>
        </div>

        {/* Contact Support Channel - Email Only */}
        <a
          href="mailto:rsk149652@gmail.com?subject=EventPass%20Support%20Request"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #BFDBFE',
            borderRadius: 18,
            padding: '1.15rem 1.25rem',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.08)',
            transition: 'all 0.2s ease',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563EB' }}>
            <Mail size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>Email Support</span>
            <span style={{ fontSize: '0.82rem', color: '#2563EB', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>rsk149652@gmail.com</span>
          </div>
        </a>

        {/* Search FAQs */}
        <div style={{ ...inputWrapStyle, marginBottom: '1.25rem', background: '#FFFFFF', border: '1.5px solid #E2E8F0' }}>
          <Search size={18} color="#94A3B8" />
          <input 
            type="text" 
            value={faqSearch} 
            onChange={e => setFaqSearch(e.target.value)}
            placeholder="Search FAQs & helpful guides..."
            style={inputInnerStyle}
          />
        </div>

        {/* FAQs Accordion Section */}
        <div 
          style={{ 
            background: '#FFFFFF',
            borderRadius: 24,
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)',
            padding: '1.5rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={iconBoxStyle}>
              <HelpCircle size={18} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Frequently Asked Questions</h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>Instant solutions & guidance</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  style={{
                    border: '1px solid',
                    borderColor: isOpen ? '#BFDBFE' : '#F1F5F9',
                    borderRadius: 14,
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    background: isOpen ? '#F8FAFC' : '#FFFFFF'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1rem',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isOpen ? '#2563EB' : '#0F172A' }}>
                      {faq.q}
                    </span>
                    <ChevronDown 
                      size={18} 
                      color={isOpen ? '#2563EB' : '#94A3B8'} 
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0 }} 
                    />
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 1rem 0.9rem', fontSize: '0.825rem', color: '#475569', lineHeight: 1.55 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Tips Box */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1.5px solid #A7F3D0',
            borderRadius: 20,
            padding: '1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem'
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#065F46', margin: '0 0 0.25rem' }}>Gate Scanner Pro Tip</h4>
            <p style={{ fontSize: '0.8rem', color: '#047857', margin: 0, lineHeight: 1.5 }}>
              Hold your camera 15-20 cm away from the attendee's phone screen. EventPass automatically compensates for low light and screen reflections.
            </p>
          </div>
        </div>

        {/* Back Button */}
        <button
          type="button"
          onClick={() => setProfileSubpage(null)}
          style={{
            background: '#F1F5F9',
            color: '#334155',
            border: '1px solid #CBD5E1',
            borderRadius: 12,
            padding: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            width: '100%',
            cursor: 'pointer'
          }}
        >
          ← Back to Profile Overview
        </button>
      </div>
    );
  }

  // DEFAULT VIEW: MAIN PROFILE CARD
  return (
    <div className="animate-fade" style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '0 0.5rem 5rem' }}>
      <div 
        style={{ 
          background: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          border: '1.5px solid #E2E8F0',
          overflow: 'hidden',
          padding: '1.5rem 1.25rem 1rem'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Profile
          </h1>
          <button 
            type="button"
            onClick={() => setProfileSubpage('settings')}
            aria-label="Profile Settings"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '50%',
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <Settings size={19} />
          </button>
        </div>

        {/* User Identity Display */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.75rem' }}>
          <div 
            style={{ 
              position: 'relative', 
              width: 88, 
              height: 88, 
              marginBottom: '0.85rem' 
            }}
          >
            {user.avatar && !user.avatar.includes('unsplash.com') ? (
              <img 
                src={user.avatar} 
                alt={user.name || 'User'} 
                style={{
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: '3px solid #2563EB',
                  boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)'
                }}
              />
            ) : (
              <div 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)',
                  border: '3px solid #2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '1.85rem',
                  letterSpacing: '1px',
                  boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)',
                  textTransform: 'uppercase'
                }}
              >
                {getInitials(user.name, user.email)}
              </div>
            )}
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem', letterSpacing: '-0.01em' }}>
            {user.name || user.email.split('@')[0] || 'User Profile'}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>
              <Mail size={14} color="#2563EB" />
              <span>{user.email || 'No email registered'}</span>
            </div>

            {user.mobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.875rem', fontWeight: 500 }}>
                <Phone size={14} color="#2563EB" />
                <span>{user.mobile}</span>
              </div>
            )}

            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              background: '#EFF6FF', 
              color: '#2563EB', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              padding: '0.2rem 0.65rem', 
              borderRadius: 999, 
              marginTop: '0.35rem',
              border: '1px solid #DBEAFE',
              textTransform: 'capitalize'
            }}>
              <ShieldCheck size={13} color="#2563EB" />
              <span>{user.role === 'manager' ? 'Event Organizer / Manager' : user.role === 'scanner' ? 'Gate Staff Scanner' : 'Attendee / Guest'}</span>
            </div>
          </div>
        </div>

        {/* Action Menu List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {/* 1. My Passes */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => setProfileSubpage('my_tickets')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <Ticket size={19} color="#2563EB" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                My Passes & Tickets
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>

          {/* 2. Notifications */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => navigate('notifications')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <Bell size={19} color="#2563EB" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                Notifications
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>

          {/* 3. Settings */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => setProfileSubpage('settings')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <Settings size={19} color="#2563EB" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                Account Settings
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>

          {/* 4. Help & Support */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => setProfileSubpage('support')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <HelpCircle size={19} color="#2563EB" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                Help & Support
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>
        </div>

        {/* Log Out Option at Bottom */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
          <button
            type="button"
            onClick={logout}
            style={{
              background: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FECACA',
              borderRadius: 12,
              padding: '0.65rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} /> Log Out of Account
          </button>
        </div>
      </div>
    </div>
  );
};

// Reusable styling helpers
const menuRowStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.85rem 0.75rem',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid #F8FAFC',
  borderRadius: 10,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textAlign: 'left'
};

const iconBoxStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: '#EFF6FF',
  border: '1px solid #DBEAFE',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};

const inputWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  padding: '0.65rem 0.85rem',
  background: '#F8FAFC',
  border: '1.5px solid #E2E8F0',
  borderRadius: 12,
  transition: 'all 0.2s ease'
};

const inputInnerStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  outline: 'none',
  width: '100%',
  fontSize: '0.875rem',
  color: '#0F172A',
  fontWeight: 600
};

const toggleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 0.85rem',
  background: '#F8FAFC',
  borderRadius: 12,
  border: '1px solid #F1F5F9'
};

const switchStyle: React.CSSProperties = {
  width: '38px',
  height: '20px',
  accentColor: '#2563EB',
  cursor: 'pointer'
};

