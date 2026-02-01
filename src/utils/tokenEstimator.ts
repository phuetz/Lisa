/**
 * Token Estimator Utility - Enhanced Version
 *
 * Estimates token counts for different LLM models.
 * Uses heuristic-based estimation for browser compatibility.
 *
 * Note: For accurate token counting in Node.js, use tiktoken.
 * This implementation provides good estimates without native dependencies.
 */

export interface TokenEstimate {
  tokens: number;
  model: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  model: string;
}

export interface TokenizerConfig {
  // Average characters per token for different model families
  charsPerToken: number;
  // Overhead for special tokens (BOS, EOS, etc.)
  overheadTokens: number;
}

// Tokenizer configurations for different model families
const TOKENIZER_CONFIGS: Record<string, TokenizerConfig> = {
  // OpenAI GPT models (cl100k_base tokenizer)
  'gpt-4': { charsPerToken: 4, overheadTokens: 3 },
  'gpt-4o': { charsPerToken: 4, overheadTokens: 3 },
  'gpt-4o-mini': { charsPerToken: 4, overheadTokens: 3 },
  'gpt-3.5-turbo': { charsPerToken: 4, overheadTokens: 3 },

  // Anthropic Claude models
  'claude': { charsPerToken: 3.5, overheadTokens: 4 },
  'claude-3': { charsPerToken: 3.5, overheadTokens: 4 },
  'claude-3.5': { charsPerToken: 3.5, overheadTokens: 4 },

  // Google Gemini models
  'gemini': { charsPerToken: 4, overheadTokens: 2 },
  'gemini-1.5': { charsPerToken: 4, overheadTokens: 2 },
  'gemini-2': { charsPerToken: 4, overheadTokens: 2 },

  // xAI Grok models
  'grok': { charsPerToken: 4, overheadTokens: 3 },
  'grok-2': { charsPerToken: 4, overheadTokens: 3 },

  // Local models (Llama, Mistral, etc.)
  'llama': { charsPerToken: 3.5, overheadTokens: 2 },
  'mistral': { charsPerToken: 3.5, overheadTokens: 2 },
  'qwen': { charsPerToken: 3, overheadTokens: 2 },

  // Default fallback
  'default': { charsPerToken: 4, overheadTokens: 3 },
};

/**
 * Get tokenizer config for a model
 */
function getTokenizerConfig(model: string): TokenizerConfig {
  const normalizedModel = model.toLowerCase();

  // Find matching config
  for (const [key, config] of Object.entries(TOKENIZER_CONFIGS)) {
    if (normalizedModel.includes(key)) {
      return config;
    }
  }

  return TOKENIZER_CONFIGS.default;
}

/**
 * Estimate tokens for a single text string
 */
export function estimateTokens(text: string, model: string = 'default'): TokenEstimate {
  if (!text) {
    return { tokens: 0, model, confidence: 'high' };
  }

  const config = getTokenizerConfig(model);

  // Basic estimation: characters / chars per token
  let tokens = Math.ceil(text.length / config.charsPerToken);

  // Adjust for whitespace (whitespace often gets its own token)
  const whitespaceCount = (text.match(/\s+/g) || []).length;
  tokens += Math.floor(whitespaceCount * 0.3);

  // Adjust for special characters and punctuation
  const specialChars = (text.match(/[^\w\s]/g) || []).length;
  tokens += Math.floor(specialChars * 0.5);

  // Adjust for numbers (often tokenized as individual digits)
  const numbers = (text.match(/\d+/g) || []);
  const digitCount = numbers.reduce((sum, num) => sum + num.length, 0);
  tokens += Math.floor(digitCount * 0.3);

  // Add overhead
  tokens += config.overheadTokens;

  // Determine confidence based on text characteristics
  let confidence: 'high' | 'medium' | 'low' = 'high';

  // Lower confidence for non-ASCII text (different tokenization)
  if (/[\u0080-\uFFFF]/.test(text)) {
    confidence = 'medium';
    // Non-ASCII characters often take more tokens
    const nonAsciiCount = (text.match(/[\u0080-\uFFFF]/g) || []).length;
    tokens += Math.floor(nonAsciiCount * 0.5);
  }

  // Lower confidence for code
  if (/[{}()[\];=<>]/.test(text) && text.length > 100) {
    confidence = 'medium';
  }

  // Lower confidence for very long texts
  if (text.length > 10000) {
    confidence = 'low';
  }

  return {
    tokens: Math.max(1, Math.round(tokens)),
    model,
    confidence,
  };
}

