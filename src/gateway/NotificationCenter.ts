/**
 * Lisa Notification Center
 * Centralized notification management with multiple channels
 * Inspired by OpenClaw's notification system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  actions?: NotificationAction[];
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  soundEnabled?: boolean;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'task' | 'message' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationCategory = 
  | 'chat'
  | 'workflow'
  | 'agent'
  | 'skill'
  | 'cron'
  | 'webhook'
  | 'system'
  | 'update'
  | 'security';

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: string; // Action identifier
  data?: Record<string, unknown>;
}

export interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  categories: Record<NotificationCategory, CategoryPreference>;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
  };
  maxVisible: number;
  autoHideDuration: number; // ms, 0 = don't auto-hide
}

export interface CategoryPreference {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  minPriority: NotificationPriority;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  soundEnabled: true,
  desktopEnabled: true,
  categories: {
    chat: { enabled: true, sound: true, desktop: true, minPriority: 'normal' },
    workflow: { enabled: true, sound: true, desktop: true, minPriority: 'normal' },
    agent: { enabled: true, sound: false, desktop: true, minPriority: 'high' },
    skill: { enabled: true, sound: false, desktop: false, minPriority: 'normal' },
    cron: { enabled: true, sound: false, desktop: false, minPriority: 'high' },
    webhook: { enabled: true, sound: false, desktop: false, minPriority: 'high' },
    system: { enabled: true, sound: true, desktop: true, minPriority: 'low' },
    update: { enabled: true, sound: true, desktop: true, minPriority: 'normal' },
    security: { enabled: true, sound: true, desktop: true, minPriority: 'low' }
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  },
  maxVisible: 5,
  autoHideDuration: 5000
};

export class NotificationCenter extends BrowserEventEmitter {
  private notifications: Map<string, Notification> = new Map();
  private preferences: NotificationPreferences;
  private hasDesktopPermission = false;
  private maxStoredNotifications = 100;

  constructor(preferences?: Partial<NotificationPreferences>) {
    super();
    this.preferences = { ...DEFAULT_PREFERENCES, ...preferences };
    this.checkDesktopPermission();
  }

  private async checkDesktopPermission(): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        this.hasDesktopPermission = true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.hasDesktopPermission = permission === 'granted';
      }
    }
  }

  // Create notification
  notify(options: {
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    category?: NotificationCategory;
    actions?: NotificationAction[];
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
    soundEnabled?: boolean;
  }): Notification {
    const id = `notif_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    const notification: Notification = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      priority: options.priority || 'normal',
      category: options.category || 'system',
      timestamp: new Date(),
      read: false,
      dismissed: false,
      actions: options.actions,
      metadata: options.metadata,
      expiresAt: options.expiresAt,
      soundEnabled: options.soundEnabled
    };

    // Check if should notify based on preferences
    if (!this.shouldNotify(notification)) {
      return notification;
    }

    this.notifications.set(id, notification);
    this.trimOldNotifications();

    this.emit('notification:created', notification);

    // Play sound
    if (this.shouldPlaySound(notification)) {
      this.playNotificationSound(notification.type);
    }

    // Show desktop notification
    if (this.shouldShowDesktop(notification)) {
      this.showDesktopNotification(notification);
    }

    return notification;
  }

  // Convenience methods
  info(title: string, message: string, category?: NotificationCategory): Notification {
    return this.notify({ type: 'info', title, message, category });
  }

  success(title: string, message: string, category?: NotificationCategory): Notification {
    return this.notify({ type: 'success', title, message, category });
  }

  warning(title: string, message: string, category?: NotificationCategory): Notification {
    return this.notify({ type: 'warning', title, message, priority: 'high', category });
  }

  error(title: string, message: string, category?: NotificationCategory): Notification {
    return this.notify({ type: 'error', title, message, priority: 'urgent', category });
  }

  task(title: string, message: string, actions?: NotificationAction[]): Notification {
    return this.notify({ type: 'task', title, message, category: 'workflow', actions });
  }

  // Notification management
  markAsRead(id: string): boolean {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.emit('notification:read', notification);
      return true;
    }
    return false;
  }

  markAllAsRead(): void {
    for (const notification of this.notifications.values()) {
      notification.read = true;
    }
    this.emit('notifications:allRead');
  }

  dismiss(id: string): boolean {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.dismissed = true;
      this.emit('notification:dismissed', notification);
      return true;
    }
    return false;
  }

  dismissAll(): void {
    for (const notification of this.notifications.values()) {
      notification.dismissed = true;
    }
    this.emit('notifications:allDismissed');
  }

  delete(id: string): boolean {
    const deleted = this.notifications.delete(id);
    if (deleted) {
      this.emit('notification:deleted', { id });
    }
    return deleted;
  }

  clearAll(): void {
    this.notifications.clear();
    this.emit('notifications:cleared');
  }

  // Query notifications
  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  getNotifications(filter?: {
    type?: NotificationType;
    category?: NotificationCategory;
    priority?: NotificationPriority;
    unreadOnly?: boolean;
    undismissedOnly?: boolean;
    limit?: number;
  }): Notification[] {
    let notifications = Array.from(this.notifications.values());

    if (filter?.type) {
      notifications = notifications.filter(n => n.type === filter.type);
    }
    if (filter?.category) {
      notifications = notifications.filter(n => n.category === filter.category);
    }
    if (filter?.priority) {
      notifications = notifications.filter(n => n.priority === filter.priority);
    }
    if (filter?.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    if (filter?.undismissedOnly) {
      notifications = notifications.filter(n => !n.dismissed);
    }

    // Sort by timestamp (newest first) and priority
    notifications.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    if (filter?.limit) {
      notifications = notifications.slice(0, filter.limit);
    }

    return notifications;
  }

  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.read && !n.dismissed).length;
  }

  // Action handling
  executeAction(notificationId: string, actionId: string): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) return;

    this.emit('notification:action', {
      notification,
      action
    });

    // Auto-dismiss after action
    this.dismiss(notificationId);
  }

  // Preferences
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.emit('preferences:updated', this.preferences);
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Check methods
  private shouldNotify(notification: Notification): boolean {
    if (!this.preferences.enabled) return false;

    // Check quiet hours
    if (this.isQuietHours()) return false;

    // Check category preferences
    const categoryPref = this.preferences.categories[notification.category];
    if (!categoryPref?.enabled) return false;

    // Check minimum priority
    const priorityOrder = { low: 1, normal: 2, high: 3, urgent: 4 };
    if (priorityOrder[notification.priority] < priorityOrder[categoryPref.minPriority]) {
      return false;
    }

    return true;
  }

  private shouldPlaySound(notification: Notification): boolean {
    if (!this.preferences.soundEnabled) return false;
    if (notification.soundEnabled === false) return false;
    
    const categoryPref = this.preferences.categories[notification.category];
    return categoryPref?.sound ?? false;
  }

  private shouldShowDesktop(notification: Notification): boolean {
    if (!this.preferences.desktopEnabled) return false;
    if (!this.hasDesktopPermission) return false;
    
    const categoryPref = this.preferences.categories[notification.category];
    return categoryPref?.desktop ?? false;
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = this.preferences.quietHours;
    
    if (start <= end) {
      return currentTime >= start && currentTime < end;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 08:00)
      return currentTime >= start || currentTime < end;
    }
  }

  // Desktop notification
  private showDesktopNotification(notification: Notification): void {
    if (typeof window === 'undefined' || !this.hasDesktopPermission) return;

    const icon = this.getNotificationIcon(notification.type);
    
    const desktopNotif = new Notification(notification.title, {
      body: notification.message,
      icon,
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent'
    });

    desktopNotif.onclick = () => {
      window.focus();
      this.emit('notification:clicked', notification);
      desktopNotif.close();
    };

    if (this.preferences.autoHideDuration > 0 && notification.priority !== 'urgent') {
      setTimeout(() => desktopNotif.close(), this.preferences.autoHideDuration);
    }
  }

  private getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      info: '💬',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      task: '📋',
      message: '💬',
      system: '⚙️'
    };
    return icons[type] || '🔔';
  }

  // Sound
  private playNotificationSound(type: NotificationType): void {
    try {
      const frequencies: Record<NotificationType, number> = {
        info: 440,
        success: 523,
        warning: 392,
        error: 330,
        task: 466,
        message: 494,
        system: 415
      };

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequencies[type] || 440;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // Sound playback not critical
    }
  }

  // Cleanup
  private trimOldNotifications(): void {
    const notifications = Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (notifications.length > this.maxStoredNotifications) {
      const toRemove = notifications.slice(this.maxStoredNotifications);
      for (const n of toRemove) {
        this.notifications.delete(n.id);
      }
    }

    // Remove expired notifications
    const now = new Date();
    for (const [id, notification] of this.notifications) {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id);
      }
    }
  }

  // Stats
  getStats(): {
    total: number;
    unread: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const notifications = Array.from(this.notifications.values());
    
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const n of notifications) {
      byType[n.type] = (byType[n.type] || 0) + 1;
      byCategory[n.category] = (byCategory[n.category] || 0) + 1;
      byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
    }

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType,
      byCategory,
      byPriority
    };
  }
}

// Singleton
let notificationCenterInstance: NotificationCenter | null = null;

export function getNotificationCenter(): NotificationCenter {
  if (!notificationCenterInstance) {
    notificationCenterInstance = new NotificationCenter();
  }
  return notificationCenterInstance;
}

export function resetNotificationCenter(): void {
  if (notificationCenterInstance) {
    notificationCenterInstance.removeAllListeners();
    notificationCenterInstance = null;
  }
}

