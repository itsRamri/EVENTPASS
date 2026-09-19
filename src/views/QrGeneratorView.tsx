import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { 
  QrCode, 
  Download, 
  Copy, 
  Printer, 
  Sparkles, 
  Ticket, 
  Link as LinkIcon, 
  FileText, 
  Wifi, 
  Share2, 
  Check, 
  Sliders, 
  RefreshCw
} from 'lucide-react';

export const QrGeneratorView: React.FC = () => {
  const { user, events, guests, navigate, showToast } = useApp();

  const userEmail = (user.email || '').toLowerCase().trim();
  const userMobile = (user.mobile || '').replace(/\D/g, '');
  const userId = user.id || '';

  const myEvents = events.filter(e => {
    const creatorEmail = (e.creatorEmail || '').toLowerCase().trim();
    const creatorMobile = (e.creatorMobile || '').replace(/\D/g, '');
    const creatorId = e.creatorId || '';

    if (creatorEmail || creatorId || creatorMobile) {
      return (
        (creatorEmail && creatorEmail === userEmail) ||
        (creatorId && creatorId === userId) ||
        (creatorMobile && userMobile && creatorMobile === userMobile)
      );
    }
    return false;
  });

  // Mode: 'pass' | 'event_link' | 'url' | 'text' | 'wifi'
  const [genMode, setGenMode] = useState<'pass' | 'event_link' | 'url' | 'text' | 'wifi'>('pass');

  // Input States
  const [selectedEvtId, setSelectedEvtId] = useState<string>(myEvents[0]?.id || events[0]?.id || '');
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [customToken, setCustomToken] = useState<string>('EP-PASS-10042');
  const [customUrl, setCustomUrl] = useState<string>('https://eventpass.io/register');
  const [customText, setCustomText] = useState<string>('EVENTPASS-VIP-ACCESS-2026');
  
  // Wi-Fi States
  const [wifiSsid, setWifiSsid] = useState<string>('Campus_Event_Guest');
  const [wifiPassword, setWifiPassword] = useState<string>('EventPass@2026');
  const [wifiType, setWifiType] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');

  // Customization Options
  const [fgColor, setFgColor] = useState<string>('#1E293B');
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [qrSize] = useState<number>(320);
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [badgeLabel, setBadgeLabel] = useState<string>('EVENTPASS OFFICIAL');
  const [includeLogo] = useState<boolean>(true);

  // Output QR Data URL & SVG
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentEvent = myEvents.find(e => e.id === selectedEvtId) || myEvents[0] || events[0] || {
    id: 'evt_demo',
    name: 'Sample Event',
    venue: 'Main Auditorium',
    date: new Date().toISOString().split('T')[0],
    tokenSettings: { prefix: 'EP' }
  };

  const eventGuests = guests.filter(g => g.eventId === currentEvent.id);
  const selectedGuest = guests.find(g => g.id === selectedGuestId);

  // Compute what payload the QR code should contain
  const getQrPayload = (): string => {
    switch (genMode) {
      case 'pass':
        if (selectedGuest) {
          return selectedGuest.token || `${currentEvent.tokenSettings?.prefix || 'EP'}-10001`;
        }
        return customToken || `${currentEvent.tokenSettings?.prefix || 'EP'}-10001`;

      case 'event_link':
        return `https://eventpass.io/register?eventId=${currentEvent.id}`;

      case 'url':
        return customUrl.startsWith('http') ? customUrl : `https://${customUrl}`;

      case 'text':
        return customText || 'EVENTPASS';

      case 'wifi':
        return `WIFI:T:${wifiType};S:${wifiSsid};P:${wifiPassword};;`;

      default:
        return 'EVENTPASS';
    }
  };

  const currentPayload = getQrPayload();

  // Generate QR Code on canvas and data URL
  useEffect(() => {
    const generate = async () => {
      try {
        const payload = getQrPayload();
        const url = await QRCode.toDataURL(payload, {
          width: qrSize,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor
          },
          errorCorrectionLevel: errorLevel
        });
        setQrDataUrl(url);

        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, payload, {
            width: qrSize,
            margin: 2,
            color: {
              dark: fgColor,
              light: bgColor
            },
            errorCorrectionLevel: errorLevel
          });
        }
      } catch (err) {
        console.error('QR Generation failed', err);
      }
    };

    generate();
  }, [genMode, selectedEvtId, selectedGuestId, customToken, customUrl, customText, wifiSsid, wifiPassword, wifiType, fgColor, bgColor, qrSize, errorLevel]);

  // Actions
  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `eventpass-qr-${genMode}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('High-Resolution QR Code PNG downloaded!', 'success');
  };

  const handleDownloadSvg = async () => {
    try {
      const svgString = await QRCode.toString(currentPayload, {
        type: 'svg',
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor
        },
        errorCorrectionLevel: errorLevel
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventpass-qr-${genMode}-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Vector QR Code SVG downloaded!', 'success');
    } catch (err) {
      showToast('Could not export SVG', 'error');
    }
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(currentPayload);
    setCopied(true);
    showToast(`Copied QR code value: "${currentPayload}"`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintBadge = () => {
    window.print();
  };

  const handleTestInScanner = () => {
    showToast(`Simulating scan for token: ${currentPayload}`, 'info');
    navigate('scanner');
  };

  return (
    <div className="animate-fade" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>QR Code Generator Studio</h1>
          <p>Generate high-resolution, secure QR codes for Attendee Passes, Registration Links, Flyers & Gate Badges</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleTestInScanner}>
            <QrCode size={16} /> Test in Gate Scanner
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleDownloadPng}>
            <Download size={16} /> Export PNG
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '0.65rem', 
          marginBottom: '1.5rem', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', 
          gap: '0.5rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {[
          { id: 'pass' as const, label: 'Attendee Pass Token', icon: <Ticket size={16} />, desc: 'Individual entry pass' },
          { id: 'event_link' as const, label: 'Event Registration URL', icon: <LinkIcon size={16} />, desc: 'Scan to register flyer' },
          { id: 'url' as const, label: 'Custom Web Link', icon: <Share2 size={16} />, desc: 'Any website or portal' },
          { id: 'text' as const, label: 'Plain Text / Hash', icon: <FileText size={16} />, desc: 'Security access key' },
          { id: 'wifi' as const, label: 'Event Wi-Fi Access', icon: <Wifi size={16} />, desc: 'Instant guest Wi-Fi' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn-sm ${genMode === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '0.65rem 0.5rem',
              gap: '0.2rem',
              textAlign: 'center'
            }}
            onClick={() => setGenMode(tab.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
              {tab.icon} {tab.label}
            </div>
            <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Main Studio Workspace: Configuration Left, Live Preview Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT: Generator Settings Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="var(--accent-primary)" /> Configure QR Payload & Style
          </h3>

          {/* Mode Specific Inputs */}
          {genMode === 'pass' && (
            <div>
              <div className="form-group">
                <label className="form-label">Select Event <span className="required-star">*</span></label>
                <select value={selectedEvtId} onChange={e => { setSelectedEvtId(e.target.value); setSelectedGuestId(''); }}>
                  {myEvents.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.tokenSettings?.prefix || 'EP'})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Registered Guest (Optional)</label>
                <select value={selectedGuestId} onChange={e => setSelectedGuestId(e.target.value)}>
                  <option value="">-- Custom Token or Direct Pass --</option>
                  {eventGuests.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.token}) - {g.status.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {!selectedGuestId && (
                <div className="form-group">
                  <label className="form-label">Pass Token Code <span className="required-star">*</span></label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      value={customToken} 
                      onChange={e => setCustomToken(e.target.value.toUpperCase())}
                      placeholder="e.g. EP-PASS-10024"
                      style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCustomToken(`${currentEvent.tokenSettings?.prefix || 'EP'}-${Math.floor(10000 + Math.random() * 90000)}`)}
                      title="Generate Random Token"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <div className="form-hint">Unique token assigned to the physical or digital pass</div>
                </div>
              )}
            </div>
          )}

          {genMode === 'event_link' && (
            <div>
              <div className="form-group">
                <label className="form-label">Select Event for Registration QR <span className="required-star">*</span></label>
                <select value={selectedEvtId} onChange={e => setSelectedEvtId(e.target.value)}>
                  {myEvents.map(e => (
                    <option key={e.id} value={e.id}>{e.name} (ID: {e.id})</option>
                  ))}
                </select>
              </div>
              <div className="glass-panel" style={{ padding: '0.85rem 1rem', background: 'var(--bg-tertiary)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Target Registration URL</div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700, wordBreak: 'break-all', marginTop: 3 }}>
                  {`https://eventpass.io/register?eventId=${currentEvent.id}`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Print this QR code on posters or distribute on social media for 1-scan guest self-registration.
                </div>
              </div>
            </div>
          )}

          {genMode === 'url' && (
            <div className="form-group">
              <label className="form-label">Website URL <span className="required-star">*</span></label>
              <input 
                type="url" 
                value={customUrl} 
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://example.com/event-page" 
                required
              />
              <div className="form-hint">Direct users to any schedule, live stream, or sponsor page</div>
            </div>
          )}

          {genMode === 'text' && (
            <div className="form-group">
              <label className="form-label">Plain Text / Key Code <span className="required-star">*</span></label>
              <textarea 
                value={customText} 
                onChange={e => setCustomText(e.target.value)}
                placeholder="Enter arbitrary text or security code..."
                rows={3} 
                required
              />
              <div className="form-hint">Any text or JSON data payload encoded directly into the QR matrix</div>
            </div>
          )}

          {genMode === 'wifi' && (
            <div>
              <div className="form-group">
                <label className="form-label">Network Name (SSID) <span className="required-star">*</span></label>
                <input 
                  type="text" 
                  value={wifiSsid} 
                  onChange={e => setWifiSsid(e.target.value)}
                  placeholder="e.g. Campus_Hall_WiFi" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Wi-Fi Password</label>
                <input 
                  type="text" 
                  value={wifiPassword} 
                  onChange={e => setWifiPassword(e.target.value)}
                  placeholder="e.g. Hackathon2026!" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Security Encryption</label>
                <select value={wifiType} onChange={e => setWifiType(e.target.value as any)}>
                  <option value="WPA">WPA / WPA2 (Standard)</option>
                  <option value="WEP">WEP (Legacy)</option>
                  <option value="nopass">None (Open Network)</option>
                </select>
              </div>
            </div>
          )}

          {/* Style Customizer */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.925rem', marginBottom: '0.85rem', color: 'var(--text-primary)' }}>Visual Styling & Palettes</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Foreground Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="color" 
                    value={fgColor} 
                    onChange={e => setFgColor(e.target.value)}
                    style={{ width: 42, height: 38, padding: 2, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    value={fgColor} 
                    onChange={e => setFgColor(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Background Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="color" 
                    value={bgColor} 
                    onChange={e => setBgColor(e.target.value)}
                    style={{ width: 42, height: 38, padding: 2, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    value={bgColor} 
                    onChange={e => setBgColor(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textTransform: 'uppercase' }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Palette Swatches */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {[
                { name: 'Navy & White', fg: '#1E293B', bg: '#FFFFFF' },
                { name: 'Blue Accent', fg: '#4A7BF7', bg: '#FFFFFF' },
                { name: 'Emerald', fg: '#10B981', bg: '#FFFFFF' },
                { name: 'RSK Beige Theme', fg: '#1E293B', bg: '#F5F3EB' },
                { name: 'Midnight Dark', fg: '#FFFFFF', bg: '#1E293B' },
              ].map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => { setFgColor(p.fg); setBgColor(p.bg); }}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.725rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-subtle)',
                    background: p.bg,
                    color: p.fg,
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Error Correction</label>
                <select value={errorLevel} onChange={e => setErrorLevel(e.target.value as any)}>
                  <option value="L">L — Low (7% recovery)</option>
                  <option value="M">M — Medium (15% recovery)</option>
                  <option value="Q">Q — Quartile (25% recovery)</option>
                  <option value="H">H — High (30% recovery, best for print)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Badge Label Header</label>
                <input 
                  type="text" 
                  value={badgeLabel} 
                  onChange={e => setBadgeLabel(e.target.value)} 
                  placeholder="e.g. EVENTPASS OFFICIAL"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Live High-Resolution Preview & Export Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Printable Event Pass Badge Card */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '1.75rem', 
              background: 'var(--bg-card)', 
              border: '2px solid var(--border-subtle)', 
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              position: 'relative',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {/* Badge Header Ribbon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <Sparkles size={16} color="var(--accent-primary)" /> EVENTPASS
              </div>
              <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
                {badgeLabel || 'OFFICIAL PASS'}
              </span>
            </div>

            {/* Event Name & Metadata */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                {genMode === 'pass' && selectedGuest ? selectedGuest.name : currentEvent.name}
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {genMode === 'pass' && selectedGuest 
                  ? `${currentEvent.name} • ${selectedGuest.college || 'Attendee'}` 
                  : `📅 ${currentEvent.date} • 📍 ${currentEvent.venue}`}
              </div>
            </div>

            {/* The QR Code Image Canvas Container */}
            <div 
              style={{ 
                background: bgColor, 
                padding: '1.25rem', 
                borderRadius: 'var(--radius-lg)', 
                display: 'inline-block',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                border: '1px solid var(--border-subtle)',
                position: 'relative'
              }}
            >
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Generated QR Code" 
                  style={{ width: 220, height: 220, display: 'block' }} 
                />
              ) : (
                <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Generating QR...
                </div>
              )}

              {/* Center Logo Overlay */}
              {includeLogo && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: '#1E293B',
                    border: '3px solid #FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  <Sparkles size={18} />
                </div>
              )}
            </div>

            {/* Encoded Token Code Footer */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-subtle)' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Encoded Security Payload
              </div>
              <div 
                style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 800, 
                  fontSize: '0.95rem', 
                  color: 'var(--accent-primary)',
                  marginTop: 2,
                  wordBreak: 'break-all',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>{currentPayload}</span>
                <button 
                  type="button" 
                  className="icon-btn" 
                  style={{ width: 26, height: 26 }} 
                  onClick={handleCopyPayload}
                  title="Copy payload string"
                >
                  {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                </button>
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Instant Scan Verification Compatible with EVENTPASS Scanner
              </div>
            </div>
          </div>

          {/* Export & Action Buttons */}
          <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem', marginBottom: '0.65rem' }}>
              <button className="btn btn-primary" onClick={handleDownloadPng}>
                <Download size={16} /> Download PNG
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadSvg}>
                <Download size={16} /> Download SVG
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
              <button className="btn btn-secondary" onClick={handlePrintBadge}>
                <Printer size={16} /> Print Badge
              </button>
              <button className="btn btn-secondary" onClick={handleTestInScanner}>
                <QrCode size={16} /> Test in Scanner
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
