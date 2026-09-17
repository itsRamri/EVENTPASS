import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EventItem, GuestRegistration, GuestDocument } from '../types';
import { LiveCameraModal } from '../components/LiveCameraModal';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  Upload, 
  CheckCircle2, 
  Hourglass, 
  FileText, 
  Sparkles,
  Search,
  KeyRound,
  Send,
  Camera,
  User
} from 'lucide-react';

import { compressImageFile, readFileAsDataUrl } from '../utils/image';

export const GuestHome: React.FC = () => {
  const { user, events, guests, saveGuest, openDigitalPass, addNotification, showToast } = useApp();

  const [registeringEvent, setRegisteringEvent] = useState<EventItem | null>(null);
  const [targetInvitedGuestId, setTargetInvitedGuestId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<GuestDocument[]>([]);
  const [submissionSuccessGuest, setSubmissionSuccessGuest] = useState<GuestRegistration | null>(null);

  // Live Camera Capture & Crop Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraFieldLabel, setCameraFieldLabel] = useState<string>('Live Selfie Photo');
  const [capturedAvatar, setCapturedAvatar] = useState<string | null>(null);

  // Join by Event ID state
  const [inputEventId, setInputEventId] = useState('');

  const activeEvents = events.filter(e => e.status === 'active');
  const myRegistrations = guests.filter(g => 
    (g.email && g.email.toLowerCase() === user.email.toLowerCase()) || 
    (g.name && g.name === user.name && g.name !== 'Pending Guest Submission') ||
    (g.mobile && g.mobile === user.mobile)
  );

  const pendingInvitations = guests.filter(g => 
    g.status === 'invited' && (
      !g.email || 
      g.email.toLowerCase() === user.email.toLowerCase() || 
      g.mobile === user.mobile ||
      g.answers?.['Invited Email']?.toLowerCase() === user.email.toLowerCase() ||
      g.name === 'Pending Guest Submission'
    )
  );

  const isEventOrganizer = (evt: EventItem) => {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userMobile = (user.mobile || '').replace(/\D/g, '');
    const evtCreatorEmail = (evt.creatorEmail || '').toLowerCase().trim();
    const evtCreatorMobile = (evt.creatorMobile || '').replace(/\D/g, '');

    if (user.id && evt.creatorId && user.id === evt.creatorId) return true;
    if (userEmail && evtCreatorEmail && userEmail === evtCreatorEmail) return true;
    if (userMobile && evtCreatorMobile && userMobile === evtCreatorMobile) return true;
    if (user.role === 'manager' && user.name && evt.organizer && user.name.toLowerCase() === evt.organizer.toLowerCase()) return true;
    return false;
  };

  const handleOpenRegistration = (evt: EventItem, existingInviteId?: string, defaultEmail?: string, defaultMobile?: string) => {
    // 0. Check if user is the creator/organizer of this event
    if (isEventOrganizer(evt)) {
      showToast(`⚠️ You created this party ("${evt.name}"). Event organizers cannot register as guests in their own party.`, 'warning');
      return;
    }

    // Check if user has already joined / registered for this event
    if (!existingInviteId) {
      const alreadyJoined = guests.find(g => 
        g.eventId === evt.id && (
          (g.email && user.email && g.email.toLowerCase() === user.email.toLowerCase()) ||
          (g.mobile && user.mobile && g.mobile === user.mobile)
        ) && (g.status === 'approved' || g.status === 'pending' || g.status === 'checkedin')
      );

      if (alreadyJoined) {
        if (alreadyJoined.status === 'approved' || alreadyJoined.status === 'checkedin') {
          showToast(`✓ You have already joined in this party ("${evt.name}")! Opening your digital pass...`, 'success');
          openDigitalPass(alreadyJoined.id);
        } else {
          showToast(`⏳ You have already joined in this party ("${evt.name}")! Your pass request is currently pending manager approval.`, 'info');
        }
        return;
      }
    }

    setRegisteringEvent(evt);
    setTargetInvitedGuestId(existingInviteId || null);
    setCapturedAvatar(null);
    setFormData({
      'Full Name': user.name && user.name !== 'Pending Guest Submission' ? user.name : '',
      'Email Address': defaultEmail || user.email || '',
      'Mobile Number': defaultMobile || user.mobile || '',
      'College / Institute': user.college || '',
      'Department / Branch': user.branch || ''
    });
    setUploadedFiles([]);
  };

  const handleJoinByEventId = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputEventId.trim();
    if (!query) return;

    // 1. Check if user entered a specific Token Code, Pass ID, or Guest ID
    const tokenMatchedGuest = guests.find(g => 
      (g.token && g.token.toLowerCase() === query.toLowerCase()) ||
      (g.passId && g.passId.toLowerCase() === query.toLowerCase()) ||
      (g.id && g.id.toLowerCase() === query.toLowerCase()) ||
      (g.tokens && g.tokens.some(t => t.toLowerCase() === query.toLowerCase())) ||
      (g.tokenList && g.tokenList.some(item => item.tokenCode.toLowerCase() === query.toLowerCase()))
    );

    let matchedEvent: EventItem | undefined;

    if (tokenMatchedGuest) {
      matchedEvent = events.find(e => e.id === tokenMatchedGuest.eventId);
    }

    // 2. Check if user entered Event ID, Prefix, or Event Name
    if (!matchedEvent) {
      matchedEvent = events.find(evt => 
        evt.id.toLowerCase() === query.toLowerCase() ||
        (evt.tokenSettings?.prefix && evt.tokenSettings.prefix.toLowerCase() === query.toLowerCase()) ||
        evt.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (!matchedEvent) {
      showToast(`No event found with code / ID "${query}". Please check the ID provided by your Event Manager.`, 'error');
      return;
    }

    // 3. Prevent Event Creator from joining their own party
    if (isEventOrganizer(matchedEvent)) {
      showToast(`⚠️ You created this party ("${matchedEvent.name}"). Event organizers cannot register as guests in their own party.`, 'warning');
      setInputEventId('');
      return;
    }

    // 4. Check if user already joined this event
    const userExistingReg = guests.find(g => 
      g.eventId === matchedEvent!.id && (
        (tokenMatchedGuest && tokenMatchedGuest.id === g.id) ||
        (g.email && user.email && g.email.toLowerCase() === user.email.toLowerCase()) ||
        (g.mobile && user.mobile && g.mobile === user.mobile) ||
        (g.name && user.name && g.name === user.name && g.name !== 'Pending Guest Submission')
      )
    );

    if (userExistingReg) {
      if (userExistingReg.status === 'approved' || userExistingReg.status === 'checkedin') {
        showToast(`✓ You have already joined in this party ("${matchedEvent.name}")! Opening your digital pass...`, 'success');
        openDigitalPass(userExistingReg.id);
        setInputEventId('');
        return;
      } else if (userExistingReg.status === 'pending') {
        showToast(`⏳ You have already joined in this party ("${matchedEvent.name}")! Your registration is currently pending manager approval.`, 'info');
        setInputEventId('');
        return;
      } else if (userExistingReg.status === 'invited') {
        showToast(`Found your invitation for "${matchedEvent.name}"! Please fill your attendee details.`, 'info');
        handleOpenRegistration(matchedEvent, userExistingReg.id, userExistingReg.email, userExistingReg.mobile);
        setInputEventId('');
        return;
      }
    }

    // 5. If user hasn't joined this event, open registration form for this new event
    showToast(`Joining "${matchedEvent.name}"... Please fill event requirements.`, 'success');
    handleOpenRegistration(matchedEvent);
    setInputEventId('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      let dataUrl = '';

      if (isPdf) {
        dataUrl = await readFileAsDataUrl(file);
      } else {
        dataUrl = await compressImageFile(file, 640, 0.85);
      }

      const doc: GuestDocument = {
        name: file.name,
        type: isPdf ? 'pdf' : 'image',
        size: (file.size / 1024).toFixed(1) + ' KB',
        url: dataUrl
      };

      // If it's an image, also set as avatar so it directly becomes the guest profile photo stored in DB
      if (!isPdf) {
        setCapturedAvatar(dataUrl);
      }

      setUploadedFiles(prev => [...prev.filter(f => f.name !== file.name), doc]);
      setFormData(prev => ({ ...prev, [label]: file.name }));
      showToast(`✓ Uploaded & attached: ${file.name}`, 'success');
    } catch (err) {
      console.error('File read error:', err);
      showToast('Could not process photo/file. Please try again.', 'error');
    }
  };

  const handleCapturePhoto = (croppedDataUrl: string) => {
    setCapturedAvatar(croppedDataUrl);
    const safeName = cameraFieldLabel.replace(/[^a-zA-Z0-9]/g, '_');
    const doc: GuestDocument = {
      name: `${safeName}_Cropped.jpg`,
      type: 'image',
      size: 'Cropped High-Res (512x512)',
      url: croppedDataUrl
    };
    setUploadedFiles(prev => [...prev.filter(f => !f.name.startsWith(safeName)), doc]);
    setFormData(prev => ({ ...prev, [cameraFieldLabel]: `${cameraFieldLabel} (Live Photo Attached)` }));
    showToast('✓ Live camera photo captured, cropped and attached successfully!', 'success');
  };

  const handleDynamicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringEvent) return;

    // Check if user is the creator/organizer of this event
    const submittedEmail = (formData['Email Address'] || user.email || '').toLowerCase().trim();
    const submittedMobile = (formData['Mobile Number'] || user.mobile || '').replace(/\D/g, '');
    const creatorEmail = (registeringEvent.creatorEmail || '').toLowerCase().trim();
    const creatorMobile = (registeringEvent.creatorMobile || '').replace(/\D/g, '');

    if (isEventOrganizer(registeringEvent) || (creatorEmail && submittedEmail === creatorEmail) || (creatorMobile && submittedMobile === creatorMobile)) {
      showToast(`⚠️ You are the creator of "${registeringEvent.name}". Organizers cannot register as guests in their own party.`, 'error');
      return;
    }

    const existingGuest = targetInvitedGuestId ? guests.find(g => g.id === targetInvitedGuestId) : null;

    // Validate only requirements that are actually marked as required by the event creator
    for (const req of (registeringEvent.requirements || [])) {
      if (req.required) {
        const val = formData[req.label];
        const isDocType = ['id_card', 'pdf_upload', 'image_upload', 'profile_photo', 'live_photo'].includes(req.type);
        const hasDoc = uploadedFiles.some(f => f.name.includes(req.label.replace(/[^a-zA-Z0-9]/g, '_')) || f.name === val) || 
                       (req.type === 'live_photo' && (capturedAvatar || val)) ||
                       (val && String(val).trim().length > 0) ||
                       (existingGuest?.documents && existingGuest.documents.length > 0);
        
        if (isDocType) {
          if (!hasDoc) {
            showToast(`⚠️ Please upload or capture required document: "${req.label}"`, 'error');
            return;
          }
        } else {
          if (!val || String(val).trim().length === 0) {
            showToast(`⚠️ Please fill in required field: "${req.label}"`, 'error');
            return;
          }
        }
      }
    }

    const guestId = targetInvitedGuestId || ('gst_' + Date.now());
    const passId = 'PASS-' + Math.floor(100000 + Math.random() * 900000);

    const updatedGuest: GuestRegistration = {
      id: guestId,
      eventId: registeringEvent.id,
      name: formData['Full Name'] || user.name,
      email: formData['Email Address'] || existingGuest?.email || user.email,
      mobile: formData['Mobile Number'] || existingGuest?.mobile || user.mobile,
      avatar: capturedAvatar || existingGuest?.avatar || user.avatar,
      college: formData['College / Institute'] || user.college || 'National Institute of Technology',
      branch: formData['Department / Branch'] || user.branch || 'Engineering',
      rollNo: formData['Student Roll Number'] || 'REG-' + Math.floor(1000 + Math.random() * 9000),
      status: 'pending', // Sent to manager for review/approval
      token: existingGuest?.token || '', // Token will be issued upon manager approval
      tokenCount: existingGuest?.tokenCount || registeringEvent.tokenSettings?.tokensPerUser || 1,
      usedTokens: existingGuest?.usedTokens || 0,
      passId: existingGuest?.passId || passId,
      registrationDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      checkInTime: null,
      scanTimestamp: null,
      answers: { ...existingGuest?.answers, ...formData },
      documents: uploadedFiles.length > 0 ? uploadedFiles : (existingGuest?.documents || [])
    };


    saveGuest(updatedGuest);
    setRegisteringEvent(null);
    setTargetInvitedGuestId(null);
    setSubmissionSuccessGuest(updatedGuest);

    addNotification({
      title: 'Registration Submitted to Manager',
      message: `${updatedGuest.name} submitted registration for "${registeringEvent.name}". Awaiting manager approval.`,
      type: 'info'
    });
    showToast(`✓ Details submitted! Awaiting Manager approval for "${registeringEvent.name}".`, 'success');
  };

  return (
    <div className="animate-fade">
      {/* Top Banner */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="welcome-greeting" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div 
            style={{ 
              width: 46, 
              height: 46, 
              borderRadius: 'var(--radius-md)', 
              background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', 
              border: '2px solid #38BDF8', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#2563EB',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.2)'
            }}
          >
            <User size={24} strokeWidth={2.3} />
          </div>
          <div className="greeting-text">
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Welcome, {user.name}
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              From Registration to Check-in — Simple, Secure, Seamless.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          {pendingInvitations.map(inv => {
            const invEvt = events.find(e => e.id === inv.eventId) || events[0];
            if (!invEvt) return null;
            return (
              <div 
                key={inv.id} 
                className="glass-panel" 
                style={{ 
                  padding: '1.35rem 1.5rem', 
                  marginBottom: '1rem', 
                  background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)', 
                  border: '1.5px solid #F59E0B', 
                  borderRadius: 'var(--radius-lg)', 
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 260 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    📬
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#92400E' }}>
                        Event Invitation Received!
                      </span>
                      <span style={{ fontSize: '0.725rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}>
                        INVITATION PENDING
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#451A03', marginTop: 2, marginBottom: 0 }}>
                      You have been invited to <strong>{invEvt.name}</strong> ({invEvt.date} • {invEvt.venue}).
                    </p>
                    <div style={{ fontSize: '0.775rem', color: '#78350F', marginTop: 2 }}>
                      Invite sent to: <strong>{inv.email || inv.mobile || user.email}</strong> • Accept and fill your attendee details to request pass approval.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary"
                    style={{ background: '#D97706', borderColor: '#B45309', fontWeight: 800 }}
                    onClick={() => handleOpenRegistration(invEvt, inv.id, inv.email, inv.mobile)}
                  >
                    ✨ Accept Invitation & Fill Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join with Event ID / Invited Pass Section */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', border: '1px solid rgba(74, 123, 247, 0.3)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
          <KeyRound size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Have an Event Invite Code / Event ID?</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Paste the Event ID provided by your organizer to access the private registration form instantly.
        </p>

        <form onSubmit={handleJoinByEventId} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="e.g. evt_fresher_2026"
            value={inputEventId}
            onChange={e => setInputEventId(e.target.value)}
            style={{ flex: 1, minWidth: 220, fontFamily: 'var(--font-mono)' }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <Send size={15} /> Join & Register
          </button>
        </form>
      </div>

      {/* Available Events */}
      <h2 style={{ marginBottom: '1rem' }}>Available Events for Registration</h2>
      <div className="events-grid" style={{ marginBottom: '2.5rem' }}>
        {activeEvents.map(evt => {
          const myReg = myRegistrations.find(r => r.eventId === evt.id);
          const hasInvite = pendingInvitations.find(i => i.eventId === evt.id);
          const isHost = isEventOrganizer(evt);

          return (
            <div key={evt.id} className="event-card">
              <div className="event-cover-wrap">
                <img src={evt.coverImage} className="event-cover-img" alt={evt.name} />
                <div className="event-badge-overlay">
                  {isHost ? (
                    <span className="badge" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 800 }}>
                      👑 ORGANIZER / HOST
                    </span>
                  ) : myReg ? (
                    <span className={`badge badge-${myReg.status}`}>
                      {myReg.status.toUpperCase()}
                    </span>
                  ) : hasInvite ? (
                    <span className="badge badge-invited" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                      INVITATION RECEIVED
                    </span>
                  ) : (
                    <span className="badge badge-approved">REGISTRATION OPEN</span>
                  )}
                </div>
              </div>

              <div className="event-card-body">
                <h3 className="event-title">{evt.name}</h3>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Event ID: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>{evt.id}</span>
                </div>

                <div className="event-meta-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} /> {evt.date}
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={14} /> {evt.startTime}
                  </span>
                </div>
                <div className="event-meta-row" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} /> {evt.venue}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {evt.description ? evt.description.substring(0, 110) + '...' : ''}
                </p>

                {/* Document Vault & Guidelines preview for Guest */}
                {evt.documents && evt.documents.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', margin: '0.5rem 0', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--text-primary)' }}>
                      📜 Document Vault ({evt.documents.length} Guidelines/Files)
                    </span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Attached</span>
                  </div>
                )}

                <div className="event-card-actions" style={{ gap: '0.5rem', display: 'flex', flexWrap: 'wrap' }}>
                  {isHost ? (
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, background: '#F8FAFC', color: '#64748B', fontWeight: 700 }}
                      onClick={() => showToast(`You are the creator/host of "${evt.name}". Organizers manage their event from the Manager Dashboard.`, 'info')}
                    >
                      👑 You Host This Event
                    </button>
                  ) : myReg ? (
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => {
                        if (myReg.status === 'approved' || myReg.status === 'checkedin') {
                          openDigitalPass(myReg.id);
                        } else {
                          showToast(`Your status for this event is: ${myReg.status.toUpperCase()}`, 'info');
                        }
                      }}
                    >
                      {myReg.status === 'approved' || myReg.status === 'checkedin' ? '🎟️ View Pass' : `Status: ${myReg.status.toUpperCase()}`}
                    </button>
                  ) : hasInvite ? (
                    <button 
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, background: '#D97706', borderColor: '#B45309', fontWeight: 800 }}
                      onClick={() => handleOpenRegistration(evt, hasInvite.id, hasInvite.email, hasInvite.mobile)}
                    >
                      ✉️ Accept & Complete Details →
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleOpenRegistration(evt)}
                    >
                      Register for Event →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registration History */}
      <h2 style={{ marginBottom: '1rem' }}>My Event Passes & Status</h2>
      {myRegistrations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Ticket size={28} />
          </div>
          <div className="empty-title">No event registrations yet</div>
          <p className="empty-desc">Choose an event above or join with an Event ID to submit your registration.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {myRegistrations.map(reg => {
            const evt = events.find(e => e.id === reg.eventId) || { name: 'Campus Event', date: 'TBD' };

            return (
              <div 
                key={reg.id} 
                className="req-item-card" 
                style={{ padding: '1rem 1.15rem' }}
              >
                <div style={{ fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => (reg.status === 'approved' || reg.status === 'checkedin') && openDigitalPass(reg.id)}>
                  {reg.status === 'approved' || reg.status === 'checkedin' ? '🎫' : '⏳'}
                </div>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => (reg.status === 'approved' || reg.status === 'checkedin') && openDigitalPass(reg.id)}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{evt.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Registered: {reg.registrationDate}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className={`badge badge-${reg.status}`}>
                    {reg.status.toUpperCase()}
                  </span>

                  {(reg.status === 'approved' || reg.status === 'checkedin') && (
                    <button className="btn btn-primary btn-sm" onClick={() => openDigitalPass(reg.id)}>
                      Pass
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Registration Modal */}
      {registeringEvent && (
        <div className="modal-overlay active" onClick={() => setRegisteringEvent(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Register: {registeringEvent.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>
                  Event ID: {registeringEvent.id}
                </span>
              </div>
              <button className="icon-btn" onClick={() => setRegisteringEvent(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Event Guidelines & Rules from Vault */}
              {registeringEvent.documents && registeringEvent.documents.length > 0 && (
                <div className="glass-panel" style={{ padding: '0.85rem 1rem', background: 'var(--bg-tertiary)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📜 Official Guidelines & Rules ({registeringEvent.documents.length} Files Attached)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {registeringEvent.documents.map(d => (
                      <div key={d.id} style={{ fontSize: '0.775rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>• {d.name} ({d.size})</span>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Guidelines Document</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleDynamicSubmit}>
                {/* Standard Base Fields */}
                <div className="form-group">
                  <label className="form-label">Full Name <span className="required-star">*</span></label>
                  <input 
                    type="text" 
                    value={formData['Full Name'] || ''} 
                    onChange={e => setFormData({ ...formData, 'Full Name': e.target.value })} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address <span className="required-star">*</span></label>
                  <input 
                    type="email" 
                    value={formData['Email Address'] || ''} 
                    onChange={e => setFormData({ ...formData, 'Email Address': e.target.value })} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number <span className="required-star">*</span></label>
                  <input 
                    type="tel" 
                    value={formData['Mobile Number'] || ''} 
                    onChange={e => setFormData({ ...formData, 'Mobile Number': e.target.value })} 
                    required 
                  />
                </div>

                {/* Event Custom Requirements */}
                {registeringEvent.requirements.map(req => {
                  if (['Full Name', 'Email Address', 'Mobile Number'].includes(req.label)) return null;

                  if (req.type === 'dropdown' && req.options) {
                    return (
                      <div key={req.id} className="form-group">
                        <label className="form-label">
                          {req.label} {req.required && <span className="required-star">*</span>}
                        </label>
                        <select 
                          value={formData[req.label] || ''} 
                          onChange={e => setFormData({ ...formData, [req.label]: e.target.value })}
                          required={req.required}
                        >
                          <option value="">Select option...</option>
                          {req.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        {req.description && <div className="form-hint">{req.description}</div>}
                      </div>
                    );
                  }

                  if (req.type === 'radio' && req.options) {
                    return (
                      <div key={req.id} className="form-group">
                        <label className="form-label">
                          {req.label} {req.required && <span className="required-star">*</span>}
                        </label>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                          {req.options.map(opt => (
                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name={req.label} 
                                value={opt} 
                                checked={formData[req.label] === opt}
                                onChange={e => setFormData({ ...formData, [req.label]: e.target.value })}
                                required={req.required}
                                style={{ width: 'auto' }}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                        {req.description && <div className="form-hint">{req.description}</div>}
                      </div>
                    );
                  }

                  if (['id_card', 'pdf_upload', 'image_upload', 'profile_photo', 'live_photo'].includes(req.type)) {
                    const isLive = req.type === 'live_photo' || req.type === 'profile_photo';
                    const isPdf = req.type === 'pdf_upload';
                    const uploadIcon = isLive ? '📸' : isPdf ? '📄' : '🖼️';
                    const actionLabel = isLive 
                      ? 'Click to Open Live Camera & Take Photo' 
                      : isPdf 
                        ? 'Click to upload PDF document' 
                        : 'Click to upload document photo';

                    return (
                      <div key={req.id} className="form-group">
                        <label className="form-label">
                          {req.label} {req.required && <span className="required-star">*</span>}
                        </label>
                        
                        {isLive ? (
                          <div 
                            className="glass-panel" 
                            style={{ 
                              padding: '1.5rem 1rem', 
                              textAlign: 'center', 
                              border: capturedAvatar ? '2.5px solid #10B981' : '2px dashed #2563EB', 
                              background: capturedAvatar ? 'rgba(16, 185, 129, 0.05)' : '#EFF6FF',
                              cursor: 'pointer',
                              borderRadius: 'var(--radius-lg)',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => {
                              setCameraFieldLabel(req.label);
                              setIsCameraModalOpen(true);
                            }}
                          >
                            {capturedAvatar ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                                <img 
                                  src={capturedAvatar} 
                                  alt="Captured Live Photo" 
                                  style={{ width: 190, height: 190, borderRadius: 'var(--radius-xl)', objectFit: 'cover', border: '4px solid #10B981', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)' }} 
                                />
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#047857' }}>
                                  ✓ Live Photo Captured & Attached (High-Res)
                                </div>
                                <button 
                                  type="button" 
                                  className="btn btn-secondary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCameraFieldLabel(req.label);
                                    setIsCameraModalOpen(true);
                                  }}
                                  style={{ fontSize: '0.825rem', fontWeight: 800, padding: '0.45rem 1.1rem' }}
                                >
                                  <Camera size={15} /> Retake / Recrop Photo
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontSize: '2.8rem', marginBottom: '0.5rem' }}>📸</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E40AF' }}>
                                  {actionLabel}
                                </div>
                                <div className="form-hint" style={{ marginTop: '0.35rem', color: '#1D4ED8', fontWeight: 600 }}>
                                  * Opens live camera with auto-crop & adjust tool
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (() => {
                          const attachedDoc = uploadedFiles.find(f => f.name === formData[req.label] || f.name.includes(req.label.replace(/[^a-zA-Z0-9]/g, '_')));
                          const isAttachedImg = attachedDoc && attachedDoc.type === 'image' && attachedDoc.url;

                          return (
                            <div 
                              className="glass-panel" 
                              style={{ 
                                padding: isAttachedImg ? '1rem' : '1.25rem', 
                                textAlign: 'center', 
                                border: formData[req.label] ? '2px solid #10B981' : '1.5px dashed rgba(74, 123, 247, 0.4)', 
                                background: formData[req.label] ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card)',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-lg)',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => document.getElementById(`upload-${req.id}`)?.click()}
                            >
                              {isAttachedImg ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                  <img 
                                    src={attachedDoc.url} 
                                    alt={attachedDoc.name} 
                                    style={{ 
                                      width: '100%', 
                                      maxHeight: 220, 
                                      borderRadius: 'var(--radius-md)', 
                                      objectFit: 'contain', 
                                      border: '2px solid #10B981', 
                                      background: '#0F172A',
                                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                                    }} 
                                  />
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>
                                    ✓ Attached: {attachedDoc.name} ({attachedDoc.size})
                                  </div>
                                  <button 
                                    type="button" 
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      document.getElementById(`upload-${req.id}`)?.click();
                                    }}
                                    style={{ fontSize: '0.8rem', fontWeight: 800, padding: '0.35rem 0.9rem' }}
                                  >
                                    📁 Change / Re-upload Photo
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>{uploadIcon}</div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: formData[req.label] ? '#10B981' : 'var(--text-primary)' }}>
                                    {formData[req.label] ? (
                                      <span>✓ Attached: {formData[req.label]}</span>
                                    ) : (
                                      actionLabel
                                    )}
                                  </div>
                                  <div className="form-hint" style={{ marginTop: '0.25rem' }}>
                                    {req.description || (isPdf ? 'Supports official .PDF files up to 10MB' : 'Supports JPG, PNG, WEBP files')}
                                  </div>
                                </div>
                              )}
                              <input 
                                type="file" 
                                id={`upload-${req.id}`} 
                                accept={isPdf ? '.pdf' : 'image/*,.pdf'} 
                                style={{ display: 'none' }} 
                                onChange={e => handleFileUpload(e, req.label)} 
                              />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  }

                  return (
                    <div key={req.id} className="form-group">
                      <label className="form-label">
                        {req.label} {req.required && <span className="required-star">*</span>}
                      </label>
                      <input 
                        type={req.type === 'number' ? 'number' : 'text'} 
                        placeholder={`Enter ${req.label}...`}
                        value={formData[req.label] || ''}
                        onChange={e => setFormData({ ...formData, [req.label]: e.target.value })}
                        required={req.required}
                      />
                      {req.description && <div className="form-hint">{req.description}</div>}
                    </div>
                  );
                })}

                <div className="modal-footer" style={{ padding: '1.25rem 0 0', background: 'transparent' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setRegisteringEvent(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Submit Registration Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Submission Success Modal */}
      {submissionSuccessGuest && (
        <div className="modal-overlay active" onClick={() => setSubmissionSuccessGuest(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <Hourglass size={34} />
              </div>

              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Registration Submitted!</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Your pass request has been sent to the Event Manager. Once accepted, your digital VIP pass will be unlocked automatically.
              </p>

              <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-tertiary)', textAlign: 'left', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tracking Pass ID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-secondary)', fontSize: '1rem' }}>
                  {submissionSuccessGuest.passId}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <span>Current Status:</span>
                  <span className="badge badge-pending">PENDING APPROVAL</span>
                </div>
              </div>

              <button className="btn btn-primary btn-block" onClick={() => setSubmissionSuccessGuest(null)}>
                Got It / Return to Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Capture & Crop Modal */}
      <LiveCameraModal
        isOpen={isCameraModalOpen}
        title={`Live Photo: ${cameraFieldLabel}`}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCapturePhoto}
      />
    </div>
  );
};
