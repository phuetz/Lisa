/**
 * Push Notification Service
 * Gère les notifications push sur Android/iOS via Capacitor
 */

import { Capacitor } from '@capacitor/core';

interface NotificationOptions {
  title: string;
  body: string;
  id?: number;
  schedule?: { at: Date };
  sound?: string;
  actionTypeId?: string;
  extra?: Record<string, unknown>;
  // Rich notification options
  largeBody?: string;
  summaryText?: string;
  inboxStyle?: string[];
  image?: string;
  group?: string;
  groupSummary?: boolean;
  // Quick actions
  actions?: NotificationAction[];
}

interface NotificationAction {
  id: string;
  title: string;
  requiresInput?: boolean;
  inputPlaceholder?: string;
  destructive?: boolean;
}

interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: 1 | 2 | 3 | 4 | 5;
  visibility: -1 | 0 | 1;
  sound?: string;
  vibration?: boolean;
}

interface ProactiveNotification {
  type: 'weather' | 'reminder' | 'suggestion' | 'daily_summary';
  condition: () => Promise<boolean>;
  generate: () => Promise<{ title: string; body: string; extra?: Record<string, unknown> }>;
  schedule?: { hour: number; minute: number };
}

class PushNotificationService {
  private initialized = false;
  private pushNotifications: typeof import('@capacitor/push-notifications').PushNotifications | null = null;
  private localNotifications: typeof import('@capacitor/local-notifications').LocalNotifications | null = null;
  private proactiveNotifications: ProactiveNotification[] = [];
  private notificationGroups: Map<string, number[]> = new Map();

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize(): Promise<boolean> {
    if (this.initialized || !this.isNative) return false;

    try {
      // Import dynamique des plugins
      const [pushModule, localModule] = await Promise.all([
        import('@capacitor/push-notifications').catch(() => null),
        import('@capacitor/local-notifications').catch(() => null),
      ]);

      if (pushModule) {
        this.pushNotifications = pushModule.PushNotifications;
      }
      if (localModule) {
        this.localNotifications = localModule.LocalNotifications;
      }

      // Créer les canaux de notification Android
      await this.createNotificationChannels();

      // Demander les permissions
      const permStatus = await this.requestPermission();
      
      if (permStatus) {
        // Enregistrer pour les push notifications
        await this.registerPushNotifications();
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[PushNotificationService] Initialization failed:', error);
      return false;
    }
  }

  private async createNotificationChannels(): Promise<void> {
    if (!this.localNotifications) return;

    const channels: NotificationChannel[] = [
      {
        id: 'lisa-messages',
        name: 'Messages Lisa',
        description: 'Notifications des messages de Lisa',
        importance: 4,
        visibility: 1,
        vibration: true,
      },
      {
        id: 'lisa-reminders',
        name: 'Rappels',
        description: 'Rappels et alertes programmées',
        importance: 4,
        visibility: 1,
        vibration: true,
      },
      {
        id: 'lisa-silent',
        name: 'Silencieux',
        description: 'Notifications silencieuses',
        importance: 2,
        visibility: 0,
        vibration: false,
      },
    ];

    try {
      for (const channel of channels) {
        await this.localNotifications.createChannel(channel);
      }
    } catch (error) {
      console.warn('[PushNotificationService] Channel creation error:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.pushNotifications) return false;

    try {
      const result = await this.pushNotifications.requestPermissions();
      return result.receive === 'granted';
    } catch (error) {
      console.error('[PushNotificationService] Permission request failed:', error);
      return false;
    }
  }

  private async registerPushNotifications(): Promise<void> {
    if (!this.pushNotifications) return;

    try {
      // Listeners pour les notifications push
      await this.pushNotifications.addListener('registration', (token) => {
        // Sauvegarder le token pour le backend
        localStorage.setItem('push_token', token.value);
      });

      await this.pushNotifications.addListener('registrationError', (error) => {
        console.error('[PushNotificationService] Push registration error:', error);
      });

      await this.pushNotifications.addListener('pushNotificationReceived', (notification) => {
        // Afficher une notification locale
        this.showLocalNotification({
          title: notification.title || 'Lisa AI',
          body: notification.body || '',
          extra: notification.data,
        });
      });

      await this.pushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        // Gérer l'action (ouvrir conversation, etc.)
        this.handleNotificationAction(action.notification.data);
      });

      await this.pushNotifications.register();
    } catch (error) {
      console.error('[PushNotificationService] Registration error:', error);
    }
  }

  /**
   * Afficher une notification locale
   */
  async showLocalNotification(options: NotificationOptions): Promise<void> {
    if (!this.localNotifications) {
      // Fallback web
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title, { body: options.body });
      }
      return;
    }

