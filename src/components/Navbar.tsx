import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Sparkles, ChevronLeft } from 'lucide-react';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              navigate(user.role === 'guest' ? 'guest_home' : 'dashboard');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0F172A',
              padding: '0.35rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            aria-label="Go Back"
          >
            <ChevronLeft size={24} strokeWidth={2.6} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              navigate(user.role === 'guest' ? 'guest_home' : 'dashboard');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0F172A',
              padding: '0.35rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            aria-label="Go Back"
          >
            <ChevronLeft size={24} strokeWidth={2.6} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              navigate(user.role === 'guest' ? 'guest_home' : 'dashboard');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0F172A',
              padding: '0.35rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            aria-label="Go Back"
          >
            <ChevronLeft size={24} strokeWidth={2.6} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              navigate(user.role === 'guest' ? 'guest_home' : 'dashboard');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0F172A',
              padding: '0.35rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            aria-label="Go Back"
          >
            <ChevronLeft size={24} strokeWidth={2.6} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setProfileSubpage(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0F172A',
              padding: '0.35rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            aria-label="Go Back to Profile"
          >
            <ChevronLeft size={24} strokeWidth={2.6} />
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
          <div className="brand-icon-box" style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', padding: '3px', background: '#FFFFFF', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', flexShrink: 0 }}>
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
          style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E293B', position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <Bell size={21} strokeWidth={2.2} />
          {unreadCount > 0 && <span className="notification-badge-dot" style={{ position: 'absolute', top: 3, right: 3, width: 9, height: 9, borderRadius: '50%', background: '#EF4444', border: '2px solid #FFFFFF' }} />}
        </button>
      </div>
    </header>
  );
};
