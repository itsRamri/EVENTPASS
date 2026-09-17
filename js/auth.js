/* ==========================================================================
   EVENTPASS — AUTHENTICATION & PROFILE SYSTEM
   ========================================================================== */

class AuthModule {
  constructor() {
    this.currentUser = db.getUser();
  }

  getCurrentUser() {
    return db.getUser();
  }

  switchRole(newRole) {
    const user = this.getCurrentUser();
    user.role = newRole;
    
    // Switch avatar & name preset for realistic experience if needed
    if (newRole === 'manager') {
      user.name = 'Aarav Sharma';
      user.email = 'aarav.sharma@eventpass.io';
      user.avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    } else if (newRole === 'guest') {
      user.name = 'Shubham Kumar';
      user.email = 'shubham.k@gmail.com';
      user.avatar = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80';
    } else if (newRole === 'scanner') {
      user.name = 'Karan Mehra';
      user.email = 'karan.scanner@eventpass.io';
      user.avatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
    }

    db.setUser(user);
    this.currentUser = user;
    notifications.showToast(`Switched view to ${newRole.toUpperCase()}`, 'info');
    
    // Trigger global UI re-render
    if (window.app) {
      window.app.renderApp();
    }
  }

  updateProfile(profileData) {
    const user = { ...this.getCurrentUser(), ...profileData };
    db.setUser(user);
    this.currentUser = user;
    notifications.showToast('Profile updated successfully', 'success');
    if (window.app) {
      window.app.renderApp();
    }
  }

  renderProfileView() {
    const user = this.getCurrentUser();
    return `
      <div class="animate-fade" style="max-width: 600px; margin: 0 auto;">
        <div class="page-header">
          <div>
            <h1>Account Profile</h1>
            <p>Manage your identity, role permissions and security</p>
          </div>
          <span class="badge badge-role">${user.role.toUpperCase()}</span>
        </div>

        <div class="glass-panel" style="padding: 2rem; margin-bottom: 1.5rem; text-align: center;">
          <div style="position: relative; display: inline-block; margin-bottom: 1rem;">
            <img src="${user.avatar}" id="profile-avatar-preview" alt="${user.name}" style="width: 100px; height: 100px; border-radius: var(--radius-xl); object-fit: cover; border: 3px solid var(--accent-primary); box-shadow: var(--shadow-glow);" />
          </div>

          <h2 style="font-size: 1.4rem; margin-bottom: 0.25rem;">${user.name}</h2>
          <p style="color: var(--accent-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">${user.email}</p>
          <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 0.75rem;">
            <span class="badge badge-approved">Active Account</span>
            <span class="badge badge-role">Role: ${user.role}</span>
            <span class="badge badge-checkedin" style="text-transform: none;">🔒 Fixed Profile</span>
          </div>
        </div>

        <div class="glass-panel" style="padding: 1.75rem; margin-bottom: 1.5rem;">
          <div class="flex-between" style="margin-bottom: 1.25rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle);">
            <h3 style="font-size: 1.1rem;">Personal Information</h3>
            <span style="font-size: 0.75rem; color: var(--text-muted);">🔒 Non-editable</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            <div style="background: var(--bg-tertiary); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Full Name</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">${user.name}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Email Address</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${user.email}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Mobile Number</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${user.mobile || '+91 98765 43210'}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">College / University</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${user.college || 'National Institute of Technology'}</div>
            </div>
            <div style="background: var(--bg-tertiary); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Department / Branch</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${user.branch || 'Computer Science & Engineering'}</div>
            </div>
          </div>
        </div>

        <!-- Quick Switch Persona Playground -->
        <div class="glass-panel" style="padding: 1.5rem; border-color: rgba(99, 102, 241, 0.3);">
          <div class="flex-between" style="margin-bottom: 0.75rem;">
            <div>
              <h4 style="color: var(--accent-primary);">Switch Active Persona / Role</h4>
              <p style="font-size: 0.8rem;">Experience the entire application as any role</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
            <button class="btn ${user.role === 'manager' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="auth.switchRole('manager')">👑 Manager</button>
            <button class="btn ${user.role === 'guest' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="auth.switchRole('guest')">🎟️ Guest</button>
            <button class="btn ${user.role === 'scanner' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="auth.switchRole('scanner')">📷 Scanner</button>
          </div>
        </div>

        <div style="text-align: center; margin-top: 2rem;">
          <button class="btn btn-secondary btn-sm" style="color: #EF4444;" onclick="if(confirm('Reset all demo data and restore defaults?')) { db.resetAll(); location.reload(); }">
            ↻ Reset All Application Data
          </button>
        </div>
      </div>
    `;
  }

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('profile-avatar-preview');
        if (preview) preview.src = e.target.result;
        this.updateProfile({ avatar: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  handleProfileSubmit(event) {
    event.preventDefault();
    const updated = {
      name: document.getElementById('prof-name').value,
      email: document.getElementById('prof-email').value,
      mobile: document.getElementById('prof-mobile').value,
      college: document.getElementById('prof-college').value,
      branch: document.getElementById('prof-branch').value,
    };
    this.updateProfile(updated);
  }
}

const auth = new AuthModule();
