/**
 * Web implementation of Widget Plugin
 * Provides fallback behavior for web platform
 */

import type { WidgetPluginInterface, ConversationWidgetData, StatsWidgetData } from './widgetPlugin';

export class WidgetPluginWeb implements WidgetPluginInterface {
  async updateRecentConversations(_options: { conversations: ConversationWidgetData[] }): Promise<void> {
    // Web doesn't support home screen widgets
    // Could potentially use browser notifications or PWA features
    console.log('[WidgetPluginWeb] updateRecentConversations - not supported on web');
  }

  async updateStats(_options: { stats: StatsWidgetData }): Promise<void> {
    console.log('[WidgetPluginWeb] updateStats - not supported on web');
  }

  async refreshAllWidgets(): Promise<void> {
    console.log('[WidgetPluginWeb] refreshAllWidgets - not supported on web');
  }

  async isSupported(): Promise<{ supported: boolean }> {
    return { supported: false };
  }

  async getActiveWidgetCount(): Promise<{ count: number }> {
    return { count: 0 };
  }
}
