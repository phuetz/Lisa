/**
 * Connection Manager Service
 * OpenClaw-inspired AI provider connection management
 *
 * Features:
 * - Multi-provider support with profile-based selection
 * - Exponential backoff for transient failures
 * - Semantic error classification (transient vs permanent)
 * - Session stickiness for cache efficiency
 * - Two-stage fallback (profile rotation → provider fallback)
 */

import { BrowserEventEmitter } from '../gateway/BrowserEventEmitter';

// Provider types
export type AIProviderType = 'gemini' | 'openai' | 'anthropic' | 'xai' | 'lmstudio' | 'ollama';

// Error classification
export type ErrorType = 'transient' | 'auth' | 'billing' | 'permanent' | 'network';

// Connection state
export type ConnectionState = 'connected' | 'connecting' | 'degraded' | 'disconnected' | 'cooldown';

// Provider profile
export interface ProviderProfile {
  id: string;
  provider: AIProviderType;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  isPinned: boolean;
  isAutoPinned: boolean;
  lastUsed?: number;
  cooldownUntil?: number;
  failureCount: number;
  usageStats: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    lastError?: string;
    lastErrorTime?: number;
  };
}

// Connection status
export interface ConnectionStatus {
  provider: AIProviderType;
  state: ConnectionState;
  model: string | null;
  latencyMs: number;
  error?: string;
  errorType?: ErrorType;
  profileId?: string;
  isCloudProvider: boolean;
  tokenCount?: number;
  costEstimate?: number;
}

// Health check result
export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  providers: Record<AIProviderType, {
    available: boolean;
    profileCount: number;
    activeProfiles: number;
    cooldownProfiles: number;
    lastCheck: number;
    latencyMs?: number;
    error?: string;
  }>;
  timestamp: number;
}

// Backoff configuration
const BACKOFF_CONFIG = {
  transient: {
    initial: 60 * 1000,      // 1 minute
    multiplier: 5,
    max: 60 * 60 * 1000      // 1 hour
  },
  billing: {
    initial: 5 * 60 * 60 * 1000, // 5 hours
    multiplier: 2,
    max: 24 * 60 * 60 * 1000    // 24 hours
  },
  auth: {
    initial: 5 * 60 * 1000,    // 5 minutes
    multiplier: 2,
    max: 60 * 60 * 1000        // 1 hour
  }
};

// Cloud providers list
const CLOUD_PROVIDERS: AIProviderType[] = ['gemini', 'openai', 'anthropic', 'xai'];

class ConnectionManager extends BrowserEventEmitter {
  private profiles: Map<string, ProviderProfile> = new Map();
  private currentProfileId: string | null = null;
  private sessionPinnedProfile: string | null = null;
  private healthCache: HealthCheckResult | null = null;
  private healthCacheTime: number = 0;
  private readonly HEALTH_CACHE_TTL = 30000; // 30 seconds

  constructor() {
    super();
    this.loadProfiles();
  }

  /**
   * Load profiles from localStorage
   */
  private loadProfiles(): void {
    try {
      const saved = localStorage.getItem('lisa-connection-profiles');
      if (saved) {
        const data = JSON.parse(saved);
        this.profiles = new Map(Object.entries(data.profiles || {}));
        this.currentProfileId = data.currentProfileId || null;
        this.sessionPinnedProfile = data.sessionPinnedProfile || null;
      }
    } catch (e) {
      console.warn('[ConnectionManager] Failed to load profiles:', e);
    }

    // Ensure default profiles exist
    this.ensureDefaultProfiles();
  }

  /**
   * Save profiles to localStorage
   */
  private saveProfiles(): void {
    try {
      const data = {
        profiles: Object.fromEntries(this.profiles),
        currentProfileId: this.currentProfileId,
        sessionPinnedProfile: this.sessionPinnedProfile
      };
      localStorage.setItem('lisa-connection-profiles', JSON.stringify(data));
    } catch (e) {
      console.warn('[ConnectionManager] Failed to save profiles:', e);
    }
  }

  /**
   * Ensure default profiles exist for each provider
   */
  private ensureDefaultProfiles(): void {
    const defaultProviders: AIProviderType[] = ['gemini', 'openai', 'anthropic', 'xai', 'lmstudio'];

    for (const provider of defaultProviders) {
      const existingProfile = Array.from(this.profiles.values()).find(p => p.provider === provider);
      if (!existingProfile) {
        const profile: ProviderProfile = {
          id: `${provider}-default`,
          provider,
          isPinned: false,
          isAutoPinned: false,
          failureCount: 0,
          usageStats: {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0
          }
        };
        this.profiles.set(profile.id, profile);
      }
    }

    this.saveProfiles();
  }

