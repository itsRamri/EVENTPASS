import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Users, 
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
  const isGuestHome = currentView === 'guest_home' && !currentView.includes('events');
  const isMyEvents = currentView === 'my_events' || (currentView === 'guest_home');
  const isTickets = currentView === 'my_passes';
  const isNotifs = currentView === 'notifications';
  const isProfile = currentView === 'profile';

  // Manager Tab mappings
  const isManagerHome = currentView === 'dashboard';
  const isEvent = currentView === 'create_event';
  const isGuests = currentView === 'guests' || currentView === 'staff';
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
          background: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
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
              color: currentView === 'guest_home' ? '#2563EB' : '#94A3B8',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '0.725rem',
              fontWeight: currentView === 'guest_home' ? 700 : 500
            }}
          >
            <Home size={20} strokeWidth={currentView === 'guest_home' ? 2.5 : 2} />
            <span>Home</span>
          </button>

          {/* 2. My Events */}
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
              color: currentView === 'my_events' ? '#2563EB' : '#94A3B8',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '0.725rem',
              fontWeight: currentView === 'my_events' ? 700 : 500
            }}
          >
            <Calendar size={20} strokeWidth={currentView === 'my_events' ? 2.5 : 2} />
            <span>My Events</span>
          </button>

          {/* 3. Tickets */}
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
              color: currentView === 'my_passes' ? '#2563EB' : '#94A3B8',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '0.725rem',
              fontWeight: currentView === 'my_passes' ? 700 : 500
            }}
          >
            <Ticket size={20} strokeWidth={currentView === 'my_passes' ? 2.5 : 2} />
            <span>Tickets</span>
          </button>

          {/* 4. Notifications */}
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
              color: currentView === 'notifications' ? '#2563EB' : '#94A3B8',
              cursor: 'pointer',
              padding: '4px 10px',
              position: 'relative',
              fontSize: '0.725rem',
              fontWeight: currentView === 'notifications' ? 700 : 500
            }}
          >
            <div style={{ position: 'relative' }}>
              <Bell size={20} strokeWidth={currentView === 'notifications' ? 2.5 : 2} />
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
                    border: '1.5px solid #FFF'
                  }}
                />
              )}
            </div>
            <span>Notifications</span>
          </button>

          {/* 5. Profile */}
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
              color: isProfile ? '#2563EB' : '#94A3B8',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: '0.725rem',
              fontWeight: isProfile ? 700 : 500
            }}
          >
            <User size={20} strokeWidth={isProfile ? 2.5 : 2} />
            <span>Profile</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modern Solid Grounded Bottom Dock Navigation for Managers / Staff */}
      <div className="floating-dock-wrapper">
        {/* Navigation Items Container */}
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
            <span className="dock-tab-label">Event</span>
          </button>

          {/* 3. Center Glowing Orb Action Button */}
          <div className="dock-center-slot">
            <button
              type="button"
              className={`dock-orb-btn ${showQuickMenu ? 'active-open' : ''}`}
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              aria-label="Quick Actions"
            >
              <div className="dock-orb-glow"></div>
              <div className="dock-orb-body">
                <div className="dock-orb-gloss"></div>
                <Plus size={24} strokeWidth={2.8} className={`dock-orb-plus ${showQuickMenu ? 'rotated' : ''}`} />
              </div>
            </button>
          </div>

          {/* 4. Search */}
          <button
            type="button"
            className={`dock-tab ${isSearch ? 'active' : ''}`}
            onClick={() => navigate('guest_home')}
          >
            <div className="dock-tab-icon-wrap">
              <Search size={18} strokeWidth={isSearch ? 2.6 : 2} />
            </div>
            <span className="dock-tab-label">Search</span>
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


      {/* Quick Action Bottom Sheet / Modal */}
      {showQuickMenu && (
        <div className="quick-dock-overlay" onClick={() => setShowQuickMenu(false)}>
          <div className="quick-dock-menu" onClick={e => e.stopPropagation()}>
            <div className="quick-dock-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="quick-dock-badge-dot"></div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Quick Actions</span>
              </div>
              <button className="icon-btn-subtle" onClick={() => setShowQuickMenu(false)}>
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
                <div className="quick-action-icon" style={{ background: 'linear-gradient(135deg, #4E65FF, #92EFFD)' }}>
                  <QrCode size={18} color="#FFF" />
                </div>
                <div className="quick-action-info">
                  <div className="quick-action-title">Gate QR Scanner</div>
                  <div className="quick-action-sub">Scan attendee pass & verify</div>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </button>

              <button 
                className="quick-action-item"
                onClick={() => {
                  setShowQuickMenu(false);
                  navigate('staff');
                }}
              >
                <div className="quick-action-icon" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}>
                  <ShieldCheck size={18} color="#FFF" />
                </div>
                <div className="quick-action-info">
                  <div className="quick-action-title">Staff Access</div>
                  <div className="quick-action-sub">Manage scanner access & staff</div>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