    try {
      await this.localNotifications.schedule({
        notifications: [
          {
            id: options.id || Date.now(),
            title: options.title,
            body: options.body,
            schedule: options.schedule,
            channelId: 'lisa-messages',
            extra: options.extra,
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
          },
        ],
      });
    } catch (error) {
      console.error('[PushNotificationService] Show notification error:', error);
    }
  }

  /**
   * Programmer une notification future (rappel)
   */
  async scheduleReminder(
    title: string,
    body: string,
    scheduleAt: Date,
    extra?: Record<string, unknown>
  ): Promise<number> {
    const id = Date.now();
    
    await this.showLocalNotification({
      id,
      title,
      body,
      schedule: { at: scheduleAt },
      extra: { ...extra, type: 'reminder' },
    });

    return id;
  }

  /**
   * Annuler une notification programmée
   */
  async cancelNotification(id: number): Promise<void> {
    if (!this.localNotifications) return;

    try {
      await this.localNotifications.cancel({ notifications: [{ id }] });
    } catch (error) {
      console.error('[PushNotificationService] Cancel notification error:', error);
    }
  }

  /**
   * Annuler toutes les notifications
   */
  async cancelAllNotifications(): Promise<void> {
    if (!this.localNotifications) return;

    try {
      const pending = await this.localNotifications.getPending();
      if (pending.notifications.length > 0) {
        await this.localNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (error) {
      console.error('[PushNotificationService] Cancel all error:', error);
    }
  }

  /**
   * Gérer l'action quand l'utilisateur tape sur une notification
   */
  private handleNotificationAction(data?: Record<string, unknown>): void {
    if (!data) return;

    if (data.type === 'reminder') {
      // Naviguer vers la conversation ou action spécifique
    } else if (data.conversationId) {
      // Ouvrir la conversation spécifique
    }
  }

  /**
   * Obtenir le token push actuel
   */
  getPushToken(): string | null {
    return localStorage.getItem('push_token');
  }

  // ============ RICH NOTIFICATIONS ============

  /**
   * Show a rich notification with image
   */
  async showRichNotification(options: NotificationOptions): Promise<void> {
    if (!this.localNotifications) {
      // Fallback to basic notification
      return this.showLocalNotification(options);
    }

    try {
      const notificationId = options.id || Date.now();

      // Track group membership
      if (options.group) {
        const groupIds = this.notificationGroups.get(options.group) || [];
        groupIds.push(notificationId);
        this.notificationGroups.set(options.group, groupIds);
      }

      await this.localNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: options.title,
            body: options.body,
            largeBody: options.largeBody,
            summaryText: options.summaryText,
            schedule: options.schedule,
            channelId: 'lisa-messages',
            extra: options.extra,
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            // Rich notification features
            attachments: options.image ? [{ id: 'image', url: options.image }] : undefined,
            group: options.group,
            groupSummary: options.groupSummary,
            // Inbox style for multiple lines
            inboxList: options.inboxStyle,
            actionTypeId: options.actions ? 'REPLY_ACTION' : undefined,
          },
        ],
      });

      // Register action types if actions provided
      if (options.actions && options.actions.length > 0) {
        await this.registerActionTypes(options.actions);
      }
    } catch (error) {
      console.error('[PushNotificationService] Rich notification error:', error);
      // Fallback to basic
      await this.showLocalNotification(options);
    }
  }

  /**
   * Register notification action types
   */
  private async registerActionTypes(actions: NotificationAction[]): Promise<void> {
    if (!this.localNotifications) return;

    try {
      await this.localNotifications.registerActionTypes({
        types: [
          {
            id: 'REPLY_ACTION',
            actions: actions.map(action => ({
              id: action.id,
              title: action.title,
              input: action.requiresInput,
              inputPlaceholder: action.inputPlaceholder,
              destructive: action.destructive,
            })),
          },
        ],
      });
    } catch (error) {
      console.warn('[PushNotificationService] Action types registration failed:', error);
    }
  }

  /**
   * Show notification with quick reply
   */
  async showQuickReplyNotification(
    title: string,
    body: string,
    conversationId: string,
    extra?: Record<string, unknown>
  ): Promise<void> {
    await this.showRichNotification({
      title,
      body,
      group: conversationId,
      extra: { ...extra, conversationId },
      actions: [
        {
          id: 'reply',
          title: 'Reply',
          requiresInput: true,
          inputPlaceholder: 'Type your reply...',
        },
        {
          id: 'mark_read',
          title: 'Mark as Read',
        },
      ],
    });
  }

  /**
   * Show grouped notifications (inbox style)
   */
  async showGroupedNotifications(
    groupId: string,
    groupTitle: string,
    messages: Array<{ sender: string; message: string }>
  ): Promise<void> {
    if (messages.length === 0) return;

    const inboxStyle = messages.map(m => `${m.sender}: ${m.message}`);

    await this.showRichNotification({
      title: groupTitle,
      body: `${messages.length} new messages`,
      group: groupId,
      groupSummary: true,
      inboxStyle,
      summaryText: `${messages.length} messages`,
    });
  }

  // ============ PROACTIVE NOTIFICATIONS ============

  /**
   * Register a proactive notification
   */
  registerProactiveNotification(notification: ProactiveNotification): void {
    this.proactiveNotifications.push(notification);
  }

  /**
   * Check and trigger proactive notifications
   */
  async checkProactiveNotifications(): Promise<void> {
    for (const notification of this.proactiveNotifications) {
      try {
        // Check if condition is met
        const shouldTrigger = await notification.condition();
        if (!shouldTrigger) continue;

        // Check schedule if defined
        if (notification.schedule) {
          const now = new Date();
          if (now.getHours() !== notification.schedule.hour ||
              Math.abs(now.getMinutes() - notification.schedule.minute) > 5) {
            continue;
          }
        }

        // Generate and show notification
        const content = await notification.generate();
        await this.showLocalNotification({
          title: content.title,
          body: content.body,
          extra: { ...content.extra, type: notification.type, proactive: true },
        });
      } catch (error) {
        console.error(`[PushNotificationService] Proactive ${notification.type} error:`, error);
      }
    }
  }

  /**
   * Setup default proactive notifications
   */
  setupDefaultProactives(): void {
    // Morning greeting with weather (8:00 AM)
    this.registerProactiveNotification({
      type: 'weather',
      schedule: { hour: 8, minute: 0 },
      condition: async () => {
        const lastShown = localStorage.getItem('proactive_weather_last');
        if (lastShown) {
          const last = new Date(lastShown);
          const now = new Date();
          // Only show once per day
          if (last.toDateString() === now.toDateString()) return false;
        }
        return true;
      },
      generate: async () => {
        localStorage.setItem('proactive_weather_last', new Date().toISOString());
        // In real implementation, fetch weather data
        return {
          title: 'Good morning!',
          body: 'Start your day with Lisa. Tap to ask anything.',
          extra: { action: 'open_chat' },
        };
      },
    });

    // Daily summary (8:00 PM)
    this.registerProactiveNotification({
      type: 'daily_summary',
      schedule: { hour: 20, minute: 0 },
      condition: async () => {
        const lastShown = localStorage.getItem('proactive_summary_last');
        if (lastShown) {
          const last = new Date(lastShown);
          const now = new Date();
          if (last.toDateString() === now.toDateString()) return false;
        }
        return true;
      },
      generate: async () => {
        localStorage.setItem('proactive_summary_last', new Date().toISOString());
        return {
          title: 'Daily Summary',
          body: 'See what you accomplished today with Lisa.',
          extra: { action: 'show_summary' },
        };
      },
    });

    // Start proactive check interval (every 15 minutes)
    setInterval(() => this.checkProactiveNotifications(), 15 * 60 * 1000);
  }

  /**
   * Clear notification group
   */
  async clearNotificationGroup(groupId: string): Promise<void> {
    if (!this.localNotifications) return;

    const ids = this.notificationGroups.get(groupId) || [];
    if (ids.length > 0) {
      await this.localNotifications.cancel({
        notifications: ids.map(id => ({ id })),
      });
      this.notificationGroups.delete(groupId);
    }
  }

  /**
   * Get notification badge count
   */
  async getBadgeCount(): Promise<number> {
    if (!this.localNotifications) return 0;

    try {
      const pending = await this.localNotifications.getPending();
      return pending.notifications.length;
    } catch {
      return 0;
    }
  }

  /**
   * Set app badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    // This requires the Badge plugin on native
    try {
      const { Badge } = await import('@capawesome/capacitor-badge');
      await Badge.set({ count });
    } catch {
      // Badge plugin not available
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
