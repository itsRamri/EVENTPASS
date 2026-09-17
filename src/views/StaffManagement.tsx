import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StaffMember, StaffPermissions, NotificationItem } from '../types';
import { syncNotificationToDb } from '../services/dbService';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Trash2, 
  UserCheck,
  Calendar,
  Sparkles
} from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const { staff, events, saveStaff, deleteStaff, updateStaffPermission, toggleStaffStatus, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);

  // Direct Staff Invite State (Zero Form Filling)
  const [staffInviteMode, setStaffInviteMode] = useState<'email' | 'mobile'>('email');
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [assignedEventId, setAssignedEventId] = useState('all');
  const [perms, setPerms] = useState<StaffPermissions>({
    canScan: true,
    canCheckIn: true,
    canViewDetails: true,
    canApprove: false,
    canReject: false
  });

  const targetEvent = events.find(e => e.id === assignedEventId);
  const partyName = assignedEventId === 'all' ? 'All Active Events' : targetEvent?.name || 'Selected Event';

  const filteredStaff = staff.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone && s.phone.includes(q));
  });

  const handleGrantAccess = (e: React.FormEvent) => {
    e.preventDefault();

    if (staffInviteMode === 'email') {
      const emails = staffEmailInput.split(/[\n,]+/).map(em => em.trim()).filter(Boolean);
      if (emails.length === 0) {
        showToast('Please enter at least one valid email address', 'warning');
        return;
      }

      emails.forEach((emailAddr, i) => {
        const username = emailAddr.split('@')[0];
        const formattedName = username.charAt(0).toUpperCase() + username.slice(1);

        const newMember: StaffMember = {
          id: 'stf_em_' + Date.now() + '_' + i,
          name: formattedName,
          email: emailAddr,
          designation: 'Gate Security & Scanner',
          role: 'scanner',
          status: 'active',
          isProfileComplete: true,
          approvalStatus: 'approved',
          assignedEventId: assignedEventId,
          permissions: perms,
          requestedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };

        saveStaff(newMember);

        // Send direct notification specifically to this staff account
        const staffNotif: NotificationItem = {
          id: 'notif_stf_' + Date.now() + '_' + i,
          title: '🎉 Access Granted!',
          message: `Congratulations! You have been granted direct access to scan and manage QR passes for "${partyName}".`,
          type: 'success',
          timestamp: 'Just now',
          read: false,
          recipientEmail: emailAddr.toLowerCase(),
          recipientRole: 'staff'
        };
        syncNotificationToDb(staffNotif);
      });

      setIsAddStaffModalOpen(false);
      setStaffEmailInput('');
      showToast(`✓ Direct scanner access granted to ${emails.length} staff member(s) for "${partyName}".`, 'success');
    } else {
      const phones = staffPhoneInput.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
      if (phones.length === 0) {
        showToast('Please enter at least one valid phone number', 'warning');
        return;
      }

      phones.forEach((phoneNum, i) => {
        const cleanDigits = phoneNum.replace(/\D/g, '');
        const formattedName = 'Scanner Staff ' + (cleanDigits.slice(-4) || i + 1);

        const newMember: StaffMember = {
          id: 'stf_mob_' + Date.now() + '_' + i,
          name: formattedName,
          email: `${cleanDigits || Date.now()}@scanner.eventpass.io`,
          phone: phoneNum,
          designation: 'Gate Security & Scanner',
          role: 'scanner',
          status: 'active',
          isProfileComplete: true,
          approvalStatus: 'approved',
          assignedEventId: assignedEventId,
          permissions: perms,
          requestedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };

        saveStaff(newMember);

        // Send direct notification specifically to this staff mobile account
        const staffNotif: NotificationItem = {
          id: 'notif_stf_' + Date.now() + '_' + i,
          title: '🎉 Access Granted!',
          message: `Congratulations! You have been granted direct access to scan and manage QR passes for "${partyName}".`,
          type: 'success',
          timestamp: 'Just now',
          read: false,
          recipientPhone: cleanDigits,
          recipientRole: 'staff'
        };
        syncNotificationToDb(staffNotif);
      });

      setIsAddStaffModalOpen(false);
      setStaffPhoneInput('');
      showToast(`✓ Direct scanner access granted to ${phones.length} mobile number(s) for "${partyName}".`, 'success');
    }
  };

  const handleRevoke = (s: StaffMember) => {
    if (confirm(`Are you sure you want to remove gate scanning credentials for ${s.name}?`)) {
      deleteStaff(s.id);
    }
  };

  return (
    <div className="animate-fade">
      {/* Top Header */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '1.5rem 1.75rem', 
          marginBottom: '1.5rem', 
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.35rem', border: '1px solid #BFDBFE' }}>
            <ShieldCheck size={13} /> EVENT GATE DELEGATION & PERMISSIONS
          </div>
          <h1 style={{ color: '#0F172A', fontWeight: 800, fontSize: '1.5rem', margin: 0 }}>
            Gate Scanner Access & Staff Management
          </h1>
          <p style={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            Grant direct QR pass scanning and gate check-in permissions to volunteers, security crew, and gate staff
          </p>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => setIsAddStaffModalOpen(true)}
          style={{ fontWeight: 800, padding: '0.75rem 1.4rem', fontSize: '0.925rem', letterSpacing: '0.01em' }}
        >
          <Plus size={18} /> + Grant Scanner Access
        </button>
      </div>

      {/* Search Input */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', background: '#FFFFFF', border: '1px solid #E2E8F0', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
          <input 
            type="text" 
            placeholder="Search scanner staff members by name or email..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.85rem', borderRadius: 'var(--radius-md)', color: '#0F172A', fontWeight: 600, border: '1.5px solid #CBD5E1', background: '#FFFFFF', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Staff Members List */}
      {filteredStaff.length === 0 ? (
        <div className="glass-panel empty-state" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div className="empty-icon-wrap" style={{ width: 64, height: 64, margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(74, 123, 247, 0.1)', color: 'var(--accent-primary)' }}>
            <ShieldCheck size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: '#0F172A', fontWeight: 800 }}>No Scanner Staff Delegated Yet</h3>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.25rem', fontWeight: 600 }}>
            Grant scanning and check-in access to other people so they can scan attendee passes at event gates.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setIsAddStaffModalOpen(true)} style={{ fontWeight: 800 }}>
            + Grant Scanner Access
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {filteredStaff.map(s => {
            const assignedEvt = events.find(e => e.id === s.assignedEventId) || { name: 'All Event Gates' };
            const p: StaffPermissions = s.permissions || {
              canScan: false,
              canCheckIn: false,
              canViewDetails: false,
              canApprove: false,
              canReject: false
            };

            return (
              <div 
                key={s.id} 
                className="glass-panel staff-item-card" 
                style={{ 
                  padding: '1.25rem 1.35rem', 
                  background: '#FFFFFF', 
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  overflow: 'hidden'
                }}
              >
                {/* Header Row */}
                <div className="flex-between" style={{ marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.85rem', width: '100%' }}>
                  {/* Staff Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: '1 1 220px', minWidth: 0, maxWidth: '100%' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div 
                        style={{ 
                          width: 48, 
                          height: 48, 
                          borderRadius: 'var(--radius-md)', 
                          background: '#EFF6FF', 
                          border: '2px solid #BFDBFE', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 900, 
                          color: '#1D4ED8', 
                          fontSize: '1.25rem' 
                        }}
                      >
                        {s.name.charAt(0)}
                      </div>
                      <span 
                        style={{ 
                          position: 'absolute', 
                          bottom: -2, 
                          right: -2, 
                          width: 13, 
                          height: 13, 
                          borderRadius: '50%', 
                          background: s.status === 'active' ? '#10B981' : '#EF4444', 
                          border: '2px solid #FFFFFF' 
                        }} 
                      />
                    </div>
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', wordBreak: 'break-word' }}>
                          {s.name}
                        </span>
                        <span 
                          style={{ 
                            fontSize: '0.725rem', 
                            fontWeight: 800, 
                            padding: '0.15rem 0.55rem', 
                            borderRadius: '999px', 
                            background: s.status === 'active' ? '#D1FAE5' : '#FEE2E2', 
                            color: s.status === 'active' ? '#065F46' : '#991B1B',
                            border: s.status === 'active' ? '1px solid #A7F3D0' : '1px solid #FECACA'
                          }}
                        >
                          {s.status === 'active' ? '✓ ACTIVE SCANNER' : '✕ INACTIVE'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600, marginTop: '0.15rem', wordBreak: 'break-all' }}>
                        {s.email} {s.phone ? `• ${s.phone}` : ''} {s.designation ? `(${s.designation})` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    {/* Active Toggle Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#F8FAFC', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid #CBD5E1' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Active:</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={s.status === 'active'} 
                          onChange={() => toggleStaffStatus(s.id)} 
                        />
                        <span className="slider" />
                      </label>
                    </div>

                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ color: '#EF4444', fontWeight: 800, borderColor: '#FECACA', background: '#FEF2F2', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }} 
                      onClick={() => handleRevoke(s)} 
                      title="Remove Staff Access"
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </div>
                </div>

                {/* Granular Permission Tiles & Event Access */}
                <div style={{ background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1.5px solid #E2E8F0' }}>
                  {/* Assigned Event Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', flexWrap: 'wrap', background: '#EFF6FF', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #BFDBFE' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={15} color="#2563EB" /> Authorized Event Access:
                    </span>
                    <select
                      value={s.assignedEventId || 'all'}
                      onChange={e => {
                        const selectedId = e.target.value;
                        const updated: StaffMember = { ...s, assignedEventId: selectedId };
                        saveStaff(updated);
                        const evtName = selectedId === 'all' ? 'All Active Events' : events.find(ev => ev.id === selectedId)?.name || 'Selected Event';
                        showToast(`✓ Access updated for ${s.name}: ${evtName}`, 'success');
                      }}
                      style={{
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        padding: '0.35rem 0.65rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1.5px solid #94A3B8',
                        background: '#FFFFFF',
                        color: '#0F172A',
                        cursor: 'pointer',
                        flex: '1 1 200px'
                      }}
                    >
                      <option value="all">🌐 All Active Events (Full Gate Access)</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>🎯 {ev.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.55rem' }}>
                    DELEGATED SCANNER PERMISSIONS:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.45rem', 
                        cursor: 'pointer', 
                        color: p.canScan ? '#0F172A' : '#64748B', 
                        fontWeight: 800,
                        fontSize: '0.825rem',
                        background: '#FFFFFF',
                        padding: '0.45rem 0.7rem',
                        borderRadius: 'var(--radius-sm)',
                        border: p.canScan ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                        flex: '1 1 calc(50% - 0.5rem)',
                        minWidth: '120px'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={!!p.canScan} 
                        onChange={e => updateStaffPermission(s.id, 'canScan', e.target.checked)} 
                      />
                      <span>📷 Scan</span>
                    </label>

                    <label 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.45rem', 
                        cursor: 'pointer', 
                        color: p.canCheckIn ? '#0F172A' : '#64748B', 
                        fontWeight: 800,
                        fontSize: '0.825rem',
                        background: '#FFFFFF',
                        padding: '0.45rem 0.7rem',
                        borderRadius: 'var(--radius-sm)',
                        border: p.canCheckIn ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                        flex: '1 1 calc(50% - 0.5rem)',
                        minWidth: '120px'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={!!p.canCheckIn} 
                        onChange={e => updateStaffPermission(s.id, 'canCheckIn', e.target.checked)} 
                      />
                      <span>🎟️ Check-In</span>
                    </label>

                    <label 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.45rem', 
                        cursor: 'pointer', 
                        color: p.canViewDetails ? '#0F172A' : '#64748B', 
                        fontWeight: 800,
                        fontSize: '0.825rem',
                        background: '#FFFFFF',
                        padding: '0.45rem 0.7rem',
                        borderRadius: 'var(--radius-sm)',
                        border: p.canViewDetails ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                        flex: '1 1 calc(50% - 0.5rem)',
                        minWidth: '120px'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={!!p.canViewDetails} 
                        onChange={e => updateStaffPermission(s.id, 'canViewDetails', e.target.checked)} 
                      />
                      <span>📋 Details Check</span>
                    </label>

                    <label 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.45rem', 
                        cursor: 'pointer', 
                        color: p.canApprove ? '#0F172A' : '#64748B', 
                        fontWeight: 800,
                        fontSize: '0.825rem',
                        background: '#FFFFFF',
                        padding: '0.45rem 0.7rem',
                        borderRadius: 'var(--radius-sm)',
                        border: p.canApprove ? '1.5px solid #93C5FD' : '1px solid #CBD5E1',
                        flex: '1 1 calc(50% - 0.5rem)',
                        minWidth: '120px'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={!!p.canApprove} 
                        onChange={e => updateStaffPermission(s.id, 'canApprove', e.target.checked)} 
                      />
                      <span>✓ Approve</span>
                    </label>

                    <label 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.45rem', 
                        cursor: 'pointer', 
                        color: p.canReject ? '#0F172A' : '#64748B', 
                        fontWeight: 800,
                        fontSize: '0.825rem',
                        background: '#FFFFFF',
                        padding: '0.45rem 0.7rem',
                        borderRadius: 'var(--radius-sm)',
                        border: p.canReject ? '1.5px solid #FECACA' : '1px solid #CBD5E1',
                        flex: '1 1 100%',
                        minWidth: '120px'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={!!p.canReject} 
                        onChange={e => updateStaffPermission(s.id, 'canReject', e.target.checked)} 
                      />
                      <span>✕ Delete Guest Pass</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Staff / Direct Scanner Access Modal */}
      {isAddStaffModalOpen && (
        <div className="modal-overlay active" onClick={() => setIsAddStaffModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(500px, calc(100vw - 1.5rem))', width: '100%', boxSizing: 'border-box' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', border: '1px solid #BFDBFE', flexShrink: 0 }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 style={{ color: '#0F172A', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>Direct Scanner Access Invite</h2>
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => setIsAddStaffModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleGrantAccess}>
              <div className="modal-body">
                {/* Channel Selector Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.15rem' }}>
                  <button
                    type="button"
                    onClick={() => setStaffInviteMode('email')}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      border: staffInviteMode === 'email' ? '2px solid #2563EB' : '1.5px solid #CBD5E1',
                      background: staffInviteMode === 'email' ? '#EFF6FF' : '#FFFFFF',
                      color: staffInviteMode === 'email' ? '#1D4ED8' : '#64748B',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📧 Invite via Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffInviteMode('mobile')}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      border: staffInviteMode === 'mobile' ? '2px solid #2563EB' : '1.5px solid #CBD5E1',
                      background: staffInviteMode === 'mobile' ? '#EFF6FF' : '#FFFFFF',
                      color: staffInviteMode === 'mobile' ? '#1D4ED8' : '#64748B',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📱 Invite via Mobile / SMS
                  </button>
                </div>

                {/* Input Fields */}
                {staffInviteMode === 'email' ? (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.875rem' }}>
                      Staff Email Address(es) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Example: security@event.com"
                      value={staffEmailInput}
                      onChange={e => setStaffEmailInput(e.target.value)}
                      required
                      style={{ color: '#0F172A', fontWeight: 600, border: '1.5px solid #94A3B8', borderRadius: 'var(--radius-sm)', padding: '0.65rem', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div className="form-hint" style={{ color: '#64748B', fontSize: '0.775rem' }}>
                      Staff will receive an instant invitation notification with scanner authorization.
                    </div>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.875rem' }}>
                      Staff Mobile Number(s) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="Example: +91 98765 43210"
                      value={staffPhoneInput}
                      onChange={e => setStaffPhoneInput(e.target.value)}
                      required
                      style={{ color: '#0F172A', fontWeight: 600, border: '1.5px solid #94A3B8', borderRadius: 'var(--radius-sm)', padding: '0.65rem', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                    />
                    <div className="form-hint" style={{ color: '#64748B', fontSize: '0.775rem' }}>
                      Staff will receive instant mobile access for gate scanning.
                    </div>
                  </div>
                )}

                {/* Event Selection */}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.875rem' }}>
                    Authorized Event / Party Access <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select 
                    value={assignedEventId} 
                    onChange={e => setAssignedEventId(e.target.value)}
                    style={{ color: '#0F172A', fontWeight: 700, border: '1.5px solid #94A3B8', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem', width: '100%', background: '#FFFFFF', fontSize: '0.875rem' }}
                  >
                    <option value="all">🌐 All Active Events (Universal Scanner Access)</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>🎯 {ev.name}</option>
                    ))}
                  </select>
                </div>

                {/* Permissions */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: '#0F172A', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    Assigned Scanner Permissions
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid #CBD5E1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 800, color: '#0F172A', fontSize: '0.8rem', flex: '1 1 calc(50% - 0.45rem)', minWidth: '100px' }}>
                      <input 
                        type="checkbox" 
                        checked={perms.canScan} 
                        onChange={e => setPerms({ ...perms, canScan: e.target.checked })} 
                      />
                      <span>📷 Scan Pass</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 800, color: '#0F172A', fontSize: '0.8rem', flex: '1 1 calc(50% - 0.45rem)', minWidth: '100px' }}>
                      <input 
                        type="checkbox" 
                        checked={perms.canCheckIn} 
                        onChange={e => setPerms({ ...perms, canCheckIn: e.target.checked })} 
                      />
                      <span>🎟️ Check-In</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 800, color: '#0F172A', fontSize: '0.8rem', flex: '1 1 calc(50% - 0.45rem)', minWidth: '100px' }}>
                      <input 
                        type="checkbox" 
                        checked={perms.canViewDetails} 
                        onChange={e => setPerms({ ...perms, canViewDetails: e.target.checked })} 
                      />
                      <span>📋 Details Check</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 800, color: '#0F172A', fontSize: '0.8rem', flex: '1 1 calc(50% - 0.45rem)', minWidth: '100px' }}>
                      <input 
                        type="checkbox" 
                        checked={perms.canApprove} 
                        onChange={e => setPerms({ ...perms, canApprove: e.target.checked })} 
                      />
                      <span>✓ Approve</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 800, color: '#0F172A', fontSize: '0.8rem', flex: '1 1 100%', minWidth: '100px' }}>
                      <input 
                        type="checkbox" 
                        checked={perms.canReject} 
                        onChange={e => setPerms({ ...perms, canReject: e.target.checked })} 
                      />
                      <span>✕ Delete Guest Pass</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer flex-between">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddStaffModalOpen(false)} style={{ fontWeight: 700 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 800, padding: '0.65rem 1.25rem', background: '#059669', borderColor: '#059669' }}>
                  <UserCheck size={16} /> 🚀 Send Direct Scanner Access Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
