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
  Lock,
  Plus,
  MapPin,
  Clock,
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

  // Events created by the logged-in user
  const myCreatedEvents = events.filter(e => {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userMobile = (user.mobile || '').replace(/\D/g, '');
    const userName = (user.name || '').toLowerCase().trim();

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
  const myRegistrations = guests.filter(g => 
    (g.email && g.email.toLowerCase() === (user.email || '').toLowerCase()) || 
    (g.name && g.name.toLowerCase() === (user.name || '').toLowerCase() && g.name !== 'Pending Guest Submission') ||
    (g.mobile && g.mobile === user.mobile)
  );

  // ========================================================
  // SUBPAGE 1: FULL PAGE MY TICKETS
  // ========================================================
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
              border: '1px solid #E2E8F0',
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
                background: '#2563EB',
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
                    border: '1px solid #E2E8F0',
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
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <h4 
                          style={{ 
                            fontSize: '1.05rem', 
                            fontWeight: 800, 
                            color: '#0F172A', 
                            margin: 0,
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {evt?.name || 'VIP Event Pass'}
                        </h4>
                        <span 
                          style={{
                            fontSize: '0.675rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: 6,
                            textTransform: 'uppercase',
                            background: reg.status === 'approved' || reg.status === 'checkedin' ? '#DCFCE7' : '#FEF3C7',
                            color: reg.status === 'approved' || reg.status === 'checkedin' ? '#166534' : '#92400E',
                            flexShrink: 0
                          }}
                        >
                          {reg.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: '#64748B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} color="#2563EB" />
                          <span>{evt?.date ? evt.date : 'Upcoming Event'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={14} color="#2563EB" />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt?.venue || 'Main Auditorium'}</span>
                        </div>
                        {reg.token && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', marginTop: '0.15rem' }}>
                            Pass ID: {reg.token}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openDigitalPass(reg.id)}
                    style={{
                      background: '#2563EB',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.925rem',
                      borderRadius: 14,
                      padding: '0.75rem 1rem',
                      width: '100%',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem'
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

  // ========================================================
  // SUBPAGE 2: FULL PAGE REGISTRATION HISTORY
  // ========================================================
  if (profileSubpage === 'history') {
    return (
      <div className="animate-fade" style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '0.5rem 1rem 5rem' }}>
        {myRegistrations.length === 0 && myCreatedEvents.length === 0 ? (
          <div 
            style={{ 
              textAlign: 'center', 
              padding: '3rem 1.5rem', 
              background: '#FFFFFF', 
              borderRadius: 24, 
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#64748B' }}>
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
              No History Recorded
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
              All your event registrations, RSVPs, and created events will be chronologically tracked here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Joined Events Section */}
            {myRegistrations.length > 0 && (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Ticket size={18} color="#2563EB" /> Events Joined ({myRegistrations.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {myRegistrations.map(reg => {
                    const evt = events.find(e => e.id === reg.eventId);
                    return (
                      <div 
                        key={reg.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 18,
                          border: '1px solid #E2E8F0',
                          padding: '1.15rem',
                          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
                            {evt?.name || 'Party Pass'}
                          </div>
                          <span 
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: 6,
                              textTransform: 'uppercase',
                              background: reg.status === 'approved' || reg.status === 'checkedin' ? '#DCFCE7' : '#FEF3C7',
                              color: reg.status === 'approved' || reg.status === 'checkedin' ? '#166534' : '#92400E'
                            }}
                          >
                            {reg.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div>📅 {evt?.date || 'Date TBD'} • 📍 {evt?.venue || 'Campus Arena'}</div>
                          {reg.registrationDate && (
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                              Registered: {reg.registrationDate}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openDigitalPass(reg.id)}
                          style={{
                            background: '#F1F5F9',
                            color: '#0F172A',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            borderRadius: 10,
                            padding: '0.6rem',
                            border: '1px solid #E2E8F0',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          View Pass Details
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Created Events Section */}
            {myCreatedEvents.length > 0 && (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} color="#2563EB" /> Events Created ({myCreatedEvents.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                  {myCreatedEvents.map(evt => {
                    const guestCount = guests.filter(g => g.eventId === evt.id).length;
                    return (
                      <div 
                        key={evt.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 18,
                          border: '1px solid #E2E8F0',
                          padding: '1.15rem',
                          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
                            {evt.name}
                          </div>
                          <span 
                            style={{
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.5rem',
                              borderRadius: 6,
                              textTransform: 'uppercase',
                              background: evt.status === 'active' ? '#DCFCE7' : '#FEF3C7',
                              color: evt.status === 'active' ? '#166534' : '#92400E'
                            }}
                          >
                            {evt.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                          📅 {evt.date || 'Upcoming'} • 📍 {evt.venue || 'Venue'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 700, marginTop: '0.2rem' }}>
                          👥 {guestCount} Registered Attendees
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // SUBPAGE 3: FULL PAGE SETTINGS
  // ========================================================
  if (profileSubpage === 'settings') {
    return (
      <div className="animate-fade" style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '0.5rem 1rem 5rem' }}>
        <div 
          style={{ 
            background: '#FFFFFF', 
            borderRadius: 24, 
            border: '1px solid #E2E8F0', 
            padding: '1.75rem',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)'
          }}
        >
          {/* Security Notice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.85rem 1rem', borderRadius: 14, marginBottom: '1.5rem' }}>
            <Lock size={18} color="#2563EB" />
            <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 600 }}>
              Verified Official Account Details (Non-editable profile)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Full Name */}
            <div style={{ background: '#F8FAFC', padding: '1rem 1.15rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} color="#2563EB" /> Full Name
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                {user.name || user.email.split('@')[0] || 'Official User'}
              </div>
            </div>

            {/* Email Address */}
            <div style={{ background: '#F8FAFC', padding: '1rem 1.15rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} color="#2563EB" /> Email Address
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', wordBreak: 'break-all' }}>
                {user.email || 'No email attached'}
              </div>
            </div>

            {/* Mobile Contact */}
            <div style={{ background: '#F8FAFC', padding: '1rem 1.15rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={14} color="#2563EB" /> Mobile Number
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                {user.mobile || '+91 ••••• •••••'}
              </div>
            </div>

            {/* Account Role & Status */}
            <div style={{ background: '#F8FAFC', padding: '1rem 1.15rem', borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} color="#2563EB" /> Account Privileges
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', textTransform: 'capitalize' }}>
                {user.role} • Active Status
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // SUBPAGE 4: FULL PAGE MY CREATED EVENTS
  // ========================================================
  if (profileSubpage === 'my_events') {
    return (
      <div className="animate-fade" style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '0.5rem 1rem 5rem' }}>
        {myCreatedEvents.length === 0 ? (
          <div 
            style={{ 
              textAlign: 'center', 
              padding: '3rem 1.5rem', 
              background: '#FFFFFF', 
              borderRadius: 24, 
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#2563EB' }}>
              <Calendar size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
              No Created Events
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: 360, margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              You haven't organized or created any events yet under this account.
            </p>
            <button
              type="button"
              onClick={() => {
                setProfileSubpage(null);
                navigate('create_event');
              }}
              style={{
                background: '#2563EB',
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
              <Plus size={16} /> Create New Event
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {myCreatedEvents.map(evt => {
              const registeredCount = guests.filter(g => g.eventId === evt.id).length;
              return (
                <div 
                  key={evt.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 20,
                    border: '1px solid #E2E8F0',
                    padding: '1.25rem',
                    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.85rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {evt.name}
                      </h4>
                      <span 
                        style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                          background: evt.status === 'active' ? '#DCFCE7' : '#FEF3C7',
                          color: evt.status === 'active' ? '#166534' : '#92400E'
                        }}
                      >
                        {evt.status}
                      </span>
                    </div>

                    {evt.tagline && (
                      <div style={{ fontSize: '0.825rem', color: '#64748B', marginBottom: '0.5rem' }}>
                        {evt.tagline}
                      </div>
                    )}

                    <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={14} color="#2563EB" /> <span>{evt.date || 'Upcoming'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={14} color="#2563EB" /> <span>{evt.venue || 'Auditorium'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748B' }}>
                    <span>👥 <strong>{registeredCount}</strong> Guests</span>
                    <span style={{ fontWeight: 700, color: '#2563EB' }}>Prefix: {evt.tokenSettings?.prefix || 'EP-PASS'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // SUBPAGE 5: FULL PAGE HELP & SUPPORT
  // ========================================================
  if (profileSubpage === 'support') {
    return (
      <div className="animate-fade" style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '0.5rem 1rem 5rem' }}>
        <div 
          style={{ 
            background: '#FFFFFF', 
            borderRadius: 24, 
            border: '1px solid #E2E8F0', 
            padding: '1.75rem',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', marginBottom: '0.35rem' }}>
                🎫 How do I present my ticket at gate entry?
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                Open <strong>My Tickets</strong> in your profile to display your animated QR pass. The gate staff scanner will scan and admit your entry pass instantly.
              </div>
            </div>

            <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', marginBottom: '0.35rem' }}>
                📞 24/7 Organizer & Helpdesk Assistance
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                Email official support at <strong style={{ color: '#2563EB' }}>support@eventpass.live</strong> or call the 24/7 assistance desk at <strong>+91 98765 43210</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // DEFAULT VIEW: MAIN PROFILE CARD
  // ========================================================
  return (
    <div className="animate-fade" style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '0 0.5rem 5rem' }}>
      {/* Main Profile Card Shell */}
      <div 
        style={{ 
          background: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          border: '1px solid #F1F5F9',
          overflow: 'hidden',
          padding: '1.5rem 1.25rem 1rem'
        }}
      >
        {/* Header: Title & Settings Icon */}
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
            <div 
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '3px solid #38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                boxShadow: '0 6px 18px rgba(56, 189, 248, 0.25)'
              }}
            >
              <User size={46} strokeWidth={2.2} />
            </div>
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
          {/* 1. My Events */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => setProfileSubpage('my_events')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <Calendar size={19} color="#475569" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                My Events
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>

          {/* 2. My Tickets */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => setProfileSubpage('my_tickets')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <Ticket size={19} color="#475569" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                My Tickets
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>

          {/* 3. Registration History */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => setProfileSubpage('history')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <FileText size={19} color="#475569" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                Registration History
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>

          {/* 4. Notifications */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => navigate('notifications')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <Bell size={19} color="#475569" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                Notifications
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>

          {/* 5. Settings */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => setProfileSubpage('settings')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <Settings size={19} color="#475569" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1E293B' }}>
                Settings
              </span>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>

          {/* 6. Help & Support */}
          <button 
            type="button"
            className="profile-menu-row"
            onClick={() => setProfileSubpage('support')}
            style={menuRowStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div style={iconBoxStyle}>
                <HelpCircle size={19} color="#475569" />
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
              background: '#FFF1F2',
              color: '#E11D48',
              border: '1px solid #FECDD3',
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
  width: 32,
  height: 32,
  borderRadius: 8,
  background: '#F8FAFC',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
};
