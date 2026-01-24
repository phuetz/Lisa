/**
 * Widget Plugin for Capacitor
 * Bridges TypeScript to native widget implementations
 */

import { registerPlugin } from '@capacitor/core';

export interface ConversationWidgetData {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
}

export interface StatsWidgetData {
  totalConversations: number;
  totalMessages: number;
  messagesToday: number;
  favoriteAgent: string | null;
}

export interface WidgetPluginInterface {
  /**
   * Update recent conversations displayed in widgets
   */
  updateRecentConversations(options: { conversations: ConversationWidgetData[] }): Promise<void>;

  /**
   * Update stats displayed in widgets
   */
  updateStats(options: { stats: StatsWidgetData }): Promise<void>;

  /**
   * Refresh all widgets
   */
  refreshAllWidgets(): Promise<void>;

  /**
   * Check if widgets are supported on this device
   */
  isSupported(): Promise<{ supported: boolean }>;

  /**
   * Get the number of active widgets
   */
  getActiveWidgetCount(): Promise<{ count: number }>;
}

// Register the plugin
const WidgetPlugin = registerPlugin<WidgetPluginInterface>('WidgetPlugin', {
  web: () => import('./widgetPluginWeb').then(m => new m.WidgetPluginWeb()),
});

export default WidgetPlugin;

/**
 * Helper class for widget management
 */
export class WidgetManager {
  private static instance: WidgetManager;

  private constructor() {}

  static getInstance(): WidgetManager {
    if (!WidgetManager.instance) {
      WidgetManager.instance = new WidgetManager();
    }
    return WidgetManager.instance;
  }

  /**
   * Update widgets with latest conversation data
   */
  async updateConversations(conversations: ConversationWidgetData[]): Promise<void> {
    try {
      await WidgetPlugin.updateRecentConversations({
        conversations: conversations.slice(0, 5), // Max 5 for widgets
      });
    } catch (error) {
      console.warn('[WidgetManager] Failed to update conversations:', error);
    }
  }

  /**
   * Update widgets with latest stats
   */
  async updateStats(stats: StatsWidgetData): Promise<void> {
    try {
      await WidgetPlugin.updateStats({ stats });
    } catch (error) {
      console.warn('[WidgetManager] Failed to update stats:', error);
    }
  }

  /**
   * Force refresh all widgets
   */
  async refreshAll(): Promise<void> {
    try {
      await WidgetPlugin.refreshAllWidgets();
    } catch (error) {
      console.warn('[WidgetManager] Failed to refresh widgets:', error);
    }
  }

  /**
   * Check if device supports widgets
   */
  async isSupported(): Promise<boolean> {
    try {
      const { supported } = await WidgetPlugin.isSupported();
      return supported;
    } catch {
      return false;
    }
  }
}

export const widgetManager = WidgetManager.getInstance();