  /**
   * Get API key for a provider (from profile, store, or environment)
   */
  getApiKeyForProvider(provider: AIProviderType): string | undefined {
    // Check profile first
    const profile = this.getActiveProfile(provider);
    if (profile?.apiKey) {
      return profile.apiKey;
    }

    // Fallback to environment variables
    switch (provider) {
      case 'gemini':
        return import.meta.env.VITE_GEMINI_API_KEY;
      case 'openai':
        return import.meta.env.VITE_OPENAI_API_KEY;
      case 'anthropic':
        return import.meta.env.VITE_ANTHROPIC_API_KEY;
      case 'xai':
        return import.meta.env.GROK_API_KEY;
      default:
        return undefined;
    }
  }

  /**
   * Get active profile for a provider
   */
  getActiveProfile(provider: AIProviderType): ProviderProfile | undefined {
    // Check session-pinned profile first
    if (this.sessionPinnedProfile) {
      const pinned = this.profiles.get(this.sessionPinnedProfile);
      if (pinned?.provider === provider && !this.isInCooldown(pinned)) {
        return pinned;
      }
    }

    // Find best available profile for provider
    const providerProfiles = Array.from(this.profiles.values())
      .filter(p => p.provider === provider && !this.isInCooldown(p))
      .sort((a, b) => {
        // Prioritize pinned profiles
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        // Then by last used (most recent first)
        return (b.lastUsed || 0) - (a.lastUsed || 0);
      });

    return providerProfiles[0];
  }

  /**
   * Check if profile is in cooldown
   */
  isInCooldown(profile: ProviderProfile): boolean {
    if (!profile.cooldownUntil) return false;
    return Date.now() < profile.cooldownUntil;
  }

  /**
   * Calculate cooldown duration based on error type and failure count
   */
  private calculateCooldown(errorType: ErrorType, failureCount: number): number {
    const config = BACKOFF_CONFIG[errorType as keyof typeof BACKOFF_CONFIG] || BACKOFF_CONFIG.transient;
    const duration = Math.min(
      config.initial * Math.pow(config.multiplier, failureCount - 1),
      config.max
    );
    return duration;
  }

  /**
   * Classify an error by type
   */
  classifyError(error: Error | string, statusCode?: number): ErrorType {
    const message = typeof error === 'string' ? error : error.message;
    const lowerMessage = message.toLowerCase();

    // Auth errors
    if (statusCode === 401 || statusCode === 403 ||
        lowerMessage.includes('unauthorized') ||
        lowerMessage.includes('invalid api key') ||
        lowerMessage.includes('authentication')) {
      return 'auth';
    }

    // Billing errors
    if (statusCode === 402 ||
        lowerMessage.includes('payment') ||
        lowerMessage.includes('billing') ||
        lowerMessage.includes('quota exceeded') ||
        lowerMessage.includes('rate limit')) {
      return 'billing';
    }

    // Network errors
    if (lowerMessage.includes('network') ||
        lowerMessage.includes('fetch') ||
        lowerMessage.includes('timeout') ||
        lowerMessage.includes('econnrefused') ||
        lowerMessage.includes('connection')) {
      return 'network';
    }

    // Rate limit (429) - transient
    if (statusCode === 429) {
      return 'transient';
    }

    // Server errors (5xx) - transient
    if (statusCode && statusCode >= 500) {
      return 'transient';
    }

    // Default to permanent for unknown errors
    return 'permanent';
  }

  /**
   * Report a connection failure
   */
  reportFailure(provider: AIProviderType, error: Error | string, statusCode?: number): void {
    const profile = this.getActiveProfile(provider);
    if (!profile) return;

    const errorType = this.classifyError(error, statusCode);
    const errorMessage = typeof error === 'string' ? error : error.message;

    // Update profile stats
    profile.failureCount += 1;
    profile.usageStats.lastError = errorMessage;
    profile.usageStats.lastErrorTime = Date.now();

    // Calculate and set cooldown for transient/auth/billing errors
    if (errorType !== 'permanent') {
      const cooldown = this.calculateCooldown(errorType, profile.failureCount);
      profile.cooldownUntil = Date.now() + cooldown;
      console.log(`[ConnectionManager] Profile ${profile.id} entering cooldown for ${Math.round(cooldown / 1000)}s (${errorType} error)`);
    }

    this.saveProfiles();
    this.emit('connectionFailure', { provider, profile, error: errorMessage, errorType });

    // Try to rotate to next profile
    this.rotateProfile(provider);
  }

