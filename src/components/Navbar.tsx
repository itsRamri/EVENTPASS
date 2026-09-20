import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, ChevronLeft } from 'lucide-react';

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

export const Navbar: React.FC = () => {
  const { 
    user, 
    navigate, 
    currentView, 
    editingEvent, 
    setEditingEvent, 
    profileSubpage, 
    setProfileSubpage, 
    notifications 
  } = useApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  const isCreateEventView = currentView === 'create_event';
  const isGuestApprovalView = currentView === 'guests';
  const isStaffAccessView = currentView === 'staff';
  const isNotificationsView = currentView === 'notifications';
  const isProfileSubpage = currentView === 'profile' && profileSubpage !== null;

  const getProfileSubpageTitle = () => {
    switch (profileSubpage) {
      case 'my_tickets':
        return 'MY TICKETS';
      case 'history':
        return 'REGISTRATION HISTORY';
      case 'settings':
        return 'SETTINGS';
      case 'my_events':
        return 'MY EVENTS';
      case 'support':
        return 'HELP & SUPPORT';
      default:
        return 'PROFILE';
    }
  };

  return (
    <header className="top-nav">
      {isCreateEventView ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              navigate(user.role === 'guest' ? 'guest_home' : 'dashboard');
            }}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              padding: '0.4rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            aria-label="Go Back"
          >
            <ChevronLeft size={22} strokeWidth={2.6} />
          </button>
          <h1 
            style={{ 
              fontSize: '1.15rem', 
              fontWeight: 800, 
              color: '#0F172A', 
              margin: 0,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            {editingEvent ? 'EDIT EVENT' : 'CREATE EVENT'}
          </h1>
        </div>
      ) : isGuestApprovalView ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => {
              navigate(user.role === 'guest' ? 'guest_home' : 'dashboard');
            }}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              padding: '0.4rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            aria-label="Go Back"
          >
            <ChevronLeft size={22} strokeWidth={2.6} />
          </button>
          <h1 
            style={{ 
              fontSize: '1.15rem', 
              fontWeight: 800, 
              color: '#0F172A', 
              margin: 0,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            GUEST APPROVAL
          </h1>
        </div>
      ) : isStaffAccessView ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => {
              navigate(user.role === 'guest' ? 'guest_home' : 'dashboard');
            }}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              padding: '0.4rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            aria-label="Go Back"
          >
            <ChevronLeft size={22} strokeWidth={2.6} />
          </button>
          <h1 
            style={{ 
              fontSize: '1.15rem', 
              fontWeight: 800, 
              color: '#0F172A', 
              margin: 0,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            STAFF ACCESS
          </h1>
        </div>
      ) : isNotificationsView ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => {
              navigate(user.role === 'guest' ? 'guest_home' : 'dashboard');
            }}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              padding: '0.4rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            aria-label="Go Back"
          >
            <ChevronLeft size={22} strokeWidth={2.6} />
          </button>
          <h1 
            style={{ 
              fontSize: '1.15rem', 
              fontWeight: 800, 
              color: '#0F172A', 
              margin: 0,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            NOTIFICATIONS
          </h1>
        </div>
      ) : isProfileSubpage ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => {
              setProfileSubpage(null);
            }}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
              padding: '0.4rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            aria-label="Go Back to Profile"
          >
            <ChevronLeft size={22} strokeWidth={2.6} />
          </button>
          <h1 
            style={{ 
              fontSize: '1.15rem', 
              fontWeight: 800, 
              color: '#0F172A', 
              margin: 0,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            {getProfileSubpageTitle()}
          </h1>
        </div>
      ) : (
        <div 
          className="brand-logo" 
          onClick={() => navigate(user.role === 'guest' ? 'guest_home' : user.role === 'scanner' ? 'scanner' : 'dashboard')} 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <div 
            className="brand-icon-box" 
            style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              padding: '2px', 
              background: '#FFFFFF', 
              border: '1.5px solid #E2E8F0', 
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)', 
              flexShrink: 0 
            }}
          >
            <img src="/logo.png" alt="EventPass" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A', lineHeight: 1.1 }}>EVENTPASS</span>
            <span className="brand-tagline-mini" style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em', color: '#2563EB', marginTop: '2px' }}>Simple • Secure • Seamless</span>
          </div>
        </div>
      )}

      <div className="top-actions">
        {/* Notification Bell */}
        <button 
          className="icon-btn" 
          onClick={() => navigate('notifications')}
          title="Notifications"
          style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '50%', 
            background: '#F8FAFC', 
            border: '1.5px solid #E2E8F0', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#334155', 
            position: 'relative', 
            cursor: 'pointer', 
            transition: 'all 0.2s ease', 
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)' 
          }}
        >
          <Bell size={20} strokeWidth={2.2} />
          {unreadCount > 0 && (
            <span 
              className="notification-badge-dot" 
              style={{ 
                position: 'absolute', 
                top: 4, 
                right: 4, 
                width: 9, 
                height: 9, 
                borderRadius: '50%', 
                background: '#EF4444', 
                border: '2px solid #FFFFFF' 
              }} 
            />
          )}
        </button>

        {/* Profile Avatar Button */}
        <button
          type="button"
          onClick={() => navigate('profile')}
          title="Profile"
          aria-label="View Profile"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            padding: 0,
            border: '1.5px solid #2563EB',
            background: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
        >
          {user.avatar && !user.avatar.includes('unsplash.com') ? (
            <img
              src={user.avatar}
              alt={user.name || 'User'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'uppercase'
              }}
            >
              {getInitials(user.name, user.email)}
            </div>
          )}
        </button>
      </div>
    </header>
  );
};
