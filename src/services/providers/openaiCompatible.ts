/**
 * OpenAI-Compatible Provider Adapter
 * Handles OpenAI, Perplexity, Mistral, and any OpenAI-compatible endpoint.
 * Adapted from PromptCommander.
 */

import type { ProviderAdapter } from './base';
import type { ProviderKey } from '../../types/promptcommander';
import { processSSEStream, estimateTokens } from './base';

/**
 * Core OpenAI adapter — also used as base for Perplexity, Mistral, etc.
 */
export const openaiAdapter: ProviderAdapter = {
  key: 'openai',
  async sendMessage(request, apiKey, callbacks, signal, baseUrl) {
    const endpoint = (baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
    const isPerplexity = endpoint.includes('perplexity.ai');

    const messages: Array<Record<string, unknown>> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      if (typeof msg.content === 'string') {
        messages.push({ role: msg.role, content: msg.content });
      } else {
        const contentParts = msg.content as Array<Record<string, unknown>>;
        const toolUse = contentParts.find(p => p.type === 'tool_use');
        const toolResult = contentParts.find(p => p.type === 'tool_result');

        if (toolUse) {
          messages.push({
            role: 'assistant',
            tool_calls: [{
              id: toolUse.toolCallId,
              type: 'function',
              function: {
                name: toolUse.toolName,
                arguments: JSON.stringify(toolUse.args),
              },
            }],
          });
        } else if (toolResult) {
          messages.push({
            role: 'tool',
            tool_call_id: toolResult.toolCallId,
            content: JSON.stringify(toolResult.text ?? toolResult.args ?? ''),
          });
        } else {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    const tools = request.tools?.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: request.stream,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream_options: request.stream ? { include_usage: true } : undefined,
      ...(tools && tools.length > 0 ? { tools } : {}),
      ...(request.webSearchEnabled && isPerplexity ? { return_citations: true, search_recency_filter: 'month' } : {}),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as Record<string, Record<string, string>>).error?.message || `Erreur ${response.status}: ${response.statusText}`);
    }

    // Non-streaming response
    if (!request.stream) {
      const data = await response.json();
      if (!data.choices?.length) throw new Error('Réponse vide du fournisseur');
      const message = data.choices[0]?.message;

      const toolCalls = message?.tool_calls?.map((tc: { id: string; function: { name: string; arguments: string } }) => {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
        return { id: tc.id, name: tc.function.name, args };
      });

      callbacks.onDone({
        content: message?.content || '',
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        finishReason: data.choices[0]?.finish_reason || 'stop',
        toolCalls,
      });
      return;
    }

    // Streaming response
    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = 'stop';
    let currentToolCall: { id: string; name: string; argsString: string } | null = null;

    await processSSEStream(response, (line) => {
      if (!line.startsWith('data: ')) return;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];

        const delta = choice?.delta?.content;
        if (delta) {
          fullText += delta;
          callbacks.onChunk(delta);
        }

        // Handle streaming tool calls
        const toolCallDelta = choice?.delta?.tool_calls?.[0];
        if (toolCallDelta) {
          if (!currentToolCall) {
            currentToolCall = {
              id: toolCallDelta.id,
              name: toolCallDelta.function?.name || '',
              argsString: toolCallDelta.function?.arguments || '',
            };
          } else if (toolCallDelta.function?.arguments) {
            if (currentToolCall.argsString.length < 1_000_000) {
              currentToolCall.argsString += toolCallDelta.function.arguments;
            }
          }
        }

        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
        if (parsed.usage) {
          inputTokens = parsed.usage.prompt_tokens || 0;
          outputTokens = parsed.usage.completion_tokens || 0;
        }
      } catch {
        // Ignore parse errors on individual lines
      }
    });

    // Finalize tool calls
    const finalToolCall = currentToolCall as { id: string; name: string; argsString: string } | null;
    let toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> | undefined;
    if (finalToolCall) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(finalToolCall.argsString); } catch { /* ignore */ }
      toolCalls = [{ id: finalToolCall.id, name: finalToolCall.name, args }];
    }

    // Fallback token estimation
    if (!inputTokens) inputTokens = estimateTokens(request.messages.map(m => typeof m.content === 'string' ? m.content : '').join(' '));
    if (!outputTokens) outputTokens = estimateTokens(fullText);

    callbacks.onDone({ content: fullText, inputTokens, outputTokens, finishReason, toolCalls });
  },
};

/**
 * Factory for OpenAI-compatible providers (Perplexity, Mistral, custom endpoints)
 */
export function createOpenAICompatibleAdapter(
  key: ProviderKey,
  defaultBaseUrl: string,
): ProviderAdapter {
  return {
    key,
    async sendMessage(request, apiKey, callbacks, signal, baseUrl) {
      const resolvedUrl = baseUrl || defaultBaseUrl;
      if (!resolvedUrl) {
        throw new Error('URL endpoint non configurée. Allez dans Paramètres pour définir l\'URL du fournisseur.');
      }
      return openaiAdapter.sendMessage(request, apiKey, callbacks, signal, resolvedUrl);
    },
  };
}

// Pre-built adapters for common providers
export const perplexityAdapter = createOpenAICompatibleAdapter('perplexity', 'https://api.perplexity.ai');
export const mistralAdapter = createOpenAICompatibleAdapter('mistral', 'https://api.mistral.ai/v1');
export const openaiCompatibleAdapter = createOpenAICompatibleAdapter('openai-compatible', '');