/**
 * Estimate tokens for a chat message array
 */
export function estimateChatTokens(
  messages: Array<{ role: string; content: string }>,
  model: string = 'default'
): TokenEstimate {
  let totalTokens = 0;
  let lowestConfidence: 'high' | 'medium' | 'low' = 'high';

  for (const message of messages) {
    // Add tokens for role
    totalTokens += 4; // Approximate overhead for role markers

    // Add tokens for content
    const estimate = estimateTokens(message.content, model);
    totalTokens += estimate.tokens;

    // Track lowest confidence
    if (estimate.confidence === 'low') {
      lowestConfidence = 'low';
    } else if (estimate.confidence === 'medium' && lowestConfidence === 'high') {
      lowestConfidence = 'medium';
    }
  }

  // Add message separator overhead
  totalTokens += messages.length * 3;

  return {
    tokens: totalTokens,
    model,
    confidence: lowestConfidence,
  };
}

/**
 * Estimate cost based on token count
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): { inputCost: number; outputCost: number; totalCost: number; currency: string } {
  // Pricing per 1M tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4': { input: 30, output: 60 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'claude-3.5-sonnet': { input: 3, output: 15 },
    'claude-3-opus': { input: 15, output: 75 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    'gemini-1.5-pro': { input: 1.25, output: 5 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
    'grok-2': { input: 2, output: 10 },
  };

  const normalizedModel = model.toLowerCase();
  let modelPricing = { input: 1, output: 3 }; // Default pricing

  for (const [key, price] of Object.entries(pricing)) {
    if (normalizedModel.includes(key)) {
      modelPricing = price;
      break;
    }
  }

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: 'USD',
  };
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString();
  } else if (tokens < 1_000_000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  } else {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
}

/**
 * Check if text is within token limit
 */
export function isWithinLimit(
  text: string,
  limit: number,
  model: string = 'default'
): { withinLimit: boolean; tokens: number; remaining: number; percentage: number } {
  const estimate = estimateTokens(text, model);
  const remaining = limit - estimate.tokens;
  const percentage = (estimate.tokens / limit) * 100;

  return {
    withinLimit: estimate.tokens <= limit,
    tokens: estimate.tokens,
    remaining: Math.max(0, remaining),
    percentage: Math.min(100, percentage),
  };
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(
  text: string,
  limit: number,
  model: string = 'default',
  suffix: string = '...'
): string {
  const estimate = estimateTokens(text, model);

  if (estimate.tokens <= limit) {
    return text;
  }

  const config = getTokenizerConfig(model);
  const targetChars = Math.floor(limit * config.charsPerToken * 0.9); // 90% to be safe

  if (text.length <= targetChars) {
    return text;
  }

  return text.slice(0, targetChars - suffix.length) + suffix;
}

// ============================================================================
// Token Usage Tracking
// ============================================================================

interface TokenUsageEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: CostEstimate;
  timestamp: number;
}

class TokenUsageTracker {
  private history: TokenUsageEntry[] = [];
  private maxHistorySize = 1000;

  /**
   * Record token usage
   */
  record(model: string, inputTokens: number, outputTokens: number): TokenUsageEntry {
    const cost = estimateCost(inputTokens, outputTokens, model);

    const entry: TokenUsageEntry = {
      model,
      inputTokens,
      outputTokens,
      cost: { ...cost, model },
      timestamp: Date.now()
    };

