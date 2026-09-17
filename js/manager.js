/* ==========================================================================
   EVENTPASS — EVENT MANAGER MODULE
   ========================================================================== */

class EventManagerModule {
  constructor() {
    this.wizardStep = 1;
    this.activeEventTab = 'active'; // 'active', 'draft', 'completed'
    this.newEvent = this.getBlankEventState();
  }

  getBlankEventState() {
    return {
      id: 'evt_' + Date.now(),
      name: '',
      tagline: '',
      status: 'active',
      coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
      description: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '18:00',
      endTime: '22:00',
      venue: '',
      location: '',
      organizer: 'Event Management Team',
      tokenSettings: {
        totalLimit: 500,
        tokenType: 'ALPHANUMERIC',
        prefix: 'EP-PASS',
        validity: '',
        autoGenerate: true,
        qrEnabled: true
      },
      requirements: [
        { id: 'req_' + Date.now() + '_1', label: 'Full Name', type: 'text', required: true, description: 'Legal name' },
        { id: 'req_' + Date.now() + '_2', label: 'College Email ID', type: 'email', required: true, description: 'Official email' },
        { id: 'req_' + Date.now() + '_3', label: 'Mobile Number', type: 'mobile', required: true, description: 'Contact WhatsApp number' }
      ],
      documents: []
    };
  }

  // Dashboard Stats Computation
  getOverallStats() {
    const guests = db.getGuests();
    const total = guests.length;
    const pending = guests.filter(g => g.status === 'pending').length;
    const approved = guests.filter(g => g.status === 'approved').length;
    const checkedin = guests.filter(g => g.status === 'checkedin').length;
    const rejected = guests.filter(g => g.status === 'rejected').length;
    const blocked = guests.filter(g => g.status === 'blocked').length;

    return { total, pending, approved, checkedin, rejected, blocked };
  }

