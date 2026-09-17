import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => {
        let icon = <Info size={20} color="#6366F1" />;
        if (t.type === 'success') icon = <CheckCircle2 size={20} color="#10B981" />;
        if (t.type === 'error') icon = <AlertCircle size={20} color="#EF4444" />;
        if (t.type === 'warning') icon = <AlertTriangle size={20} color="#F59E0B" />;

        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div>{icon}</div>
            <div style={{ flex: 1 }}>
              {t.title && (
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {t.title}
                </div>
              )}
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                {t.message}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
