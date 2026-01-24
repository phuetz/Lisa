/**
 * Widget Service
 * Manages data synchronization with native home screen widgets
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface WidgetData {
  quickChat: {
    lastQuery?: string;
    lastResponse?: string;
    timestamp?: number;
  };
  recentConversations: Array<{
    id: string;
    title: string;
    lastMessage: string;
    timestamp: number;
  }>;
  stats: {
    totalConversations: number;
    messagesThisWeek: number;
    favoriteTopics: string[];
  };
  voiceShortcuts: Array<{
    id: string;
    phrase: string;
    action: string;
  }>;
}

const WIDGET_DATA_KEY = 'lisa_widget_data';
const WIDGET_REFRESH_INTERVAL = 60000; // 1 minute

class WidgetService {
  private widgetData: WidgetData = {
    quickChat: {},
    recentConversations: [],
    stats: {
      totalConversations: 0,
      messagesThisWeek: 0,
      favoriteTopics: [],
    },
    voiceShortcuts: [],
  };
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  get platform(): 'android' | 'ios' | 'web' {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
    return 'web';
  }

  /**
   * Initialize widget service
   */
  async initialize(): Promise<void> {
    if (!this.isNative) {
      console.log('[WidgetService] Not on native platform, skipping');
      return;
    }

    await this.loadWidgetData();
    this.startRefreshInterval();
    console.log('[WidgetService] Initialized');
  }

  /**
   * Start periodic refresh
   */
  private startRefreshInterval(): void {
    if (this.refreshInterval) return;

    this.refreshInterval = setInterval(() => {
      this.syncToNative();
    }, WIDGET_REFRESH_INTERVAL);
  }

  /**
   * Stop periodic refresh
   */
  stopRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Load widget data from storage
   */
  private async loadWidgetData(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: WIDGET_DATA_KEY });
      if (value) {
        this.widgetData = JSON.parse(value);
      }
    } catch (error) {
      console.error('[WidgetService] Failed to load data:', error);
    }
  }

  /**
   * Save widget data to storage
   */
  private async saveWidgetData(): Promise<void> {
    try {
      await Preferences.set({
        key: WIDGET_DATA_KEY,
        value: JSON.stringify(this.widgetData),
      });
    } catch (error) {
      console.error('[WidgetService] Failed to save data:', error);
    }
  }

  /**
   * Sync data to native widgets
   */
  async syncToNative(): Promise<void> {
    if (!this.isNative) return;

    await this.saveWidgetData();

    // Call native widget update
    try {
      if (this.platform === 'android') {
        await this.updateAndroidWidgets();
      } else if (this.platform === 'ios') {
        await this.updateIOSWidgets();
      }
    } catch (error) {
      console.error('[WidgetService] Sync to native failed:', error);
    }
  }

  /**
   * Update Android widgets via app widget manager
   */
  private async updateAndroidWidgets(): Promise<void> {
    try {
      // Use CapacitorPreferences for shared data with widgets
      // Android widgets read from SharedPreferences which Capacitor Preferences uses
      await Preferences.set({
        key: 'widget_quick_chat',
        value: JSON.stringify(this.widgetData.quickChat),
      });
      await Preferences.set({
        key: 'widget_recent_conversations',
        value: JSON.stringify(this.widgetData.recentConversations.slice(0, 5)),
      });
      await Preferences.set({
        key: 'widget_stats',
        value: JSON.stringify(this.widgetData.stats),
      });

      // Broadcast widget update intent
      // This would be handled by a custom Capacitor plugin
      console.log('[WidgetService] Android widgets updated');
    } catch (error) {
      console.error('[WidgetService] Android widget update failed:', error);
    }
  }

  /**
   * Update iOS widgets via App Groups
   */
  private async updateIOSWidgets(): Promise<void> {
    try {
      // iOS uses App Groups for widget data sharing
      // Data is written to shared UserDefaults
      await Preferences.set({
        key: 'widget_data',
        value: JSON.stringify(this.widgetData),
      });

      // Trigger widget timeline reload
      // This would be handled by WidgetKit integration
      console.log('[WidgetService] iOS widgets updated');
    } catch (error) {
      console.error('[WidgetService] iOS widget update failed:', error);
    }
  }

  // ============ QUICK CHAT WIDGET ============

  /**
   * Update quick chat widget data
   */
  async updateQuickChat(query: string, response: string): Promise<void> {
    this.widgetData.quickChat = {
      lastQuery: query,
      lastResponse: response.slice(0, 200), // Truncate for widget display
      timestamp: Date.now(),
    };
    await this.syncToNative();
  }

  /**
   * Get quick chat data
   */
  getQuickChat(): WidgetData['quickChat'] {
    return this.widgetData.quickChat;
  }

  // ============ RECENT CONVERSATIONS WIDGET ============

  /**
   * Update recent conversations for widget
   */
  async updateRecentConversations(
    conversations: Array<{
      id: string;
      title: string;
      lastMessage: string;
      timestamp: number;
    }>
  ): Promise<void> {
    this.widgetData.recentConversations = conversations
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
    await this.syncToNative();
  }

  /**
   * Add a conversation to recent
   */
  async addRecentConversation(conversation: {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: number;
  }): Promise<void> {
    // Remove if exists
    this.widgetData.recentConversations = this.widgetData.recentConversations.filter(
      c => c.id !== conversation.id
    );

    // Add to front
    this.widgetData.recentConversations.unshift(conversation);

    // Keep only latest 10
    this.widgetData.recentConversations = this.widgetData.recentConversations.slice(0, 10);

    await this.syncToNative();
  }

  /**
   * Get recent conversations
   */
  getRecentConversations(): WidgetData['recentConversations'] {
    return this.widgetData.recentConversations;
  }

  // ============ STATS WIDGET ============

  /**
   * Update stats for widget
   */
  async updateStats(stats: Partial<WidgetData['stats']>): Promise<void> {
    this.widgetData.stats = { ...this.widgetData.stats, ...stats };
    await this.syncToNative();
  }

  /**
   * Increment message count
   */
  async incrementMessageCount(): Promise<void> {
    this.widgetData.stats.messagesThisWeek++;
    await this.syncToNative();
  }

  /**
   * Get stats
   */
  getStats(): WidgetData['stats'] {
    return this.widgetData.stats;
  }

  // ============ VOICE SHORTCUTS ============

  /**
   * Register a voice shortcut
   */
  async registerVoiceShortcut(phrase: string, action: string): Promise<string> {
    const shortcut = {
      id: `shortcut_${Date.now()}`,
      phrase,
      action,
    };

    this.widgetData.voiceShortcuts.push(shortcut);
    await this.syncToNative();

    // Register with native voice assistant
    await this.registerNativeVoiceShortcut(shortcut);

    return shortcut.id;
  }

  /**
   * Remove a voice shortcut
   */
  async removeVoiceShortcut(id: string): Promise<void> {
    this.widgetData.voiceShortcuts = this.widgetData.voiceShortcuts.filter(s => s.id !== id);
    await this.syncToNative();
  }

  /**
   * Get all voice shortcuts
   */
  getVoiceShortcuts(): WidgetData['voiceShortcuts'] {
    return this.widgetData.voiceShortcuts;
  }

  /**
   * Register shortcut with native voice assistant
   */
  private async registerNativeVoiceShortcut(shortcut: {
    id: string;
    phrase: string;
    action: string;
  }): Promise<void> {
    if (this.platform === 'android') {
      // Android: Register with Google Assistant App Actions
      // This would require a custom Capacitor plugin
      console.log('[WidgetService] Registering Android voice shortcut:', shortcut.phrase);
    } else if (this.platform === 'ios') {
      // iOS: Register with Siri via INIntent
      // This would require a custom Capacitor plugin
      console.log('[WidgetService] Registering iOS Siri shortcut:', shortcut.phrase);
    }
  }

  // ============ DEFAULT SHORTCUTS ============

  /**
   * Setup default voice shortcuts
   */
  async setupDefaultShortcuts(): Promise<void> {
    const defaultShortcuts = [
      { phrase: 'Ask Lisa', action: 'open_chat' },
      { phrase: 'New chat with Lisa', action: 'new_conversation' },
      { phrase: 'Voice mode Lisa', action: 'voice_mode' },
      { phrase: 'Quick note Lisa', action: 'quick_note' },
    ];

    for (const shortcut of defaultShortcuts) {
      // Check if already exists
      const exists = this.widgetData.voiceShortcuts.some(
        s => s.phrase.toLowerCase() === shortcut.phrase.toLowerCase()
      );
      if (!exists) {
        await this.registerVoiceShortcut(shortcut.phrase, shortcut.action);
      }
    }
  }

  // ============ UTILITIES ============

  /**
   * Get all widget data
   */
  getAllData(): WidgetData {
    return { ...this.widgetData };
  }

  /**
   * Reset weekly stats (call on Sunday midnight)
   */
  async resetWeeklyStats(): Promise<void> {
    this.widgetData.stats.messagesThisWeek = 0;
    await this.syncToNative();
  }

  /**
   * Clear all widget data
   */
  async clearAll(): Promise<void> {
    this.widgetData = {
      quickChat: {},
      recentConversations: [],
      stats: {
        totalConversations: 0,
        messagesThisWeek: 0,
        favoriteTopics: [],
      },
      voiceShortcuts: [],
    };
    await this.syncToNative();
    console.log('[WidgetService] All data cleared');
  }
}

// Export singleton
export const widgetService = new WidgetService();
export default widgetService;
