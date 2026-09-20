import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  Ticket, 
  FileText, 
  Bell, 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  LogOut, 
  User, 
  Mail, 
  ShieldCheck, 
  Phone 
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { 
    user, 
    logout, 
    navigate, 
    guests, 
    events, 
    openDigitalPass,
    profileSubpage, 
    setProfileSubpage 
  } = useApp();

  const userEmail = (user.email || '').toLowerCase().trim();
  const userMobile = (user.mobile || '').replace(/\D/g, '');
  const userName = (user.name || '').toLowerCase().trim();

  // Events created by the logged-in user
  const myCreatedEvents = events.filter(e => {
    const creatorEmail = (e.creatorEmail || '').toLowerCase().trim();
    const creatorMobile = (e.creatorMobile || '').replace(/\D/g, '');
    const organizer = (e.organizer || '').toLowerCase().trim();

    return (
      (creatorEmail && creatorEmail === userEmail) ||
      (creatorMobile && userMobile && creatorMobile === userMobile) ||
      (e.creatorId && e.creatorId === user.id) ||
      (organizer && userName && organizer === userName)
    );
  });

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
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  border: '3px solid #2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                  boxShadow: '0 6px 18px rgba(37, 99, 235, 0.2)'
                }}
              >
                <User size={46} strokeWidth={2.2} />
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