  /**
   * Report a successful connection
   */
  reportSuccess(provider: AIProviderType, tokenCount?: number, cost?: number): void {
    const profile = this.getActiveProfile(provider);
    if (!profile) return;

    // Reset failure count on success
    profile.failureCount = 0;
    profile.cooldownUntil = undefined;
    profile.lastUsed = Date.now();
    profile.usageStats.totalRequests += 1;

    if (tokenCount) {
      profile.usageStats.totalTokens += tokenCount;
    }
    if (cost) {
      profile.usageStats.totalCost += cost;
    }

    // Auto-pin for session stickiness
    if (!this.sessionPinnedProfile && !profile.isAutoPinned) {
      profile.isAutoPinned = true;
      this.sessionPinnedProfile = profile.id;
    }

    this.saveProfiles();
    this.emit('connectionSuccess', { provider, profile });
  }

  /**
   * Rotate to next available profile for provider
   */
  private rotateProfile(provider: AIProviderType): ProviderProfile | undefined {
    const availableProfiles = Array.from(this.profiles.values())
      .filter(p => p.provider === provider && !this.isInCooldown(p));

    if (availableProfiles.length === 0) {
      console.warn(`[ConnectionManager] No available profiles for ${provider}`);
      this.emit('allProfilesExhausted', { provider });
      return undefined;
    }

    // Unpin current session profile
    if (this.sessionPinnedProfile) {
      const pinned = this.profiles.get(this.sessionPinnedProfile);
      if (pinned?.provider === provider) {
        pinned.isAutoPinned = false;
        this.sessionPinnedProfile = null;
      }
    }

    const nextProfile = availableProfiles[0];
    console.log(`[ConnectionManager] Rotated to profile ${nextProfile.id}`);
    this.emit('profileRotated', { provider, profile: nextProfile });

    return nextProfile;
  }

  /**
   * Get connection status for a provider
   */
  async getConnectionStatus(provider: AIProviderType): Promise<ConnectionStatus> {
    const profile = this.getActiveProfile(provider);
    const isCloud = CLOUD_PROVIDERS.includes(provider);
    const apiKey = this.getApiKeyForProvider(provider);

    // Check if in cooldown
    if (profile && this.isInCooldown(profile)) {
      return {
        provider,
        state: 'cooldown',
        model: null,
        latencyMs: 0,
        error: `En pause jusqu'à ${new Date(profile.cooldownUntil!).toLocaleTimeString()}`,
        profileId: profile.id,
        isCloudProvider: isCloud
      };
    }

    // For cloud providers, check if API key exists
    if (isCloud) {
      if (!apiKey) {
        return {
          provider,
          state: 'disconnected',
          model: null,
          latencyMs: 0,
          error: `Clé API ${provider} non configurée`,
          isCloudProvider: true
        };
      }

      // Assume connected if API key exists (will validate on first request)
      return {
        provider,
        state: 'connected',
        model: this.getDefaultModel(provider),
        latencyMs: 0,
        profileId: profile?.id,
        isCloudProvider: true,
        tokenCount: profile?.usageStats.totalTokens,
        costEstimate: profile?.usageStats.totalCost
      };
    }

    // For local providers, perform health check
    return this.checkLocalProviderHealth(provider);
  }

