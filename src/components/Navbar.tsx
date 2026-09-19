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

  const userEmail = (user.email || '').toLowerCase().trim();
  const userPhone = (user.mobile || '').replace(/\D/g, '');

  const myNotifications = notifications.filter(n => {
    if (n.recipientEmail) {
      return Boolean(userEmail && n.recipientEmail.toLowerCase().trim() === userEmail);
    }
    if (n.recipientPhone) {
      return Boolean(userPhone && n.recipientPhone.replace(/\D/g, '') === userPhone);
    }
    if (n.recipientRole) {
      return n.recipientRole === 'all' || n.recipientRole === user.role;
    }
    return true;
  });

  const unreadCount = myNotifications.filter(n => !n.read).length;

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
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-icon-box" style={{ overflow: 'hidden', padding: '2px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <img src="/logo.png" alt="EventPass" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <span>EVENTPASS</span>
            <span className="brand-tagline-mini">Simple • Secure • Seamless</span>
          </div>
        </div>
      )}

      <div className="top-actions">
        {/* Notification Bell */}
        <button 
          className="icon-btn" 
          onClick={() => navigate('notifications')}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="notification-badge-dot" />}
        </button>
      </div>
    </header>
  );
};
