/**
 * Lisa Gateway - Main exports
 * OpenClaw-inspired architecture for Lisa
 */

// Core types
export * from './types';

// Gateway Server
export { GatewayServer, getGateway, resetGateway } from './GatewayServer';

// Skills Platform
export { SkillsManager, getSkillsManager, resetSkillsManager } from './SkillsManager';
export type { Skill, SkillCategory, SkillStatus, SkillConfig, SkillManifest } from './SkillsManager';

// Session Tools (Agent-to-Agent)
export { sessionTools, sessions_list, sessions_send, sessions_spawn, sessions_history } from './SessionTools';

// Cron/Automation
export { CronManager, getCronManager, resetCronManager, PREDEFINED_SCHEDULES } from './CronManager';
export type { CronJob, CronAction, CronSchedule } from './CronManager';

// Webhooks
export { WebhookManager, getWebhookManager, resetWebhookManager } from './WebhookManager';
export type { Webhook, WebhookAction, WebhookRequest, WebhookResponse } from './WebhookManager';

// Voice Wake
export { VoiceWake, getVoiceWake, resetVoiceWake } from './VoiceWake';
export type { VoiceWakeConfig, WakeEvent, VoiceWakeState } from './VoiceWake';

// Chat Commands
export { ChatCommandManager, getChatCommandManager, resetChatCommandManager } from './ChatCommands';
export type { ChatCommand, CommandContext, CommandResult } from './ChatCommands';

// Usage Tracking & Model Failover
export { UsageTracker, getUsageTracker, resetUsageTracker } from './UsageTracker';
export type { UsageRecord, UsageStats, ModelConfig, ModelProvider } from './UsageTracker';

// Node Manager (Device Capabilities)
export { NodeManager, getNodeManager, resetNodeManager } from './NodeManager';
export type { Node, NodeType, NodePlatform, NodeCapability, NodeAction, NodeActionResult } from './NodeManager';

// Context Manager
export { ContextManager, getContextManager, resetContextManager } from './ContextManager';
export type { ContextEntry, ContextWindow, ContextConfig } from './ContextManager';

// Prompt Templates
export { PromptTemplateManager, getPromptTemplateManager, resetPromptTemplateManager } from './PromptTemplates';
export type { PromptTemplate, PromptCategory, PromptVariable, CompiledPrompt } from './PromptTemplates';

// Agent Orchestrator
export { AgentOrchestrator, getAgentOrchestrator, resetAgentOrchestrator } from './AgentOrchestrator';
export type { AgentDefinition, AgentTask, Workflow, WorkflowStep } from './AgentOrchestrator';

// Notification Center
export { NotificationCenter, getNotificationCenter, resetNotificationCenter } from './NotificationCenter';
export type { Notification, NotificationType, NotificationPriority, NotificationCategory } from './NotificationCenter';

// Keyboard Shortcuts
export { KeyboardShortcutManager, getKeyboardShortcutManager, resetKeyboardShortcutManager } from './KeyboardShortcuts';
export type { KeyboardShortcut, ShortcutCategory } from './KeyboardShortcuts';

// Theme Manager
export { ThemeManager, getThemeManager, resetThemeManager } from './ThemeManager';
export type { Theme, ThemeColors, ThemeFonts } from './ThemeManager';

// Plugin System
export { PluginSystem, getPluginSystem, resetPluginSystem } from './PluginSystem';
export type { Plugin, PluginPermission, PluginManifest, PluginHooks } from './PluginSystem';

// Settings Manager
export { SettingsManager, getSettingsManager, resetSettingsManager } from './SettingsManager';
export type { Settings, SettingSchema } from './SettingsManager';

// Search Manager
export { SearchManager, getSearchManager, resetSearchManager } from './SearchManager';
export type { SearchResult, SearchQuery, SearchIndex } from './SearchManager';

// Activity Logger
export { ActivityLogger, getActivityLogger, resetActivityLogger } from './ActivityLogger';
export type { ActivityLog, ActivityType, ActivityCategory, ActivityFilter } from './ActivityLogger';

// Rate Limiter
export { RateLimiter, getRateLimiter, resetRateLimiter } from './RateLimiter';
export type { RateLimitConfig, RateLimitResult, RateLimitStats } from './RateLimiter';

// Cache Manager
export { CacheManager, getCacheManager, resetCacheManager } from './CacheManager';
export type { CacheEntry, CacheConfig, CacheStats } from './CacheManager';

// Export Manager
export { ExportManager, getExportManager, resetExportManager } from './ExportManager';
export type { ExportFormat, ExportOptions, ExportResult } from './ExportManager';

// Health Monitor
export { HealthMonitor, getHealthMonitor, resetHealthMonitor } from './HealthMonitor';
export type { HealthStatus, HealthCheck, SystemMetrics } from './HealthMonitor';

