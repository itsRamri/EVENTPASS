 import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GuestRegistration, GuestStatus } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  Check, 
  X, 
  Ticket, 
  FileText, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  UserPlus,
  Mail,
  Phone,
  Upload,
  Copy,
  UserCheck,
  UserX,
  Eye,
  Sparkles,
  QrCode,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  CheckCheck,
  ImageIcon,
  ExternalLink,
  User
} from 'lucide-react';

// Helper to extract clean date-only from registration timestamp (e.g. "17 Sep 2026")
const formatRegistrationDateOnly = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split(/[,•]/);
  return parts[0].trim();
};

export const GuestManagement: React.FC = () => {
  const { 
    user,
    guests, 
    events, 
    selectedEventId, 
    setSelectedEventId, 
    updateGuestStatus, 
    deleteGuest, 
    saveGuest,
    addDirectGuest,
    openDigitalPass, 
    navigate,
    addNotification,
    showToast 
  } = useApp();

  // Events created by the logged-in manager / account
  const myEvents = events.filter(e => {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userMobile = (user.mobile || '').replace(/\D/g, '');
    const userId = user.id || '';
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

  const myEventIds = new Set(myEvents.map(e => e.id));
  const myGuests = guests.filter(g => myEventIds.has(g.eventId));

  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'approved' | 'checkedin'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuestDossier, setSelectedGuestDossier] = useState<GuestRegistration | null>(null);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{ url: string; title: string } | null>(null);

  // Invite / Add Guest Modal
  const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'email' | 'mobile' | 'document'>('email');
  
  // Quick Invite States
  const [quickEmailInput, setQuickEmailInput] = useState('');
  const [quickMobileInput, setQuickMobileInput] = useState('');
  const [quickInviteNote, setQuickInviteNote] = useState('');

  // Target Event State for Modal
  const [guestEventId, setGuestEventId] = useState(selectedEventId && selectedEventId !== 'all' && myEventIds.has(selectedEventId) ? selectedEventId : (myEvents[0]?.id || ''));
  const targetModalEvt = myEvents.find(e => e.id === guestEventId) || myEvents[0];
  const [tokensToGrant, setTokensToGrant] = useState<number>(targetModalEvt?.tokenSettings?.tokensPerUser || 1);

  // Document Upload & Bulk Parse State
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTextContent, setDocTextContent] = useState('');
  const [parsedEntries, setParsedEntries] = useState<Array<{ type: 'email' | 'phone'; value: string }>>([]);

  // Filter guests by selected event first
  const eventScopedGuests = (selectedEventId && selectedEventId !== 'all')
    ? myGuests.filter(g => g.eventId === selectedEventId)
    : myGuests;

  const counts = {
    all: eventScopedGuests.length,
    pending: eventScopedGuests.filter(g => g.status === 'pending' || g.status === 'invited').length,
    approved: eventScopedGuests.filter(g => g.status === 'approved').length,
    checkedin: eventScopedGuests.filter(g => g.status === 'checkedin').length
  };

  const filteredGuests = eventScopedGuests.filter(g => {
    if (statusTab === 'pending') {
      if (g.status !== 'pending' && g.status !== 'invited') return false;
    } else if (statusTab === 'approved') {
      if (g.status !== 'approved') return false;
    } else if (statusTab === 'checkedin') {
      if (g.status !== 'checkedin') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (g.name || '').toLowerCase().includes(q);
      const matchEmail = (g.email || '').toLowerCase().includes(q);
      const matchMobile = (g.mobile || '').toLowerCase().includes(q);
      const matchToken = (g.token || '').toLowerCase().includes(q);
      const matchPassId = (g.passId || '').toLowerCase().includes(q);
      const matchRoll = (g.rollNo || '').toLowerCase().includes(q);
      const matchCollege = (g.college || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchMobile || matchToken || matchPassId || matchRoll || matchCollege;
    }
    return true;
  });

  const currentSelectedEvent = myEvents.find(e => e.id === guestEventId) || myEvents[0] || { id: 'evt_general', name: 'Event', tokenSettings: { prefix: 'EP' } };

  const handleDeleteAction = (g: GuestRegistration) => {
    if (confirm(`Permanently delete ${g.name} from the event records?`)) {
      deleteGuest(g.id);
      if (selectedGuestDossier?.id === g.id) setSelectedGuestDossier(null);
    }
  };

  // 1. Send Email Invite (Creates 'invited' request; no token until guest fills details & manager approves)
  const handleQuickEmailInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEvt = events.find(e => e.id === guestEventId) || events[0];
    const hostEmail = (targetEvt.creatorEmail || user.email || '').toLowerCase().trim();
    const rawEmails = quickEmailInput.split(/[\n,]+/).map(em => em.trim()).filter(Boolean);

    const hasSelfInvite = rawEmails.some(em => em.toLowerCase() === hostEmail);
    const validEmails = rawEmails.filter(em => em.toLowerCase() !== hostEmail);

    if (hasSelfInvite && validEmails.length === 0) {
      showToast(`⚠️ You are the creator of this party ("${targetEvt.name}"). Organizers cannot invite themselves as guests.`, 'error');
      return;
    }

    if (hasSelfInvite) {
      showToast(`⚠️ Your own email (${hostEmail}) was excluded because event organizers cannot register as guests.`, 'info');
    }

    if (validEmails.length === 0) {
      showToast('Please enter at least one valid guest email address', 'warning');
      return;
    }

    validEmails.forEach((emailAddr, i) => {
      const guestId = 'gst_inv_' + Date.now() + '_' + i;

      const newGuest: GuestRegistration = {
        id: guestId,
        eventId: targetEvt.id,
        name: 'Pending Guest Submission',
        email: emailAddr,
        mobile: '',
        avatar: '',
        college: 'Awaiting Submission',
        branch: 'Pending Acceptance',
        rollNo: '',
        status: 'invited', // Waiting for guest acceptance & details
        token: '', // No token issued yet
        tokenCount: tokensToGrant || targetEvt.tokenSettings?.tokensPerUser || 1,
        usedTokens: 0,
        passId: '',
        registrationDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        checkInTime: null,
        scanTimestamp: null,
        answers: {
          'Invited Email': emailAddr,
          'Invite Note': quickInviteNote || 'Direct Email Invitation'
        },
        documents: []
      };

      addDirectGuest(newGuest);

      addNotification({
        title: '🎟️ You are Invited!',
        message: `You have been officially invited to "${targetEvt.name}"! Access and manage your entry passes.`,
        type: 'info',
        recipientEmail: emailAddr.toLowerCase().trim(),
        recipientRole: 'guest'
      });
    });

    setIsAddGuestModalOpen(false);
    setQuickEmailInput('');
    setQuickInviteNote('');
    showToast(`✓ Invitation sent to ${validEmails.length} guest(s) (${tokensToGrant || 1} tokens allocated)!`, 'success');
  };

  // 2. Send Mobile Invite
  const handleQuickMobileInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEvt = events.find(e => e.id === guestEventId) || events[0];
    const hostMobile = (targetEvt.creatorMobile || user.mobile || '').replace(/\D/g, '');
    const rawPhones = quickMobileInput.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);

    const hasSelfInvite = hostMobile ? rawPhones.some(p => p.replace(/\D/g, '') === hostMobile) : false;
    const validPhones = rawPhones.filter(p => !hostMobile || p.replace(/\D/g, '') !== hostMobile);

    if (hasSelfInvite && validPhones.length === 0) {
      showToast(`⚠️ You are the creator of this party ("${targetEvt.name}"). Organizers cannot invite their own mobile number as a guest.`, 'error');
      return;
    }

    if (hasSelfInvite) {
      showToast(`⚠️ Your own mobile number was excluded because event organizers cannot register as guests.`, 'info');
    }

    if (validPhones.length === 0) {
      showToast('Please enter a valid guest mobile number', 'warning');
      return;
    }

    validPhones.forEach((phoneNum, i) => {
      const guestId = 'gst_mob_' + Date.now() + '_' + i;
      const cleanPhone = phoneNum.replace(/\D/g, '');

      const newGuest: GuestRegistration = {
        id: guestId,
        eventId: targetEvt.id,
        name: 'Pending Guest Submission',
        email: '',
        mobile: cleanPhone,
        avatar: '',
        college: 'Awaiting Submission',
        branch: 'Pending Acceptance',
        rollNo: '',
        status: 'invited',
        token: '',
        tokenCount: tokensToGrant || targetEvt.tokenSettings?.tokensPerUser || 1,
        usedTokens: 0,
        passId: '',
        registrationDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        checkInTime: null,
        scanTimestamp: null,
        answers: {
          'Mobile Contact': cleanPhone,
          'Invite Channel': 'SMS / WhatsApp Request'
        },
        documents: []
      };

      addDirectGuest(newGuest);

      addNotification({
        title: '🎟️ You are Invited!',
        message: `You have been officially invited to "${targetEvt.name}"! Access and manage your entry passes.`,
        type: 'info',
        recipientPhone: cleanPhone,
        recipientRole: 'guest'
      });
    });

    setIsAddGuestModalOpen(false);
    setQuickMobileInput('');
    showToast(`✓ SMS/WhatsApp invite dispatched to ${validPhones.length} phone(s)!`, 'success');
  };

  // 3. Document / Bulk Invite Handler
  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setDocTextContent(text);
      extractEmailsAndPhones(text, file.name);
    };
    reader.readAsText(file);
  };

  const extractEmailsAndPhones = (text: string, filename?: string) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/g;

    const matchedEmails = Array.from(new Set(text.match(emailRegex) || []));
    const matchedPhones = Array.from(new Set(text.match(phoneRegex) || [])).filter(p => p.replace(/\D/g, '').length >= 10);

    const entries: Array<{ type: 'email' | 'phone'; value: string }> = [
      ...matchedEmails.map(em => ({ type: 'email' as const, value: em })),
      ...matchedPhones.map(ph => ({ type: 'phone' as const, value: ph }))
    ];

    // If file is binary or mock sample
    if (entries.length === 0 && filename) {
      const mockList = [
        { type: 'email' as const, value: 'arjun.kapoor@nit.edu' },
        { type: 'email' as const, value: 'kavita.krishnan@campus.org' },
        { type: 'phone' as const, value: '+91 98765 11223' },
        { type: 'email' as const, value: 'devendra.singh@tech.in' }
      ];
      setParsedEntries(mockList);
      showToast(`Document "${filename}" parsed: Found ${mockList.length} attendee invite contacts!`, 'success');
    } else {
      setParsedEntries(entries);
      showToast(`Document parsed: Found ${entries.length} contact(s)!`, 'success');
    }
  };

  const handleBulkDocumentInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEvt = events.find(e => e.id === guestEventId) || events[0];
    const hostEmail = (targetEvt.creatorEmail || user.email || '').toLowerCase().trim();
    const hostMobile = (targetEvt.creatorMobile || user.mobile || '').replace(/\D/g, '');

    const validEntries = parsedEntries.filter(entry => {
      if (entry.type === 'email' && hostEmail && entry.value.toLowerCase().trim() === hostEmail) return false;
      if (entry.type === 'phone' && hostMobile && entry.value.replace(/\D/g, '') === hostMobile) return false;
      return true;
    });

    const hadSelfInvite = parsedEntries.length > validEntries.length;

    if (hadSelfInvite && validEntries.length === 0) {
      showToast(`⚠️ The document only contained the event organizer's contact. Organizers cannot register as guests in their own party.`, 'error');
      return;
    }

    if (hadSelfInvite) {
      showToast(`⚠️ Notice: Organizer contact was automatically excluded from guest invitations.`, 'info');
    }

    if (validEntries.length === 0) {
      showToast('No valid emails or phone numbers found to invite', 'warning');
      return;
    }

    validEntries.forEach((entry, i) => {
      const guestId = 'gst_doc_' + Date.now() + '_' + i;
      const isEmail = entry.type === 'email';

      const newGuest: GuestRegistration = {
        id: guestId,
        eventId: targetEvt.id,
        name: 'Pending Guest Submission',
        email: isEmail ? entry.value : '',
        mobile: !isEmail ? entry.value : '',
        avatar: '',
        college: 'Awaiting Submission',
        branch: 'Pending Acceptance',
        rollNo: '',
        status: 'invited', // Waiting for attendee to fill details
        token: '',
        tokenCount: tokensToGrant || targetEvt.tokenSettings?.tokensPerUser || 1,
        usedTokens: 0,
        passId: '',
        registrationDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        checkInTime: null,
        scanTimestamp: null,
        answers: {
          'Import Source': docFile?.name || 'Document Upload',
          'Contact': entry.value
        },
        documents: []
      };

      addDirectGuest(newGuest);

      if (entry.type === 'email' && entry.value) {
        addNotification({
          title: '🎟️ You are Invited!',
          message: `You have been officially invited to "${targetEvt.name}"! Access and manage your entry passes.`,
          type: 'info',
          recipientEmail: entry.value.toLowerCase().trim(),
          recipientRole: 'guest'
        });
      } else if (entry.type === 'phone' && entry.value) {
        addNotification({
          title: '🎟️ You are Invited!',
          message: `You have been officially invited to "${targetEvt.name}"! Access and manage your entry passes.`,
          type: 'info',
          recipientPhone: entry.value.replace(/\D/g, ''),
          recipientRole: 'guest'
        });
      }
    });

    setIsAddGuestModalOpen(false);
    setDocFile(null);
    setDocTextContent('');
    setParsedEntries([]);
    showToast(`✓ Dispatched invitations to ${validEntries.length} attendee(s) from document!`, 'success');
  };



  return (
    <div className="animate-fade">
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#0F172A', fontWeight: 800 }}>
            <Users size={26} color="var(--accent-primary)" /> Guest Approval
          </h1>
          <p style={{ color: '#475569', fontWeight: 600 }}>Send invitations, approve guest registrations, issue event QR passes, and track check-ins</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsAddGuestModalOpen(true)}
            style={{ fontWeight: 800, letterSpacing: '0.01em', padding: '0.65rem 1.25rem' }}
          >
            <UserPlus size={18} /> + Invite / Add Guest
          </button>
        </div>
      </div>

      {/* Filter Tabs & Event Selector */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1.15rem 1.25rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Status Filter Tabs */}
        <div className="filter-tabs" style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', maxWidth: '100%' }}>
          <button 
            className={`filter-btn ${statusTab === 'all' ? 'active' : ''}`}
            onClick={() => setStatusTab('all')}
            style={{ fontWeight: 700 }}
          >
            All Attendees ({counts.all})
          </button>
          <button 
            className={`filter-btn ${statusTab === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusTab('pending')}
            style={{ position: 'relative', fontWeight: 700 }}
          >
            ⏳ Pending Requests ({counts.pending})
            {counts.pending > 0 && (
              <span 
                style={{ 
                  position: 'absolute', 
                  top: -4, 
                  right: -4, 
                  width: 10, 
                  height: 10, 
                  borderRadius: '50%', 
                  background: 'var(--accent-primary)' 
                }} 
              />
            )}
          </button>
          <button 
            className={`filter-btn ${statusTab === 'approved' ? 'active' : ''}`}
            onClick={() => setStatusTab('approved')}
            style={{ fontWeight: 700 }}
          >
            ✓ Approved Passes ({counts.approved})
          </button>
          <button 
            className={`filter-btn ${statusTab === 'checkedin' ? 'active' : ''}`}
            onClick={() => setStatusTab('checkedin')}
            style={{ fontWeight: 700 }}
          >
            🎟️ Checked In ({counts.checkedin})
          </button>
        </div>

        {/* Event Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', maxWidth: '100%' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>Event:</span>
          <select 
            value={selectedEventId || 'all'} 
            onChange={e => setSelectedEventId(e.target.value === 'all' ? null : e.target.value)}
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', fontWeight: 700, color: '#0F172A', border: '1px solid #CBD5E1', maxWidth: '100%', boxSizing: 'border-box' }}
          >
            <option value="all">All Events ({myEvents.length})</option>
            {myEvents.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', background: '#FFFFFF', border: '1px solid #E2E8F0', boxSizing: 'border-box', maxWidth: '100%' }}>
        <div className="search-input-container">
          <div className="search-input-icon">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            className="search-input-box"
            placeholder="Search attendees by name, email, or mobile..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Guests Cards / Table */}
      {filteredGuests.length === 0 ? (
        <div className="glass-panel empty-state" style={{ padding: '3rem 2rem', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', boxSizing: 'border-box', maxWidth: '100%' }}>
          <div className="empty-icon-wrap" style={{ width: 64, height: 64, margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(74, 123, 247, 0.1)', color: 'var(--accent-primary)' }}>
            <Users size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: '#0F172A', fontWeight: 800 }}>No Attendees Found</h3>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.25rem', fontWeight: 600 }}>
            {statusTab === 'pending' 
              ? 'No pending registration requests waiting for approval.' 
              : statusTab === 'checkedin'
                ? 'No attendees have checked in at the gate yet.'
                : 'No attendees match your search or filter selection.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setIsAddGuestModalOpen(true)} style={{ fontWeight: 700 }}>
            + Send Guest Invite
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {filteredGuests.map(g => {
            const evt = events.find(e => e.id === g.eventId) || { name: 'Campus Event' };
            const isInvited = g.status === 'invited';
            const isPending = g.status === 'pending';
            const isApproved = g.status === 'approved';
            const isCheckedIn = g.status === 'checkedin';

            return (
              <div 
                key={g.id} 
                className="glass-panel guest-item-card" 
                style={{ 
                  padding: '1rem 1.15rem', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'flex-start', 
                  justifyContent: 'flex-start', 
                  gap: '0.65rem', 
                  background: isCheckedIn ? '#F8FAFC' : '#FFFFFF',
                  border: isCheckedIn ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  maxWidth: '100%',
                  height: 'auto',
                  minHeight: 'unset',
                  boxSizing: 'border-box'
                }}
              >
                {/* Top: Attendee Avatar & Primary Info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', width: '100%', minWidth: 0, flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {g.avatar && !g.avatar.includes('unsplash.com') ? (
                      <img 
                        src={g.avatar} 
                        style={{ 
                          width: 'clamp(90px, 22vw, 125px)', 
                          height: 'clamp(105px, 26vw, 145px)', 
                          borderRadius: 'var(--radius-md)', 
                          objectFit: 'cover', 
                          border: '2px solid #E2E8F0',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                          cursor: 'pointer'
                        }} 
                        alt={g.name}
                        onClick={() => setPreviewPhotoModal({ url: g.avatar, title: `${g.name}'s Attendee Photo` })}
                        title="Click to view full photo"
                      />
                    ) : (
                      <div
                        style={{
                          width: 'clamp(90px, 22vw, 125px)', 
                          height: 'clamp(105px, 26vw, 145px)', 
                          borderRadius: 'var(--radius-md)', 
                          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
                          border: '2px dashed #CBD5E1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          color: '#94A3B8'
                        }}
                      >
                        <User size={34} strokeWidth={2} color="#94A3B8" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>No Photo</span>
                      </div>
                    )}
                    {isCheckedIn && (
                      <span 
                        style={{ 
                          position: 'absolute', 
                          bottom: -4, 
                          right: -4, 
                          background: '#10B981', 
                          color: '#FFFFFF', 
                          borderRadius: '50%', 
                          width: 24, 
                          height: 24, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '0.85rem', 
                          fontWeight: 800, 
                          border: '2px solid #FFFFFF', 
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {isInvited ? (
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#92400E', wordBreak: 'break-word' }}>
                          Awaiting Guest Registration
                        </span>
                      ) : (
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', wordBreak: 'break-word' }}>
                          {g.name}
                        </span>
                      )}
                      {/* Status Badge */}
                      {isInvited && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                          INVITATION SENT
                        </span>
                      )}
                      {isPending && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
                          ⏳ AWAITING APPROVAL
                        </span>
                      )}
                      {isApproved && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                          ✓ PASS ACTIVE
                        </span>
                      )}
                      {isCheckedIn && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#E2E8F0', color: '#334155', border: '1px solid #CBD5E1' }}>
                          🎟️ CHECKED IN
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        🎟️ {g.tokenCount || g.tokens?.length || 1} Token{(g.tokenCount || g.tokens?.length || 1) > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '0.2rem', fontWeight: 600, wordBreak: 'break-all' }}>
                      {isInvited ? (
                        <span>Invite: <strong style={{ color: '#0F172A' }}>{g.email || g.mobile}</strong></span>
                      ) : (
                        <span>{g.email} {g.mobile ? `• ${g.mobile}` : ''}</span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.775rem', color: '#64748B', marginTop: '0.25rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontWeight: 600 }}>
                      <span>📍 {evt.name}</span>
                      {!isInvited && (
                        <>
                          {(g.college || g.branch) && (
                            <>
                              <span>•</span>
                              <span>🎓 {g.college || 'Attendee'} {g.branch ? `(${g.branch})` : ''}</span>
                            </>
                          )}
                          {g.rollNo && (
                            <>
                              <span>•</span>
                              <span>Roll: <strong style={{ color: '#0F172A' }}>{g.rollNo}</strong></span>
                            </>
                          )}
                          {g.registrationDate && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#475569', fontWeight: 700 }}>📅 {formatRegistrationDateOnly(g.registrationDate)}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Check-In Timestamp & Pass Status (Only if checked-in or pending) */}
                {(isCheckedIn || isPending) && (
                  <div style={{ width: '100%', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                    {isCheckedIn ? (
                      <div style={{ background: '#F1F5F9', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #CBD5E1', display: 'inline-block' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>CHECK-IN TIME</div>
                        <div style={{ fontWeight: 800, color: '#0F172A', marginTop: 2, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} color="var(--accent-primary)" /> {g.checkInTime}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#1E40AF', fontSize: '0.8rem', fontWeight: 700 }}>
                        📋 Guest submitted details. Ready for Manager review.
                      </div>
                    )}
                  </div>
                )}

                {/* Actions: Directly below info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', width: '100%', paddingTop: '0.35rem', borderTop: '1px solid #F1F5F9' }}>
                  {/* If Invited: Manager can resend invite */}
                  {isInvited && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => showToast(`✓ Invitation link resent to ${g.email || g.mobile}!`, 'success')}
                      style={{ fontWeight: 700, color: '#0F172A', borderColor: '#CBD5E1', background: '#FFFFFF' }}
                      title="Resend invitation link to guest"
                    >
                      ✉️ Resend Invite
                    </button>
                  )}

                  {/* If Pending: Manager can Approve (generates unique token) or Reject */}
                  {isPending && (
                    <>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => {
                          updateGuestStatus(g.id, 'approved');
                          showToast(`✓ Approved! Unique QR pass token generated for ${g.name}.`, 'success');
                        }}
                        style={{ fontWeight: 800 }}
                      >
                        <Check size={14} /> Approve & Generate Pass
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => updateGuestStatus(g.id, 'rejected')}
                        style={{ fontWeight: 700 }}
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}

                  {/* View Full Dossier */}
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setSelectedGuestDossier(g)}
                    title="View Full Details"
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Eye size={14} /> Details
                  </button>

                  <button 
                    className="btn btn-danger btn-sm" 
                    onClick={() => handleDeleteAction(g)}
                    title="Delete Attendee"
                    style={{ padding: '0.45rem 0.65rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Invite Guest Modal with Compact Sleek Layout */}
      {isAddGuestModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsAddGuestModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, background: '#FFFFFF', boxShadow: '0 20px 40px rgba(0,0,0,0.18)', borderRadius: 'var(--radius-lg)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '1rem 1.25rem' }}>
              <div>
                <h2 style={{ color: '#0F172A', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>Invite Guests to Event</h2>
                <p style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, marginTop: 2, margin: 0 }}>
                  Selected: <strong style={{ color: 'var(--accent-primary)' }}>{currentSelectedEvent.name}</strong>
                </p>
              </div>
              <button className="icon-btn" onClick={() => setIsAddGuestModalOpen(false)}>✕</button>
            </div>

            {/* Target Event & Token Allocation Selector */}
            <div style={{ padding: '0.75rem 1.25rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ASSIGN TO EVENT
                </label>
                <select 
                  value={guestEventId} 
                  onChange={e => {
                    const newId = e.target.value;
                    setGuestEventId(newId);
                    const selEvt = events.find(ev => ev.id === newId);
                    if (selEvt?.tokenSettings?.tokensPerUser) {
                      setTokensToGrant(selEvt.tokenSettings.tokensPerUser);
                    }
                  }}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: '#0F172A', fontWeight: 700, border: '1.5px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.85rem' }}
                >
                  {myEvents.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🎟️ TOKENS TO GRANT / USER
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <select
                    value={tokensToGrant}
                    onChange={e => setTokensToGrant(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: '#1D4ED8', fontWeight: 800, border: '1.5px solid #93C5FD', background: '#EFF6FF', fontSize: '0.85rem' }}
                  >
                    {[1, 2, 5, 10, 15, 20].map(n => (
                      <option key={n} value={n}>{n === 15 ? '⭐ 15 Tokens' : `${n} Token${n > 1 ? 's' : ''}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>


            {/* Modal Invite Method Tabs - Ultra Clear & High Contrast */}
            <div style={{ display: 'flex', borderBottom: '1.5px solid #E2E8F0', background: '#F1F5F9' }}>
              <button 
                type="button"
                onClick={() => setInviteMode('email')}
                style={{ 
                  flex: 1, 
                  padding: '0.65rem 0.35rem', 
                  border: 'none', 
                  background: inviteMode === 'email' ? '#FFFFFF' : 'transparent',
                  fontWeight: inviteMode === 'email' ? 900 : 700,
                  color: inviteMode === 'email' ? '#1D4ED8' : '#334155',
                  borderBottom: inviteMode === 'email' ? '3px solid #1D4ED8' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.825rem'
                }}
              >
                <Mail size={15} color={inviteMode === 'email' ? '#1D4ED8' : '#334155'} /> 
                <span>Email</span>
              </button>
              <button 
                type="button"
                onClick={() => setInviteMode('mobile')}
                style={{ 
                  flex: 1, 
                  padding: '0.65rem 0.35rem', 
                  border: 'none', 
                  background: inviteMode === 'mobile' ? '#FFFFFF' : 'transparent',
                  fontWeight: inviteMode === 'mobile' ? 900 : 700,
                  color: inviteMode === 'mobile' ? '#1D4ED8' : '#334155',
                  borderBottom: inviteMode === 'mobile' ? '3px solid #1D4ED8' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.825rem'
                }}
              >
                <Phone size={15} color={inviteMode === 'mobile' ? '#1D4ED8' : '#334155'} /> 
                <span>Mobile</span>
              </button>
              <button 
                type="button"
                onClick={() => setInviteMode('document')}
                style={{ 
                  flex: 1, 
                  padding: '0.65rem 0.35rem', 
                  border: 'none', 
                  background: inviteMode === 'document' ? '#FFFFFF' : 'transparent',
                  fontWeight: inviteMode === 'document' ? 900 : 700,
                  color: inviteMode === 'document' ? '#1D4ED8' : '#334155',
                  borderBottom: inviteMode === 'document' ? '3px solid #1D4ED8' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.825rem'
                }}
              >
                <FileSpreadsheet size={15} color={inviteMode === 'document' ? '#1D4ED8' : '#334155'} /> 
                <span>Document</span>
              </button>
            </div>

            {/* 1. EMAIL INVITE */}
            {inviteMode === 'email' && (
              <form onSubmit={handleQuickEmailInviteSubmit}>
                <div className="modal-body" style={{ padding: '1.15rem 1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                    <label className="form-label" style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      Guest Email Address <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea 
                      rows={2} 
                      placeholder="e.g. shubham.k@gmail.com"
                      value={quickEmailInput}
                      onChange={e => setQuickEmailInput(e.target.value)}
                      style={{ color: '#0F172A', fontWeight: 600, fontSize: '0.875rem', border: '1.5px solid #94A3B8', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', width: '100%', background: '#FFFFFF' }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      Personalized Note (Optional)
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. You are cordially invited to our campus event!"
                      value={quickInviteNote}
                      onChange={e => setQuickInviteNote(e.target.value)}
                      style={{ color: '#0F172A', fontWeight: 600, fontSize: '0.875rem', border: '1.5px solid #94A3B8', borderRadius: 'var(--radius-sm)', padding: '0.55rem 0.75rem', width: '100%', background: '#FFFFFF' }}
                    />
                  </div>
                </div>

                <div className="modal-footer flex-between" style={{ borderTop: '1px solid #E2E8F0', padding: '0.85rem 1.25rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddGuestModalOpen(false)} style={{ fontWeight: 700 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800, padding: '0.6rem 1.15rem' }}>
                    <Mail size={15} /> Send Invitation
                  </button>
                </div>
              </form>
            )}

            {/* 2. MOBILE INVITE */}
            {inviteMode === 'mobile' && (
              <form onSubmit={handleQuickMobileInviteSubmit}>
                <div className="modal-body" style={{ padding: '1.15rem 1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea 
                      rows={2} 
                      placeholder="e.g. +91 98765 XXXXX"
                      value={quickMobileInput}
                      onChange={e => setQuickMobileInput(e.target.value)}
                      style={{ color: '#0F172A', fontWeight: 600, fontSize: '0.875rem', border: '1.5px solid #94A3B8', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', width: '100%', background: '#FFFFFF' }}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer flex-between" style={{ borderTop: '1px solid #E2E8F0', padding: '0.85rem 1.25rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddGuestModalOpen(false)} style={{ fontWeight: 700 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800, padding: '0.6rem 1.15rem' }}>
                    <Phone size={15} /> Dispatch Mobile Invite
                  </button>
                </div>
              </form>
            )}

            {/* 3. UPLOAD DOCUMENT (BULK INVITES) - Replaces Direct Form */}
            {inviteMode === 'document' && (
              <form onSubmit={handleBulkDocumentInviteSubmit}>
                <div className="modal-body" style={{ padding: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.9rem' }}>
                      Upload Attendee Document (CSV, TXT, Excel, PDF) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div 
                      style={{ 
                        border: '2px dashed #94A3B8', 
                        borderRadius: 'var(--radius-md)', 
                        padding: '1.5rem 1rem', 
                        textAlign: 'center',
                        background: '#F8FAFC',
                        cursor: 'pointer'
                      }}
                      onClick={() => document.getElementById('bulk-doc-file-input')?.click()}
                    >
                      <Upload size={32} color="#1D4ED8" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                        {docFile ? docFile.name : 'Click to Browse / Upload Document'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 3, fontWeight: 600 }}>
                        Supports .CSV, .TXT, .XLSX, .PDF containing guest emails or phone numbers
                      </div>
                      <input 
                        type="file" 
                        id="bulk-doc-file-input" 
                        accept=".csv,.txt,.xlsx,.xls,.pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={handleDocFileUpload}
                      />
                    </div>
                  </div>


                  {/* Parsed Contacts Preview */}
                  {parsedEntries.length > 0 && (
                    <div style={{ marginTop: '1rem', background: '#EFF6FF', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #BFDBFE' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#1E40AF', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                        <CheckCheck size={16} /> Extracted {parsedEntries.length} Attendee Contacts:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '100px', overflowY: 'auto' }}>
                        {parsedEntries.slice(0, 8).map((entry, idx) => (
                          <span 
                            key={idx}
                            style={{ 
                              background: '#FFFFFF', 
                              border: '1px solid #93C5FD', 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#1E3A8A'
                            }}
                          >
                            {entry.type === 'email' ? '✉️' : '📱'} {entry.value}
                          </span>
                        ))}
                        {parsedEntries.length > 8 && (
                          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, padding: '0.15rem 0.4rem' }}>
                            +{parsedEntries.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer flex-between" style={{ borderTop: '1px solid #E2E8F0', padding: '1rem 1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddGuestModalOpen(false)} style={{ fontWeight: 700 }}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={parsedEntries.length === 0}
                    style={{ fontWeight: 800, padding: '0.7rem 1.35rem' }}
                  >
                    <Upload size={17} /> Send Invitations to Document List ({parsedEntries.length})
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Guest Dossier / Full Details Modal */}
      {selectedGuestDossier && (() => {
        // Resolve primary photo (avatar or first document image)
        const primaryPhoto = (selectedGuestDossier.avatar && !selectedGuestDossier.avatar.includes('unsplash.com'))
          ? selectedGuestDossier.avatar
          : selectedGuestDossier.documents?.find(d => d.type === 'image' && d.url)?.url;

        // Non-duplicate documents
        const nonDuplicateDocs = selectedGuestDossier.documents?.filter(d => !primaryPhoto || d.url !== primaryPhoto) || [];

        return (
          <div className="modal-overlay active" onClick={() => setSelectedGuestDossier(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: '100%', background: '#FFFFFF', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--radius-lg)', padding: '1.15rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.65rem' }}>
                <div>
                  <h2 style={{ color: '#0F172A', fontWeight: 800, margin: 0, fontSize: '1.15rem' }}>Attendee Details</h2>
                  <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 600, marginTop: '0.1rem' }}>
                    {currentSelectedEvent.name}
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedGuestDossier(null)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Single Prominent Photo Section */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem', textAlign: 'center' }}>
                <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                  {primaryPhoto ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img 
                        src={primaryPhoto} 
                        style={{ 
                          width: 'clamp(120px, 32vw, 160px)', 
                          height: 'clamp(140px, 38vw, 190px)', 
                          borderRadius: 'var(--radius-lg)', 
                          objectFit: 'cover', 
                          border: '3px solid #E2E8F0', 
                          boxShadow: '0 6px 20px rgba(15, 23, 42, 0.12)', 
                          cursor: 'pointer' 
                        }} 
                        alt={selectedGuestDossier.name}
                        onClick={() => setPreviewPhotoModal({ url: primaryPhoto, title: `${selectedGuestDossier.name}'s Photo` })}
                        title="Click to view full photo"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoModal({ url: primaryPhoto, title: `${selectedGuestDossier.name}'s Photo` })}
                        style={{
                          position: 'absolute',
                          bottom: 6,
                          right: 6,
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '999px',
                          padding: '5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                        }}
                        title="Zoom Photo"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 'clamp(110px, 30vw, 140px)', 
                        height: 'clamp(130px, 35vw, 165px)', 
                        borderRadius: 'var(--radius-lg)', 
                        background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
                        border: '2px dashed #CBD5E1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        color: '#94A3B8'
                      }}
                    >
                      <User size={38} strokeWidth={1.8} color="#94A3B8" />
                      <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748B' }}>No Photo Uploaded</span>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '1.2rem', color: '#0F172A', margin: 0, fontWeight: 800, wordBreak: 'break-word' }}>
                  {selectedGuestDossier.name}
                </h3>
                {selectedGuestDossier.email && (
                  <div style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 600, wordBreak: 'break-all', marginTop: 2 }}>
                    {selectedGuestDossier.email}
                  </div>
                )}
                {selectedGuestDossier.mobile && (
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, marginTop: 2 }}>
                    📱 {selectedGuestDossier.mobile}
                  </div>
                )}
              </div>

              {/* Information / Submitted Details Grid */}
              <div style={{ background: '#F8FAFC', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0', fontSize: '0.8rem', display: 'grid', gap: '0.45rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 700 }}>Status:</span>
                  <span className={`badge badge-${selectedGuestDossier.status === 'checkedin' ? 'checkedin' : selectedGuestDossier.status}`}>
                    {selectedGuestDossier.status.toUpperCase()}
                  </span>
                </div>

                {selectedGuestDossier.college && selectedGuestDossier.college !== 'Awaiting Submission' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B', fontWeight: 700 }}>College / Inst:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>{selectedGuestDossier.college}</span>
                  </div>
                )}

                {selectedGuestDossier.branch && selectedGuestDossier.branch !== 'Pending Acceptance' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B', fontWeight: 700 }}>Department / Branch:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>{selectedGuestDossier.branch}</span>
                  </div>
                )}

                {selectedGuestDossier.rollNo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B', fontWeight: 700 }}>Roll / Reg No:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A', textAlign: 'right' }}>{selectedGuestDossier.rollNo}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 700 }}>Allocated Passes:</span>
                  <span style={{ fontWeight: 800, color: '#2563EB' }}>
                    🎟️ {selectedGuestDossier.tokenCount || selectedGuestDossier.tokens?.length || 1} Token{(selectedGuestDossier.tokenCount || selectedGuestDossier.tokens?.length || 1) > 1 ? 's' : ''}
                  </span>
                </div>

                {selectedGuestDossier.registrationDate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B', fontWeight: 700 }}>Registered On:</span>
                    <span style={{ fontWeight: 700, color: '#475569' }}>{formatRegistrationDateOnly(selectedGuestDossier.registrationDate)}</span>
                  </div>
                )}

                {selectedGuestDossier.checkInTime && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#047857', fontWeight: 800 }}>
                    <span>Check-in Time:</span>
                    <span>{selectedGuestDossier.checkInTime}</span>
                  </div>
                )}
              </div>

              {/* Form Answers (Only if present and has filled non-empty values) */}
              {selectedGuestDossier.answers && Object.entries(selectedGuestDossier.answers).filter(([_, v]) => v !== undefined && v !== '' && v !== null).length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={13} color="#2563EB" /> Submitted Details:
                  </div>
                  <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0', display: 'grid', gap: '0.4rem' }}>
                    {Object.entries(selectedGuestDossier.answers)
                      .filter(([_, val]) => val !== undefined && val !== '' && val !== null)
                      .map(([key, val]) => (
                        <div key={key} style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.25rem' }}>
                          <span style={{ color: '#64748B', fontWeight: 700 }}>{key}:</span>
                          <span style={{ fontWeight: 700, color: '#0F172A', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{String(val)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Uploaded Documents (if any non-duplicate document exists) */}
              {nonDuplicateDocs.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FileText size={14} color="#2563EB" /> Uploaded Documents ({nonDuplicateDocs.length}):
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {nonDuplicateDocs.map((doc, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          background: '#F8FAFC', 
                          borderRadius: 'var(--radius-md)', 
                          border: '1px solid #CBD5E1',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', wordBreak: 'break-word' }}>
                            {doc.name}
                          </div>
                          {doc.size && <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{doc.size}</div>}
                        </div>
                        {doc.url && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              if (doc.type === 'image') {
                                setPreviewPhotoModal({ url: doc.url!, title: `${selectedGuestDossier.name} - ${doc.name}` });
                              } else {
                                const win = window.open();
                                win?.document.write(`<iframe src="${doc.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                              }
                            }}
                            style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem' }}
                          >
                            <ExternalLink size={12} /> View
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedGuestDossier(null)}
                  style={{ fontWeight: 700, width: selectedGuestDossier.status === 'pending' ? 'auto' : '100%' }}
                >
                  Close
                </button>

                {selectedGuestDossier.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        updateGuestStatus(selectedGuestDossier.id, 'rejected');
                        setSelectedGuestDossier(null);
                      }}
                      style={{ fontWeight: 800 }}
                    >
                      <UserX size={13} /> Reject
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        updateGuestStatus(selectedGuestDossier.id, 'approved');
                        setSelectedGuestDossier(null);
                      }}
                      style={{ background: '#10B981', borderColor: '#059669', fontWeight: 800 }}
                    >
                      <UserCheck size={13} /> Approve
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* Full Photo / Document Lightbox Preview Modal */}
      {previewPhotoModal && (
        <div className="modal-overlay active" onClick={() => setPreviewPhotoModal(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 840, width: '94%', background: '#0F172A', color: '#FFFFFF', padding: '1.25rem', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{previewPhotoModal.title}</h3>
              <button className="icon-btn" onClick={() => setPreviewPhotoModal(null)} style={{ color: '#FFFFFF', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div style={{ background: '#020617', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #334155' }}>
              <img 
                src={previewPhotoModal.url} 
                alt={previewPhotoModal.title} 
                style={{ maxWidth: '100%', maxHeight: '78vh', borderRadius: 'var(--radius-md)', objectFit: 'contain' }} 
              />
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <a 
                href={previewPhotoModal.url} 
                download="attendee_verification_photo.jpg"
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800, padding: '0.5rem 1.25rem' }}
              >
                ⬇️ Download Full Photo
              </a>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setPreviewPhotoModal(null)}
                style={{ fontWeight: 700, padding: '0.5rem 1.25rem' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
