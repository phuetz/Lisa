import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationPermissionPromptProps {
  onClose: () => void;
}

export function NotificationPermissionPrompt({ onClose }: NotificationPermissionPromptProps) {
  const { t } = useTranslation();
  const { permissionState, requestPermission } = useNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show the prompt if permission is in 'default' state (not granted/denied yet)
    if (permissionState === 'default') {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [permissionState]);

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      // Show success message briefly
      setTimeout(() => {
        setVisible(false);
        onClose();
      }, 1500);
    } else {
      // If denied, just close the prompt
      setVisible(false);
      onClose();
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="notification-permission-prompt" role="dialog" aria-labelledby="notif-title">
      <div className="prompt-content">
        <div className="prompt-header">
          <span aria-hidden="true" style={{ fontSize: '1.2rem', marginRight: 12, color: 'var(--color-accent, #f5a623)' }}>&#128276;</span>
          <h3 id="notif-title">{t('Enable Notifications')}</h3>
        </div>

        <p>
          {t('Lisa can send you notifications for alarms and timers, even when the tab is closed. Would you like to enable notifications?')}
        </p>

        <div className="prompt-actions">
          <button className="dismiss-btn" onClick={handleDismiss}>
            {t('Not Now')}
          </button>
          <button className="enable-btn" onClick={handleRequestPermission}>
            {t('Enable Notifications')}
          </button>
        </div>
      </div>

      <style>{`
        .notification-permission-prompt {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          max-width: 380px;
          animation: slide-up 0.3s ease-out;
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .prompt-content {
          background: var(--bg-panel, #1a1a26);
          backdrop-filter: blur(8px);
          border-radius: var(--radius-lg, 12px);
          padding: 16px;
          box-shadow: var(--shadow-elevated, 0 4px 20px rgba(0, 0, 0, 0.4));
          border: 1px solid var(--border-primary, #2d2d44);
          color: var(--text-primary, #e8e8f0);
        }

        .prompt-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .prompt-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #e8e8f0);
        }

        .prompt-content p {
          margin: 0 0 16px 0;
          line-height: 1.5;
          font-size: 0.9rem;
          color: var(--text-secondary, #9898b0);
        }

        .prompt-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .dismiss-btn {
          background: transparent;
          border: 1px solid var(--border-primary, #2d2d44);
          color: var(--text-secondary, #9898b0);
          padding: 8px 16px;
          border-radius: var(--radius-md, 8px);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all var(--transition-fast, 0.15s ease);
        }

        .dismiss-btn:hover {
          background: var(--bg-hover, rgba(255, 255, 255, 0.06));
        }

        .dismiss-btn:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring, 0 0 0 2px var(--color-accent));
        }

        .enable-btn {
          background: var(--color-accent, #f5a623);
          border: none;
          color: #fff;
          padding: 8px 16px;
          border-radius: var(--radius-md, 8px);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast, 0.15s ease);
        }

        .enable-btn:hover {
          background: var(--color-accent-hover, #e6951a);
          transform: translateY(-1px);
        }

        .enable-btn:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring, 0 0 0 2px var(--color-accent));
        }
      `}</style>
    </div>
  );
}
