/* ==========================================================================
   EVENTPASS — GUEST EXPERIENCE & APPROVAL SYSTEM
   ========================================================================== */

class GuestModule {
  constructor() {
    this.activeGuestTab = 'all'; // 'all', 'pending', 'approved', 'checkedin', 'rejected', 'blocked'
    this.searchQuery = '';
    this.selectedEventFilter = 'all';
    this.uploadedFilesMap = {};
  }

  // --- GUEST STUDENT PORTAL VIEWS ---

  renderGuestHomeView() {
    const user = auth.getCurrentUser();
    const events = db.getEvents().filter(e => e.status === 'active');
    const myRegistrations = db.getGuests().filter(g => g.email === user.email || g.name === user.name);

    return `
      <div class="animate-fade">
        <div class="page-header">
          <div class="welcome-greeting">
            <img src="${user.avatar}" class="welcome-avatar" alt="${user.name}" />
            <div class="greeting-text">
              <h1>Welcome, ${user.name}</h1>
              <p>Discover campus events, access digital passes & register in seconds</p>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.navigate('my_passes')">🎟️ My Passes</button>
        </div>

        <!-- Featured Events -->
        <h2 style="margin-bottom: 1rem;">Available Events for Registration</h2>
        <div class="events-grid" style="margin-bottom: 2rem;">
          ${events.map(evt => {
            const isRegistered = myRegistrations.find(r => r.eventId === evt.id);
            return `
              <div class="event-card">
                <div class="event-cover-wrap">
                  <img src="${evt.coverImage}" class="event-cover-img" alt="${evt.name}" />
                  <div class="event-badge-overlay">
                    ${isRegistered ? `
                      <span class="badge badge-${isRegistered.status}">${isRegistered.status.toUpperCase()}</span>
                    ` : `
                      <span class="badge badge-role">OPEN FOR ALL</span>
                    `}
                  </div>
                </div>
                <div class="event-card-body">
                  <h3 class="event-title">${evt.name}</h3>
                  <div class="event-meta-row">
                    <span>📅 ${evt.date}</span>
                    <span>•</span>
                    <span>⏰ ${evt.startTime}</span>
                  </div>
                  <div class="event-meta-row" style="color:var(--text-muted);">
                    <span>📍 ${evt.venue}</span>
                  </div>
                  <p style="font-size: 0.85rem; color: var(--text-secondary);">${evt.description ? evt.description.substring(0, 110) + '...' : ''}</p>

                  <div class="event-card-actions">
                    ${isRegistered ? `
                      <button class="btn btn-secondary btn-sm btn-block" onclick="guest.viewRegistrationStatus('${isRegistered.id}')">
                        Track Registration (${isRegistered.status.toUpperCase()})
                      </button>
                    ` : `
                      <button class="btn btn-primary btn-sm btn-block" onclick="guest.openRegistrationModal('${evt.id}')">
                        Register for Event →
                      </button>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- My Registration History -->
        <h2 style="margin-bottom: 1rem;">My Registration History</h2>
        ${myRegistrations.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon-wrap">🎟️</div>
            <div class="empty-title">No event registrations yet</div>
            <p class="empty-desc">Choose an event above and complete registration to get your digital entry pass.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${myRegistrations.map(reg => {
              const evt = db.getEventById(reg.eventId) || { name: 'Unknown Event', date: 'TBD' };
              return `
                <div class="req-item-card" style="cursor: pointer;" onclick="guest.viewRegistrationStatus('${reg.id}')">
                  <div style="font-size: 1.5rem;">${reg.status === 'approved' || reg.status === 'checkedin' ? '🎫' : '⏳'}</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 0.95rem;">${evt.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Registered on ${reg.registrationDate} • Token: ${reg.token || 'Pending Generation'}</div>
                  </div>
                  <span class="badge badge-${reg.status}">${reg.status.toUpperCase()}</span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  // Dynamic Registration Modal Generator
  openRegistrationModal(eventId) {
    const evt = db.getEventById(eventId);
    if (!evt) return;
    const user = auth.getCurrentUser();
    this.uploadedFilesMap = {};

    const reqs = evt.requirements || [];

    const modalHtml = `
      <div class="modal-header">
        <div>
          <h3>Register: ${evt.name}</h3>
          <p style="font-size: 0.775rem; color: var(--accent-secondary);">From Registration to Check-in — Simple, Secure, Seamless.</p>
        </div>
        <button class="icon-btn" onclick="app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <form id="dynamic-reg-form" onsubmit="guest.handleDynamicSubmit(event, '${evt.id}')">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required-star">*</span></label>
            <input type="text" name="Full Name" value="${user.name}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address <span class="required-star">*</span></label>
            <input type="email" name="Email Address" value="${user.email}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number <span class="required-star">*</span></label>
            <input type="tel" name="Mobile Number" value="${user.mobile || '+91 98765 43210'}" required />
          </div>

          <!-- Dynamic Event Custom Fields -->
          ${reqs.map((req, idx) => this.renderDynamicField(req, idx)).join('')}

          <div class="modal-footer" style="padding: 1.25rem 0 0; background: transparent;">
            <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Registration</button>
          </div>
        </form>
      </div>
    `;
    app.openModal(modalHtml);
  }

  renderDynamicField(req, idx) {
    if (['Full Name', 'Email Address', 'Mobile Number'].includes(req.label)) {
      return ''; // Already rendered standard base fields
    }

    const reqAttr = req.required ? 'required' : '';
    const reqStar = req.required ? '<span class="required-star">*</span>' : '<span style="font-size:0.75rem;color:var(--text-muted);">(Optional)</span>';
    const cleanDesc = (req.description && !/^custom\s+[\w_]+\s+requirement$/i.test(req.description.trim()) && !/^custom\s+requirement$/i.test(req.description.trim())) ? req.description.trim() : '';

    if (req.type === 'dropdown' && req.options) {
      return `
        <div class="form-group">
          <label class="form-label">${req.label} ${reqStar}</label>
          <select name="${req.label}" ${reqAttr}>
            <option value="">Select option...</option>
            ${req.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
          ${cleanDesc ? `<div class="form-hint">${cleanDesc}</div>` : ''}
        </div>
      `;
    }

    if (req.type === 'radio' && req.options) {
      return `
        <div class="form-group">
          <label class="form-label">${req.label} ${reqStar}</label>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.35rem;">
            ${req.options.map(opt => `
              <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.875rem; cursor: pointer;">
                <input type="radio" name="${req.label}" value="${opt}" ${reqAttr} style="width: auto;" />
                ${opt}
              </label>
            `).join('')}
          </div>
          ${cleanDesc ? `<div class="form-hint">${cleanDesc}</div>` : ''}
        </div>
      `;
    }

    if (['id_card', 'pdf_upload', 'image_upload', 'profile_photo'].includes(req.type)) {
      return `
        <div class="form-group">
          <label class="form-label">${req.label} ${reqStar}</label>
          <div class="glass-panel" style="padding: 1rem; text-align: center; border: 1px dashed rgba(99,102,241,0.4); cursor: pointer;" onclick="document.getElementById('file-input-${idx}').click()">
            <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">📤</div>
            <div style="font-size: 0.85rem; font-weight: 600;" id="file-label-${idx}">Click to upload file / photo</div>
            <div class="form-hint">${cleanDesc || 'Supports PDF, JPG, PNG up to 5MB'}</div>
            <input type="file" id="file-input-${idx}" style="display: none;" onchange="guest.handleFileUpload(event, '${req.label}', 'file-label-${idx}')" />
          </div>
        </div>
      `;
    }

    return `
      <div class="form-group">
        <label class="form-label">${req.label} ${reqStar}</label>
        <input type="${req.type === 'number' ? 'number' : 'text'}" name="${req.label}" placeholder="Enter ${req.label}..." ${reqAttr} />
        ${cleanDesc ? `<div class="form-hint">${cleanDesc}</div>` : ''}
      </div>
    `;
  }

  handleFileUpload(event, fieldLabel, labelElementId) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFilesMap[fieldLabel] = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
      };
      const lbl = document.getElementById(labelElementId);
      if (lbl) {
        lbl.innerHTML = `<span style="color:#10B981;">✓ ${file.name}</span> (${(file.size / 1024).toFixed(1)} KB)`;
      }
    }
  }

  handleDynamicSubmit(event, eventId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const answers = {};

    formData.forEach((value, key) => {
      answers[key] = value;
    });

    const user = auth.getCurrentUser();
    const guestId = 'gst_' + Date.now();
    const token = 'EP-PASS-' + Math.floor(10000 + Math.random() * 90000);
    const passId = 'PASS-' + Math.floor(100000 + Math.random() * 900000);

    const documents = Object.keys(this.uploadedFilesMap).map(k => this.uploadedFilesMap[k]);

    const newGuest = {
      id: guestId,
      eventId: eventId,
      name: answers['Full Name'] || user.name,
      email: answers['Email Address'] || user.email,
      mobile: answers['Mobile Number'] || user.mobile,
      avatar: user.avatar,
      college: answers['College / Institute'] || user.college || 'National Institute of Technology',
      branch: answers['Department / Branch'] || user.branch || 'Engineering',
      rollNo: answers['Student Roll Number'] || 'REG-' + Math.floor(1000 + Math.random() * 9000),
      status: 'pending', // Pending manager approval
      token: token,
      passId: passId,
      registrationDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      checkInTime: null,
      answers: answers,
      documents: documents
    };

    db.saveGuest(newGuest);
    app.closeModal();

    // Notify Manager
    db.addNotification({
      title: 'New Registration Submitted',
      message: `${newGuest.name} submitted registration for event approval.`,
      type: 'info'
    });

    this.renderSubmissionSuccessModal(newGuest);
  }

  renderSubmissionSuccessModal(guest) {
    const modalHtml = `
      <div class="modal-body" style="text-align: center; padding: 2rem 1.5rem;">
        <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(245, 158, 11, 0.15); color: #F59E0B; font-size: 2.25rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
          ⏳
        </div>
        <h2 style="font-size: 1.35rem; margin-bottom: 0.5rem;">Registration Submitted!</h2>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
          Your registration has been sent to the Event Manager for verification. You will be notified as soon as your pass is approved.
        </p>

        <div class="glass-panel" style="padding: 1rem; background: var(--bg-tertiary); text-align: left; margin-bottom: 1.5rem;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">Tracking Pass ID</div>
          <div style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-secondary); font-size: 1rem;">${guest.passId}</div>
          <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.85rem;">
            <span>Current Status:</span>
            <span class="badge badge-pending">PENDING APPROVAL</span>
          </div>
        </div>

        <button class="btn btn-primary btn-block" onclick="app.closeModal(); if(window.app) window.app.renderApp();">
          Done / Return Home
        </button>
      </div>
    `;
    app.openModal(modalHtml);
  }

  viewRegistrationStatus(guestId) {
    const g = db.getGuestById(guestId);
    if (!g) return;

    if (g.status === 'approved' || g.status === 'checkedin') {
      scanner.openDigitalPassModal(g.id);
    } else {
      const modalHtml = `
        <div class="modal-header">
          <h3>Registration Status</h3>
          <button class="icon-btn" onclick="app.closeModal()">✕</button>
        </div>
        <div class="modal-body" style="text-align: center; padding: 1.75rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">
            ${g.status === 'pending' ? '⏳' : g.status === 'rejected' ? '❌' : '🛑'}
          </div>
          <span class="badge badge-${g.status}" style="font-size: 0.9rem; padding: 0.4rem 1rem; margin-bottom: 1rem;">
            ${g.status.toUpperCase()}
          </span>
          <h3 style="margin-top: 0.5rem;">${g.name}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Pass ID: ${g.passId}</p>

          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">
            ${g.status === 'pending' ? 'Your pass request is currently being reviewed by the organizing committee.' : ''}
            ${g.status === 'rejected' ? 'Unfortunately your registration could not be approved at this time.' : ''}
            ${g.status === 'blocked' ? 'This entry pass has been restricted by event security.' : ''}
          </p>
        </div>
      `;
      app.openModal(modalHtml);
    }
  }

  // --- MANAGER GUEST MANAGEMENT & APPROVAL SYSTEM ---

  renderManagerGuestView() {
    const allGuests = db.getGuests();
    const events = db.getEvents();

    const filtered = allGuests.filter(g => {
      // Tab filter
      if (this.activeGuestTab !== 'all' && g.status !== this.activeGuestTab) return false;
      // Event filter
      if (this.selectedEventFilter !== 'all' && g.eventId !== this.selectedEventFilter) return false;
      // Search filter
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesEmail = g.email.toLowerCase().includes(q);
        const matchesMobile = g.mobile && g.mobile.toLowerCase().includes(q);
        const matchesToken = g.token && g.token.toLowerCase().includes(q);
        const matchesPassId = g.passId && g.passId.toLowerCase().includes(q);
        const matchesRoll = g.rollNo && g.rollNo.toLowerCase().includes(q);
        const matchesCollege = g.college && g.college.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesMobile || matchesToken || matchesPassId || matchesRoll || matchesCollege;
      }
      return true;
    });

    const counts = {
      all: allGuests.length,
      pending: allGuests.filter(g => g.status === 'pending').length,
      approved: allGuests.filter(g => g.status === 'approved').length,
      checkedin: allGuests.filter(g => g.status === 'checkedin').length,
      rejected: allGuests.filter(g => g.status === 'rejected').length,
      blocked: allGuests.filter(g => g.status === 'blocked').length
    };

    return `
      <div class="animate-fade">
        <div class="page-header">
          <div>
            <h1>Guest Approvals & Management</h1>
            <p>Review registrations, verify identity documents, approve passes & manage security</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('scanner')">📷 Live Scanner</button>
        </div>

        <!-- Filter Bar -->
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
          <div style="flex: 1; min-width: 240px;">
            <input type="text" placeholder="🔍 Search by Name, Email, Mobile, Token, Pass ID, Roll No..." value="${this.searchQuery}" oninput="guest.handleSearch(event)" />
          </div>
          <div style="min-width: 180px;">
            <select onchange="guest.handleEventFilter(event)">
              <option value="all">All Events</option>
              ${events.map(e => `<option value="${e.id}" ${this.selectedEventFilter === e.id ? 'selected' : ''}>${e.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Status Filter Tabs -->
        <div class="tabs-container">
          <button class="tab-btn ${this.activeGuestTab === 'all' ? 'active' : ''}" onclick="guest.setTab('all')">
            All Guests <span class="tab-badge">${counts.all}</span>
          </button>
          <button class="tab-btn ${this.activeGuestTab === 'pending' ? 'active' : ''}" onclick="guest.setTab('pending')">
            Pending <span class="tab-badge" style="background:var(--status-pending);">${counts.pending}</span>
          </button>
          <button class="tab-btn ${this.activeGuestTab === 'approved' ? 'active' : ''}" onclick="guest.setTab('approved')">
            Approved <span class="tab-badge">${counts.approved}</span>
          </button>
          <button class="tab-btn ${this.activeGuestTab === 'checkedin' ? 'active' : ''}" onclick="guest.setTab('checkedin')">
            Checked In <span class="tab-badge">${counts.checkedin}</span>
          </button>
          <button class="tab-btn ${this.activeGuestTab === 'rejected' ? 'active' : ''}" onclick="guest.setTab('rejected')">
            Rejected <span class="tab-badge">${counts.rejected}</span>
          </button>
          <button class="tab-btn ${this.activeGuestTab === 'blocked' ? 'active' : ''}" onclick="guest.setTab('blocked')">
            Blocked <span class="tab-badge" style="background:#EF4444;">${counts.blocked}</span>
          </button>
        </div>

        <!-- Guests Grid / List -->
        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon-wrap">👥</div>
            <div class="empty-title">No guests found</div>
            <p class="empty-desc">No registration records match your current filter criteria.</p>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${filtered.map(g => this.renderGuestRow(g)).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderGuestRow(g) {
    const evt = db.getEventById(g.eventId) || { name: 'Event' };

    return `
      <div class="glass-panel" style="padding: 1.15rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 1rem; min-width: 220px;">
          <img src="${g.avatar}" style="width: 48px; height: 48px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--border-subtle);" alt="${g.name}" />
          <div>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${g.name}</div>
            <div style="font-size: 0.8rem; color: var(--accent-secondary);">${g.email} • ${g.mobile}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${evt.name} • ${g.college || ''}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="text-align: right; margin-right: 0.5rem;">
            <span class="badge badge-${g.status}">${g.status.toUpperCase()}</span>
            <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-top: 3px;">
              ${g.token || g.passId}
            </div>
          </div>

          <button class="btn btn-secondary btn-sm" onclick="guest.openGuestDossier('${g.id}')">
            View Details
          </button>

          ${g.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="guest.updateGuestStatus('${g.id}', 'approved')">
              ✓ Approve
            </button>
            <button class="btn btn-danger btn-sm" onclick="guest.updateGuestStatus('${g.id}', 'rejected')">
              ✕ Reject
            </button>
          ` : ''}

          ${g.status === 'approved' ? `
            <button class="btn btn-primary btn-sm" onclick="scanner.openDigitalPassModal('${g.id}')">
              🎟️ View Pass
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  openGuestDossier(guestId) {
    const g = db.getGuestById(guestId);
    if (!g) return;
    const evt = db.getEventById(g.eventId) || { name: 'Event' };

    const modalHtml = `
      <div class="modal-header">
        <div>
          <h3>Guest Dossier</h3>
          <span class="badge badge-${g.status}">${g.status.toUpperCase()}</span>
        </div>
        <button class="icon-btn" onclick="app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <!-- Guest Profile Header -->
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem;">
          <img src="${g.avatar}" style="width: 72px; height: 72px; border-radius: var(--radius-lg); object-fit: cover; border: 2px solid var(--accent-primary);" />
          <div>
            <h2 style="font-size: 1.25rem;">${g.name}</h2>
            <div style="color: var(--accent-secondary); font-size: 0.85rem;">${g.email} • ${g.mobile}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${g.college} (${g.branch})</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Roll No: ${g.rollNo}</div>
          </div>
        </div>

        <!-- Pass & Token Info -->
        <div class="glass-panel" style="padding: 1rem; background: var(--bg-tertiary); margin-bottom: 1.25rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-muted);">Event:</span>
              <div style="font-weight: 700;">${evt.name}</div>
            </div>
            <div>
              <span style="color: var(--text-muted);">Token Code:</span>
              <div style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-secondary);">${g.token}</div>
            </div>
            <div>
              <span style="color: var(--text-muted);">Pass ID:</span>
              <div style="font-family: var(--font-mono); font-weight: 700;">${g.passId}</div>
            </div>
            <div>
              <span style="color: var(--text-muted);">Registration Time:</span>
              <div>${g.registrationDate}</div>
            </div>
          </div>
        </div>

        <!-- Custom Answers -->
        <h4 style="margin-bottom: 0.75rem;">Registration Form Responses</h4>
        <div class="glass-panel" style="padding: 1rem; margin-bottom: 1.25rem;">
          ${g.answers ? Object.keys(g.answers).map(k => `
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.85rem;">
              <span style="color: var(--text-muted);">${k}:</span>
              <span style="font-weight: 600; text-align: right;">${g.answers[k]}</span>
            </div>
          `).join('') : '<p style="font-size:0.8rem;">No custom responses.</p>'}
        </div>

        <!-- Uploaded Documents -->
        <h4 style="margin-bottom: 0.75rem;">Uploaded Verification Documents</h4>
        ${g.documents && g.documents.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem;">
            ${g.documents.map(d => `
              <div class="req-item-card" style="padding: 0.6rem 0.85rem;">
                <span>${d.type === 'pdf' ? '📄' : '🖼️'}</span>
                <div style="flex: 1; font-size: 0.85rem; font-weight: 600;">${d.name}</div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${d.size || ''}</span>
              </div>
            `).join('')}
          </div>
        ` : `<p style="font-size:0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">No documents attached.</p>`}

        <!-- Actions Panel -->
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid var(--border-subtle);">
          ${g.status !== 'approved' ? `<button class="btn btn-success btn-sm" onclick="guest.updateGuestStatus('${g.id}', 'approved')">✓ Approve Pass</button>` : ''}
          ${g.status !== 'rejected' ? `<button class="btn btn-secondary btn-sm" onclick="guest.updateGuestStatus('${g.id}', 'rejected')">✕ Reject</button>` : ''}
          ${g.status !== 'blocked' ? `
            <button class="btn btn-danger btn-sm" onclick="guest.confirmBlockGuest('${g.id}')">🛑 Block Guest</button>
          ` : `
            <button class="btn btn-success btn-sm" onclick="guest.updateGuestStatus('${g.id}', 'approved')">Unblock Guest</button>
          `}
          <button class="btn btn-secondary btn-sm" style="color: #EF4444;" onclick="guest.confirmDeleteGuest('${g.id}')">🗑 Remove</button>
        </div>
      </div>
    `;
    app.openModal(modalHtml);
  }

  updateGuestStatus(guestId, newStatus) {
    const g = db.getGuestById(guestId);
    if (!g) return;
    g.status = newStatus;
    db.saveGuest(g);

    notifications.showToast(`Guest marked as ${newStatus.toUpperCase()}`, newStatus === 'approved' ? 'success' : 'warning');
    
    // In-app Notification for Guest
    db.addNotification({
      title: `Registration ${newStatus.toUpperCase()}`,
      message: `Your registration for the event has been updated to: ${newStatus.toUpperCase()}`,
      type: newStatus === 'approved' ? 'success' : 'warning'
    });

    app.closeModal();
    if (window.app) window.app.renderApp();
  }

  confirmBlockGuest(guestId) {
    const g = db.getGuestById(guestId);
    if (!g) return;
    if (confirm(`⚠️ Are you sure you want to BLOCK ${g.name}? Blocked guests will be rejected immediately during scanner check-in.`)) {
      this.updateGuestStatus(guestId, 'blocked');
    }
  }

  confirmDeleteGuest(guestId) {
    const g = db.getGuestById(guestId);
    if (!g) return;
    if (confirm(`Remove ${g.name} permanently from the guest list?`)) {
      db.deleteGuest(guestId);
      notifications.showToast('Guest removed', 'info');
      app.closeModal();
      if (window.app) window.app.renderApp();
    }
  }

  setTab(tab) {
    this.activeGuestTab = tab;
    if (window.app) window.app.renderApp();
  }

  handleSearch(e) {
    this.searchQuery = e.target.value;
    if (window.app) window.app.renderApp();
  }

  handleEventFilter(e) {
    this.selectedEventFilter = e.target.value;
    if (window.app) window.app.renderApp();
  }
}

const guest = new GuestModule();
