import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Sliders, 
  Trash2, 
  Copy, 
  UserPlus, 
  QrCode, 
  Sparkles, 
  ShieldCheck, 
  User
} from 'lucide-react';
import { EventItem } from '../types';


export const ManagerDashboard: React.FC = () => {
  const { 
    user, 
    events, 
    guests, 
    staff,
    saveStaff,
    deleteStaff,
    navigate, 
    setSelectedEventId, 
    deleteEvent, 
    setEditingEvent, 
    showToast 
  } = useApp();

  const totalGuests = guests.length;
  const checkedInCount = guests.filter(g => g.status === 'checkedin').length;
  const pendingCount = guests.filter(g => g.status === 'pending' || g.status === 'invited').length;
  const approvedCount = guests.filter(g => g.status === 'approved').length;
  const activeEventsCount = events.filter(e => e.status === 'active').length;
  const checkInPercent = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;
  const approvedStaff = staff.filter(s => s.status === 'active');


  // Active events list
  const activeEvents = events.filter(e => e.status === 'active');

  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handleCopyLink = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `https://eventpass.io/register?eventId=${eventId}`;
    navigator.clipboard.writeText(link);
    showToast('Registration link copied to clipboard!', 'success');
  };

  const handleCopyEventId = (eventId: string, eventName: string) => {
    navigator.clipboard.writeText(eventId);
    showToast(`Event ID copied: ${eventId} (Share with guests to join!)`, 'success');
  };

  const handleEditEvent = (evt: EventItem) => {
    setEditingEvent(evt);
    navigate('create_event');
  };

  const handleDeleteEvent = (eventId: string, eventName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${eventName}"? All registrations for this event will also be removed.`)) {
      deleteEvent(eventId);
    }
  };

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (checkInPercent / 100) * circumference;

  return (
    <div className="animate-fade">
      {/* Top Welcome Header - Native App-like Executive Card */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1.5rem', 
          marginBottom: '1.5rem', 
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem' }}>
          {/* User Info & Dynamic Greeting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div 
                style={{ 
                  width: 'clamp(68px, 18vw, 82px)', 
                  height: 'clamp(68px, 18vw, 82px)', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  border: '3.5px solid #38BDF8',
                  boxShadow: '0 6px 18px rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB'
                }} 
              >
                <User size={38} strokeWidth={2.3} />
              </div>
              <span 
                style={{ 
                  position: 'absolute', 
                  bottom: 3, 
                  right: 3, 
                  width: 16, 
                  height: 16, 
                  borderRadius: '50%', 
                  background: '#10B981', 
                  border: '2.5px solid #FFFFFF',
                  boxShadow: '0 0 8px #10B981'
                }} 
                title="Online Active"
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <span 
                  style={{ 
                    fontSize: '0.725rem', 
                    fontWeight: 700, 
                    color: '#64748B', 
                    background: '#F1F5F9', 
                    padding: '0.2rem 0.55rem', 
                    borderRadius: '999px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  📅 {formattedToday}
                </span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.65rem)', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.25, wordBreak: 'break-word' }}>
                {timeGreeting}, {user.name} 👋
              </h1>
            </div>
          </div>

          {/* Action Quick Launch Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.5rem', flex: '1 1 320px', width: '100%' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('scanner')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontWeight: 800, padding: '0.65rem 1rem', width: '100%' }}
            >
              <QrCode size={18} /> Live Scanner
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setEditingEvent(null);
                navigate('create_event');
              }}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontWeight: 700, padding: '0.65rem 1rem', width: '100%' }}
            >
              <Plus size={18} /> + New Event
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('guests')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontWeight: 700, padding: '0.65rem 1rem', width: '100%' }}
            >
              <Users size={16} /> Guest Passes
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('staff')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', fontWeight: 700, padding: '0.65rem 1rem', width: '100%' }}
              title="Manage Scanner Access & Staff"
            >
              <ShieldCheck size={16} /> Staff Access
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats & Check-in Progress Overview */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Check-in Gauge Card */}
        <div 
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="110" height="110" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
                {checkInPercent}%
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, marginTop: 3 }}>
                Admitted
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
              Live Gate Admission
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginTop: '0.15rem' }}>
              {checkedInCount} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>/ {totalGuests} Guests</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.3rem', fontWeight: 500 }}>
              <span style={{ color: '#059669', fontWeight: 700 }}>{approvedCount} approved</span> • <span style={{ color: '#D97706', fontWeight: 700 }}>{pendingCount} pending</span>
            </div>
          </div>
        </div>

        {/* Total Registered Stats Card */}
        <div 
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div className="flex-between">
            <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Attendees</span>
            <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 800 }}>
              PASSES
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: '0.35rem' }}>
            {totalGuests}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Across all active events & registrations</span>
          </div>
        </div>

        {/* Active Events & Limit Card */}
        <div 
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div className="flex-between">
            <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Events</span>
            <span style={{ background: '#F0FDF4', color: '#16A34A', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 800 }}>
              {activeEvents.length} ACTIVE
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: '0.35rem' }}>
            {events.length}
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginLeft: '0.4rem' }}>Parties</span>
          </div>
        </div>
      </div>

      {/* Events Section Heading */}
      <div className="flex-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Active Event Management</h2>
          <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>Configure passes, entry requirements, documents and invite guests</p>
        </div>
      </div>

      {/* Events Grid */}
      {activeEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Calendar size={28} />
          </div>
          <div className="empty-title">No active events found</div>
          <p className="empty-desc">Create your first event to start issuing passes and managing admissions.</p>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => {
              setEditingEvent(null);
              navigate('create_event');
            }}
          >
            + Create New Event
          </button>
        </div>
      ) : (
        <div className="events-grid">
          {activeEvents.map(evt => {
            const eventGuests = guests.filter(g => g.eventId === evt.id);
            const totalReg = eventGuests.length;
            const approved = eventGuests.filter(g => g.status === 'approved').length;
            const pending = eventGuests.filter(g => g.status === 'pending').length;
            const checkedIn = eventGuests.filter(g => g.status === 'checkedin').length;
            const limit = evt.tokenSettings?.totalLimit || 500;
            const progressPercent = Math.min(100, Math.round((totalReg / limit) * 100));

            return (
              <div key={evt.id} className="event-card">
                <div className="event-cover-wrap">
                  <img src={evt.coverImage} className="event-cover-img" alt={evt.name} />
                  <div className="event-badge-overlay">
                    <span className="badge badge-approved">
                      {evt.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="event-card-body">
                  <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                    <h3 className="event-title" style={{ flex: 1 }}>{evt.name}</h3>
                  </div>

                  {/* Event ID with 1-click Copy */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      background: 'var(--bg-tertiary)', 
                      padding: '0.35rem 0.65rem', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)'
                    }}
                    onClick={() => handleCopyEventId(evt.id, evt.name)}
                    title="Click to copy Event ID for guest invitation"
                  >
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Event ID:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{evt.id}</span>
                    <Copy size={12} style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }} />
                  </div>

                  <div className="event-meta-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={14} /> {evt.date}
                    </span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={14} /> {evt.startTime} - {evt.endTime}
                    </span>
                  </div>

                  <div className="event-meta-row" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={14} /> {evt.venue}
                    </span>
                  </div>

                  {/* Attendee Registrations & Tokens info (Unlimited Capacity) */}
                  <div style={{ background: '#F8FAFC', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: '#0F172A', fontWeight: 800 }}>
                      👥 {totalReg} Total Guests
                    </span>
                    <span style={{ color: '#2563EB', fontWeight: 800, background: '#EFF6FF', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid #BFDBFE', fontSize: '0.725rem' }}>
                      🎟️ {evt.tokenSettings?.tokensPerUser || 1} Tokens/Guest
                    </span>
                  </div>

                  {/* Breakdown Badges */}
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                    <span className="badge badge-approved">{approved} Approved</span>
                    <span className="badge badge-pending">{pending} Pending</span>
                    <span className="badge badge-checkedin">{checkedIn} Checked In</span>
                  </div>

                  {/* Card Actions */}
                  <div className="event-card-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem', width: '100%' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => handleEditEvent(evt)}
                      title="Edit all fields, requirements & documents"
                    >
                      <Sliders size={14} /> Customize
                    </button>

                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        setSelectedEventId(evt.id);
                        navigate('guests');
                      }}
                      title="Add or invite guests"
                    >
                      <UserPlus size={14} /> Invite
                    </button>

                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        setSelectedEventId(evt.id);
                        navigate('guests');
                      }}
                    >
                      <Users size={14} /> Guests ({totalReg})
                    </button>

                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center', color: 'var(--text-muted)' }}
                      onClick={() => handleDeleteEvent(evt.id, evt.name)}
                      title="Delete Event"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

