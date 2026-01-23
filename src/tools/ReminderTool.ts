/**
 * ReminderTool: Créer des rappels et alarmes
 * Utilise les notifications locales Capacitor
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface Reminder {
  id: number;
  title: string;
  message: string;
  scheduledAt: Date;
  repeat?: 'daily' | 'weekly' | 'monthly' | 'none';
  completed: boolean;
}

interface ExecuteProps {
  action: 'create' | 'list' | 'delete' | 'complete';
  title?: string;
  message?: string;
  delay?: string; // "30 minutes", "2 hours", "1 day"
  time?: string;  // "14:30", "tomorrow 9:00"
  repeat?: 'daily' | 'weekly' | 'monthly' | 'none';
  reminderId?: number;
}

interface ExecuteResult {
  success: boolean;
  output?: Reminder | Reminder[] | string | null;
  error?: string | null;
}

// Storage key
const REMINDERS_KEY = 'lisa_reminders';

// Parse delay string to milliseconds
function parseDelay(delay: string): number {
  const match = delay.match(/(\d+)\s*(minute|hour|day|week|second)s?/i);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
  };
  
  return value * (multipliers[unit] || 0);
}

// Parse time string to Date
function parseTime(timeStr: string): Date {
  const now = new Date();
  
  // Handle "tomorrow X:XX"
  if (timeStr.toLowerCase().includes('tomorrow')) {
    const time = timeStr.replace(/tomorrow\s*/i, '');
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    date.setHours(hours || 9, minutes || 0, 0, 0);
    return date;
  }
  
  // Handle "HH:MM"
  if (timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    // If time has passed today, schedule for tomorrow
    if (date <= now) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }
  
  return now;
}

// Load reminders from storage
function loadReminders(): Reminder[] {
  try {
    const stored = localStorage.getItem(REMINDERS_KEY);
    if (stored) {
      const reminders = JSON.parse(stored);
      return reminders.map((r: Reminder) => ({
        ...r,
        scheduledAt: new Date(r.scheduledAt),
      }));
    }
  } catch (e) {
    console.error('Failed to load reminders:', e);
  }
  return [];
}

// Save reminders to storage
function saveReminders(reminders: Reminder[]): void {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  } catch (e) {
    console.error('Failed to save reminders:', e);
  }
}

// Generate unique ID
function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export class ReminderTool {
  name = 'ReminderTool';
  description = 'Créer, lister et gérer des rappels et alarmes.';

  private async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      // Web notifications
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    }
    
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  }

  private async scheduleNotification(reminder: Reminder): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback - use setTimeout
      const delay = reminder.scheduledAt.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(reminder.title, { body: reminder.message });
          }
        }, delay);
      }
      return;
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: reminder.id,
        title: reminder.title,
        body: reminder.message,
        schedule: { at: reminder.scheduledAt },
        sound: 'default',
        actionTypeId: 'REMINDER',
        extra: { reminderId: reminder.id },
      }],
    });
  }

  private async cancelNotification(id: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    
    await LocalNotifications.cancel({ notifications: [{ id }] });
  }

  async execute(props: ExecuteProps): Promise<ExecuteResult> {
    const { action } = props;

    try {
      switch (action) {
        case 'create':
          return await this.createReminder(props);
        case 'list':
          return this.listReminders();
        case 'delete':
          return await this.deleteReminder(props.reminderId);
        case 'complete':
          return this.completeReminder(props.reminderId);
        default:
          return { success: false, error: `Action inconnue: ${action}`, output: null };
      }
    } catch (error) {
      console.error('ReminderTool execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        output: null,
      };
    }
  }

  private async createReminder(props: ExecuteProps): Promise<ExecuteResult> {
    const { title, message, delay, time, repeat = 'none' } = props;

    if (!title) {
      return { success: false, error: 'Un titre est requis pour le rappel.', output: null };
    }

    // Request permission
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return { success: false, error: 'Permission de notifications refusée.', output: null };
    }

    // Calculate scheduled time
    let scheduledAt: Date;
    if (delay) {
      const delayMs = parseDelay(delay);
      if (delayMs === 0) {
        return { success: false, error: `Format de délai invalide: ${delay}`, output: null };
      }
      scheduledAt = new Date(Date.now() + delayMs);
    } else if (time) {
      scheduledAt = parseTime(time);
    } else {
      // Default: 5 minutes
      scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
    }

    const reminder: Reminder = {
      id: generateId(),
      title,
      message: message || title,
      scheduledAt,
      repeat,
      completed: false,
    };

    // Save to storage
    const reminders = loadReminders();
    reminders.push(reminder);
    saveReminders(reminders);

    // Schedule notification
    await this.scheduleNotification(reminder);

    return { success: true, output: reminder };
  }

  private listReminders(): ExecuteResult {
    const reminders = loadReminders();
    const activeReminders = reminders.filter(r => !r.completed && r.scheduledAt > new Date());
    return { success: true, output: activeReminders };
  }

  private async deleteReminder(id?: number): Promise<ExecuteResult> {
    if (!id) {
      return { success: false, error: 'ID du rappel requis.', output: null };
    }

    const reminders = loadReminders();
    const index = reminders.findIndex(r => r.id === id);
    
    if (index === -1) {
      return { success: false, error: `Rappel #${id} non trouvé.`, output: null };
    }

    // Cancel notification
    await this.cancelNotification(id);

    // Remove from storage
    reminders.splice(index, 1);
    saveReminders(reminders);

    return { success: true, output: `Rappel #${id} supprimé.` };
  }

  private completeReminder(id?: number): ExecuteResult {
    if (!id) {
      return { success: false, error: 'ID du rappel requis.', output: null };
    }

    const reminders = loadReminders();
    const reminder = reminders.find(r => r.id === id);
    
    if (!reminder) {
      return { success: false, error: `Rappel #${id} non trouvé.`, output: null };
    }

    reminder.completed = true;
    saveReminders(reminders);

    return { success: true, output: reminder };
  }

  formatResponse(data: Reminder | Reminder[] | string): string {
    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return '📭 Aucun rappel actif.';
      }
      
      let response = '📋 **Vos rappels:**\n\n';
      for (const reminder of data) {
        const time = reminder.scheduledAt.toLocaleString('fr-FR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        response += `🔔 **${reminder.title}**\n`;
        response += `   📅 ${time}\n`;
        if (reminder.repeat !== 'none') {
          response += `   🔄 Répétition: ${reminder.repeat}\n`;
        }
        response += '\n';
      }
      return response;
    }

    // Single reminder
    const time = data.scheduledAt.toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `✅ **Rappel créé!**\n\n🔔 **${data.title}**\n📅 ${time}\n${data.message !== data.title ? `💬 ${data.message}` : ''}`;
  }
}

export const reminderTool = new ReminderTool();
