/**
 * Proactive Notification Service
 * Génère des suggestions et notifications proactives basées sur le contexte
 */

import { pushNotificationService } from './pushNotificationService';

export interface ProactiveSuggestion {
  id: string;
  type: 'weather' | 'reminder' | 'tip' | 'news' | 'health' | 'productivity';
  title: string;
  body: string;
  action?: {
    type: 'open_chat' | 'open_url' | 'run_agent';
    payload: string;
  };
  priority: 'low' | 'medium' | 'high';
  scheduledTime?: Date;
  conditions?: SuggestionCondition[];
}

export interface SuggestionCondition {
  type: 'time_range' | 'day_of_week' | 'location' | 'user_active' | 'weather';
  value: string | number | boolean;
}

export interface UserContext {
  currentTime: Date;
  dayOfWeek: number;
  isWorkHours: boolean;
  lastActiveTime?: Date;
  location?: { lat: number; lon: number };
  recentTopics?: string[];
}

class ProactiveNotificationServiceImpl {
  private scheduledSuggestions: Map<string, NodeJS.Timeout> = new Map();
  private userPreferences: Map<string, boolean> = new Map();
  private readonly STORAGE_KEY = 'lisa_proactive_prefs';

  constructor() {
    this.loadPreferences();
    this.initializeDefaultSchedules();
  }

  /**
   * Initialize default proactive schedules
   */
  private initializeDefaultSchedules() {
    // Morning weather briefing (8:00 AM)
    this.scheduleDaily('morning_weather', 8, 0, async () => {
      if (this.isEnabled('weather')) {
        await this.sendWeatherBriefing();
      }
    });

    // Productivity tip (10:00 AM on weekdays)
    this.scheduleWeekdays('productivity_tip', 10, 0, async () => {
      if (this.isEnabled('productivity')) {
        await this.sendProductivityTip();
      }
    });

    // Evening summary (6:00 PM)
    this.scheduleDaily('evening_summary', 18, 0, async () => {
      if (this.isEnabled('summary')) {
        await this.sendEveningSummary();
      }
    });

    // Health reminder (every 2 hours during work hours)
    this.scheduleInterval('health_reminder', 2 * 60 * 60 * 1000, async () => {
      const hour = new Date().getHours();
      if (hour >= 9 && hour <= 18 && this.isEnabled('health')) {
        await this.sendHealthReminder();
      }
    });
  }

  /**
   * Check if a notification type is enabled
   */
  private isEnabled(type: string): boolean {
    return this.userPreferences.get(type) !== false;
  }

