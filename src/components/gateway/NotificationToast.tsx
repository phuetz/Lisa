/**
 * Lisa Notification Toast
 * Toast notification system with animations
 */

import { useState, useEffect, useCallback } from 'react';
import { getNotificationCenter } from '../../gateway';
import type { Notification, NotificationType, NotificationPriority } from '../../gateway';

interface NotificationToastProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxVisible?: number;
}

export function NotificationToast({ 
  position = 'top-right', 
  maxVisible = 5 
}: NotificationToastProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const center = getNotificationCenter();

    const handleNew = (notification: Notification) => {
      setNotifications(prev => {
        const updated = [notification, ...prev].slice(0, maxVisible);
        return updated;
      });
    };

    const handleDismiss = ({ id }: { id: string }) => {
      setDismissing(prev => new Set(prev).add(id));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setDismissing(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    };

    center.on('notification:created', handleNew);
    center.on('notification:dismissed', handleDismiss);

    return () => {
      center.off('notification:created', handleNew);
      center.off('notification:dismissed', handleDismiss);
    };
  }, [maxVisible]);

  const handleDismiss = useCallback((id: string) => {
    const center = getNotificationCenter();
    center.dismiss(id);
  }, []);

  const handleAction = useCallback((notification: Notification, actionId: string) => {
    // Emit action event for handling elsewhere
    const center = getNotificationCenter();
    center.emit('notification:action', { notificationId: notification.id, actionId });
    handleDismiss(notification.id);
  }, [handleDismiss]);

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
    'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
  };

  if (notifications.length === 0) return null;

  return (
    <div style={{ ...styles.container, ...positionStyles[position] }}>
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          isDismissing={dismissing.has(notification.id)}
          onDismiss={() => handleDismiss(notification.id)}
          onAction={(actionId) => handleAction(notification, actionId)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  notification,
  isDismissing,
  onDismiss,
  onAction
}: {
  notification: Notification;
  isDismissing: boolean;
  onDismiss: () => void;
  onAction: (actionId: string) => void;
}) {
  const typeIcons: Record<NotificationType, string> = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    task: '📋',
    message: '💬',
    system: '⚙️'
  };

  const typeColors: Record<NotificationType, string> = {
    info: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    task: '#8b5cf6',
    message: '#06b6d4',
    system: '#6b7280'
  };

  const priorityStyles: Record<NotificationPriority, React.CSSProperties> = {
    low: {},
    normal: {},
    high: { borderLeft: `4px solid ${typeColors[notification.type]}` },
    urgent: { 
      borderLeft: `4px solid ${typeColors[notification.type]}`,
      animation: 'pulse 1s infinite'
    }
  };

  return (
    <div
      style={{
        ...styles.toast,
        ...priorityStyles[notification.priority],
        opacity: isDismissing ? 0 : 1,
        transform: isDismissing ? 'translateX(100%)' : 'translateX(0)'
      }}
    >
      <div style={styles.toastHeader}>
        <span style={styles.toastIcon}>{typeIcons[notification.type]}</span>
        <span style={styles.toastTitle}>{notification.title}</span>
        <button onClick={onDismiss} style={styles.closeButton}>×</button>
      </div>
      
      {notification.message && (
        <p style={styles.toastMessage}>{notification.message}</p>
      )}

      {notification.actions && notification.actions.length > 0 && (
        <div style={styles.toastActions}>
          {notification.actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              style={{
                ...styles.actionButton,
                ...(action.type === 'primary' ? styles.actionButtonPrimary : 
                    action.type === 'danger' ? styles.actionButtonDanger : {})
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

          </div>
  );
}

// Hook for programmatic notifications
export function useNotifications() {
  const notify = useCallback((
    title: string,
    options: {
      message?: string;
      type?: NotificationType;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
                } = {}
  ) => {
    const center = getNotificationCenter();
    return center.notify({
      title,
      message: options.message || '',
      type: options.type || 'info',
      priority: options.priority || 'normal',
      category: 'system'
    });
  }, []);

  const success = useCallback((title: string, message?: string) => {
    return notify(title, { message, type: 'success' });
  }, [notify]);

  const error = useCallback((title: string, message?: string) => {
    return notify(title, { message, type: 'error', priority: 'high' });
  }, [notify]);

  const warning = useCallback((title: string, message?: string) => {
    return notify(title, { message, type: 'warning' });
  }, [notify]);

  const info = useCallback((title: string, message?: string) => {
    return notify(title, { message, type: 'info' });
  }, [notify]);

  return { notify, success, error, warning, info };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '400px',
    width: '100%',
    pointerEvents: 'none'
  },
  toast: {
    backgroundColor: '#1a1a26',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    border: '1px solid #2d2d44',
    pointerEvents: 'auto',
    transition: 'all 0.3s ease'
  },
  toastHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  toastIcon: {
    fontSize: '18px'
  },
  toastTitle: {
    flex: 1,
    fontWeight: 600,
    fontSize: '14px',
    color: '#fff'
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6a6a82',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '0 4px',
    lineHeight: 1
  },
  toastMessage: {
    margin: '8px 0 0 28px',
    fontSize: '13px',
    color: '#6a6a82',
    lineHeight: 1.4
  },
  toastActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    marginLeft: '28px'
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#2d2d44',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6'
  },
  progressContainer: {
    marginTop: '12px',
    height: '3px',
    backgroundColor: '#2d2d44',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease'
  }
};

export default NotificationToast;
