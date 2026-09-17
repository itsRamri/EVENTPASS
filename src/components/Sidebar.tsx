import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  ShieldCheck, 
  QrCode, 
  UserCheck, 
  Bell, 
  User, 
  LogOut,
  Sparkles,
  Repeat,
  Compass,
  Home,
  CalendarDays,
  Ticket,
  CheckCircle2
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, currentView, navigate, logout } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'guest_home', label: 'My Passes & Invites', icon: <Ticket size={18} /> },
    { id: 'scanner', label: 'Live Gate Scanner', icon: <QrCode size={18} /> },
    { id: 'guests', label: 'Guests & Approvals', icon: <Users size={18} /> },
    { id: 'staff', label: 'Staff & Scanner Access', icon: <ShieldCheck size={18} /> },
    { id: 'profile', label: 'Profile Settings', icon: <User size={18} /> }
  ];

  return (
    <aside className="desktop-sidebar">
      <div className="desktop-sidebar-brand">
        <div className="brand-icon-box">
          <Sparkles size={22} />
        </div>
        <div>
          <div className="brand-logo" style={{ fontSize: '1.15rem' }}>EVENTPASS</div>
          <span className="brand-tagline-mini">Your Events. Our Priority.</span>
        </div>
      </div>

      <div className="desktop-nav-menu">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`desktop-nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="desktop-sidebar-footer">
        <div className="desktop-user-pill">
          <div 
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 'var(--radius-sm)', 
              background: '#EFF6FF', 
              border: '1.5px solid #38BDF8', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#2563EB',
              flexShrink: 0 
            }}
          >
            <User size={18} strokeWidth={2.3} />
          </div>
          <div className="desktop-user-info">
            <div className="desktop-user-name">{user.name || 'User'}</div>
            <div className="desktop-user-role" style={{ fontSize: '0.7rem', color: '#64748B' }}>{user.email || 'Active Member'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button 
            className="icon-btn" 
            onClick={logout}
            title="Log Out"
            style={{ color: '#EF4444' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