  /**
   * Load user preferences from storage
   */
  private loadPreferences() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        Object.entries(prefs).forEach(([key, value]) => {
          this.userPreferences.set(key, value as boolean);
        });
      }
    } catch (error) {
      console.warn('[ProactiveNotifications] Failed to load preferences:', error);
    }
  }

  /**
   * Save user preferences
   */
  private savePreferences() {
    try {
      const prefs: Record<string, boolean> = {};
      this.userPreferences.forEach((value, key) => {
        prefs[key] = value;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.warn('[ProactiveNotifications] Failed to save preferences:', error);
    }
  }

  /**
   * Enable/disable a notification type
   */
  setPreference(type: string, enabled: boolean) {
    this.userPreferences.set(type, enabled);
    this.savePreferences();
  }

  /**
   * Get all preferences
   */
  getPreferences(): Record<string, boolean> {
    const prefs: Record<string, boolean> = {};
    this.userPreferences.forEach((value, key) => {
      prefs[key] = value;
    });
    return prefs;
  }

  /**
   * Schedule a daily notification
   */
  private scheduleDaily(id: string, hour: number, minute: number, callback: () => Promise<void>) {
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hour, minute, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();

    const timeoutId = setTimeout(async () => {
      await callback();
      // Reschedule for next day
      this.scheduleDaily(id, hour, minute, callback);
    }, delay);

    this.scheduledSuggestions.set(id, timeoutId);
  }

  /**
   * Schedule weekday-only notification
   */
  private scheduleWeekdays(id: string, hour: number, minute: number, callback: () => Promise<void>) {
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hour, minute, 0, 0);

    // Find next weekday
    while (scheduledTime <= now || scheduledTime.getDay() === 0 || scheduledTime.getDay() === 6) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime.getTime() - now.getTime();

    const timeoutId = setTimeout(async () => {
      await callback();
      this.scheduleWeekdays(id, hour, minute, callback);
    }, delay);

    this.scheduledSuggestions.set(id, timeoutId);
  }

  /**
   * Schedule interval-based notification
   */
  private scheduleInterval(id: string, intervalMs: number, callback: () => Promise<void>) {
    const intervalId = setInterval(callback, intervalMs);
    this.scheduledSuggestions.set(id, intervalId as unknown as NodeJS.Timeout);
  }

  /**
   * Send weather briefing
   */
  private async sendWeatherBriefing() {
    try {
      // This would integrate with a weather API
      const suggestion: ProactiveSuggestion = {
        id: `weather_${Date.now()}`,
        type: 'weather',
        title: 'Bonjour ! Voici la météo',
        body: 'Demandez-moi la météo du jour pour planifier votre journée.',
        action: {
          type: 'open_chat',
          payload: 'Quelle est la météo aujourd\'hui ?',
        },
        priority: 'medium',
      };

      await this.sendSuggestion(suggestion);
    } catch (error) {
      console.error('[ProactiveNotifications] Weather briefing failed:', error);
    }
  }

  /**
   * Send productivity tip
   */
  private async sendProductivityTip() {
    const tips = [
      'Prenez 5 minutes pour organiser vos tâches de la journée.',
      'La technique Pomodoro peut améliorer votre concentration.',
      'N\'oubliez pas de faire des pauses régulières.',
      'Commencez par la tâche la plus importante.',
      'Désactivez les notifications non essentielles pour vous concentrer.',
    ];

    const tip = tips[Math.floor(Math.random() * tips.length)];

    const suggestion: ProactiveSuggestion = {
      id: `productivity_${Date.now()}`,
      type: 'productivity',
      title: 'Conseil productivité',
      body: tip,
      priority: 'low',
    };

    await this.sendSuggestion(suggestion);
  }

  /**
   * Send evening summary
   */
  private async sendEveningSummary() {
    const suggestion: ProactiveSuggestion = {
      id: `summary_${Date.now()}`,
      type: 'tip',
      title: 'Résumé de la journée',
      body: 'Voulez-vous un résumé de vos conversations aujourd\'hui ?',
      action: {
        type: 'open_chat',
        payload: 'Résume mes conversations d\'aujourd\'hui',
      },
      priority: 'low',
    };

    await this.sendSuggestion(suggestion);
  }

  /**
   * Send health reminder
   */
  private async sendHealthReminder() {
    const reminders = [
      { title: 'Hydratation', body: 'Pensez à boire un verre d\'eau.' },
      { title: 'Pause active', body: 'Levez-vous et étirez-vous quelques secondes.' },
      { title: 'Repos des yeux', body: 'Regardez au loin pendant 20 secondes.' },
      { title: 'Posture', body: 'Vérifiez votre posture et redressez-vous.' },
    ];

    const reminder = reminders[Math.floor(Math.random() * reminders.length)];

    const suggestion: ProactiveSuggestion = {
      id: `health_${Date.now()}`,
      type: 'health',
      title: reminder.title,
      body: reminder.body,
      priority: 'low',
    };

    await this.sendSuggestion(suggestion);
  }

  /**
   * Send a proactive suggestion as notification
   */
  async sendSuggestion(suggestion: ProactiveSuggestion) {
    try {
      await pushNotificationService.showLocalNotification({
        title: suggestion.title,
        body: suggestion.body,
        data: {
          type: 'proactive',
          suggestionType: suggestion.type,
          action: suggestion.action,
        },
      });

      console.log('[ProactiveNotifications] Sent:', suggestion.type);
    } catch (error) {
      console.error('[ProactiveNotifications] Failed to send:', error);
    }
  }

  /**
   * Trigger a contextual suggestion based on user activity
   */
  async triggerContextualSuggestion(context: UserContext) {
    // Morning greeting
    if (context.currentTime.getHours() >= 6 && context.currentTime.getHours() < 9) {
      if (!this.hasRecentSuggestion('morning_greeting')) {
        await this.sendSuggestion({
          id: 'morning_greeting',
          type: 'tip',
          title: 'Bonjour !',
          body: 'Comment puis-je vous aider aujourd\'hui ?',
          action: { type: 'open_chat', payload: '' },
          priority: 'low',
        });
      }
    }

    // Follow-up on recent topics
    if (context.recentTopics && context.recentTopics.length > 0) {
      const topic = context.recentTopics[0];
      await this.sendSuggestion({
        id: `followup_${Date.now()}`,
        type: 'tip',
        title: 'Suite de notre discussion',
        body: `Voulez-vous continuer sur "${topic}" ?`,
        action: { type: 'open_chat', payload: `Continuons sur ${topic}` },
        priority: 'low',
      });
    }
  }

  /**
   * Check if we sent a suggestion recently (within last hour)
   */
  private hasRecentSuggestion(type: string): boolean {
    const key = `last_suggestion_${type}`;
    const lastSent = localStorage.getItem(key);
    if (!lastSent) return false;

    const hourAgo = Date.now() - 60 * 60 * 1000;
    return parseInt(lastSent) > hourAgo;
  }

  /**
   * Cancel all scheduled suggestions
   */
  cancelAll() {
    this.scheduledSuggestions.forEach((timeout, id) => {
      clearTimeout(timeout);
      clearInterval(timeout as unknown as number);
    });
    this.scheduledSuggestions.clear();
  }

  /**
   * Cancel a specific scheduled suggestion
   */
  cancel(id: string) {
    const timeout = this.scheduledSuggestions.get(id);
    if (timeout) {
      clearTimeout(timeout);
      clearInterval(timeout as unknown as number);
      this.scheduledSuggestions.delete(id);
    }
  }
}

export const proactiveNotificationService = new ProactiveNotificationServiceImpl();
export default proactiveNotificationService;
