import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastItemProps {
  toast: {
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title?: string;
  };
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right'>('right');

  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const diff = currentXRef.current - startXRef.current;
    const threshold = 55; // swipe threshold in pixels

    if (Math.abs(diff) > threshold) {
      const dir = diff > 0 ? 'right' : 'left';
      setExitDirection(dir);
      setIsExiting(true);
      setTimeout(() => {
        onDismiss(toast.id);
      }, 200);
    } else {
      setOffsetX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    setIsSwiping(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      currentXRef.current = moveEvent.clientX;
      const diff = currentXRef.current - startXRef.current;
      setOffsetX(diff);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsSwiping(false);
      const diff = currentXRef.current - startXRef.current;
      if (Math.abs(diff) > 55) {
        const dir = diff > 0 ? 'right' : 'left';
        setExitDirection(dir);
        setIsExiting(true);
        setTimeout(() => {
          onDismiss(toast.id);
        }, 200);
      } else {
        setOffsetX(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  let icon = <Info size={18} color="#2563EB" />;
  let accentColor = '#2563EB';
  let badgeBg = '#EFF6FF';
  if (toast.type === 'success') {
    icon = <CheckCircle2 size={18} color="#10B981" />;
    accentColor = '#10B981';
    badgeBg = '#ECFDF5';
  } else if (toast.type === 'error') {
    icon = <AlertCircle size={18} color="#EF4444" />;
    accentColor = '#EF4444';
    badgeBg = '#FEF2F2';
  } else if (toast.type === 'warning') {
    icon = <AlertTriangle size={18} color="#F59E0B" />;
    accentColor = '#F59E0B';
    badgeBg = '#FFFBEB';
  }

  const opacity = isExiting ? 0 : Math.max(0.05, 1 - Math.abs(offsetX) / 240);
  const transform = isExiting
    ? `translateX(${exitDirection === 'right' ? '120%' : '-120%'})`
    : `translateX(${offsetX}px)`;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{
        pointerEvents: 'auto',
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 16,
        padding: '0.75rem 0.95rem',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        cursor: isSwiping ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y',
        transform,
        opacity,
        transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease',
        willChange: 'transform, opacity'
      }}
    >
      <div 
        style={{ 
          width: 32, 
          height: 32, 
          borderRadius: 10, 
          background: badgeBg, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flexShrink: 0 
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A', lineHeight: 1.2, marginBottom: 2 }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>
          {toast.message}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: '#94A3B8',
          cursor: 'pointer',
          padding: 4,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        title="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  // Show only latest 3 notifications so it never covers the screen
  const visibleToasts = toasts.slice(-3);

  return (
    <div 
      className="toast-container"
      style={{
        position: 'fixed',
        top: 'max(14px, env(safe-area-inset-top, 14px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(420px, calc(100vw - 24px))',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none'
      }}
    >
      {visibleToasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
