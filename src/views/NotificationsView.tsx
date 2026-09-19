import React from 'react';
import { useApp } from '../context/AppContext';
import { Bell, CheckCircle2, Trash2, ArrowLeft } from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { user, navigate, notifications, markNotificationsRead, deleteNotification, clearAllNotifications } = useApp();

  const userEmail = (user.email || '').toLowerCase().trim();
  const userPhone = (user.mobile || '').replace(/\D/g, '');

  const userNotifications = notifications.filter(n => {
    if (n.recipientEmail) {
      return Boolean(userEmail && n.recipientEmail.toLowerCase().trim() === userEmail);
    }
    if (n.recipientPhone) {
      return Boolean(userPhone && n.recipientPhone.replace(/\D/g, '') === userPhone);
    }
    if (n.recipientRole) {
      return n.recipientRole === 'all' || n.recipientRole === user.role;
    }
    return true;
  });

  return (
    <div className="animate-fade" style={{ maxWidth: 640, margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Notifications</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={markNotificationsRead}>
            <CheckCircle2 size={14} /> Mark Read
          </button>
          {userNotifications.length > 0 && (
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ color: '#EF4444' }}
              onClick={clearAllNotifications}
              title="Clear all alerts"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      {userNotifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap">
            <Bell size={28} />
          </div>
          <div className="empty-title">All caught up!</div>
          <p className="empty-desc">You have no unread or pending notifications.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {userNotifications.map(n => (
            <div 
              key={n.id} 
              className="glass-panel" 
              style={{
                padding: '1rem 1.25rem',
                borderLeft: `3px solid ${n.type === 'success' ? '#10B981' : n.type === 'warning' ? '#F59E0B' : '#6366F1'}`,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{n.title}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.timestamp}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {n.message}
                </div>
              </div>

              <button 
                className="icon-btn" 
                style={{ width: 28, height: 28, color: 'var(--text-muted)' }}
                onClick={() => deleteNotification(n.id)}
                title="Delete alert"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
