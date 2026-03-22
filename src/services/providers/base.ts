/**
 * Provider Base Utilities
 * Shared SSE parser, token estimation, and cost calculation.
 * Adapted from PromptCommander's provider infrastructure.
 */

import type { NormalizedRequest, NormalizedResponse, StreamCallbacks, ProviderKey } from '../../types/promptcommander';

// ─── Provider Adapter Interface ───────────────────────────────────

export interface ProviderAdapter {
  key: ProviderKey;
  sendMessage(
    request: NormalizedRequest,
    apiKey: string,
    callbacks: StreamCallbacks,
    signal: AbortSignal,
    baseUrl?: string,
  ): Promise<void>;
}

// ─── Token Estimation ─────────────────────────────────────────────

// Regex to detect CJK characters, emoji, and other wide/complex scripts
const CJK_EMOJI_RE = /[\u3000-\u9fff\uf900-\ufaff\u{20000}-\u{2fa1f}\u{1f000}-\u{1faff}\u{2600}-\u{27bf}]/u;

// Lazy-loaded tiktoken encoder
let _encoder: { encode: (text: string) => number[] } | null = null;
let _encoderFailed = false;

async function getEncoder(): Promise<{ encode: (text: string) => number[] }> {
  if (_encoderFailed) throw new Error('Encoder init previously failed');
  if (!_encoder) {
    try {
      const { getEncoding } = await import(/* @vite-ignore */ 'js-tiktoken');
      _encoder = getEncoding('cl100k_base');
    } catch (e) {
      _encoderFailed = true;
      throw e;
    }
  }
  return _encoder;
}

/**
 * Estimate token count for a text string.
 * Uses tiktoken for accuracy, falls back to character-ratio heuristic.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Sync fallback — tiktoken may not be loaded yet
  const ratio = CJK_EMOJI_RE.test(text) ? 1.5 : 3.5;
  return Math.ceil(text.length / ratio);
}

/**
 * Async token estimation with tiktoken (more accurate)
 */
export async function estimateTokensAsync(text: string): Promise<number> {
  if (!text) return 0;
  try {
    const enc = await getEncoder();
    return enc.encode(text).length;
  } catch {
    return estimateTokens(text);
  }
}

// ─── Cost Calculation ─────────────────────────────────────────────

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  priceInputPer1M: number,
  priceOutputPer1M: number,
): number {
  return (inputTokens * priceInputPer1M + outputTokens * priceOutputPer1M) / 1_000_000;
}

// ─── SSE Stream Parser ────────────────────────────────────────────

/**
 * Parse a Server-Sent Events stream, calling processLine for each data line.
 * Handles buffering, comment lines, and normalization.
 */
export async function processSSEStream(
  response: Response,
  processLine: (line: string) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error('Le corps de la réponse est vide');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        // SSE spec: lines starting with ':' are comments
        if (trimmedLine.startsWith(':')) continue;
        // Normalize 'data:' without space to 'data: '
        const normalized = trimmedLine.startsWith('data:') && !trimmedLine.startsWith('data: ')
          ? 'data: ' + trimmedLine.slice(5)
          : trimmedLine;
        processLine(normalized);
      }
    }
    // Process remaining buffer
    if (buffer.trim()) {
      processLine(buffer.trim());
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new Error(`Erreur lors de la lecture du flux : ${(err as Error).message}`);
  } finally {
    reader.releaseLock();
  }
}

// ─── Provider Router ──────────────────────────────────────────────

const adapters = new Map<ProviderKey, ProviderAdapter>();

export function registerAdapter(adapter: ProviderAdapter): void {
  adapters.set(adapter.key, adapter);
}

export function getAdapter(provider: ProviderKey): ProviderAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`Fournisseur inconnu : ${provider}`);
  }
  return adapter;
}

/**
 * Send a message to a provider with automatic timeout management.
 * Resets 120s timeout on each chunk to handle slow streaming.
 */
export async function sendToProvider(
  provider: ProviderKey,
  request: NormalizedRequest,
  apiKey: string,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
  baseUrl?: string,
): Promise<void> {
  const adapter = getAdapter(provider);

  const timeoutController = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const resetTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutController.abort(new Error('Timeout : Aucune réponse du fournisseur depuis 120s'));
    }, 120_000);
  };

  resetTimeout();

  const onAbort = () => timeoutController.abort(signal.reason);
  signal.addEventListener('abort', onAbort);

  const wrappedCallbacks: StreamCallbacks = {
    onChunk: (text) => {
      resetTimeout();
      callbacks.onChunk(text);
    },
    onDone: (res) => {
      resetTimeout();
      callbacks.onDone(res);
    },
    onToolCall: callbacks.onToolCall,
  };

  try {
    await adapter.sendMessage(request, apiKey, wrappedCallbacks, timeoutController.signal, baseUrl);
  } finally {
    clearTimeout(timeoutId);
    signal.removeEventListener('abort', onAbort);
  }
}
