import { useEffect } from 'react';
import { useVisionAudioStore } from '../store/visionAudioStore';
import { useNotifications } from './useNotifications';

export default function useAlarmTimerScheduler() {
  const { alarms, timers, setState } = useVisionAudioStore();
  const { sendNotification, permissionState } = useNotifications();

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let triggered = false;

      const newAlarms = alarms.map((a) =>
        !a.triggered && a.time <= now ? { ...a, triggered: true } : a
      );
      const newTimers = timers.map((t) =>
        !t.triggered && t.finish <= now ? { ...t, triggered: true } : t
      );

      if (newAlarms.some((a) => a.triggered && !alarms.find((o) => o.id === a.id)?.triggered)) {
        triggered = true;
      }
      if (newTimers.some((t) => t.triggered && !timers.find((o) => o.id === t.id)?.triggered)) {
        triggered = true;
      }

      if (triggered) {
        setState({ alarms: newAlarms, timers: newTimers });
        
        // Speak notification
        speechSynthesis.speak(new SpeechSynthesisUtterance('Time\'s up'));
        
        // Send notification if permission granted
        if (permissionState === 'granted') {
          // Find what triggered - alarm or timer
          const triggeredAlarm = newAlarms.find(a => a.triggered && !alarms.find(o => o.id === a.id)?.triggered);
          const triggeredTimer = newTimers.find(t => t.triggered && !timers.find(o => o.id === t.id)?.triggered);
          
          if (triggeredAlarm) {
            sendNotification({
              title: 'Lisa Alarm',
              body: triggeredAlarm.label || 'Your alarm is ringing!',
              tag: `alarm-${triggeredAlarm.id}`,
              actions: [{ action: 'snooze', title: 'Snooze' }]
            });
          }
          
          if (triggeredTimer) {
            sendNotification({
              title: 'Lisa Timer',
              body: triggeredTimer.label 
                ? `Your timer "${triggeredTimer.label}" is complete!` 
                : 'Your timer is complete!',
              tag: `timer-${triggeredTimer.id}`
            });
          }
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [alarms, timers, sendNotification, permissionState]);
  
  // Request notification permission on mount
  useEffect(() => {
    if (permissionState === 'default') {
      // We don't auto-request permission as it should be triggered by user interaction
      console.log('Notification permission should be requested after user interaction');
    }
  }, [permissionState]);
}
