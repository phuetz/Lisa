import { useState } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPermissionPrompt } from './NotificationPermissionPrompt';

export default function AlarmTimerPanel() {
  const { t } = useTranslation();
  const { alarms, timers, setState } = useVisionAudioStore();
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
      <div role="region" aria-live="polite" aria-label={ariaLabel} style={{ position: 'absolute', left: 10, bottom: 10, background: '#ffffffcc', padding: 8, borderRadius: 6, fontSize: 12 }}>
      {alarms.length > 0 && (
        <div>
          <strong>{t('alarms')}</strong>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {alarms.map((a) => (
              <li role="listitem" key={a.id}>
                {new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                {a.triggered && '✅'}{' '}
                <button aria-label={t('delete')} onClick={() => cancelAlarm(a.id)} style={{ fontSize: 10 }}>🗑</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {timers.length > 0 && (
        <div>
          <strong>{t('timers')}</strong>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {timers.map((timer) => (
              <li role="listitem" key={timer.id}>
                {Math.max(0, Math.ceil((timer.finish - Date.now()) / 1000))}s {timer.triggered && '✅'}{' '}
                <button aria-label={t('delete')} onClick={() => cancelTimer(timer.id)} style={{ fontSize: 10 }}>🗑</button>
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
