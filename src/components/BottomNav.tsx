import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Plus, 
  Search, 
  User, 
  QrCode, 
  Ticket, 
  X, 
  ArrowRight,
  Calendar,
  Bell,
  ShieldCheck
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentView, navigate, user, notifications } = useApp();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Automatically hide bottom nav when typing or when soft keyboard is open
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (
          !active ||
          (active.tagName !== 'INPUT' &&
            active.tagName !== 'TEXTAREA' &&
            active.tagName !== 'SELECT' &&
            !active.isContentEditable)
        ) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    let initialHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const handleViewportResize = () => {
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        if (initialHeight - currentHeight > 100) {
          setIsKeyboardVisible(true);
        } else if (Math.abs(currentHeight - initialHeight) < 40) {
          setIsKeyboardVisible(false);
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  // Hide Bottom Navigation during event creation, QR scanner, or input typing
  const hiddenViews = ['create_event', 'scanner', 'qr_generator'];
  if (hiddenViews.includes(currentView) || isKeyboardVisible) {
    return null;
  }

  const isGuestRole = user.role === 'guest';
  const unreadCount = notifications.filter(n => !n.read).length;

  // Guest Tab mappings
  const isGuestHome = currentView === 'guest_home';
  const isTickets = currentView === 'my_passes';
  const isNotifs = currentView === 'notifications';
  const isProfile = currentView === 'profile';

  // Manager Tab mappings
  const isManagerHome = currentView === 'dashboard';
  const isEvent = currentView === 'create_event';
  const isSearch = currentView === 'guest_home' || currentView === 'my_events' || currentView === 'my_passes';

  if (isGuestRole) {
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.08)',
          zIndex: 90,
          padding: '0.5rem 1rem max(0.6rem, env(safe-area-inset-bottom))'
        }}
      >
        <div
          style={{
            maxWidth: 540,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            width: '100%'
          }}
        >
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => navigate('guest_home')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: isGuestHome ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '0.725rem',
              fontWeight: isGuestHome ? 700 : 500
            }}
          >
            <Home size={20} strokeWidth={isGuestHome ? 2.6 : 2} />
            <span>Home</span>
          </button>

          {/* 2. Tickets */}
          <button
            type="button"
            onClick={() => navigate('guest_home')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: isTickets ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '0.725rem',
              fontWeight: isTickets ? 700 : 500
            }}
          >
            <Ticket size={20} strokeWidth={isTickets ? 2.6 : 2} />
            <span>Passes</span>
          </button>

          {/* 3. Notifications */}
          <button
            type="button"
            onClick={() => navigate('notifications')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: isNotifs ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              padding: '4px 10px',
              position: 'relative',
              fontSize: '0.725rem',
              fontWeight: isNotifs ? 700 : 500
            }}
          >
            <div style={{ position: 'relative' }}>
              <Bell size={20} strokeWidth={isNotifs ? 2.6 : 2} />
              {unreadCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#EF4444',
                    border: '1.5px solid #FFFFFF'
                  }}
                />
              )}
            </div>
            <span>Notifications</span>
          </button>

          {/* 4. Profile */}
          <button
            type="button"
            onClick={() => navigate('profile')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              color: isProfile ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '0.725rem',
              fontWeight: isProfile ? 700 : 500
            }}
          >
            <User size={20} strokeWidth={isProfile ? 2.6 : 2} />
            <span>Profile</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modern Clean Floating Bottom Dock */}
      <div className="floating-dock-wrapper">
        <nav className="dock-inner-nav">
          {/* 1. Home / Dashboard */}
          <button
            type="button"
            className={`dock-tab ${isManagerHome ? 'active' : ''}`}
            onClick={() => navigate('dashboard')}
          >
            <div className="dock-tab-icon-wrap">
              <Home size={18} strokeWidth={isManagerHome ? 2.6 : 2} />
            </div>
            <span className="dock-tab-label">Home</span>
          </button>

          {/* 2. Event (Create Event) */}
          <button
            type="button"
            className={`dock-tab ${isEvent ? 'active' : ''}`}
            onClick={() => navigate('create_event')}
          >
            <div className="dock-tab-icon-wrap">
              <Calendar size={18} strokeWidth={isEvent ? 2.6 : 2} />
            </div>
            <span className="dock-tab-label">Create</span>
          </button>

          {/* 3. Center Elevated Glowing Orb */}
          <div className="dock-center-slot">
            <button
              type="button"
              className={`dock-orb-btn ${showQuickMenu ? 'active-open' : ''}`}
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              aria-label="Quick Actions"
            >
              <div className="dock-orb-glow"></div>
              <div className="dock-orb-body">
                <Plus size={24} strokeWidth={2.8} className={`dock-orb-plus ${showQuickMenu ? 'rotated' : ''}`} />
              </div>
            </button>
          </div>

          {/* 4. Search / Explore */}
          <button
            type="button"
            className={`dock-tab ${isSearch ? 'active' : ''}`}
            onClick={() => navigate('guest_home')}
          >
            <div className="dock-tab-icon-wrap">
              <Search size={18} strokeWidth={isSearch ? 2.6 : 2} />
            </div>
            <span className="dock-tab-label">Explore</span>
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            className={`dock-tab ${isProfile ? 'active' : ''}`}
            onClick={() => navigate('profile')}
          >
            <div className="dock-tab-icon-wrap">
              <User size={18} strokeWidth={isProfile ? 2.6 : 2} />
            </div>
            <span className="dock-tab-label">Profile</span>
          </button>
        </nav>
      </div>

      {/* Quick Action Bottom Sheet */}
      {showQuickMenu && (
        <div className="quick-dock-overlay" onClick={() => setShowQuickMenu(false)}>
          <div className="quick-dock-menu" onClick={e => e.stopPropagation()}>
            <div className="quick-dock-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', boxShadow: '0 0 8px rgba(37, 99, 235, 0.6)' }}></div>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>Quick Actions</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQuickMenu(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="quick-dock-grid">
              <button 
                className="quick-action-item"
                onClick={() => {
                  setShowQuickMenu(false);
                  navigate('scanner');
                }}
              >
                <div className="quick-action-icon" style={{ background: 'linear-gradient(135deg, #2563EB, #38BDF8)' }}>
                  <QrCode size={18} color="#FFF" />
                </div>
                <div className="quick-action-info">
                  <div className="quick-action-title">Gate QR Scanner</div>
                  <div className="quick-action-sub">Scan attendee pass & verify</div>
                </div>
                <ArrowRight size={16} color="#64748B" />
              </button>

              <button 
                className="quick-action-item"
                onClick={() => {
                  setShowQuickMenu(false);
                  navigate('staff');
                }}
              >
                <div className="quick-action-icon" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
                  <ShieldCheck size={18} color="#FFF" />
                </div>
                <div className="quick-action-info">
                  <div className="quick-action-title">Staff Access</div>
                  <div className="quick-action-sub">Manage scanner access & staff</div>
                </div>
                <ArrowRight size={16} color="#64748B" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
