import React from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Sparkles, Check, QrCode } from 'lucide-react';
import { UserRole } from '../types';

export const RoleSwitcherModal: React.FC = () => {
  const { isRoleModalOpen, setRoleModalOpen, user, switchRole } = useApp();

  if (!isRoleModalOpen) return null;

  const roles: { role: UserRole; title: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      role: 'manager',
      title: '👑 Event Manager',
      desc: 'Create events, customize requirement fields, review guest requests, issue passes & configure staff permissions.',
      icon: <Sparkles size={20} />,
      color: '#2563EB'
    },
    {
      role: 'guest',
      title: '🎟️ Guest / Student',
      desc: 'Browse flagship campus events, submit dynamic registration forms, track approval state & view luxury digital QR pass.',
      icon: <Shield size={20} />,
      color: '#0284C7'
    },
    {
      role: 'scanner',
      title: '📷 Scanner / Gate Staff',
      desc: 'High-speed camera scanner, anti-fraud duplicate detection, instant guest check-in & verification.',
      icon: <QrCode size={20} />,
      color: '#059669'
    }
  ];

  return (
    <div className="modal-overlay active" onClick={() => setRoleModalOpen(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Switch Active Persona Role</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Experience the entire application from different user perspectives</p>
          </div>
          <button className="icon-btn" onClick={() => setRoleModalOpen(false)}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {roles.map(r => {
              const isActive = user.role === r.role;
              return (
                <div
                  key={r.role}
                  className="glass-panel"
                  style={{
                    padding: '1.1rem',
                    cursor: 'pointer',
                    borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    switchRole(r.role);
                    setRoleModalOpen(false);
                  }}
                >
                  <div className="flex-between">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ marginTop: 2 }}>{r.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: r.color, fontSize: '0.95rem' }}>{r.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                          {r.desc}
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ color: 'var(--accent-primary)', marginLeft: '0.5rem' }}>
                        <Check size={20} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
