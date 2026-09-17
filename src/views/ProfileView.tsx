import React from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, Phone, School, BookOpen, ShieldCheck, Lock, LogOut } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, logout } = useApp();

  return (
    <div className="animate-fade" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1>Account Profile</h1>
          <p>Official verified registration & identity details</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} /> VERIFIED ACCOUNT
          </span>
        </div>
      </div>

      {/* Main Profile Summary Card */}
      <div className="glass-panel" style={{ padding: '2rem 1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        <div 
          style={{ 
            width: 84, 
            height: 84, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', 
            border: '3px solid #38BDF8', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#2563EB',
            boxShadow: '0 6px 18px rgba(56, 189, 248, 0.25)',
            margin: '0 auto 1rem'
          }}
        >
          <User size={42} strokeWidth={2.3} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {user.name}
        </h2>
        <p style={{ color: 'var(--accent-secondary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          {user.email}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="badge badge-approved">✓ Active Event Member</span>
          <span className="badge badge-checkedin" style={{ textTransform: 'none', fontSize: '0.75rem' }}>
            🔒 Verified Profile
          </span>
        </div>
      </div>

      {/* Read-Only Profile Details */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="var(--accent-primary)" />
            Profile Information
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Lock size={12} /> Non-editable
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {/* Full Name */}
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Full Name
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {user.name}
            </div>
          </div>

          {/* Email & Mobile Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={13} color="var(--accent-secondary)" /> Email Address
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {user.email}
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={13} color="var(--accent-secondary)" /> Mobile Number
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.mobile || '+91 98765 43210'}
              </div>
            </div>
          </div>

          {/* College / Institute */}
          {user.college && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <School size={13} color="var(--accent-secondary)" /> College / University
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.college}
              </div>
            </div>
          )}

          {/* Department / Branch */}
          {user.branch && (
            <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BookOpen size={13} color="var(--accent-secondary)" /> Department / Branch
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.branch}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <button 
          className="btn btn-secondary" 
          style={{ color: '#EF4444', fontWeight: 700, padding: '0.65rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={logout}
        >
          <LogOut size={16} /> Log Out of Account
        </button>
      </div>
    </div>
  );
};
