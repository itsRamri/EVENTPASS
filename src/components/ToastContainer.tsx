import React, { useState, useRef, useEffect } from 'react';
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
  const isDraggingRef = useRef(false);

  // Touch handlers for mobile horizontal swipe (left <-> right)
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsSwiping(false);
    const diff = currentXRef.current - startXRef.current;
    const threshold = 45; // swipe threshold in pixels

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

  // Mouse handlers for desktop horizontal drag & dismiss
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click
    if (e.button !== 0) return;
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    setIsSwiping(true);
    isDraggingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      currentXRef.current = moveEvent.clientX;
      const diff = currentXRef.current - startXRef.current;
      setOffsetX(diff);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsSwiping(false);
      const diff = currentXRef.current - startXRef.current;
      if (Math.abs(diff) > 45) {
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

  let icon = <Info size={19} color="#2563EB" />;
  let accentColor = '#2563EB';
  let badgeBg = '#EFF6FF';

  if (toast.type === 'success') {
    icon = <CheckCircle2 size={19} color="#10B981" />;
    accentColor = '#10B981';
    badgeBg = '#ECFDF5';
  } else if (toast.type === 'error') {
    icon = <AlertCircle size={19} color="#EF4444" />;
    accentColor = '#EF4444';
    badgeBg = '#FEF2F2';
  } else if (toast.type === 'warning') {
    icon = <AlertTriangle size={19} color="#F59E0B" />;
    accentColor = '#F59E0B';
    badgeBg = '#FFFBEB';
  }

  const opacity = isExiting ? 0 : Math.max(0.1, 1 - Math.abs(offsetX) / 200);
  const transform = isExiting
    ? `translateX(${exitDirection === 'right' ? '125%' : '-125%'}) scale(0.95)`
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
        borderLeft: `5px solid ${accentColor}`,
        borderRadius: 16,
        padding: '0.75rem 1rem',
        boxShadow: '0 10px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        cursor: isSwiping ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y',
        transform,
        opacity,
        transition: isSwiping 
          ? 'none' 
          : 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
        willChange: 'transform, opacity',
        animation: 'toastSlideDown 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <div 
        style={{ 
          width: 34, 
          height: 34, 
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
          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A', lineHeight: 1.25, marginBottom: 2 }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>
          {toast.message}
        </div>
      </div>

      {/* Close / Cut button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        style={{
          background: '#F1F5F9',
          border: 'none',
          color: '#64748B',
          cursor: 'pointer',
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#E2E8F0';
          e.currentTarget.style.color = '#0F172A';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#F1F5F9';
          e.currentTarget.style.color = '#64748B';
        }}
        title="Cut / Dismiss"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  // Render only the latest single active notification in the fixed top header slot
  const currentToast = toasts[toasts.length - 1];

  return (
    <>
      <style>{`
        @keyframes toastSlideDown {
          from {
            transform: translateY(-24px) scale(0.96);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
      <div 
        className="toast-container"
        style={{
          position: 'fixed',
          top: 'max(14px, env(safe-area-inset-top, 14px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(420px, calc(100vw - 28px))',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'none'
        }}
      >
        <ToastItem key={currentToast.id} toast={currentToast} onDismiss={dismissToast} />
      </div>
    </>
  );
};
