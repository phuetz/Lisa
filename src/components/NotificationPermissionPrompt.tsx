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
    <div className="notification-permission-prompt">
      <div className="prompt-content">
        <div className="prompt-header">
          <i className="fas fa-bell"></i>
          <h3>{t('Enable Notifications')}</h3>
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
          background: rgba(30, 30, 40, 0.85);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .prompt-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .prompt-header i {
          font-size: 1.2rem;
          margin-right: 12px;
          color: #6e8efb;
        }
        
        .prompt-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .prompt-content p {
          margin: 0 0 16px 0;
          line-height: 1.5;
          font-size: 0.9rem;
          opacity: 0.9;
        }
        
        .prompt-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        
        .dismiss-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .dismiss-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .enable-btn {
          background: linear-gradient(135deg, #6e8efb, #a777e3);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .enable-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
