/* ==========================================================================
   EVENTPASS — MAIN APPLICATION COORDINATOR & ROUTER
   ========================================================================== */

class AppCoordinator {
  constructor() {
    this.currentView = 'dashboard';
    this.modalEl = null;
    this.init();
  }

  init() {
    this.modalEl = document.getElementById('global-modal');
    
    // Set initial view according to role
    const user = auth.getCurrentUser();
    if (user.role === 'guest') {
      this.currentView = 'guest_home';
    } else if (user.role === 'scanner') {
      this.currentView = 'scanner';
    } else {
      this.currentView = 'dashboard';
    }

    this.renderApp();

    // Close modal on escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  navigate(viewName) {
    this.currentView = viewName;
    this.renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // If opening scanner view, activate camera stream
    if (viewName === 'scanner') {
      setTimeout(() => scanner.initCamera(), 100);
    } else {
      scanner.stopCamera();
    }
  }

  viewGuestsForEvent(eventId) {
    guest.selectedEventFilter = eventId;
    this.navigate('guests');
  }

  openScannerForEvent(eventId) {
    this.navigate('scanner');
  }

  renderApp() {
    const user = auth.getCurrentUser();
    const mainContainer = document.getElementById('main-content-container');
    const bottomNav = document.getElementById('bottom-navigation');
    const desktopNav = document.getElementById('desktop-nav-menu');
    const roleBadge = document.getElementById('top-role-badge');
    const userAvatar = document.getElementById('top-user-avatar');

    // Update Top Bar
    if (roleBadge) {
      roleBadge.innerHTML = `<span class="role-dot"></span> ${user.role.toUpperCase()}`;
    }
    if (userAvatar) {
      userAvatar.src = user.avatar;
    }

    // Render Navigation
    this.renderNavigations(user);

    // Render Main View Content
    if (mainContainer) {
      mainContainer.innerHTML = this.getViewHTML(user);
    }
  }

  getViewHTML(user) {
    switch (this.currentView) {
      // Event Manager Views
      case 'dashboard':
        return user.role === 'guest' ? guest.renderGuestHomeView() : manager.renderManagerDashboard();
      case 'create_event':
        return manager.renderCreateEventWizard();
      case 'guests':
        return guest.renderManagerGuestView();
      case 'staff':
        return staffModule.renderStaffManagementView();

      // Scanner Views
      case 'scanner':
        return scanner.renderScannerView();
      case 'checkins':
        guest.activeGuestTab = 'checkedin';
        return guest.renderManagerGuestView();

      // Guest Views
      case 'guest_home':
      case 'my_events':
        return guest.renderGuestHomeView();
      case 'my_passes': {
        const myPasses = db.getGuests().filter(g => (g.email === user.email || g.name === user.name) && (g.status === 'approved' || g.status === 'checkedin'));
        if (myPasses.length > 0) {
          // Open pass directly
          setTimeout(() => scanner.openDigitalPassModal(myPasses[0].id), 50);
        }
        return guest.renderGuestHomeView();
      }

      // Shared Views
      case 'notifications':
        return this.renderNotificationsView();
      case 'profile':
        return auth.renderProfileView();

      default:
        return manager.renderManagerDashboard();
    }
  }