  /**
   * Check health of local provider (LM Studio, Ollama)
   */
  private async checkLocalProviderHealth(provider: AIProviderType): Promise<ConnectionStatus> {
    const startTime = performance.now();
    const profile = this.getActiveProfile(provider);

    try {
      let baseUrl = '';
      if (provider === 'lmstudio') {
        baseUrl = '/lmstudio/v1'; // Proxied through Vite
      } else if (provider === 'ollama') {
        baseUrl = 'http://localhost:11434';
      }

      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        const models = data.data || data.models || [];

        return {
          provider,
          state: 'connected',
          model: models[0]?.id || models[0]?.name || null,
          latencyMs,
          profileId: profile?.id,
          isCloudProvider: false
        };
      } else {
        return {
          provider,
          state: 'degraded',
          model: null,
          latencyMs,
          error: `HTTP ${response.status}`,
          isCloudProvider: false
        };
      }
    } catch (error) {
      return {
        provider,
        state: 'disconnected',
        model: null,
        latencyMs: 0,
        error: error instanceof Error ? error.message : 'Connection failed',
        errorType: 'network',
        isCloudProvider: false
      };
    }
  }

  /**
   * Get default model for provider
   */
  private getDefaultModel(provider: AIProviderType): string {
    switch (provider) {
      case 'gemini': return 'gemini-2.5-flash';
      case 'openai': return 'gpt-4o-mini';
      case 'anthropic': return 'claude-3-5-sonnet-20241022';
      case 'xai': return 'grok-2-latest';
      case 'lmstudio': return 'local-model';
      case 'ollama': return 'llama3';
      default: return 'unknown';
    }
  }

  /**
   * Get comprehensive health check
   */
  async getHealthCheck(forceRefresh = false): Promise<HealthCheckResult> {
    const now = Date.now();

    // Return cached result if valid
    if (!forceRefresh && this.healthCache && (now - this.healthCacheTime) < this.HEALTH_CACHE_TTL) {
      return this.healthCache;
    }

    const providers: AIProviderType[] = ['gemini', 'openai', 'anthropic', 'xai', 'lmstudio', 'ollama'];
    const results: HealthCheckResult['providers'] = {} as HealthCheckResult['providers'];

    let healthyCount = 0;
    let degradedCount = 0;

    for (const provider of providers) {
      const providerProfiles = Array.from(this.profiles.values()).filter(p => p.provider === provider);
      const activeProfiles = providerProfiles.filter(p => !this.isInCooldown(p));
      const cooldownProfiles = providerProfiles.filter(p => this.isInCooldown(p));

      const status = await this.getConnectionStatus(provider);

      results[provider] = {
        available: status.state === 'connected',
        profileCount: providerProfiles.length,
        activeProfiles: activeProfiles.length,
        cooldownProfiles: cooldownProfiles.length,
        lastCheck: now,
        latencyMs: status.latencyMs,
        error: status.error
      };

      if (status.state === 'connected') healthyCount++;
      else if (status.state === 'degraded') degradedCount++;
    }

    const overall = healthyCount >= 2 ? 'healthy' : (healthyCount + degradedCount >= 1 ? 'degraded' : 'unhealthy');

    this.healthCache = { overall, providers: results, timestamp: now };
    this.healthCacheTime = now;

    return this.healthCache;
  }

  /**
   * Add or update a profile
   */
  setProfile(profile: Partial<ProviderProfile> & { id: string; provider: AIProviderType }): void {
    const existing = this.profiles.get(profile.id);
    const updated: ProviderProfile = {
      ...{
        isPinned: false,
        isAutoPinned: false,
        failureCount: 0,
        usageStats: { totalRequests: 0, totalTokens: 0, totalCost: 0 }
      },
      ...existing,
      ...profile
    };
    this.profiles.set(profile.id, updated);
    this.saveProfiles();
    this.emit('profileUpdated', { profile: updated });
  }

  /**
   * Remove a profile
   */
  removeProfile(profileId: string): void {
    this.profiles.delete(profileId);
    if (this.sessionPinnedProfile === profileId) {
      this.sessionPinnedProfile = null;
    }
    this.saveProfiles();
    this.emit('profileRemoved', { profileId });
  }

  /**
   * Pin a profile for the session
   */
  pinProfile(profileId: string): void {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.isPinned = true;
      this.sessionPinnedProfile = profileId;
      this.saveProfiles();
      this.emit('profilePinned', { profile });
    }
  }

  /**
   * Reset session (clear pinned profile)
   */
  resetSession(): void {
    if (this.sessionPinnedProfile) {
      const profile = this.profiles.get(this.sessionPinnedProfile);
      if (profile) {
        profile.isAutoPinned = false;
      }
    }
    this.sessionPinnedProfile = null;
    this.saveProfiles();
    this.emit('sessionReset', {});
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): ProviderProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profiles for a specific provider
   */
  getProfilesForProvider(provider: AIProviderType): ProviderProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.provider === provider);
  }

  /**
   * Clear all cooldowns (for debugging/reset)
   */
  clearCooldowns(): void {
    for (const profile of this.profiles.values()) {
      profile.cooldownUntil = undefined;
      profile.failureCount = 0;
    }
    this.saveProfiles();
    this.emit('cooldownsCleared', {});
  }
}

// Singleton instance
let connectionManagerInstance: ConnectionManager | null = null;

export function getConnectionManager(): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager();
  }
  return connectionManagerInstance;
}

export function resetConnectionManager(): void {
  if (connectionManagerInstance) {
    connectionManagerInstance.removeAllListeners();
    connectionManagerInstance = null;
  }
}

export default ConnectionManager;
