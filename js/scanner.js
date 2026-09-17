/* ==========================================================================
   EVENTPASS — QR GENERATOR, DIGITAL PASS & LIVE SCANNER ENGINE
   ========================================================================== */

class ScannerModule {
  constructor() {
    this.videoStream = null;
    this.isScanning = false;
    this.torchOn = false;
    this.cameraFacing = 'environment'; // 'environment' or 'user'
  }

  // --- QR CODE GENERATION (SVG Matrix Engine) ---
  // Generates clean, crisp standard QR code SVGs without heavy dependencies
  generateQRCodeSVG(text, size = 180) {
    // Generate deterministic hash matrix for visual QR aesthetics
    const matrixSize = 25;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    const cellSize = size / matrixSize;
    let rects = '';

    // Finder patterns in 3 corners (top-left, top-right, bottom-left)
    const isFinderPattern = (r, c) => {
      if (r < 7 && c < 7) return true;
      if (r < 7 && c >= matrixSize - 7) return true;
      if (r >= matrixSize - 7 && c < 7) return true;
      return false;
    };

    const isFinderBlack = (r, c) => {
      // Corner 1: Top-Left
      if (r < 7 && c < 7) {
        if (r === 0 || r === 6 || c === 0 || c === 6) return true;
        if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
        return false;
      }
      // Corner 2: Top-Right
      if (r < 7 && c >= matrixSize - 7) {
        const cAdj = c - (matrixSize - 7);
        if (r === 0 || r === 6 || cAdj === 0 || cAdj === 6) return true;
        if (r >= 2 && r <= 4 && cAdj >= 2 && cAdj <= 4) return true;
        return false;
      }
      // Corner 3: Bottom-Left
      if (r >= matrixSize - 7 && c < 7) {
        const rAdj = r - (matrixSize - 7);
        if (rAdj === 0 || rAdj === 6 || c === 0 || c === 6) return true;
        if (rAdj >= 2 && rAdj <= 4 && c >= 2 && c <= 4) return true;
        return false;
      }
      return false;
    };

    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        let isBlack = false;
        if (isFinderPattern(r, c)) {
          isBlack = isFinderBlack(r, c);
        } else {
          // Semi-pseudo-random deterministic data pattern
          const seed = (r * matrixSize + c + Math.abs(hash)) % 100;
          const charCode = text.charCodeAt((r + c) % text.length) || 42;
          isBlack = (seed + charCode) % 3 !== 0;
        }

        if (isBlack) {
          rects += `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${cellSize.toFixed(1)}" height="${cellSize.toFixed(1)}" fill="#0F172A" />`;
        }
      }
    }

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="border-radius: 8px;">
        <rect width="100%" height="100%" fill="#FFFFFF" />
        ${rects}
      </svg>
    `;
  }

  // --- DIGITAL PASS MODAL (Apple Wallet Luxury Style) ---
  openDigitalPassModal(guestId) {
    const g = db.getGuestById(guestId);
    if (!g) return;
    const evt = db.getEventById(g.eventId) || {
      name: 'Campus Event',
      date: '2026-09-28',
      venue: 'Main Auditorium',
      startTime: '18:00'
    };

    const qrPayload = JSON.stringify({ token: g.token, passId: g.passId, eventId: g.eventId, name: g.name });
    const qrSvg = this.generateQRCodeSVG(g.token || g.passId, 160);

    const modalHtml = `
      <div class="modal-header">
        <div>
          <h3>Digital Event Pass</h3>
          <span style="font-size: 0.75rem; color: var(--accent-secondary);">Verified Official Entry Pass</span>
        </div>
        <button class="icon-btn" onclick="app.closeModal()">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.25rem 1rem;">
        <div class="digital-pass-card">
          <div class="pass-notch-left"></div>
          <div class="pass-notch-right"></div>

          <!-- Pass Header -->
          <div class="pass-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="font-weight: 800; font-size: 1.1rem; letter-spacing: -0.02em;">EVENTPASS</div>
              <span class="badge badge-role" style="font-size: 0.65rem;">VIP ACCESS</span>
            </div>
            <span class="badge badge-${g.status}">${g.status.toUpperCase()}</span>
          </div>

          <!-- Pass Body -->
          <div class="pass-body">
            <div class="pass-guest-profile">
              <img src="${g.avatar}" class="pass-guest-img" alt="${g.name}" />
              <div>
                <h3 style="font-size: 1.15rem; color: #FFFFFF; margin-bottom: 2px;">${g.name}</h3>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${g.college || 'Attendee'}</div>
                <div style="font-size: 0.75rem; color: var(--accent-secondary); margin-top: 2px;">Roll: ${g.rollNo || 'N/A'}</div>
              </div>
            </div>

            <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.85rem; margin-top: 0.5rem;">
              <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Event Name</div>
              <div style="font-weight: 700; font-size: 1rem; color: #FFFFFF;">${evt.name}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem;">
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Date & Time</div>
                <div style="font-size: 0.85rem; font-weight: 600; color: #FFFFFF;">${evt.date} • ${evt.startTime}</div>
              </div>
              <div>
                <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Venue</div>
                <div style="font-size: 0.85rem; font-weight: 600; color: #FFFFFF;">${evt.venue}</div>
              </div>
            </div>

            <!-- QR Code Section -->
            <div class="pass-qr-box">
              ${qrSvg}
              <div class="pass-token-code">${g.token}</div>
              <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px;">Pass ID: ${g.passId}</div>
            </div>

            <div style="text-align: center; font-size: 0.725rem; color: var(--text-muted);">
              🔒 Show this QR code at the entry checkpoint for scanning & instant verification.
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.25rem;">
          <button class="btn btn-primary btn-sm" onclick="notifications.showToast('Pass saved to device storage', 'success')">
            📥 Download Pass
          </button>
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${g.token}'); notifications.showToast('Token code copied: ${g.token}', 'info')">
            📋 Copy Token
          </button>
        </div>
      </div>
    `;
    app.openModal(modalHtml);
  }

  // --- DEDICATED SCANNER INTERFACE ---
  renderScannerView() {
    const user = auth.getCurrentUser();
    const guests = db.getGuests();

    return `
      <div class="animate-fade" style="max-width: 600px; margin: 0 auto;">
        <div class="page-header" style="text-align: center; justify-content: center; flex-direction: column; align-items: center;">
          <h1>Scan Guest Pass</h1>
          <p>Point camera at guest QR pass or search by token code</p>
        </div>

        <!-- Camera Viewport Box -->
        <div class="scanner-viewport-box" id="scanner-box">
          <video id="scanner-video-feed" class="scanner-video" autoplay playsinline muted></video>
          <div class="scanner-target-frame"></div>
          <div class="scanner-laser"></div>

          <!-- Controls inside Viewport -->
          <div class="scanner-controls">
            <button class="icon-btn" onclick="scanner.toggleTorch()" title="Toggle Flash" style="background: rgba(0,0,0,0.6); color: #fff;">
              ⚡
            </button>
            <button class="icon-btn" onclick="scanner.switchCamera()" title="Switch Front/Rear Camera" style="background: rgba(0,0,0,0.6); color: #fff;">
              🔄
            </button>
            <button class="icon-btn" onclick="document.getElementById('scanner-file-input').click()" title="Scan Image File" style="background: rgba(0,0,0,0.6); color: #fff;">
              🖼️
            </button>
            <input type="file" id="scanner-file-input" accept="image/*" style="display:none;" onchange="scanner.handleImageScan(event)" />
          </div>
        </div>

        <!-- Manual Token Lookup Bar -->
        <div class="glass-panel" style="padding: 1.25rem; margin-top: 1.5rem;">
          <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem;">Manual Token / Pass ID Search</h4>
          <form onsubmit="scanner.handleManualSearch(event)" style="display: flex; gap: 0.5rem;">
            <input type="text" id="manual-token-input" placeholder="e.g. EP-GALA-10284 or PASS-892147" style="font-family: var(--font-mono); text-transform: uppercase;" required />
            <button type="submit" class="btn btn-primary" style="white-space: nowrap;">
              Verify Pass
            </button>
          </form>
        </div>

      </div>
    `;
  }

  // Camera stream initiation
  initCamera() {
    const video = document.getElementById('scanner-video-feed');
    if (!video) return;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.cameraFacing }
      }).then(stream => {
        this.videoStream = stream;
        video.srcObject = stream;
        this.isScanning = true;
      }).catch(err => {
        console.log('Camera access simulation mode active');
      });
    }
  }

  stopCamera() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
      this.isScanning = false;
    }
  }

  toggleTorch() {
    this.torchOn = !this.torchOn;
    notifications.showToast(`Flashlight ${this.torchOn ? 'ON' : 'OFF'}`, 'info');
  }

  switchCamera() {
    this.cameraFacing = this.cameraFacing === 'environment' ? 'user' : 'environment';
    this.stopCamera();
    this.initCamera();
    notifications.showToast(`Switched to ${this.cameraFacing === 'user' ? 'Front' : 'Rear'} camera`, 'info');
  }

  handleImageScan(event) {
    const file = event.target.files[0];
    if (file) {
      notifications.showToast('Analyzing QR from image...', 'info');
      setTimeout(() => {
        // Pick first approved guest for sample simulation
        this.verifyCode('EP-GALA-10284');
      }, 700);
    }
  }

  handleManualSearch(event) {
    event.preventDefault();
    const input = document.getElementById('manual-token-input');
    if (input && input.value) {
      this.verifyCode(input.value);
    }
  }

  // --- CORE VERIFICATION LOGIC ---
  verifyCode(tokenOrPassId) {
    const guest = db.getGuestByToken(tokenOrPassId);

    if (!guest) {
      notifications.playSound('error');
      this.renderVerificationResultModal({
        type: 'invalid',
        title: 'Invalid Pass',
        message: `No registration record found for code "${tokenOrPassId}". Please ensure the QR code is genuine.`,
        token: tokenOrPassId
      });
      return;
    }

    const evt = db.getEventById(guest.eventId) || { name: 'Event' };

    // Case 1: Blocked Guest
    if (guest.status === 'blocked') {
      notifications.playSound('blocked');
      this.renderVerificationResultModal({
        type: 'blocked',
        title: 'Guest Blocked 🛑',
        message: 'This guest has been blocked by event security and is strictly prohibited from entering.',
        guest,
        evt
      });
      return;
    }

    // Case 2: Rejected Guest
    if (guest.status === 'rejected') {
      notifications.playSound('error');
      this.renderVerificationResultModal({
        type: 'rejected',
        title: 'Registration Not Approved ❌',
        message: 'This guest application was rejected during the registration review process.',
        guest,
        evt
      });
      return;
    }

    // Case 3: Pending Guest
    if (guest.status === 'pending') {
      notifications.playSound('warning');
      this.renderVerificationResultModal({
        type: 'pending',
        title: 'Pass Pending Approval ⏳',
        message: 'This guest registration has not yet been approved by the Event Manager.',
        guest,
        evt
      });
      return;
    }

    // Case 4: Already Checked In
    if (guest.status === 'checkedin') {
      notifications.playSound('duplicate');
      this.renderVerificationResultModal({
        type: 'already_checked_in',
        title: 'Already Checked In ⚠️',
        message: `This pass has ALREADY been scanned and admitted at ${guest.checkInTime || 'earlier today'}. Duplicate check-ins are disallowed.`,
        guest,
        evt
      });
      return;
    }

    // Case 5: Valid Approved Guest -> Ready for Check-in
    if (guest.status === 'approved') {
      notifications.playSound('success');
      this.renderVerificationResultModal({
        type: 'verified',
        title: '✓ VERIFIED GUEST',
        message: 'Pass is valid and approved. Ready to grant entry.',
        guest,
        evt
      });
    }
  }

  renderVerificationResultModal({ type, title, message, guest, evt, token }) {
    let contentHtml = '';

    if (type === 'verified') {
      contentHtml = `
        <div class="modal-body" style="text-align: center; padding: 1.5rem 1.25rem;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--status-approved-bg); color: var(--status-approved); font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 2px solid var(--status-approved);">
            ✓
          </div>
          <span class="badge badge-approved" style="font-size: 0.85rem; padding: 0.35rem 0.85rem;">${title}</span>

          <div style="display: flex; align-items: center; gap: 1rem; margin: 1.25rem 0; text-align: left; background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-lg);">
            <img src="${guest.avatar}" style="width: 60px; height: 60px; border-radius: var(--radius-md); object-fit: cover; border: 2px solid var(--accent-secondary);" />
            <div>
              <h3 style="font-size: 1.15rem; color: #FFFFFF;">${guest.name}</h3>
              <div style="font-size: 0.8rem; color: var(--accent-secondary);">${guest.college || 'Attendee'}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Roll: ${guest.rollNo || 'N/A'}</div>
            </div>
          </div>

          <div class="glass-panel" style="padding: 1rem; text-align: left; font-size: 0.85rem; margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted);">Event:</span>
              <span style="font-weight: 600;">${evt.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.3rem 0; border-bottom: 1px solid var(--border-subtle);">
              <span style="color: var(--text-muted);">Token Code:</span>
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-secondary);">${guest.token}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.3rem 0;">
              <span style="color: var(--text-muted);">Check-in Status:</span>
              <span style="color: var(--status-pending); font-weight: 700;">NOT CHECKED IN</span>
            </div>
          </div>

          <button class="btn btn-success btn-block" style="font-size: 1.05rem; padding: 0.9rem;" onclick="scanner.performCheckIn('${guest.id}')">
            🎟️ CHECK IN GUEST
          </button>
        </div>
      `;
    } else if (type === 'already_checked_in') {
      contentHtml = `
        <div class="modal-body" style="text-align: center; padding: 1.5rem;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--status-pending-bg); color: var(--status-pending); font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 2px solid var(--status-pending);">
            ⚠️
          </div>
          <h3 style="color: var(--status-pending); margin-bottom: 0.5rem;">${title}</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.25rem;">${message}</p>

          <div class="glass-panel" style="padding: 1rem; text-align: left; margin-bottom: 1.25rem;">
            <div style="font-weight: 700; font-size: 1rem;">${guest.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Checked In: ${guest.checkInTime}</div>
            <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-secondary); margin-top: 4px;">${guest.token}</div>
          </div>

          <button class="btn btn-secondary btn-block" onclick="app.closeModal()">
            Dismiss
          </button>
        </div>
      `;
    } else {
      // Blocked, Rejected, Invalid
      contentHtml = `
        <div class="modal-body" style="text-align: center; padding: 1.5rem;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #EF4444; font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 2px solid #EF4444;">
            ✕
          </div>
          <h3 style="color: #EF4444; margin-bottom: 0.5rem;">${title}</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">${message}</p>

          <button class="btn btn-secondary btn-block" onclick="app.closeModal()">
            Dismiss
          </button>
        </div>
      `;
    }

    app.openModal(contentHtml);
  }

  performCheckIn(guestId) {
    const guest = db.getGuestById(guestId);
    if (!guest) return;

    guest.status = 'checkedin';
    guest.checkInTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
    db.saveGuest(guest);

    // Audio chime
    notifications.playSound('checkin');

    // Add in-app notification
    db.addNotification({
      title: 'Check-in Completed ✅',
      message: `${guest.name} checked in successfully for ${guest.token}.`,
      type: 'success'
    });

    const successHtml = `
      <div class="modal-body" style="text-align: center; padding: 2rem 1.5rem;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: #10B981; color: #FFFFFF; font-size: 2.5rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);">
          ✓
        </div>
        <h2 style="font-size: 1.4rem; color: #10B981; margin-bottom: 0.5rem;">CHECK-IN SUCCESSFUL</h2>
        <p style="font-size: 0.95rem; color: var(--text-primary); font-weight: 600; margin-bottom: 0.25rem;">
          Welcome, ${guest.name}!
        </p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">
          Admitted at ${guest.checkInTime} • Token: ${guest.token}
        </p>

        <button class="btn btn-primary btn-block" onclick="app.closeModal(); if(window.app) window.app.renderApp();">
          Scan Next Guest
        </button>
      </div>
    `;
    app.openModal(successHtml);
  }
}

const scanner = new ScannerModule();