  renderNavigations(user) {
    const bottomNav = document.getElementById('bottom-navigation');
    const desktopNav = document.getElementById('desktop-nav-menu');

    let navItems = [];

    if (user.role === 'manager') {
      navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'guests', label: 'Guests & Approvals', icon: '👥' },
        { id: 'scanner', label: 'QR Scanner', icon: '📷' },
        { id: 'staff', label: 'Staff Access', icon: '🛡️' },
        { id: 'profile', label: 'Profile', icon: '👤' }
      ];
    } else if (user.role === 'guest') {
      navItems = [
        { id: 'guest_home', label: 'Home', icon: '🏠' },
        { id: 'my_events', label: 'My Events', icon: '📅' },
        { id: 'my_passes', label: 'My Pass', icon: '🎟️' },
        { id: 'notifications', label: 'Alerts', icon: '🔔' },
        { id: 'profile', label: 'Profile', icon: '👤' }
      ];
    } else if (user.role === 'scanner') {
      navItems = [
        { id: 'scanner', label: 'Live Scanner', icon: '📷' },
        { id: 'checkins', label: 'Check-ins', icon: '✓' },
        { id: 'profile', label: 'Profile', icon: '👤' }
      ];
    }

    if (bottomNav) {
      bottomNav.innerHTML = navItems.map(item => `
        <button class="nav-item ${this.currentView === item.id ? 'active' : ''}" onclick="app.navigate('${item.id}')">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>
      `).join('');
    }

    if (desktopNav) {
      desktopNav.innerHTML = navItems.map(item => `
        <div class="desktop-nav-item ${this.currentView === item.id ? 'active' : ''}" onclick="app.navigate('${item.id}')">
          <span style="font-size:1.15rem;">${item.icon}</span>
          <span>${item.label}</span>
        </div>
      `).join('');
    }
  }

  renderNotificationsView() {
    const notifs = db.getNotifications();
    return `
      <div class="animate-fade" style="max-width: 600px; margin: 0 auto;">
        <div class="page-header">
          <div>
            <h1>Notifications</h1>
            <p>Real-time updates regarding registrations, passes & security</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="notifications.showToast('All marked as read', 'info')">Mark All as Read</button>
        </div>

        ${notifs.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon-wrap">🔔</div>
            <div class="empty-title">All caught up!</div>
            <p class="empty-desc">You have no unread notifications at this time.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${notifs.map(n => `
              <div class="glass-panel" style="padding: 1rem 1.25rem; border-left: 3px solid ${n.type === 'success' ? '#10B981' : n.type === 'warning' ? '#F59E0B' : '#6366F1'};">
                <div class="flex-between" style="margin-bottom: 0.25rem;">
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${n.title}</div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${n.timestamp}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${n.message}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  // Global Modal Control
  openModal(htmlContent) {
    const modalContent = document.getElementById('modal-inner-container');
    if (modalContent) {
      modalContent.innerHTML = htmlContent;
    }
    if (this.modalEl) {
      this.modalEl.classList.add('active');
    }
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
    }
  }

  openRoleSwitchModal() {
    const user = auth.getCurrentUser();
    const modalHtml = `
      <div class="modal-header">
        <h3>Switch Persona Role</h3>
        <button class="icon-btn" onclick="app.closeModal()">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.5rem 1rem;">
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
          EVENTPASS provides custom interfaces tailored specifically for each user role:
        </p>

        <div style="display: flex; flex-direction: column; gap: 0.85rem;">
          <div class="glass-panel" style="padding: 1rem; cursor: pointer; border-color: ${user.role === 'manager' ? 'var(--accent-primary)' : 'var(--border-subtle)'};" onclick="auth.switchRole('manager'); app.closeModal();">
            <div class="flex-between">
              <div>
                <div style="font-weight: 700; color: #818CF8;">👑 Event Manager</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Create events, custom requirements builder, guest approvals, permissions & analytics</div>
              </div>
              ${user.role === 'manager' ? '✓' : ''}
            </div>
          </div>

          <div class="glass-panel" style="padding: 1rem; cursor: pointer; border-color: ${user.role === 'guest' ? 'var(--accent-primary)' : 'var(--border-subtle)'};" onclick="auth.switchRole('guest'); app.closeModal();">
            <div class="flex-between">
              <div>
                <div style="font-weight: 700; color: #06B6D4;">🎟️ Guest / Student</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Browse events, dynamic form registration, track approvals & digital QR passes</div>
              </div>
              ${user.role === 'guest' ? '✓' : ''}
            </div>
          </div>

          <div class="glass-panel" style="padding: 1rem; cursor: pointer; border-color: ${user.role === 'scanner' ? 'var(--accent-primary)' : 'var(--border-subtle)'};" onclick="auth.switchRole('scanner'); app.closeModal();">
            <div class="flex-between">
              <div>
                <div style="font-weight: 700; color: #10B981;">📷 Scanner & Gate Staff</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Camera scanner, pass validation, anti-duplicate entry & check-in verification</div>
              </div>
              ${user.role === 'scanner' ? '✓' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    this.openModal(modalHtml);
  }
}

let app = null;
window.addEventListener('DOMContentLoaded', () => {
  app = new AppCoordinator();
  window.app = app;
});
