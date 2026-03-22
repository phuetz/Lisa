/**
 * Cost & Token Formatting Utilities
 * Adapted from PromptCommander
 */

/**
 * Format a cost value for display.
 * Shows dollars for values >= $0.01, cents otherwise.
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) {
    const cents = cost * 100;
    return `${cents.toFixed(2)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Format token count for display.
 * Uses k/M suffixes for large numbers.
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

/**
 * Format duration in milliseconds.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
