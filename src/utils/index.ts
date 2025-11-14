/**
 * Central export file for all Lisa utilities
 * Provides a single import point for all utility functions
 */

// Retry utilities
export {
  retryWithBackoff,
  withRetry,
  RetryPredicates,
  Retry,
  type RetryOptions,
  type RetryResult,
} from './retry';

// Circuit breaker
export {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  withCircuitBreaker,
  type CircuitBreakerOptions,
} from './circuitBreaker';

// Rate limiting
export {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  TieredRateLimiter,
  RateLimitExceededError,
  withRateLimit,
  RateLimit,
  ActionThrottler,
  type RateLimiterOptions,
} from './rateLimiter';

// Analytics
export {
  AgentAnalytics,
  analytics,
  TrackExecution,
  type AgentMetrics,
  type ExecutionRecord,
  type AnalyticsOptions,
} from './agentAnalytics';

// Performance profiling
export {
  PerformanceProfiler,
  profiler,
  componentProfiler,
  memoryMonitor,
  fpsMonitor,
  networkMonitor,
  Profile,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  ComponentProfiler,
  MemoryMonitor,
  FPSMonitor,
  NetworkMonitor,
  type PerformanceMark,
  type PerformanceMetrics,
} from './performance';

// Logging
export {
  LogLevel,
  logDebug,
  logInfo,
  logWarn,
  logError,
  logFatal,
  logEvent,
  getStructuredLogs,
  getLogsByLevel,
  getLogsByContext,
  searchLogs,
  setLogLevel,
  enablePersistence,
  clearStructuredLogs,
  exportLogs,
  importLogs,
  getLogStats,
  getEvents,
  clearEvents,
  formatEvent,
  type StructuredLogEntry,
  type WorkflowEvent,
} from './logger';

// Validation
export {
  sanitizeHtml,
  sanitizeInput,
  isValidEmail,
  isValidUrl,
  isSafeUrl,
  sanitizeFilename,
  isValidJson,
  parseJsonSafely,
  validateLength,
  validateRange,
  validateEnum,
  validateShape,
  escapeSql,
  sanitizeRegexPattern,
  isValidHexColor,
  isValidDate,
  InputValidator,
  validator,
  generateCSP,
  ActionThrottler as ValidationActionThrottler,
} from './validation';

// Model cache
export {
  ModelCache,
  TFModelCache,
  MediaPipeModelCache,
  modelCache,
  tfModelCache,
  mediaPipeCache,
  type CacheOptions,
} from './modelCache';

// Offline sync
export {
  OfflineSyncManager,
  ConflictResolver,
  ConflictStrategy,
  OfflineStorage,
  syncManager,
  offlineStorage,
  type SyncOperation,
  type SyncOptions,
} from './offlineSync';

// Lazy loading
export {
  LazyAgentLoader,
  agentLoader,
  LazyAgent,
  useLazyAgent,
} from './lazyAgent';

// Workflow templates
export {
  workflowTemplates,
  getTemplatesByCategory,
  getTemplatesByTag,
  searchTemplates,
  getTemplateById,
  getAllCategories,
  getAllTags,
  morningRoutineTemplate,
  researchTemplate,
  meetingPrepTemplate,
  codeAnalysisTemplate,
  dataProcessingTemplate,
  smartHomeTemplate,
  emailProcessingTemplate,
  healthMonitoringTemplate,
  contentCreationTemplate,
  type WorkflowTemplate,
} from '../workflow/templates';

// Migration system
export {
  MigrationManager,
  migrationManager,
  autoMigrate,
  type MigrationStep,
  type MigrationState,
} from './migration';

/**
 * Commonly used utility bundles
 */

// Performance monitoring bundle
export const performanceBundle = {
  profiler,
  analytics,
  componentProfiler,
  memoryMonitor,
  fpsMonitor,
  networkMonitor,
  startMonitoring: startPerformanceMonitoring,
  stopMonitoring: stopPerformanceMonitoring,
};

// Reliability bundle
export const reliabilityBundle = {
  retry: retryWithBackoff,
  CircuitBreaker,
  TokenBucketLimiter,
  SlidingWindowLimiter,
  RetryPredicates,
};

// Security bundle
export const securityBundle = {
  sanitizeHtml,
  sanitizeInput,
  isValidEmail,
  isValidUrl,
  isSafeUrl,
  sanitizeFilename,
  validator,
  generateCSP,
};

// Offline bundle
export const offlineBundle = {
  syncManager,
  offlineStorage,
  modelCache,
  ConflictResolver,
};

// Logging bundle
export const loggingBundle = {
  logDebug,
  logInfo,
  logWarn,
  logError,
  logFatal,
  logEvent,
  getStructuredLogs,
  searchLogs,
  getLogStats,
};

/**
 * Quick setup function for production environment
 */
export function setupProductionEnvironment() {
  // Set appropriate log level
  setLogLevel(LogLevel.INFO);

  // Enable persistence for logs and analytics
  enablePersistence(true);

  // Start performance monitoring
  startPerformanceMonitoring();

  // Initialize offline sync
  syncManager.forceSyncNow();

  logInfo('Production environment initialized', 'Setup');
}

/**
 * Quick setup function for development environment
 */
export function setupDevelopmentEnvironment() {
  // Enable debug logging
  setLogLevel(LogLevel.DEBUG);

  // Enable all monitoring
  startPerformanceMonitoring();

  logInfo('Development environment initialized', 'Setup');
}

/**
 * Quick setup function for testing environment
 */
export function setupTestEnvironment() {
  // Disable most logging in tests
  setLogLevel(LogLevel.ERROR);

  // Clear all caches
  modelCache.clear();
  syncManager.clearQueue();

  logInfo('Test environment initialized', 'Setup');
}