  renderManagerDashboard() {
    const user = auth.getCurrentUser();
    const stats = this.getOverallStats();
    const events = db.getEvents();
    const filteredEvents = events.filter(e => {
      if (this.activeEventTab === 'active') return e.status === 'active';
      if (this.activeEventTab === 'draft') return e.status === 'draft';
      if (this.activeEventTab === 'completed') return e.status === 'completed';
      return true;
    });

    return `
      <div class="animate-fade">
        <!-- Top Greeting Header -->
        <div class="page-header">
          <div class="welcome-greeting">
            <img src="${user.avatar}" class="welcome-avatar" alt="${user.name}" />
            <div class="greeting-text">
              <h1>Good Day, ${user.name}</h1>
              <p>Here is the live pulse of your events, guest approvals, and check-ins</p>
            </div>
          </div>
          <button class="btn btn-primary" onclick="app.navigate('create_event')">
            <span>+</span> Create Event
          </button>
        </div>

        <!-- 5 Key Statistic Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-label">Total Guests</span>
              <div class="stat-icon" style="background: rgba(99, 102, 241, 0.15); color: #818CF8;">👥</div>
            </div>
            <div class="stat-val">${stats.total}</div>
          </div>

          <div class="stat-card" style="border-left: 3px solid var(--status-pending);">
            <div class="stat-card-header">
              <span class="stat-label">Pending</span>
              <div class="stat-icon" style="background: var(--status-pending-bg); color: var(--status-pending);">⏳</div>
            </div>
            <div class="stat-val" style="color: var(--status-pending);">${stats.pending}</div>
          </div>

          <div class="stat-card" style="border-left: 3px solid var(--status-approved);">
            <div class="stat-card-header">
              <span class="stat-label">Approved</span>
              <div class="stat-icon" style="background: var(--status-approved-bg); color: var(--status-approved);">✓</div>
            </div>
            <div class="stat-val" style="color: var(--status-approved);">${stats.approved}</div>
          </div>

          <div class="stat-card" style="border-left: 3px solid var(--status-checkedin);">
            <div class="stat-card-header">
              <span class="stat-label">Checked In</span>
              <div class="stat-icon" style="background: var(--status-checkedin-bg); color: var(--status-checkedin);">🎟️</div>
            </div>
            <div class="stat-val" style="color: var(--status-checkedin);">${stats.checkedin}</div>
          </div>

          <div class="stat-card" style="border-left: 3px solid var(--status-blocked);">
            <div class="stat-card-header">
              <span class="stat-label">Blocked</span>
              <div class="stat-icon" style="background: var(--status-blocked-bg); color: var(--status-blocked);">🛑</div>
            </div>
            <div class="stat-val" style="color: var(--status-blocked);">${stats.blocked}</div>
          </div>
        </div>

        <!-- Event Management Tabs -->
        <div class="flex-between" style="margin-bottom: 1rem; align-items: center;">
          <h2>Event Management</h2>
          <div class="tabs-container" style="margin-bottom: 0;">
            <button class="tab-btn ${this.activeEventTab === 'active' ? 'active' : ''}" onclick="manager.setEventTab('active')">
              Active Events <span class="tab-badge">${events.filter(e => e.status === 'active').length}</span>
            </button>
            <button class="tab-btn ${this.activeEventTab === 'draft' ? 'active' : ''}" onclick="manager.setEventTab('draft')">
              Drafts <span class="tab-badge">${events.filter(e => e.status === 'draft').length}</span>
            </button>
            <button class="tab-btn ${this.activeEventTab === 'completed' ? 'active' : ''}" onclick="manager.setEventTab('completed')">
              Completed <span class="tab-badge">${events.filter(e => e.status === 'completed').length}</span>
            </button>
          </div>
        </div>

        <!-- Event Cards Grid -->
        ${filteredEvents.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon-wrap">🎉</div>
            <div class="empty-title">No ${this.activeEventTab} events found</div>
            <p class="empty-desc">Create your next flagship event or switch tabs to view others.</p>
            <button class="btn btn-primary btn-sm" onclick="app.navigate('create_event')">+ Create New Event</button>
          </div>
        ` : `
          <div class="events-grid">
            ${filteredEvents.map(evt => this.renderEventCard(evt)).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderEventCard(evt) {
    const allGuests = db.getGuests().filter(g => g.eventId === evt.id);
    const totalReg = allGuests.length;
    const approved = allGuests.filter(g => g.status === 'approved').length;
    const pending = allGuests.filter(g => g.status === 'pending').length;
    const checkedIn = allGuests.filter(g => g.status === 'checkedin').length;
    const limit = evt.tokenSettings ? evt.tokenSettings.totalLimit : 500;
    const progressPercent = Math.min(100, Math.round((totalReg / limit) * 100));

    let statusBadge = `<span class="badge badge-approved">ACTIVE</span>`;
    if (evt.status === 'draft') statusBadge = `<span class="badge badge-pending">DRAFT</span>`;
    if (evt.status === 'completed') statusBadge = `<span class="badge badge-rejected">COMPLETED</span>`;

    return `
      <div class="event-card">
        <div class="event-cover-wrap">
          <img src="${evt.coverImage}" class="event-cover-img" alt="${evt.name}" />
          <div class="event-badge-overlay">${statusBadge}</div>
        </div>
        <div class="event-card-body">
          <h3 class="event-title">${evt.name}</h3>
          
          <div class="event-meta-row">
            <span>📅 ${evt.date}</span>
            <span>•</span>
            <span>⏰ ${evt.startTime} - ${evt.endTime}</span>
          </div>
          <div class="event-meta-row" style="color: var(--text-muted);">
            <span>📍 ${evt.venue}</span>
          </div>

          <!-- Capacity Meter -->
          <div class="event-capacity-bar-wrap">
            <div class="capacity-labels">
              <span>Capacity: ${totalReg} / ${limit}</span>
              <span>${progressPercent}% filled</span>
            </div>
            <div class="capacity-progress-track">
              <div class="capacity-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
          </div>

          <!-- Stats Mini Badges -->
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.35rem;">
            <span class="badge badge-approved">${approved} Approved</span>
            <span class="badge badge-pending">${pending} Pending</span>
            <span class="badge badge-checkedin">${checkedIn} Checked In</span>
          </div>

          <!-- Action Buttons -->
          <div class="event-card-actions">
            <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="app.viewGuestsForEvent('${evt.id}')">
              👥 Guests
            </button>
            <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="app.openScannerForEvent('${evt.id}')">
              📷 Scan
            </button>
            <button class="btn btn-secondary btn-sm" onclick="manager.openEventOptions('${evt.id}')" title="More Options">
              ⋮
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setEventTab(tab) {
    this.activeEventTab = tab;
    if (window.app) window.app.renderApp();
  }

  openEventOptions(eventId) {
    const evt = db.getEventById(eventId);
    if (!evt) return;
    const choice = confirm(`Event: "${evt.name}"\n\nOptions:\n- Click OK to Delete Event\n- Click Cancel to dismiss`);
    if (choice) {
      if (confirm(`⚠️ Are you absolutely sure you want to delete "${evt.name}"? This will permanently remove all associated registrations and passes.`)) {
        db.deleteEvent(eventId);
        notifications.showToast('Event deleted successfully', 'warning');
        if (window.app) window.app.renderApp();
      }
    }
  }

  // Multi-step Create Event Wizard
  renderCreateEventWizard() {
    return `
      <div class="animate-fade" style="max-width: 800px; margin: 0 auto;">
        <div class="page-header">
          <div>
            <h1>Create New Event</h1>
            <p>Design your event, token allocations, custom fields and documents</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('dashboard')">✕ Cancel</button>
        </div>

        <!-- Step Indicator -->
        <div class="glass-panel" style="padding: 1rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; position: relative;">
            <div style="text-align: center; flex: 1;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${this.wizardStep >= 1 ? 'var(--accent-primary)' : 'var(--bg-input)'}; color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.4rem; font-weight: 700; font-size: 0.85rem;">1</div>
              <span style="font-size: 0.75rem; color: ${this.wizardStep >= 1 ? 'var(--text-primary)' : 'var(--text-muted)'}; font-weight: 600;">Basic Info</span>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${this.wizardStep >= 2 ? 'var(--accent-primary)' : 'var(--bg-input)'}; color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.4rem; font-weight: 700; font-size: 0.85rem;">2</div>
              <span style="font-size: 0.75rem; color: ${this.wizardStep >= 2 ? 'var(--text-primary)' : 'var(--text-muted)'}; font-weight: 600;">Tokens & Passes</span>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${this.wizardStep >= 3 ? 'var(--accent-primary)' : 'var(--bg-input)'}; color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.4rem; font-weight: 700; font-size: 0.85rem;">3</div>
              <span style="font-size: 0.75rem; color: ${this.wizardStep >= 3 ? 'var(--text-primary)' : 'var(--text-muted)'}; font-weight: 600;">Requirements</span>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${this.wizardStep >= 4 ? 'var(--accent-primary)' : 'var(--bg-input)'}; color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.4rem; font-weight: 700; font-size: 0.85rem;">4</div>
              <span style="font-size: 0.75rem; color: ${this.wizardStep >= 4 ? 'var(--text-primary)' : 'var(--text-muted)'}; font-weight: 600;">Documents</span>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${this.wizardStep >= 5 ? 'var(--accent-primary)' : 'var(--bg-input)'}; color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.4rem; font-weight: 700; font-size: 0.85rem;">5</div>
              <span style="font-size: 0.75rem; color: ${this.wizardStep >= 5 ? 'var(--text-primary)' : 'var(--text-muted)'}; font-weight: 600;">Publish</span>
            </div>
          </div>
        </div>

        <!-- Wizard Step Body -->
        <div class="glass-panel" style="padding: 1.75rem; margin-bottom: 1.5rem;">
          ${this.renderWizardStepContent()}
        </div>

        <!-- Navigation Buttons -->
        <div class="flex-between">
          <button class="btn btn-secondary" onclick="manager.prevStep()" ${this.wizardStep === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
            ← Back
          </button>
          
          ${this.wizardStep < 5 ? `
            <button class="btn btn-primary" onclick="manager.nextStep()">
              Next Step →
            </button>
          ` : `
            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-secondary" onclick="manager.saveEvent('draft')">Save as Draft</button>
              <button class="btn btn-primary" onclick="manager.saveEvent('active')">🚀 Publish Event Now</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderWizardStepContent() {
    if (this.wizardStep === 1) {
      return `
        <h3 style="margin-bottom: 1.25rem;">Step 1 — Basic Information</h3>
        <div class="form-group">
          <label class="form-label">Event / Party Name <span class="required-star">*</span></label>
          <input type="text" id="wiz-name" placeholder="e.g. Grand Campus Winter Fest 2026" value="${this.newEvent.name}" />
        </div>

        <div class="form-group">
          <label class="form-label">Short Tagline</label>
          <input type="text" id="wiz-tagline" placeholder="e.g. Night of Music, Lights & Celebration" value="${this.newEvent.tagline}" />
        </div>

        <div class="form-group">
          <label class="form-label">Cover Image</label>
          <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.5rem;">
            <img src="${this.newEvent.coverImage}" id="wiz-cover-preview" style="width: 120px; height: 75px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border-subtle);" />
            <div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('wiz-img-file').click()">📷 Choose / Upload Image</button>
              <input type="file" id="wiz-img-file" accept="image/*" style="display:none;" onchange="manager.handleCoverUpload(event)" />
              <div class="form-hint">JPG, PNG, WebP up to 10MB</div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="wiz-desc" rows="3" placeholder="Tell your guests what makes this event unmissable...">${this.newEvent.description}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Date <span class="required-star">*</span></label>
            <input type="date" id="wiz-date" value="${this.newEvent.date}" />
          </div>
          <div class="form-group">
            <label class="form-label">Start Time <span class="required-star">*</span></label>
            <input type="time" id="wiz-start-time" value="${this.newEvent.startTime}" />
          </div>
          <div class="form-group">
            <label class="form-label">End Time <span class="required-star">*</span></label>
            <input type="time" id="wiz-end-time" value="${this.newEvent.endTime}" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label class="form-label">Venue Name <span class="required-star">*</span></label>
            <input type="text" id="wiz-venue" placeholder="e.g. Main Auditorium" value="${this.newEvent.venue}" />
          </div>
          <div class="form-group">
            <label class="form-label">Location / Landmark</label>
            <input type="text" id="wiz-location" placeholder="e.g. North Campus, Block C" value="${this.newEvent.location}" />
          </div>
        </div>
      `;
    }

    if (this.wizardStep === 2) {
      const limit = this.newEvent.tokenSettings.totalLimit;
      return `
        <h3 style="margin-bottom: 1.25rem;">Step 2 — Token & Pass Settings</h3>
        <p style="margin-bottom: 1.25rem; font-size: 0.875rem;">Configure capacity, pass codes, auto-generation formulas and QR security.</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Total Token / Pass Limit <span class="required-star">*</span></label>
            <input type="number" id="wiz-token-limit" min="1" max="10000" value="${limit}" oninput="manager.updateTokenPreview()" />
          </div>
          <div class="form-group">
            <label class="form-label">Token Code Prefix</label>
            <input type="text" id="wiz-token-prefix" value="${this.newEvent.tokenSettings.prefix}" oninput="manager.updateTokenPreview()" />
          </div>
        </div>

        <div class="glass-panel" style="padding: 1.25rem; background: var(--bg-tertiary); margin-bottom: 1.25rem; border: 1px dashed rgba(99,102,241,0.3);">
          <h4 style="color: var(--accent-secondary); margin-bottom: 0.75rem;">Live Pass Allocation Preview</h4>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
            <div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);" id="prev-total">${limit}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Available Tokens</div>
            </div>
            <div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--accent-primary);">0</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Used Tokens</div>
            </div>
            <div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--status-approved);" id="prev-remaining">${limit}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Remaining</div>
            </div>
          </div>
          <div style="margin-top: 1rem; font-size: 0.8rem; text-align: center; color: var(--text-secondary);">
            Sample Generated Token: <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-secondary);" id="prev-sample-token">${this.newEvent.tokenSettings.prefix}-10001</span>
          </div>
        </div>

        <div class="flex-between" style="padding: 0.75rem 0;">
          <div>
            <div style="font-weight: 600; font-size: 0.9rem;">Auto-Generate Unique QR Code</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Generates encrypted digital pass QR upon manager approval</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="wiz-qr-enabled" checked />
            <span class="slider"></span>
          </label>
        </div>
      `;
    }

    if (this.wizardStep === 3) {
      return `
        <div class="flex-between" style="margin-bottom: 1.25rem;">
          <div>
            <h3>Step 3 — Custom Registration Requirements Builder</h3>
            <p style="font-size: 0.825rem;">Customize what fields, questions, and documents guests must submit.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="manager.openAddRequirementModal()">+ Add Requirement</button>
        </div>

        <div class="requirement-builder-list" id="req-builder-container">
          ${this.newEvent.requirements.map((req, idx) => `
            <div class="req-item-card">
              <div class="req-drag-handle" title="Reorder">☰</div>
              <div class="req-info">
                <div class="req-title">
                  ${req.label} ${req.required ? '<span style="color:#EF4444;">*</span>' : '<span style="font-size:0.75rem;color:var(--text-muted);">(Optional)</span>'}
                </div>
                <span class="req-type-pill">${req.type.toUpperCase()}</span>
                ${req.description ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${req.description}</div>` : ''}
              </div>
              <div class="req-actions">
                <button class="btn btn-secondary btn-sm" onclick="manager.moveReq(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''} title="Move Up">↑</button>
                <button class="btn btn-secondary btn-sm" onclick="manager.moveReq(${idx}, 1)" ${idx === this.newEvent.requirements.length - 1 ? 'disabled style="opacity:0.3;"' : ''} title="Move Down">↓</button>
                <button class="btn btn-secondary btn-sm" onclick="manager.duplicateReq(${idx})" title="Duplicate">❐</button>
                <button class="btn btn-danger btn-sm" onclick="manager.deleteReq(${idx})" title="Delete">🗑</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (this.wizardStep === 4) {
      return `
        <div class="flex-between" style="margin-bottom: 1.25rem;">
          <div>
            <h3>Step 4 — Document Vault & Guest Guidelines</h3>
            <p style="font-size: 0.825rem;">Attach rulebooks, line-up schedules, VIP guides, or liability forms (PDF, PNG, JPG).</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="document.getElementById('wiz-doc-upload-input').click()">+ Upload Document</button>
          <input type="file" id="wiz-doc-upload-input" accept=".pdf,image/*,.doc,.docx" style="display:none;" onchange="manager.handleDocUpload(event)" />
        </div>

        ${this.newEvent.documents.length === 0 ? `
          <div class="empty-state" style="padding: 2rem;">
            <div class="empty-icon-wrap" style="width: 48px; height: 48px; font-size: 1.25rem;">📁</div>
            <div class="empty-title">No documents attached yet</div>
            <p class="empty-desc">Optional: Add event guidelines or venue map for registered guests.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${this.newEvent.documents.map((doc, idx) => `
              <div class="req-item-card">
                <div style="font-size: 1.5rem;">${doc.type === 'pdf' ? '📄' : '🖼️'}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; font-size: 0.9rem;">${doc.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${doc.size} • Uploaded ${doc.uploadDate}</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="manager.deleteDoc(${idx})">Delete</button>
              </div>
            `).join('')}
          </div>
        `}
      `;
    }

    if (this.wizardStep === 5) {
      return `
        <h3 style="margin-bottom: 1rem;">Step 5 — Publish Studio & Live Preview</h3>
        <p style="margin-bottom: 1.5rem; font-size: 0.875rem;">Verify all details before publishing your event to guests.</p>

        <div class="event-card" style="margin-bottom: 1.5rem;">
          <div class="event-cover-wrap">
            <img src="${this.newEvent.coverImage}" class="event-cover-img" />
          </div>
          <div class="event-card-body">
            <h2 style="font-size: 1.3rem;">${this.newEvent.name || 'Untitled Event'}</h2>
            <p style="color: var(--accent-secondary); font-size: 0.85rem;">${this.newEvent.tagline || ''}</p>
            <div class="event-meta-row" style="margin-top: 0.5rem;">
              <span>📅 ${this.newEvent.date}</span>
              <span>•</span>
              <span>⏰ ${this.newEvent.startTime} - ${this.newEvent.endTime}</span>
              <span>•</span>
              <span>📍 ${this.newEvent.venue || 'Venue TBD'}</span>
            </div>
            <p style="font-size: 0.875rem; margin-top: 0.5rem;">${this.newEvent.description || 'No description provided.'}</p>

            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); display: flex; gap: 1.5rem;">
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Max Passes</span>
                <div style="font-weight: 700; font-size: 1.1rem;">${this.newEvent.tokenSettings.totalLimit}</div>
              </div>
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Required Fields</span>
                <div style="font-weight: 700; font-size: 1.1rem;">${this.newEvent.requirements.length} Fields</div>
              </div>
              <div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">Documents</span>
                <div style="font-weight: 700; font-size: 1.1rem;">${this.newEvent.documents.length} Files</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  nextStep() {
    this.saveCurrentStepInputs();
    if (this.wizardStep === 1) {
      if (!this.newEvent.name || !this.newEvent.venue) {
        notifications.showToast('Please enter event name and venue', 'warning');
        return;
      }
    }
    this.wizardStep = Math.min(5, this.wizardStep + 1);
    if (window.app) window.app.renderApp();
  }

  prevStep() {
    this.saveCurrentStepInputs();
    this.wizardStep = Math.max(1, this.wizardStep - 1);
    if (window.app) window.app.renderApp();
  }

  saveCurrentStepInputs() {
    if (this.wizardStep === 1) {
      const name = document.getElementById('wiz-name');
      if (name) this.newEvent.name = name.value;
      const tag = document.getElementById('wiz-tagline');
      if (tag) this.newEvent.tagline = tag.value;
      const desc = document.getElementById('wiz-desc');
      if (desc) this.newEvent.description = desc.value;
      const date = document.getElementById('wiz-date');
      if (date) this.newEvent.date = date.value;
      const st = document.getElementById('wiz-start-time');
      if (st) this.newEvent.startTime = st.value;
      const et = document.getElementById('wiz-end-time');
      if (et) this.newEvent.endTime = et.value;
      const venue = document.getElementById('wiz-venue');
      if (venue) this.newEvent.venue = venue.value;
      const loc = document.getElementById('wiz-location');
      if (loc) this.newEvent.location = loc.value;
    } else if (this.wizardStep === 2) {
      const limit = document.getElementById('wiz-token-limit');
      if (limit) this.newEvent.tokenSettings.totalLimit = parseInt(limit.value) || 500;
      const prefix = document.getElementById('wiz-token-prefix');
      if (prefix) this.newEvent.tokenSettings.prefix = prefix.value.trim().toUpperCase() || 'EP';
    }
  }

  handleCoverUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.newEvent.coverImage = e.target.result;
        const prev = document.getElementById('wiz-cover-preview');
        if (prev) prev.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  updateTokenPreview() {
    const limit = document.getElementById('wiz-token-limit');
    const prefix = document.getElementById('wiz-token-prefix');
    const prevTotal = document.getElementById('prev-total');
    const prevRem = document.getElementById('prev-remaining');
    const sample = document.getElementById('prev-sample-token');

    const limVal = limit ? limit.value : 500;
    const pfxVal = prefix ? prefix.value.toUpperCase() : 'EP';

    if (prevTotal) prevTotal.innerText = limVal;
    if (prevRem) prevRem.innerText = limVal;
    if (sample) sample.innerText = `${pfxVal}-10001`;
  }

  moveReq(index, delta) {
    const newIdx = index + delta;
    if (newIdx < 0 || newIdx >= this.newEvent.requirements.length) return;
    const item = this.newEvent.requirements.splice(index, 1)[0];
    this.newEvent.requirements.splice(newIdx, 0, item);
    if (window.app) window.app.renderApp();
  }

  duplicateReq(index) {
    const item = { ...this.newEvent.requirements[index], id: 'req_' + Date.now(), label: this.newEvent.requirements[index].label + ' (Copy)' };
    this.newEvent.requirements.splice(index + 1, 0, item);
    if (window.app) window.app.renderApp();
  }

  deleteReq(index) {
    this.newEvent.requirements.splice(index, 1);
    if (window.app) window.app.renderApp();
  }

  openAddRequirementModal() {
    const modalHtml = `
      <div class="modal-header">
        <h3>Add Registration Requirement</h3>
        <button class="icon-btn" onclick="app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <form id="new-req-form" onsubmit="manager.saveNewRequirement(event)">
          <div class="form-group">
            <label class="form-label">Field Label / Question <span class="required-star">*</span></label>
            <input type="text" id="req-field-label" placeholder="e.g. Student College ID Card" required />
          </div>
          <div class="form-group">
            <label class="form-label">Field Type</label>
            <select id="req-field-type">
              <option value="text">Text (Single Line)</option>
              <option value="email">Email Address</option>
              <option value="mobile">Mobile Number</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="dropdown">Dropdown Selection</option>
              <option value="radio">Radio Buttons</option>
              <option value="checkbox">Checkbox</option>
              <option value="address">Address</option>
              <option value="college">College / University</option>
              <option value="branch">Branch / Department</option>
              <option value="roll_number">Roll Number / Student ID</option>
              <option value="profile_photo">Profile Photo Capture</option>
              <option value="id_card">Student ID Card Upload</option>
              <option value="pdf_upload">PDF Document Upload</option>
              <option value="image_upload">Image Upload</option>
              <option value="custom_question">Custom Paragraph Question</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Helper Description</label>
            <input type="text" id="req-field-desc" placeholder="e.g. Upload a clear picture of both sides" />
          </div>
          <div class="flex-between" style="padding: 0.5rem 0;">
            <label class="form-label" style="margin-bottom:0;">Mark as Required Field</label>
            <label class="switch">
              <input type="checkbox" id="req-field-required" checked />
              <span class="slider"></span>
            </label>
          </div>
          <div class="modal-footer" style="padding: 1rem 0 0; background: transparent;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Field</button>
          </div>
        </form>
      </div>
    `;
    app.openModal(modalHtml);
  }

  saveNewRequirement(e) {
    e.preventDefault();
    const label = document.getElementById('req-field-label').value;
    const type = document.getElementById('req-field-type').value;
    const desc = document.getElementById('req-field-desc').value;
    const required = document.getElementById('req-field-required').checked;

    this.newEvent.requirements.push({
      id: 'req_' + Date.now(),
      label,
      type,
      description: desc,
      required
    });

    app.closeModal();
    notifications.showToast('Requirement field added', 'success');
    if (window.app) window.app.renderApp();
  }

  handleDocUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      this.newEvent.documents.push({
        id: 'doc_' + Date.now(),
        name: file.name,
        size: sizeMB,
        uploadDate: new Date().toISOString().split('T')[0],
        type: isPdf ? 'pdf' : 'image',
        url: '#'
      });
      notifications.showToast(`Document "${file.name}" uploaded`, 'success');
      if (window.app) window.app.renderApp();
    }
  }

  deleteDoc(index) {
    this.newEvent.documents.splice(index, 1);
    if (window.app) window.app.renderApp();
  }

  saveEvent(status = 'active') {
    this.saveCurrentStepInputs();
    this.newEvent.status = status;
    db.saveEvent(this.newEvent);

    notifications.showToast(`Event ${status === 'active' ? 'published' : 'saved as draft'} successfully!`, 'success');
    
    // Add notification
    db.addNotification({
      title: `Event ${status === 'active' ? 'Published' : 'Drafted'}`,
      message: `"${this.newEvent.name}" is now ${status === 'active' ? 'live for registrations' : 'in your drafts'}.`,
      type: 'success'
    });

    // Reset wizard
    this.wizardStep = 1;
    this.newEvent = this.getBlankEventState();
    app.navigate('dashboard');
  }
}

const manager = new EventManagerModule();
