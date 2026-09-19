import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EventItem, RequirementField, EventDocument } from '../types';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Upload, 
  Copy, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  FileText, 
  Image as ImageIcon,
  Sparkles,
  Sliders,
  Check
} from 'lucide-react';
import { compressImageFile, readFileAsDataUrl } from '../utils/image';

export const CreateEventWizard: React.FC = () => {
  const { user, navigate, saveEvent, addNotification, showToast, editingEvent, setEditingEvent } = useApp();
  const [step, setStep] = useState<number>(1);

  // Default / editing state
  const [eventData, setEventData] = useState<EventItem>(() => {
    if (editingEvent) return JSON.parse(JSON.stringify(editingEvent));
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
        { id: 'req_1', label: 'Full Name', type: 'text', required: true, description: 'Legal name as per ID' },
        { id: 'req_2', label: 'College Email ID', type: 'email', required: true, description: 'Official campus email' },
        { id: 'req_3', label: 'Mobile Number', type: 'mobile', required: true, description: 'WhatsApp contact number' },
        { id: 'req_4', label: 'College / Institute', type: 'text', required: true, description: 'Current enrolled institution' },
        { id: 'req_5', label: 'Student ID Card / Photo Upload', type: 'image_upload', required: true, description: 'Clear photo of campus ID card' }
      ],
      documents: []
    };
  });

  const [tokensInputStr, setTokensInputStr] = useState<string>(() => {
    if (editingEvent?.tokenSettings?.tokensPerUser) {
      return String(editingEvent.tokenSettings.tokensPerUser);
    }
    return '1';
  });

  useEffect(() => {
    if (editingEvent) {
      setEventData(JSON.parse(JSON.stringify(editingEvent)));
      if (editingEvent.tokenSettings?.tokensPerUser) {
        setTokensInputStr(String(editingEvent.tokenSettings.tokensPerUser));
      }
    }
  }, [editingEvent]);

  // New Requirement Modal state
  const [isAddReqModalOpen, setIsAddReqModalOpen] = useState(false);
  const [newReqLabel, setNewReqLabel] = useState('');
  const [newReqType, setNewReqType] = useState<RequirementField['type']>('live_photo');
  const [newReqRequired, setNewReqRequired] = useState(true);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 1000, 0.85);
      setEventData(prev => ({ ...prev, coverImage: dataUrl }));
      showToast('✓ Event cover photo uploaded and ready to save to database!', 'success');
    } catch (err) {
      console.error('Cover upload error:', err);
      showToast('Could not process banner photo.', 'error');
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      const dataUrl = isPdf ? await readFileAsDataUrl(file) : await compressImageFile(file, 800, 0.85);
      const newDoc: EventDocument = {
        id: 'doc_' + Date.now(),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        uploadDate: new Date().toLocaleDateString(),
        type: isPdf ? 'pdf' : 'image',
        url: dataUrl
      };
      setEventData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDoc]
      }));
      showToast(`✓ Uploaded "${file.name}"`, 'success');
    } catch (err) {
      console.error('Doc upload error:', err);
      showToast('Could not process attachment file.', 'error');
    }
  };

  const handleRemoveDoc = (id: string) => {
    setEventData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(d => d.id !== id)
    }));
  };

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqLabel.trim()) return;

    const newReq: RequirementField = {
      id: 'req_' + Date.now(),
      label: newReqLabel.trim(),
      type: newReqType,
      required: newReqRequired,
      description: `Custom ${newReqType} requirement`
    };

    setEventData(prev => ({
      ...prev,
      requirements: [...prev.requirements, newReq]
    }));

    setNewReqLabel('');
    setNewReqType('live_photo');
    setNewReqRequired(true);
    setIsAddReqModalOpen(false);
    showToast('✓ Custom registration field added to event!', 'success');
  };

  const saveNewReq = handleAddRequirement;

  const deleteReq = (index: number) => {
    const reqs = [...eventData.requirements];
    reqs.splice(index, 1);
    setEventData(prev => ({ ...prev, requirements: reqs }));
    showToast('Requirement field deleted', 'info');
  };

  const duplicateReq = (index: number) => {
    const reqs = [...eventData.requirements];
    const item = { ...reqs[index], id: 'req_' + Date.now(), label: reqs[index].label + ' (Copy)' };
    reqs.splice(index + 1, 0, item);
    setEventData(prev => ({ ...prev, requirements: reqs }));
    showToast('Requirement duplicated', 'info');
  };

  const moveReq = (index: number, delta: number) => {
    const newIdx = index + delta;
    if (newIdx < 0 || newIdx >= eventData.requirements.length) return;
    const reqs = [...eventData.requirements];
    const item = reqs.splice(index, 1)[0];
    reqs.splice(newIdx, 0, item);
    setEventData(prev => ({ ...prev, requirements: reqs }));
  };

  const handlePublish = (status: 'active' | 'draft') => {
    if (!eventData.name.trim()) {
      showToast('Please enter an event name before publishing.', 'warning');
      setStep(1);
      return;
    }

    const isEdit = !!editingEvent;
    const finalEvent: EventItem = {
      ...eventData,
      status,
      creatorId: user.id || eventData.creatorId || `usr_${Date.now()}`,
      creatorEmail: (user.email || eventData.creatorEmail || '').toLowerCase().trim(),
      creatorMobile: (user.mobile || eventData.creatorMobile || '').replace(/\D/g, ''),
      tokenSettings: {
        ...eventData.tokenSettings,
        tokensPerUser: parseInt(tokensInputStr, 10) > 0 ? parseInt(tokensInputStr, 10) : 1
      }
    };

    saveEvent(finalEvent);
    addNotification({
      title: isEdit ? 'Event Updated' : `Event ${status === 'active' ? 'Published' : 'Saved as Draft'}`,
      message: `"${finalEvent.name}" has been ${isEdit ? 'customized and updated' : 'created'} successfully.`,
      type: 'success'
    });
    setEditingEvent(null);
    navigate('dashboard');
  };

  const handleSave = handlePublish;

  const handleCancel = () => {
    setEditingEvent(null);
    navigate('dashboard');
  };

  const handleNext = () => {
    if (step === 1) {
      if (!eventData.name || !eventData.venue) {
        showToast('Please enter event name and venue', 'warning');
        return;
      }
    }
    setStep(prev => Math.min(4, prev + 1));
  };

  return (
    <div className="animate-fade" style={{ maxWidth: 820, margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Step Indicator */}
      <div className="glass-panel" style={{ padding: '1rem 0.85rem', marginBottom: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', alignItems: 'center', minWidth: 300, gap: '0.25rem' }}>
          {[
            { num: 1, label: 'Basic Info', icon: <FileText size={15} /> },
            { num: 2, label: 'Tokens', icon: <Sliders size={15} /> },
            { num: 3, label: 'Requirements', icon: <Sparkles size={15} /> },
            { num: 4, label: editingEvent ? 'Save' : 'Publish', icon: <Check size={15} /> }
          ].map(s => {
            const isActive = step === s.num;
            const isDone = step > s.num;

            return (
              <div 
                key={s.num} 
                style={{ textAlign: 'center', flex: 1, cursor: 'pointer', zIndex: 2, padding: '0 2px' }}
                onClick={() => setStep(s.num)}
              >
                <div 
                  style={{ 
                    width: 'clamp(28px, 8vw, 36px)', 
                    height: 'clamp(28px, 8vw, 36px)', 
                    borderRadius: '50%', 
                    background: isActive ? 'var(--accent-primary)' : isDone ? 'var(--status-approved)' : '#EBE7DC', 
                    color: isActive || isDone ? '#FFFFFF' : '#1E293B', 
                    border: isActive ? '2px solid var(--accent-primary)' : isDone ? '2px solid var(--status-approved)' : '2px solid #D1CCC0',
                    boxShadow: isActive ? '0 4px 14px rgba(74, 123, 247, 0.4)' : 'none',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 0.35rem', 
                    fontWeight: 800, 
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isDone ? '✓' : s.icon}
                </div>
                <span 
                  style={{ 
                    fontSize: '0.725rem', 
                    color: isActive ? 'var(--accent-primary)' : isDone ? 'var(--text-primary)' : '#475569', 
                    fontWeight: isActive ? 800 : 700,
                    display: 'block',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Step Body */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: '1.25rem' }}>Basic Information</h3>

            <div className="form-group">
              <label className="form-label">Event / Party Name <span className="required-star">*</span></label>
              <input 
                type="text" 
                placeholder="e.g. Grand Campus Winter Fest 2026" 
                value={eventData.name} 
                onChange={e => setEventData({ ...eventData, name: e.target.value })} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Short Tagline</label>
              <input 
                type="text" 
                placeholder="e.g. Night of Music, Lights & Celebration" 
                value={eventData.tagline} 
                onChange={e => setEventData({ ...eventData, tagline: e.target.value })} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cover Image</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <img 
                  src={eventData.coverImage} 
                  style={{ width: 110, height: 70, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border-subtle)', flexShrink: 0 }} 
                  alt="Cover Preview"
                />
                <div>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => document.getElementById('cover-file-input')?.click()}
                  >
                    <Upload size={14} /> Choose / Upload Photo
                  </button>
                  <input 
                    type="file" 
                    id="cover-file-input" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleCoverUpload} 
                  />
                  <div className="form-hint">JPG, PNG, WebP up to 10MB</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea 
                rows={3} 
                placeholder="Describe your event highlights, performers, schedule, dress code..."
                value={eventData.description}
                onChange={e => setEventData({ ...eventData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Date <span className="required-star">*</span></label>
                <input 
                  type="date" 
                  value={eventData.date} 
                  onChange={e => setEventData({ ...eventData, date: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Time <span className="required-star">*</span></label>
                <input 
                  type="time" 
                  value={eventData.startTime} 
                  onChange={e => setEventData({ ...eventData, startTime: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Time <span className="required-star">*</span></label>
                <input 
                  type="time" 
                  value={eventData.endTime} 
                  onChange={e => setEventData({ ...eventData, endTime: e.target.value })} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Venue Name <span className="required-star">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. Main Auditorium, Campus East" 
                  value={eventData.venue} 
                  onChange={e => setEventData({ ...eventData, venue: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location / GPS Landmark</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sector 12, Tech Wing" 
                  value={eventData.location} 
                  onChange={e => setEventData({ ...eventData, location: e.target.value })} 
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Token Settings */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: '0.35rem', color: '#0F172A', fontWeight: 800 }}>Token Allocation System (Per User / Attendee)</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
              Specify how many tokens or passes each registered attendee will receive for this event.
            </p>

            <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: 'var(--radius-lg)', padding: '1.5rem', maxWidth: 520, marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.975rem', marginBottom: '0.5rem' }}>
                  Tokens Required Per User / Attendee <span className="required-star">*</span>
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Enter token count (e.g. 15, 500, 2)"
                  value={tokensInputStr}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setTokensInputStr(raw);
                    const num = parseInt(raw, 10);
                    setEventData(prev => ({
                      ...prev,
                      tokenSettings: { 
                        ...prev.tokenSettings, 
                        tokensPerUser: isNaN(num) || num < 1 ? 1 : num 
                      }
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid #2563EB',
                    fontWeight: 800,
                    color: '#0F172A',
                    fontSize: '1.05rem',
                    background: '#FFFFFF'
                  }}
                />
                <div className="form-hint" style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '0.45rem', fontWeight: 600 }}>
                  Each registered attendee will be allocated this number of passes / tokens upon approval.
                </div>
              </div>
            </div>
          </div>
        )}


        {/* STEP 3: Requirements Builder */}
        {step === 3 && (
          <div>
            <div className="flex-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, color: '#0F172A' }}>
                  Guest Entry Requirements
                </h3>
                <p style={{ fontSize: '0.825rem', margin: '0.2rem 0 0 0', color: 'var(--text-secondary)' }}>
                  Specify what attendees must submit to receive their VIP Pass (Live Selfie, Photo ID, Information)
                </p>
              </div>
              <button 
                type="button"
                className={`btn ${isAddReqModalOpen ? 'btn-secondary' : 'btn-primary'} btn-sm`} 
                onClick={() => setIsAddReqModalOpen(!isAddReqModalOpen)}
                style={{ fontWeight: 800 }}
              >
                <Plus size={15} /> {isAddReqModalOpen ? '✕ Close Form' : '+ Add Requirement'}
              </button>
            </div>

            {/* Inline Embedded Requirement Form (No Popup Modal) */}
            {isAddReqModalOpen && (
              <div 
                className="glass-panel" 
                style={{ 
                  background: '#FFFFFF', 
                  border: '2px solid #38BDF8', 
                  borderRadius: 'var(--radius-lg)', 
                  padding: '1.25rem 1.5rem', 
                  marginBottom: '1.5rem',
                  boxShadow: '0 8px 24px rgba(56, 189, 248, 0.12)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.65rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={18} color="#2563EB" /> Add Guest Requirement
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                    Pass Form
                  </span>
                </div>

                <form onSubmit={saveNewReq}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#0F172A' }}>
                      Requirement Name <span className="required-star">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Live Selfie, College ID Card, Contact Info" 
                      value={newReqLabel} 
                      onChange={e => setNewReqLabel(e.target.value)} 
                      required 
                      style={{ border: '1.5px solid #94A3B8', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.8rem', fontSize: '0.9rem', color: '#0F172A', fontWeight: 600 }}
                    />
                    <div className="form-hint" style={{ color: '#64748B' }}>Specify what the attendee must provide or upload</div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#0F172A' }}>
                      Verification Format <span className="required-star">*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                      {[
                        { type: 'live_photo' as const, title: 'Live Camera Selfie', desc: 'Real-time camera / selfie capture', icon: '📸' },
                        { type: 'image_upload' as const, title: 'Upload Photo / Gallery', desc: 'JPG / PNG from gallery or files', icon: '🖼️' },
                        { type: 'text' as const, title: 'Text', desc: 'Text input response', icon: '✍️' }
                      ].map(opt => (
                        <div 
                          key={opt.type}
                          onClick={() => setNewReqType(opt.type)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: newReqType === opt.type ? '2px solid #2563EB' : '1.5px solid #CBD5E1',
                            background: newReqType === opt.type ? '#EFF6FF' : '#F8FAFC',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{opt.icon}</div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: newReqType === opt.type ? '#1D4ED8' : '#0F172A' }}>
                            {opt.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {opt.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-between" style={{ padding: '0.5rem 0 1rem', borderBottom: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                    <div>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 800, color: '#0F172A' }}>Compulsory / Mandatory</label>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Attendee cannot register without providing this</div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={newReqRequired} 
                        onChange={e => setNewReqRequired(e.target.checked)} 
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddReqModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800 }}>
                      <Plus size={15} /> Add Requirement
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="requirement-builder-list">
              {eventData.requirements.map((req, idx) => {
                const isLive = req.type === 'live_photo' || req.type === 'profile_photo';
                const isImage = req.type === 'image_upload' || req.type === 'id_card';
                const typeLabel = isLive 
                  ? '📸 Live Camera Selfie' 
                  : isImage 
                    ? '🖼️ Photo / Gallery' 
                    : '✍️ Text';

                return (
                  <div key={req.id} className="req-item-card">
                    <div className="req-drag-handle" title="Reorder">☰</div>
                    <div className="req-info">
                      <div className="req-title">
                        {req.label} {req.required ? <span style={{ color: '#EF4444' }}>*</span> : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Optional)</span>}
                      </div>
                      <span className="req-type-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                        {typeLabel}
                      </span>
                      {req.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{req.description}</div>}
                    </div>

                    <div className="req-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveReq(idx, -1)} disabled={idx === 0} title="Move Up">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveReq(idx, 1)} disabled={idx === eventData.requirements.length - 1} title="Move Down">
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => duplicateReq(idx)} title="Duplicate">
                        <Copy size={14} />
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteReq(idx)} title="Delete Requirement">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Review & Publish */}
        {step === 4 && (
          <div>
            <h3 style={{ marginBottom: '1rem' }}>
              {editingEvent ? 'Save Customization Changes' : 'Review & Publish Event'}
            </h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Verify all event details before publishing or saving.
            </p>

            <div className="event-card" style={{ marginBottom: '1.5rem' }}>
              <div className="event-cover-wrap">
                <img src={eventData.coverImage} className="event-cover-img" alt={eventData.name} />
              </div>
              <div className="event-card-body">
                <h2 style={{ fontSize: '1.3rem' }}>{eventData.name || 'Untitled Event'}</h2>
                <p style={{ color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{eventData.tagline}</p>
                <div className="event-meta-row" style={{ marginTop: '0.5rem' }}>
                  <span>📅 {eventData.date}</span>
                  <span>•</span>
                  <span>⏰ {eventData.startTime} - {eventData.endTime}</span>
                  <span>•</span>
                  <span>📍 {eventData.venue}</span>
                </div>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{eventData.description || 'No description provided.'}</p>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '2rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tokens Per User</span>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#2563EB' }}>
                      🎟️ {eventData.tokenSettings.tokensPerUser || 1} Passes
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requirements</span>
                    <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{eventData.requirements.length} Fields</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Controls */}
      <div className="flex-between">
        <button 
          className="btn btn-secondary" 
          onClick={() => setStep(prev => Math.max(1, prev - 1))}
          disabled={step === 1}
          style={{ opacity: step === 1 ? 0.4 : 1 }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {step < 4 ? (
          <button className="btn btn-primary" onClick={handleNext}>
            Next Step <ArrowRight size={16} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => handlePublish('draft')}>
              Save as Draft
            </button>
            <button className="btn btn-primary" onClick={() => handlePublish('active')}>
              <Sparkles size={16} /> {editingEvent ? 'Save & Update Event' : 'Publish Event Live'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
