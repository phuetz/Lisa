/**
 * 🚨 Error Toast Component - Affichage des erreurs utilisateur
 */

import { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { errorService, type UserFriendlyError, type ErrorSeverity } from '../../services/ErrorService';

const SEVERITY_CONFIG: Record<ErrorSeverity, { icon: typeof AlertCircle; color: string; bg: string }> = {
  info: { icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
  warning: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  error: { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  critical: { icon: XCircle, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.15)' },
};

interface ErrorToastItemProps {
  error: UserFriendlyError;
  onDismiss: (id: string) => void;
}

const ErrorToastItem = ({ error, onDismiss }: ErrorToastItemProps) => {
  const config = SEVERITY_CONFIG[error.severity];
  const Icon = config.icon;

  useEffect(() => {
    // Auto-dismiss info and warning after 5 seconds
    if (error.severity === 'info' || error.severity === 'warning') {
      const timer = setTimeout(() => onDismiss(error.id), 5000);
      return () => clearTimeout(timer);
    }
  }, [error.id, error.severity, onDismiss]);

  return (
    <div
      role="alert"
      aria-live={error.severity === 'critical' ? 'assertive' : 'polite'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        backgroundColor: '#2d2d2d',
        borderRadius: '10px',
        border: `1px solid ${config.color}40`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        marginBottom: '8px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: config.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={config.color} />
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          color: '#fff', 
          margin: '0 0 4px 0' 
        }}>
          {error.title}
        </p>
        <p style={{ 
          fontSize: '13px', 
          color: '#aaa', 
          margin: 0,
          lineHeight: 1.4,
        }}>
          {error.message}
        </p>
        {error.details && (
          <p style={{ 
            fontSize: '11px', 
            color: '#666', 
            margin: '6px 0 0 0',
            fontFamily: 'monospace',
          }}>
            {error.details}
          </p>
        )}
        {error.action && (
          <button
            onClick={error.action.handler}
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              backgroundColor: config.color,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {error.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={() => onDismiss(error.id)}
        aria-label="Fermer la notification"
        style={{
          background: 'none',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          color: '#666',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export function ErrorToastContainer() {
  const [errors, setErrors] = useState<UserFriendlyError[]>([]);

  useEffect(() => {
    const unsubscribe = errorService.subscribe(setErrors);
    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    errorService.dismissError(id);
  };

  if (errors.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '400px',
        width: '100%',
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
      {errors.slice(0, 5).map(error => (
        <ErrorToastItem
          key={error.id}
          error={error}
          onDismiss={handleDismiss}
        />
      ))}
      {errors.length > 5 && (
        <div style={{
          textAlign: 'center',
          padding: '8px',
          color: '#666',
          fontSize: '12px',
        }}>
          +{errors.length - 5} autres notifications
        </div>
      )}
    </div>
  );
}

export default ErrorToastContainer;
