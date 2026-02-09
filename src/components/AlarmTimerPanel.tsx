import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPermissionPrompt } from './NotificationPermissionPrompt';

export default function AlarmTimerPanel() {
  const { t } = useTranslation();
  const alarms = useAppStore(s => s.alarms);
  const timers = useAppStore(s => s.timers);
  const setState = useAppStore(s => s.setState);
  const { permissionState } = useNotifications();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const cancelAlarm = (id: string) => {
    setState({ alarms: alarms.filter((a) => a.id !== id) });
    // Show notification prompt if not granted or denied yet
    if (permissionState === 'default' && !showPermissionPrompt) {
      setShowPermissionPrompt(true);
    }
  };

  const cancelTimer = (id: string) => {
    setState({ timers: timers.filter((t) => t.id !== id) });
    // Show notification prompt if not granted or denied yet
    if (permissionState === 'default' && !showPermissionPrompt) {
      setShowPermissionPrompt(true);
    }
  };

  if (!alarms.length && !timers.length) return null;

  // Announce updates politely for assistive tech
  const ariaLabel = t('alarms_timers_panel');

  return (
    <>
      <div role="region" aria-live="polite" aria-label={ariaLabel} style={{
        position: 'absolute',
        left: 10,
        bottom: 10,
        background: 'var(--bg-panel, #1a1a26)',
        color: 'var(--text-primary, #e8e8f0)',
        border: '1px solid var(--border-primary, #2d2d44)',
        padding: 10,
        borderRadius: 'var(--radius-md, 8px)',
        fontSize: 12,
        boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))',
      }}>
      {alarms.length > 0 && (
        <div>
          <strong style={{ color: 'var(--text-secondary, #9898b0)' }}>{t('alarms')}</strong>
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
            {alarms.map((a) => (
              <li role="listitem" key={a.id} style={{ padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {a.triggered && <span aria-label="Terminé" style={{ color: 'var(--color-accent, #f5a623)' }}>✓</span>}
                <button aria-label={t('delete')} onClick={() => cancelAlarm(a.id)} className="msg-action-btn" style={{ fontSize: 10, padding: '2px 4px', minWidth: 'auto', width: 'auto', height: 'auto' }}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {timers.length > 0 && (
        <div style={{ marginTop: alarms.length > 0 ? 8 : 0 }}>
          <strong style={{ color: 'var(--text-secondary, #9898b0)' }}>{t('timers')}</strong>
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
            {timers.map((timer) => (
              <li role="listitem" key={timer.id} style={{ padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{Math.max(0, Math.ceil((timer.finish - Date.now()) / 1000))}s</span>
                {timer.triggered && <span aria-label="Terminé" style={{ color: 'var(--color-accent, #f5a623)' }}>✓</span>}
                <button aria-label={t('delete')} onClick={() => cancelTimer(timer.id)} className="msg-action-btn" style={{ fontSize: 10, padding: '2px 4px', minWidth: 'auto', width: 'auto', height: 'auto' }}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
      
      {/* Notification permission prompt */}
      {showPermissionPrompt && (
        <NotificationPermissionPrompt 
          onClose={() => setShowPermissionPrompt(false)} 
        />
      )}
    </>
  );
}