// Backup Manager
export { BackupManager, getBackupManager, resetBackupManager } from './BackupManager';
export type { Backup, BackupType, BackupStatus, BackupSchedule } from './BackupManager';

// Sync Service
export { SyncService, getSyncService, resetSyncService } from './SyncService';
export type { SyncConfig, SyncState, SyncStatus, SyncProvider } from './SyncService';

// Analytics Manager
export { AnalyticsManager, getAnalyticsManager, resetAnalyticsManager } from './AnalyticsManager';
export type { AnalyticsEvent, UsageStats as AnalyticsUsageStats, DailyStats, InsightReport } from './AnalyticsManager';

// Model Manager
export { ModelManager, getModelManager, resetModelManager } from './ModelManager';
export type { AIModel, ModelProvider as AIModelProvider, ModelType, ModelCapability, ModelConfig as AIModelConfig, ProviderConfig } from './ModelManager';

// Conversation Manager
export { ConversationManager, getConversationManager, resetConversationManager } from './ConversationManager';
export type { Conversation, ConversationMessage, ConversationFolder, ConversationFilter } from './ConversationManager';

// Quick Actions
export { QuickActionsManager, getQuickActionsManager, resetQuickActionsManager } from './QuickActions';
export type { QuickAction, QuickActionCategory, QuickActionType } from './QuickActions';

// Browser Controller
export { BrowserController, getBrowserController, resetBrowserController } from './BrowserController';
export type { BrowserConfig, BrowserPage, BrowserAction, BrowserResult, PageSnapshot } from './BrowserController';

// Canvas Manager (A2UI)
export { CanvasManager, getCanvasManager, resetCanvasManager } from './CanvasManager';
export type { CanvasComponent, CanvasComponentType, CanvasAction, CanvasState, CanvasTheme } from './CanvasManager';

// Streaming Manager
export { StreamingManager, getStreamingManager, resetStreamingManager } from './StreamingManager';
export type { StreamConfig, StreamChunk, StreamSession, RetryPolicy } from './StreamingManager';

// Talk Mode (Open Source TTS/STT)
export { TalkMode, getTalkMode, resetTalkMode } from './TalkMode';
export type { TalkModeConfig, TTSEngine, STTEngine, Voice, TTSRequest, STTResult } from './TalkMode';

// Screen Capture
export { ScreenCapture, getScreenCapture, resetScreenCapture } from './ScreenCapture';
export type { ScreenCaptureConfig, Screenshot, Recording } from './ScreenCapture';

// Location Service
export { LocationService, getLocationService, resetLocationService } from './LocationService';
export type { LocationConfig, GeoLocation, LocationContext, GeoAddress } from './LocationService';

// Elevated Mode
export { ElevatedMode, getElevatedMode, resetElevatedMode } from './ElevatedMode';
export type { ElevatedConfig, ElevatedLevel, ElevatedSession, PermissionRequest } from './ElevatedMode';

// Email Integration
export { EmailIntegration, getEmailIntegration, resetEmailIntegration } from './EmailIntegration';
export type { EmailConfig, Email, EmailDraft, EmailFilter, EmailWebhook } from './EmailIntegration';

// Session Pruning
export { SessionPruning, getSessionPruning, resetSessionPruning } from './SessionPruning';
export type { PruningConfig, PruningStrategy, SessionContext, PruningResult } from './SessionPruning';

// Skills Registry
export { SkillsRegistry, getSkillsRegistry, resetSkillsRegistry } from './SkillsRegistry';
export type { Skill as RegistrySkill, SkillCategory as RegistrySkillCategory, SkillSource, SkillStatus as RegistrySkillStatus, SkillManifest as RegistrySkillManifest, SkillPermission } from './SkillsRegistry';

// Desktop Controller
export { DesktopController, getDesktopController, resetDesktopController } from './DesktopController';
export type { DesktopConfig, DesktopAction, DesktopActionType, MousePosition, ScreenInfo, WindowInfo } from './DesktopController';

// Telegram Channel
export { TelegramChannel, getTelegramChannel, resetTelegramChannel } from './TelegramChannel';
export type { TelegramConfig, TelegramMessage, TelegramChat, TelegramUser } from './TelegramChannel';

// Discord Channel
export { DiscordChannelManager, getDiscordChannel, resetDiscordChannel } from './DiscordChannel';
export type { DiscordConfig, DiscordMessage, DiscordGuild } from './DiscordChannel';

// Slack Channel
export { SlackChannelManager, getSlackChannel, resetSlackChannel } from './SlackChannel';
export type { SlackConfig, SlackMessage, SlackChannel as SlackChannelInfo } from './SlackChannel';

