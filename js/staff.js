/* ==========================================================================
   EVENTPASS — STAFF & PERMISSIONS MANAGEMENT MODULE
   ========================================================================== */

class StaffModule {
  constructor() {
    this.searchQuery = '';
  }

  renderStaffManagementView() {
    const staffList = db.getStaff().filter(s => {
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      }
      return true;
    });

    const events = db.getEvents();

    return `
      <div class="animate-fade">
        <div class="page-header">
          <div>
            <h1>Staff & Scanner Permissions</h1>
            <p>Delegate scanning, check-in, and guest review duties with granular controls</p>
          </div>
          <button class="btn btn-primary" onclick="staffModule.openAddStaffModal()">
            <span>+</span> Add Staff Member
          </button>
        </div>

        <!-- Search Bar -->
        <div style="margin-bottom: 1.25rem;">
          <input type="text" placeholder="🔍 Search staff members by name or email..." value="${this.searchQuery}" oninput="staffModule.handleSearch(event)" />
        </div>

        <!-- Staff List -->
        ${staffList.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon-wrap">🛡️</div>
            <div class="empty-title">No staff members found</div>
            <p class="empty-desc">Grant team members access to scan and check-in attendees at gates.</p>
            <button class="btn btn-primary btn-sm" onclick="staffModule.openAddStaffModal()">+ Invite First Staff</button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${staffList.map(s => this.renderStaffCard(s, events)).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderStaffCard(staffMember, events) {
    const assignedEvt = events.find(e => e.id === staffMember.assignedEventId) || { name: 'All Events' };
    const p = staffMember.permissions || {};

    return `
      <div class="glass-panel" style="padding: 1.25rem;">
        <div class="flex-between" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(99,102,241,0.15); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #818CF8; font-size: 1.1rem;">
              ${staffMember.name.charAt(0)}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${staffMember.name}</div>
              <div style="font-size: 0.8rem; color: var(--accent-secondary);">${staffMember.email}</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="flex-between" style="gap: 0.5rem;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">${staffMember.status === 'active' ? 'Active' : 'Disabled'}</span>
              <label class="switch">
                <input type="checkbox" ${staffMember.status === 'active' ? 'checked' : ''} onchange="staffModule.toggleStatus('${staffMember.id}')" />
                <span class="slider"></span>
              </label>
            </div>
            <button class="btn btn-secondary btn-sm" style="color:#EF4444;" onclick="staffModule.confirmDeleteStaff('${staffMember.id}')" title="Revoke Staff Access">
              🗑 Revoke
            </button>
          </div>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Assigned Event: <span style="font-weight: 600; color: var(--text-primary);">${assignedEvt.name}</span>
        </div>

        <!-- Granular Permissions Grid -->
        <div style="background: var(--bg-tertiary); padding: 0.75rem 1rem; border-radius: var(--radius-md); display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; font-size: 0.775rem;">
          <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
            <input type="checkbox" ${p.canScan ? 'checked' : ''} onchange="staffModule.updatePermission('${staffMember.id}', 'canScan', this.checked)" />
            <span>📷 Scan Pass</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
            <input type="checkbox" ${p.canCheckIn ? 'checked' : ''} onchange="staffModule.updatePermission('${staffMember.id}', 'canCheckIn', this.checked)" />
            <span>🎟️ Check In</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
            <input type="checkbox" ${p.canViewDetails ? 'checked' : ''} onchange="staffModule.updatePermission('${staffMember.id}', 'canViewDetails', this.checked)" />
            <span>📋 View Details</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
            <input type="checkbox" ${p.canApprove ? 'checked' : ''} onchange="staffModule.updatePermission('${staffMember.id}', 'canApprove', this.checked)" />
            <span>✓ Approve</span>
          </label>
          <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
            <input type="checkbox" ${p.canReject ? 'checked' : ''} onchange="staffModule.updatePermission('${staffMember.id}', 'canReject', this.checked)" />
            <span>✕ Reject</span>
          </label>
        </div>
      </div>
    `;
  }

  openAddStaffModal() {
    const events = db.getEvents();
    const modalHtml = `
      <div class="modal-header">
        <h3>Add Staff / Scanner Team Member</h3>
        <button class="icon-btn" onclick="app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <form onsubmit="staffModule.saveNewStaff(event)">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required-star">*</span></label>
            <input type="text" id="new-staff-name" placeholder="e.g. Ramesh Verma" required />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address <span class="required-star">*</span></label>
            <input type="email" id="new-staff-email" placeholder="e.g. ramesh.staff@college.edu" required />
          </div>
          <div class="form-group">
            <label class="form-label">Assign to Event</label>
            <select id="new-staff-event">
              ${events.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}
            </select>
          </div>

          <h4 style="margin: 1.25rem 0 0.5rem; font-size: 0.875rem;">Granular Permissions</h4>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; background: var(--bg-tertiary); padding: 0.75rem; border-radius: var(--radius-md);">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="perm-scan" checked />
              <span>Allow QR Code & Token Scanning</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="perm-checkin" checked />
              <span>Allow Check-In Action for Guests</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="perm-details" checked />
              <span>Allow Viewing Guest Dossier & ID Documents</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="perm-approve" />
              <span>Allow Direct Guest Approval</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="perm-reject" />
              <span>Allow Registration Rejection</span>
            </label>
          </div>

          <div class="modal-footer" style="padding: 1.25rem 0 0; background: transparent;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Staff Member</button>
          </div>
        </form>
      </div>
    `;
    app.openModal(modalHtml);
  }

  saveNewStaff(e) {
    e.preventDefault();
    const name = document.getElementById('new-staff-name').value;
    const email = document.getElementById('new-staff-email').value;
    const eventId = document.getElementById('new-staff-event').value;

    const newMember = {
      id: 'stf_' + Date.now(),
      name,
      email,
      role: 'scanner',
      status: 'active',
      assignedEventId: eventId,
      permissions: {
        canScan: document.getElementById('perm-scan').checked,
        canCheckIn: document.getElementById('perm-checkin').checked,
        canViewDetails: document.getElementById('perm-details').checked,
        canApprove: document.getElementById('perm-approve').checked,
        canReject: document.getElementById('perm-reject').checked
      }
    };

    db.saveStaff(newMember);
    app.closeModal();
    notifications.showToast(`Staff member "${name}" added`, 'success');
    if (window.app) window.app.renderApp();
  }

  toggleStatus(staffId) {
    const staff = db.getStaff();
    const member = staff.find(s => s.id === staffId);
    if (member) {
      member.status = member.status === 'active' ? 'disabled' : 'active';
      db.saveStaff(member);
      notifications.showToast(`Staff access ${member.status === 'active' ? 'enabled' : 'disabled'}`, 'info');
      if (window.app) window.app.renderApp();
    }
  }

  updatePermission(staffId, permKey, value) {
    const staff = db.getStaff();
    const member = staff.find(s => s.id === staffId);
    if (member) {
      if (!member.permissions) member.permissions = {};
      member.permissions[permKey] = value;
      db.saveStaff(member);
      notifications.showToast('Permissions updated', 'success');
    }
  }

  confirmDeleteStaff(staffId) {
    const member = db.getStaff().find(s => s.id === staffId);
    if (!member) return;
    if (confirm(`Revoke staff credentials for ${member.name}?`)) {
      db.deleteStaff(staffId);
      notifications.showToast('Staff access revoked', 'warning');
      if (window.app) window.app.renderApp();
    }
  }

  handleSearch(e) {
    this.searchQuery = e.target.value;
    if (window.app) window.app.renderApp();
  }
}

const staffModule = new StaffModule();