    this.history.push(entry);

    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    return entry;
  }

  /**
   * Get total usage for a time period
   */
  getTotalUsage(sinceMs?: number): {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    byModel: Record<string, { input: number; output: number; cost: number }>;
  } {
    const since = sinceMs ? Date.now() - sinceMs : 0;
    const filtered = this.history.filter(e => e.timestamp >= since);

    const byModel: Record<string, { input: number; output: number; cost: number }> = {};
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    for (const entry of filtered) {
      totalInputTokens += entry.inputTokens;
      totalOutputTokens += entry.outputTokens;
      totalCost += entry.cost.totalCost;

      if (!byModel[entry.model]) {
        byModel[entry.model] = { input: 0, output: 0, cost: 0 };
      }
      byModel[entry.model].input += entry.inputTokens;
      byModel[entry.model].output += entry.outputTokens;
      byModel[entry.model].cost += entry.cost.totalCost;
    }

    return { totalInputTokens, totalOutputTokens, totalCost, byModel };
  }

  /**
   * Get usage for today
   */
  getTodayUsage() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.getTotalUsage(Date.now() - startOfDay.getTime());
  }

  /**
   * Get usage for this month
   */
  getMonthUsage() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return this.getTotalUsage(Date.now() - startOfMonth.getTime());
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Get raw history
   */
  getHistory(): TokenUsageEntry[] {
    return [...this.history];
  }
}

// Singleton tracker
export const tokenUsageTracker = new TokenUsageTracker();

// ============================================================================
// Budget Alerts
// ============================================================================

interface BudgetConfig {
  dailyLimit?: number;
  monthlyLimit?: number;
  alertThreshold?: number; // 0-1, e.g., 0.8 for 80%
  onAlert?: (type: 'daily' | 'monthly', usage: number, limit: number) => void;
}

let budgetConfig: BudgetConfig = {
  alertThreshold: 0.8
};

/**
 * Configure budget alerts
 */
export function configureBudget(config: BudgetConfig): void {
  budgetConfig = { ...budgetConfig, ...config };
}

/**
 * Check budget status
 */
export function checkBudget(): {
  daily: { usage: number; limit?: number; percentage?: number; exceeded: boolean };
  monthly: { usage: number; limit?: number; percentage?: number; exceeded: boolean };
} {
  const today = tokenUsageTracker.getTodayUsage();
  const month = tokenUsageTracker.getMonthUsage();

  const dailyResult = {
    usage: today.totalCost,
    limit: budgetConfig.dailyLimit,
    percentage: budgetConfig.dailyLimit ? (today.totalCost / budgetConfig.dailyLimit) * 100 : undefined,
    exceeded: budgetConfig.dailyLimit ? today.totalCost > budgetConfig.dailyLimit : false
  };

  const monthlyResult = {
    usage: month.totalCost,
    limit: budgetConfig.monthlyLimit,
    percentage: budgetConfig.monthlyLimit ? (month.totalCost / budgetConfig.monthlyLimit) * 100 : undefined,
    exceeded: budgetConfig.monthlyLimit ? month.totalCost > budgetConfig.monthlyLimit : false
  };

  // Trigger alerts
  if (budgetConfig.onAlert) {
    const threshold = budgetConfig.alertThreshold || 0.8;

    if (dailyResult.percentage && dailyResult.percentage >= threshold * 100) {
      budgetConfig.onAlert('daily', today.totalCost, budgetConfig.dailyLimit!);
    }

    if (monthlyResult.percentage && monthlyResult.percentage >= threshold * 100) {
      budgetConfig.onAlert('monthly', month.totalCost, budgetConfig.monthlyLimit!);
    }
  }

  return { daily: dailyResult, monthly: monthlyResult };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  estimateTokens,
  estimateChatTokens,
  estimateCost,
  formatTokenCount,
  isWithinLimit,
  truncateToTokenLimit,
  tokenUsageTracker,
  configureBudget,
  checkBudget
};
