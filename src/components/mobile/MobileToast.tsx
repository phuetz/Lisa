/**
 * MobileToast - Système de notifications toast pour mobile
 * Notifications élégantes avec animations et haptics
 */

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const toastColors = {
  success: { bg: 'rgba(16, 185, 129, 0.95)', border: '#10b981' },
  error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b' },
  info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6' },
};

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = toastIcons[toast.type];
  const colors = toastColors[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        transform: isVisible ? 'translateX(0)' : 'translateX(120%)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        maxWidth: '90vw',
      }}
    >
      <Icon size={20} color="#fff" style={{ flexShrink: 0 }} />
      <span style={{ 
        flex: 1, 
        color: '#fff', 
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: 1.4
      }}>
        {toast.message}
      </span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        style={{
          padding: '4px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { hapticSuccess, hapticError, hapticWarning } = useMobile();

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type, duration }]);

    // Haptic feedback based on type
    if (type === 'success') hapticSuccess();
    else if (type === 'error') hapticError();
    else if (type === 'warning') hapticWarning();
  }, [hapticSuccess, hapticError, hapticWarning]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: 'max(16px, env(safe-area-inset-top))',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={toast} onClose={() => hideToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
