/* ==========================================================================
   EVENTPASS — NOTIFICATIONS & SOUND SYNTHESIZER
   ========================================================================== */

class NotificationManager {
  constructor() {
    this.toastContainer = null;
    this.audioCtx = null;
    this.init();
  }

  init() {
    // Create toast container if not exists
    if (!document.getElementById('toast-container')) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    } else {
      this.toastContainer = document.getElementById('toast-container');
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Synthesize sound effects without external audio files
  playSound(type) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'success' || type === 'checkin') {
        // High pleasant dual chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'warning' || type === 'duplicate') {
        // Warning double beep
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(350, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error' || type === 'blocked') {
        // Low buzzer tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  showToast(message, type = 'info', title = '') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<span style="color:#10B981;font-size:1.25rem;">✓</span>';
      this.playSound('success');
    } else if (type === 'error') {
      iconSvg = '<span style="color:#EF4444;font-size:1.25rem;">✕</span>';
      this.playSound('error');
    } else if (type === 'warning') {
      iconSvg = '<span style="color:#F59E0B;font-size:1.25rem;">⚠</span>';
      this.playSound('warning');
    } else {
      iconSvg = '<span style="color:#6366F1;font-size:1.25rem;">ℹ</span>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <div style="flex:1;">
        ${title ? `<div style="font-weight:700;font-size:0.875rem;color:var(--text-primary);">${title}</div>` : ''}
        <div style="font-size:0.825rem;color:var(--text-secondary);">${message}</div>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

const notifications = new NotificationManager();
