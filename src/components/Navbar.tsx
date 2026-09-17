import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Sparkles, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, navigate, setRoleModalOpen, notifications } = useApp();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="top-nav">
      <div 
        className="brand-logo" 
        onClick={() => navigate(user.role === 'guest' ? 'guest_home' : user.role === 'scanner' ? 'scanner' : 'dashboard')} 
        style={{ cursor: 'pointer' }}
      >
        <div className="brand-icon-box">
          <Sparkles size={20} />
        </div>
        <div>
          <span>EVENTPASS</span>
          <span className="brand-tagline-mini">Simple • Secure • Seamless</span>
        </div>
      </div>

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

        {/* User Profile Avatar Icon */}
        <div 
          className="user-avatar-btn" 
          onClick={() => navigate('profile')}
          title="My Profile"
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '2px solid #38BDF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563EB',
            cursor: 'pointer'
          }}
        >
          <User size={20} strokeWidth={2.3} />
        </div>
      </div>
    </header>
  );
};
