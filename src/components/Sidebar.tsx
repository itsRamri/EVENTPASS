import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  ShieldCheck,
  QrCode,
  User,
  LogOut,
  Ticket
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, currentView, navigate, logout } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'create_event', label: 'Create Event', icon: <PlusCircle size={18} /> },
    { id: 'guest_home', label: 'My Passes & Invites', icon: <Ticket size={18} /> },
    { id: 'scanner', label: 'Live Gate Scanner', icon: <QrCode size={18} /> },
    { id: 'guests', label: 'Guests & Approvals', icon: <Users size={18} /> },
    { id: 'staff', label: 'Staff & Scanner Access', icon: <ShieldCheck size={18} /> },
    { id: 'profile', label: 'Profile Settings', icon: <User size={18} /> }
  ];

  return (
    <aside className="desktop-sidebar">
      {/* Brand Header */}
      <div className="desktop-sidebar-brand">
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
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <img src="/logo.png" alt="EventPass" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div className="brand-logo" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            EVENTPASS
          </div>
          <span className="brand-tagline-mini" style={{ color: '#2563EB', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            Simple • Secure • Seamless
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="desktop-nav-menu">
        {navItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <div
              key={item.id}
              className={`desktop-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <div style={{ color: isActive ? '#2563EB' : '#64748B', display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </div>
              <span style={{ fontWeight: isActive ? 800 : 600, color: isActive ? '#2563EB' : '#334155' }}>
                {item.label}
              </span>
              {isActive && (
                <div 
                  style={{ 
                    marginLeft: 'auto', 
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    background: '#2563EB', 
                    boxShadow: '0 0 8px rgba(37, 99, 235, 0.6)' 
                  }} 
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Profile Pill */}
      <div className="desktop-sidebar-footer">
        <div className="desktop-user-pill">
          {user.avatar && !user.avatar.includes('unsplash.com') ? (
            <img
              src={user.avatar}
              alt={user.name || 'User'}
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                objectFit: 'cover',
                border: '1.5px solid #2563EB',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
                flexShrink: 0
              }}
            />
          ) : (
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: '#EFF6FF',
                border: '1.5px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.1)',
                flexShrink: 0
              }}
            >
              <User size={18} strokeWidth={2.4} />
            </div>
          )}
          <div className="desktop-user-info">
            <div className="desktop-user-name" style={{ color: '#0F172A' }}>{user.name || 'User'}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'capitalize', fontWeight: 600 }}>
              {user.role || 'Member'}
            </div>
          </div>
        </div>

        <button
          className="icon-btn"
          onClick={logout}
          title="Log Out"
          style={{ 
            color: '#DC2626', 
            background: '#FEF2F2', 
            border: '1px solid #FECACA',
            width: '36px',
            height: '36px'
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};
