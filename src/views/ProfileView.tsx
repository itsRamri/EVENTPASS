import React from 'react';
import { useApp } from '../context/AppContext';
import { User, Mail, Phone, ShieldCheck, Lock, LogOut, CheckCircle2 } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, logout } = useApp();

  return (
    <div className="animate-fade" style={{ maxWidth: 640, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>Account Profile</h1>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>Official verified registration & identity details</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', fontWeight: 700 }}>
            <ShieldCheck size={14} color="#16A34A" /> VERIFIED ACCOUNT
          </span>
        </div>
      </div>

      {/* Main Profile Summary Card */}
      <div 
        style={{ 
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
          padding: '2rem 1.5rem', 
          marginBottom: '1.25rem', 
          textAlign: 'center' 
        }}
      >
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

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.25rem' }}>
          {user.name}
        </h2>
        <p style={{ color: '#2563EB', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.85rem' }}>
          {user.email}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="badge badge-approved" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={13} color="#2563EB" /> Active Event Member
          </span>
          <span className="badge badge-checkedin" style={{ textTransform: 'none', fontSize: '0.75rem', background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', fontWeight: 600 }}>
            🔒 Verified Profile
          </span>
        </div>
      </div>

      {/* High-Contrast Profile Details Section */}
      <div 
        style={{ 
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
          padding: '1.5rem', 
          marginBottom: '1.5rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1.5px solid #F1F5F9' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <User size={18} color="#2563EB" />
            Profile Information
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, background: '#F8FAFC', padding: '0.25rem 0.5rem', borderRadius: 6, border: '1px solid #E2E8F0' }}>
            <Lock size={12} /> Non-editable
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {/* Full Name Field Card */}
          <div 
            style={{ 
              background: '#F8FAFC', 
              padding: '1rem 1.15rem', 
              borderRadius: 'var(--radius-md)', 
              border: '1.5px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={13} color="#2563EB" /> Full Name
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', wordBreak: 'break-word' }}>
              {user.name}
            </div>
          </div>

          {/* Email & Mobile Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
            <div 
              style={{ 
                background: '#F8FAFC', 
                padding: '1rem 1.15rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={13} color="#2563EB" /> Email Address
              </div>
              <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0F172A', wordBreak: 'break-all' }}>
                {user.email}
              </div>
            </div>

            <div 
              style={{ 
                background: '#F8FAFC', 
                padding: '1rem 1.15rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={13} color="#2563EB" /> Mobile Number
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                {user.mobile || '+91 98765 43210'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <button 
          className="btn" 
          style={{ 
            background: '#FEE2E2',
            color: '#DC2626', 
            border: '1.5px solid #FCA5A5',
            fontWeight: 800, 
            padding: '0.75rem 1.75rem', 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.1)',
            cursor: 'pointer'
          }}
          onClick={logout}
        >
          <LogOut size={16} /> Log Out of Account
        </button>
      </div>
    </div>
  );
};
