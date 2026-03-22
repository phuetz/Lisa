/**
 * Enhanced Export Utilities
 * Export conversations as Markdown, JSON, HTML, or PDF.
 * Adapted from PromptCommander's export system.
 */

import type { Conversation, Message } from '../types/chat';
import { formatCost, formatTokens } from './cost';

// ─── Markdown Export ──────────────────────────────────────────────

export function exportConversationAsMarkdown(conversation: Conversation): string {
  const lines: string[] = [];
  lines.push(`# ${conversation.title}`);
  lines.push('');
  lines.push(`> Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`);
  lines.push('');

  const validMessages = conversation.messages.filter(m => m.status !== 'error' && m.status !== 'cancelled');

  for (const msg of validMessages) {
    const roleLabel = msg.role === 'user' ? '👤 Utilisateur' : msg.role === 'assistant' ? '🤖 Lisa' : '⚙️ Système';
    lines.push(`## ${roleLabel}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');

    if (msg.cost != null && msg.cost > 0) {
      lines.push(`*${formatTokens(msg.inputTokens || 0)} in / ${formatTokens(msg.outputTokens || 0)} out — ${formatCost(msg.cost)}*`);
      lines.push('');
    }
  }

  // Footer with totals
  if (conversation.totalCost && conversation.totalCost > 0) {
    lines.push('---');
    lines.push(`**Total** : ${formatTokens(conversation.totalInputTokens || 0)} in / ${formatTokens(conversation.totalOutputTokens || 0)} out — ${formatCost(conversation.totalCost)}`);
  }

  return lines.join('\n');
}

// ─── JSON Export ──────────────────────────────────────────────────

export function exportConversationAsJSON(conversation: Conversation): string {
  const validMessages = conversation.messages.filter(m => m.status !== 'error' && m.status !== 'cancelled');
  return JSON.stringify({
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    tags: conversation.tags,
    messages: validMessages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      provider: m.provider,
      modelId: m.modelId,
      inputTokens: m.inputTokens,
      outputTokens: m.outputTokens,
      cost: m.cost,
    })),
    totalCost: conversation.totalCost,
  }, null, 2);
}

// ─── HTML Export ──────────────────────────────────────────────────

export function exportConversationAsHTML(conversation: Conversation): string {
  const validMessages = conversation.messages.filter(m => m.status !== 'error' && m.status !== 'cancelled');

  const messageHTML = validMessages.map(msg => {
    const isUser = msg.role === 'user';
    const bg = isUser ? '#e8f5e9' : '#f3f4f6';
    const label = isUser ? 'Utilisateur' : 'Lisa';
    const escaped = escapeHTML(msg.content).replace(/\n/g, '<br>');
    return `<div style="background:${bg};padding:12px 16px;border-radius:8px;margin:8px 0">
      <strong>${label}</strong><br>${escaped}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${escapeHTML(conversation.title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#fff;color:#333}h1{color:#1a1a2e}strong{color:#555}</style>
</head>
<body>
<h1>${escapeHTML(conversation.title)}</h1>
<p><em>Exporté le ${new Date().toLocaleDateString('fr-FR')}</em></p>
${messageHTML}
</body></html>`;
}

// ─── Download Helper ──────────────────────────────────────────────

export function downloadString(filename: string, content: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Convenience Functions ────────────────────────────────────────

export function downloadMarkdown(conversation: Conversation): void {
  const md = exportConversationAsMarkdown(conversation);
  const filename = sanitizeFilename(conversation.title) + '.md';
  downloadString(filename, md, 'text/markdown');
}

export function downloadJSON(conversation: Conversation): void {
  const json = exportConversationAsJSON(conversation);
  const filename = sanitizeFilename(conversation.title) + '.json';
  downloadString(filename, json, 'application/json');
}

export function downloadHTML(conversation: Conversation): void {
  const html = exportConversationAsHTML(conversation);
  const filename = sanitizeFilename(conversation.title) + '.html';
  downloadString(filename, html, 'text/html');
}

// ─── Helpers ──────────────────────────────────────────────────────

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9àâäéèêëïîôùûüÿçœæ\s-]/gi, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'conversation';
}

// ─── Import: ChatGPT Format ──────────────────────────────────────

interface ChatGPTExport {
  title?: string;
  mapping?: Record<string, {
    message?: {
      content?: { parts?: string[] };
      author?: { role?: string };
      create_time?: number;
    };
  }>;
}

/**
 * Convert a ChatGPT export JSON into Lisa's Conversation format.
 */
export function importFromChatGPT(json: ChatGPTExport): { title: string; messages: Omit<Message, 'id' | 'conversationId'>[] } | null {
  if (!json?.mapping) return null;

  const title = json.title || 'Import ChatGPT';
  const messages: Omit<Message, 'id' | 'conversationId'>[] = [];

  const entries = Object.values(json.mapping)
    .filter(e => e.message?.content?.parts?.length && e.message.author?.role)
    .sort((a, b) => (a.message?.create_time || 0) - (b.message?.create_time || 0));

  for (const entry of entries) {
    const msg = entry.message!;
    const role = msg.author?.role === 'assistant' ? 'assistant' as const : 'user' as const;
    if (role !== 'user' && role !== 'assistant') continue;

    const content = msg.content?.parts?.join('\n') || '';
    if (!content.trim()) continue;

    messages.push({
      role,
      content,
      timestamp: new Date((msg.create_time || Date.now() / 1000) * 1000),
    });
  }

  return messages.length > 0 ? { title, messages } : null;
}
