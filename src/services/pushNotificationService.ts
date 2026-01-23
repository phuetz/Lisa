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

class PushNotificationService {
  private initialized = false;
  private pushNotifications: typeof import('@capacitor/push-notifications').PushNotifications | null = null;
  private localNotifications: typeof import('@capacitor/local-notifications').LocalNotifications | null = null;

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
      console.log('[PushNotificationService] Initialized successfully');
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
      console.log('[PushNotificationService] Notification channels created');
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
        console.log('[PushNotificationService] Push registration token:', token.value);
        // Sauvegarder le token pour le backend
        localStorage.setItem('push_token', token.value);
      });

      await this.pushNotifications.addListener('registrationError', (error) => {
        console.error('[PushNotificationService] Push registration error:', error);
      });

      await this.pushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[PushNotificationService] Push received:', notification);
        // Afficher une notification locale
        this.showLocalNotification({
          title: notification.title || 'Lisa AI',
          body: notification.body || '',
          extra: notification.data,
        });
      });

      await this.pushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[PushNotificationService] Push action:', action);
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
      console.log('[PushNotificationService] Local notification (web):', options.title);
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

    console.log(`[PushNotificationService] Reminder scheduled for ${scheduleAt.toISOString()}`);
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
      console.log('[PushNotificationService] Reminder action:', data);
      // Naviguer vers la conversation ou action spécifique
    } else if (data.conversationId) {
      console.log('[PushNotificationService] Open conversation:', data.conversationId);
      // Ouvrir la conversation spécifique
    }
  }

  /**
   * Obtenir le token push actuel
   */
  getPushToken(): string | null {
    return localStorage.getItem('push_token');
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