// WhatsApp Channel
export { WhatsAppChannel, getWhatsAppChannel, resetWhatsAppChannel } from './WhatsAppChannel';
export type { WhatsAppConfig, WhatsAppMessage, WhatsAppChat } from './WhatsAppChannel';

// Signal Channel
export { SignalChannel, getSignalChannel, resetSignalChannel } from './SignalChannel';
export type { SignalConfig, SignalMessage, SignalGroup } from './SignalChannel';

// Companion Mode
export { CompanionMode, getCompanionMode, resetCompanionMode } from './CompanionMode';
export type { CompanionConfig, PersonalityProfile, RelationshipLevel, DailyRoutine, SpecialDate } from './CompanionMode';

// Mood Tracker
export { MoodTracker, getMoodTracker, resetMoodTracker } from './MoodTracker';
export type { Mood, MoodEntry, MoodPattern, MoodResponse } from './MoodTracker';

// Personal Memory
export { PersonalMemory, getPersonalMemory, resetPersonalMemory } from './PersonalMemory';
export type { SharedMemory, UserPreference, ImportantPerson, LifeEvent } from './PersonalMemory';

// Proactive Chat
export { ProactiveChat, getProactiveChat, resetProactiveChat } from './ProactiveChat';
export type { ProactiveMessage, ProactiveConfig } from './ProactiveChat';

// ============================================
// NEW MODULES - OpenClaw-inspired modernization
// ============================================

// Bot Channels - Browser stubs (real implementations require Node.js server)
// For server-side usage, import directly from './channels/DiscordBot', etc.
export { TelegramBot, getTelegramBot, resetTelegramBot } from './channels/TelegramBot.browser';
export type { TelegramConfig as RealTelegramConfig, TelegramMessage as RealTelegramMessage, TelegramState } from './channels/TelegramBot.browser';

export { DiscordBot, getDiscordBot, resetDiscordBot } from './channels/DiscordBot.browser';
export type { DiscordConfig as RealDiscordConfig, DiscordMessage as RealDiscordMessage, DiscordState } from './channels/DiscordBot.browser';

export { WhatsAppBot, getWhatsAppBot, resetWhatsAppBot } from './channels/WhatsAppBot.browser';
export type { WhatsAppConfig as RealWhatsAppConfig, WhatsAppMessage as RealWhatsAppMessage, WhatsAppState } from './channels/WhatsAppBot.browser';

export { SlackBot, getSlackBot, resetSlackBot } from './channels/SlackBot.browser';
export type { SlackConfig as RealSlackConfig, SlackMessage as RealSlackMessage, SlackState } from './channels/SlackBot.browser';

// Model Failover (multi-provider with automatic fallback)
export { ModelFailover, getModelFailover, resetModelFailover } from './ModelFailover';
export type { ModelConfig as FailoverModelConfig, FailoverConfig, ModelHealth, CompletionRequest, CompletionResponse, ModelProvider as FailoverModelProvider } from './ModelFailover';

// Voice Wake Pro (Porcupine + Web Speech API fallback)
export { VoiceWakePro, VoiceWakeFallback, getVoiceWakePro, resetVoiceWakePro } from './VoiceWakePro';
export type { VoiceWakeProConfig, WakeWordEvent, VoiceWakeProState } from './VoiceWakePro';

// Edge TTS (Microsoft Edge TTS - free)
export { EdgeTTS, getEdgeTTS, resetEdgeTTS, LISA_VOICES } from './EdgeTTS';
export type { EdgeTTSConfig, TTSVoice, TTSState } from './EdgeTTS';

// Sessions Tools Pro (Agent-to-Agent communication)
export { SessionsToolsPro, getSessionsTools, resetSessionsTools } from './SessionsToolsPro';
export type { Session, SessionMessage, SessionHistory, SendOptions, SendResult, SpawnOptions } from './SessionsToolsPro';

// ============================================
// PHASE 3.2 & 3.3 & 4.2 ENHANCEMENTS
// ============================================

// Skill Executor (Phase 3.2 - Dynamic skill execution)
export { SkillExecutor, getSkillExecutor, resetSkillExecutor } from './SkillExecutor';
export type {
  SkillExecutionContext,
  SkillExecutionResult,
  ToolHandler,
  ExecutionHistoryEntry
} from './SkillExecutor';

// Enhanced Sync Service (Phase 4.2 - Multi-device sync)
export type {
  ConnectedDevice,
  RealTimeMessage
} from './SyncService';

// React Hook
export { useGateway } from './useGateway';

// System Prompt Builder (OpenClaw-inspired)
export { buildSystemPrompt, buildToolDefinitions, getAvailableToolsList } from './buildSystemPrompt';
export type { SystemPromptConfig } from './buildSystemPrompt';

