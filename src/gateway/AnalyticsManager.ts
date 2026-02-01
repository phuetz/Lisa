/**
 * Lisa Analytics Manager
 * Usage statistics, insights, and reporting
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
}

export type AnalyticsEventType = 
  | 'page_view'
  | 'action'
  | 'conversation'
  | 'agent'
  | 'skill'
  | 'error'
  | 'performance'
  | 'feature';

export interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  totalTokensUsed: number;
  averageResponseTime: number;
  activeUsers: number;
  topAgents: { name: string; count: number }[];
  topSkills: { name: string; count: number }[];
  errorRate: number;
  uptime: number;
}

export interface DailyStats {
  date: string;
  conversations: number;
  messages: number;
  tokens: number;
  errors: number;
  avgResponseTime: number;
}

export interface InsightReport {
  id: string;
  type: 'trend' | 'anomaly' | 'suggestion' | 'achievement';
  title: string;
  description: string;
  metric: string;
  change: number;
  period: string;
  severity: 'info' | 'warning' | 'success';
  createdAt: Date;
}

export class AnalyticsManager extends BrowserEventEmitter {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private sessionStart: Date;
  private maxEvents = 10000;
  private dailyStats: Map<string, DailyStats> = new Map();

  constructor() {
    super();
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.loadFromStorage();
  }

  private generateSessionId(): string {
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('lisa-analytics');
      if (stored) {
        const data = JSON.parse(stored);
        this.events = data.events?.map((e: AnalyticsEvent) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        })) || [];
        
        if (data.dailyStats) {
          this.dailyStats = new Map(Object.entries(data.dailyStats));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data = {
        events: this.events.slice(-1000), // Keep last 1000 events
        dailyStats: Object.fromEntries(this.dailyStats)
      };
      localStorage.setItem('lisa-analytics', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  // Track events
  track(
    type: AnalyticsEventType,
    category: string,
    action: string,
    options: {
      label?: string;
      value?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type,
      category,
      action,
      label: options.label,
      value: options.value,
      metadata: options.metadata,
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    this.events.push(event);
    
    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update daily stats
    this.updateDailyStats(event);

    this.emit('event:tracked', event);
    this.saveToStorage();

    return event;
  }

  private updateDailyStats(event: AnalyticsEvent): void {
    const dateKey = event.timestamp.toISOString().split('T')[0];
    
    let stats = this.dailyStats.get(dateKey);
    if (!stats) {
      stats = {
        date: dateKey,
        conversations: 0,
        messages: 0,
        tokens: 0,
        errors: 0,
        avgResponseTime: 0
      };
      this.dailyStats.set(dateKey, stats);
    }

    if (event.type === 'conversation') {
      stats.conversations++;
    }
    if (event.category === 'message') {
      stats.messages++;
    }
    if (event.type === 'error') {
      stats.errors++;
    }
    if (event.value && event.category === 'tokens') {
      stats.tokens += event.value;
    }
  }

  // Convenience trackers
  trackPageView(page: string, metadata?: Record<string, unknown>): void {
    this.track('page_view', 'navigation', 'view', { label: page, metadata });
  }

  trackConversation(action: 'start' | 'end' | 'message', metadata?: Record<string, unknown>): void {
    this.track('conversation', 'chat', action, { metadata });
  }

  trackAgent(agentName: string, action: string, metadata?: Record<string, unknown>): void {
    this.track('agent', 'agents', action, { label: agentName, metadata });
  }

  trackSkill(skillName: string, action: string, metadata?: Record<string, unknown>): void {
    this.track('skill', 'skills', action, { label: skillName, metadata });
  }

  trackError(error: string, metadata?: Record<string, unknown>): void {
    this.track('error', 'system', 'error', { label: error, metadata });
  }

  trackPerformance(metric: string, value: number, metadata?: Record<string, unknown>): void {
    this.track('performance', 'system', metric, { value, metadata });
  }

  trackFeature(feature: string, action: string, metadata?: Record<string, unknown>): void {
    this.track('feature', 'features', action, { label: feature, metadata });
  }

  // Get statistics
  getUsageStats(): UsageStats {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    const recentEvents = this.events.filter(e => e.timestamp.getTime() > last24h);
    const weekEvents = this.events.filter(e => e.timestamp.getTime() > last7d);

    // Count conversations
    const conversations = this.events.filter(e => 
      e.type === 'conversation' && e.action === 'start'
    );

    // Count messages
    const messages = this.events.filter(e => 
      e.category === 'message'
    );

    // Count tokens
    const tokenEvents = this.events.filter(e => e.category === 'tokens');
    const totalTokens = tokenEvents.reduce((sum, e) => sum + (e.value || 0), 0);

    // Performance metrics
    const perfEvents = this.events.filter(e => 
      e.type === 'performance' && e.action === 'response_time'
    );
    const avgResponseTime = perfEvents.length > 0 
      ? perfEvents.reduce((sum, e) => sum + (e.value || 0), 0) / perfEvents.length 
      : 0;

    // Top agents
    const agentCounts = new Map<string, number>();
    this.events
      .filter(e => e.type === 'agent')
      .forEach(e => {
        const name = e.label || 'unknown';
        agentCounts.set(name, (agentCounts.get(name) || 0) + 1);
      });
    const topAgents = Array.from(agentCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top skills
    const skillCounts = new Map<string, number>();
    this.events
      .filter(e => e.type === 'skill')
      .forEach(e => {
        const name = e.label || 'unknown';
        skillCounts.set(name, (skillCounts.get(name) || 0) + 1);
      });
    const topSkills = Array.from(skillCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Error rate
    const errors = weekEvents.filter(e => e.type === 'error').length;
    const errorRate = weekEvents.length > 0 ? errors / weekEvents.length : 0;

    // Unique sessions in last 24h
    const uniqueSessions = new Set(recentEvents.map(e => e.sessionId));

    return {
      totalConversations: conversations.length,
      totalMessages: messages.length,
      totalTokensUsed: totalTokens,
      averageResponseTime: Math.round(avgResponseTime),
      activeUsers: uniqueSessions.size,
      topAgents,
      topSkills,
      errorRate: Math.round(errorRate * 10000) / 100,
      uptime: (now - this.sessionStart.getTime()) / 1000
    };
  }

  getDailyStats(days: number = 7): DailyStats[] {
    const result: DailyStats[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const stats = this.dailyStats.get(dateKey) || {
        date: dateKey,
        conversations: 0,
        messages: 0,
        tokens: 0,
        errors: 0,
        avgResponseTime: 0
      };
      
      result.push(stats);
    }

    return result;
  }

  // Generate insights
  getInsights(): InsightReport[] {
    const insights: InsightReport[] = [];
    const stats = this.getUsageStats();
    const dailyStats = this.getDailyStats(7);

    // Trend analysis - conversations
    if (dailyStats.length >= 2) {
      const recentDays = dailyStats.slice(-3);
      const earlierDays = dailyStats.slice(0, 3);
      
      const recentAvg = recentDays.reduce((s, d) => s + d.conversations, 0) / recentDays.length;
      const earlierAvg = earlierDays.reduce((s, d) => s + d.conversations, 0) / Math.max(earlierDays.length, 1);
      
      if (earlierAvg > 0) {
        const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
        
        if (Math.abs(change) > 20) {
          insights.push({
            id: `insight_conv_${Date.now()}`,
            type: 'trend',
            title: change > 0 ? 'Augmentation des conversations' : 'Baisse des conversations',
            description: `Les conversations ont ${change > 0 ? 'augmenté' : 'diminué'} de ${Math.abs(Math.round(change))}% cette semaine`,
            metric: 'conversations',
            change: Math.round(change),
            period: '7 jours',
            severity: change > 0 ? 'success' : 'warning',
            createdAt: new Date()
          });
        }
      }
    }

    // Error rate warning
    if (stats.errorRate > 5) {
      insights.push({
        id: `insight_err_${Date.now()}`,
        type: 'anomaly',
        title: 'Taux d\'erreur élevé',
        description: `Le taux d'erreur est de ${stats.errorRate}%, considérez de vérifier les logs`,
        metric: 'error_rate',
        change: stats.errorRate,
        period: '7 jours',
        severity: 'warning',
        createdAt: new Date()
      });
    }

    // Usage milestone
    if (stats.totalMessages >= 100 && stats.totalMessages < 150) {
      insights.push({
        id: `insight_milestone_${Date.now()}`,
        type: 'achievement',
        title: '100 messages atteints! 🎉',
        description: 'Vous avez dépassé les 100 messages avec Lisa',
        metric: 'messages',
        change: 0,
        period: 'total',
        severity: 'success',
        createdAt: new Date()
      });
    }

    // Top agent suggestion
    if (stats.topAgents.length > 0) {
      const topAgent = stats.topAgents[0];
      insights.push({
        id: `insight_agent_${Date.now()}`,
        type: 'suggestion',
        title: `Agent favori: ${topAgent.name}`,
        description: `Vous utilisez principalement l'agent ${topAgent.name} (${topAgent.count} fois)`,
        metric: 'agent_usage',
        change: topAgent.count,
        period: 'total',
        severity: 'info',
        createdAt: new Date()
      });
    }

    return insights;
  }

  // Session info
  getSessionInfo(): { id: string; start: Date; duration: number; events: number } {
    return {
      id: this.sessionId,
      start: this.sessionStart,
      duration: (Date.now() - this.sessionStart.getTime()) / 1000,
      events: this.events.filter(e => e.sessionId === this.sessionId).length
    };
  }

  // Export data
  exportData(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      session: this.getSessionInfo(),
      stats: this.getUsageStats(),
      dailyStats: this.getDailyStats(30),
      insights: this.getInsights(),
      recentEvents: this.events.slice(-100)
    }, null, 2);
  }

  // Clear data
  clearData(): void {
    this.events = [];
    this.dailyStats.clear();
    this.saveToStorage();
    this.emit('data:cleared');
  }
}

// Singleton
let analyticsManagerInstance: AnalyticsManager | null = null;

export function getAnalyticsManager(): AnalyticsManager {
  if (!analyticsManagerInstance) {
    analyticsManagerInstance = new AnalyticsManager();
  }
  return analyticsManagerInstance;
}

export function resetAnalyticsManager(): void {
  if (analyticsManagerInstance) {
    analyticsManagerInstance.removeAllListeners();
    analyticsManagerInstance = null;
  }
}

