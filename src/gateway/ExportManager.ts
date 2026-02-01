/**
 * Lisa Export Manager
 * Export conversations and data in multiple formats
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export type ExportFormat = 'json' | 'markdown' | 'html' | 'txt' | 'csv' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  includeSystemMessages?: boolean;
  dateRange?: { from: Date; to: Date };
  template?: string;
  filename?: string;
}

export interface ExportResult {
  id: string;
  format: ExportFormat;
  content: string;
  filename: string;
  size: number;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ExportTemplate {
  id: string;
  name: string;
  format: ExportFormat;
  template: string;
  variables: string[];
}

const DEFAULT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'markdown-default',
    name: 'Markdown Default',
    format: 'markdown',
    template: `# {{title}}

> Exported on {{exportDate}}

{{#messages}}
## {{role}}
{{content}}

---
{{/messages}}
`,
    variables: ['title', 'exportDate', 'messages']
  },
  {
    id: 'html-default',
    name: 'HTML Default',
    format: 'html',
    template: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: #fff; }
    .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
    .user { background: #2563eb; }
    .assistant { background: #333; }
    .system { background: #666; font-style: italic; }
    .timestamp { font-size: 12px; color: #888; }
    h1 { border-bottom: 1px solid #333; padding-bottom: 10px; }
    pre { background: #000; padding: 10px; border-radius: 4px; overflow-x: auto; }
    code { font-family: monospace; }
  </style>
</head>
<body>
  <h1>{{title}}</h1>
  <p class="timestamp">Exporté le {{exportDate}}</p>
  {{#messages}}
  <div class="message {{role}}">
    <strong>{{role}}</strong>
    <div>{{content}}</div>
    {{#timestamp}}<span class="timestamp">{{timestamp}}</span>{{/timestamp}}
  </div>
  {{/messages}}
</body>
</html>`,
    variables: ['title', 'exportDate', 'messages']
  }
];

export class ExportManager extends BrowserEventEmitter {
  private templates: Map<string, ExportTemplate> = new Map();
  private exports: ExportResult[] = [];
  private maxExports = 100;

  constructor() {
    super();
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    for (const template of DEFAULT_TEMPLATES) {
      this.templates.set(template.id, template);
    }
  }

  private generateId(): string {
    return `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private markdownToHtml(md: string): string {
    return md
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  // Export methods
  exportConversation(conversation: Conversation, options: ExportOptions): ExportResult {
    const { format, includeMetadata = true, includeTimestamps = true, includeSystemMessages = true } = options;
    
    let messages = [...conversation.messages];
    
    // Filter system messages
    if (!includeSystemMessages) {
      messages = messages.filter(m => m.role !== 'system');
    }

    // Filter by date range
    if (options.dateRange) {
      messages = messages.filter(m => {
        if (!m.timestamp) return true;
        return m.timestamp >= options.dateRange!.from && m.timestamp <= options.dateRange!.to;
      });
    }

    let content: string;
    let filename: string;

    switch (format) {
      case 'json':
        content = this.exportToJson(conversation, messages, includeMetadata);
        filename = `${conversation.title || 'conversation'}.json`;
        break;
      case 'markdown':
        content = this.exportToMarkdown(conversation, messages, includeTimestamps);
        filename = `${conversation.title || 'conversation'}.md`;
        break;
      case 'html':
        content = this.exportToHtml(conversation, messages, includeTimestamps);
        filename = `${conversation.title || 'conversation'}.html`;
        break;
      case 'txt':
        content = this.exportToText(conversation, messages, includeTimestamps);
        filename = `${conversation.title || 'conversation'}.txt`;
        break;
      case 'csv':
        content = this.exportToCsv(messages, includeTimestamps);
        filename = `${conversation.title || 'conversation'}.csv`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    if (options.filename) {
      filename = options.filename;
    }

    const result: ExportResult = {
      id: this.generateId(),
      format,
      content,
      filename,
      size: content.length,
      createdAt: new Date(),
      metadata: {
        conversationId: conversation.id,
        messageCount: messages.length,
        includeMetadata,
        includeTimestamps
      }
    };

    // Store export
    this.exports.unshift(result);
    if (this.exports.length > this.maxExports) {
      this.exports = this.exports.slice(0, this.maxExports);
    }

    this.emit('export:created', result);
    return result;
  }

  private exportToJson(conversation: Conversation, messages: Message[], includeMetadata: boolean): string {
    const data = {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        ...(includeMetadata && m.metadata ? { metadata: m.metadata } : {})
      })),
      ...(includeMetadata && conversation.metadata ? { metadata: conversation.metadata } : {})
    };
    return JSON.stringify(data, null, 2);
  }

  private exportToMarkdown(conversation: Conversation, messages: Message[], includeTimestamps: boolean): string {
    const lines: string[] = [
      `# ${conversation.title || 'Conversation'}`,
      '',
      `> Créé le ${this.formatDate(conversation.createdAt)}`,
      '',
      '---',
      ''
    ];

    for (const message of messages) {
      const roleEmoji = message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : '⚙️';
      const roleName = message.role === 'user' ? 'Vous' : message.role === 'assistant' ? 'Lisa' : 'Système';
      
      lines.push(`## ${roleEmoji} ${roleName}`);
      if (includeTimestamps && message.timestamp) {
        lines.push(`*${this.formatDate(message.timestamp)}*`);
      }
      lines.push('');
      lines.push(message.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  private exportToHtml(conversation: Conversation, messages: Message[], includeTimestamps: boolean): string {
    const template = this.templates.get('html-default');
    if (!template) {
      throw new Error('HTML template not found');
    }

    let html = template.template;
    html = html.replace(/\{\{title\}\}/g, this.escapeHtml(conversation.title || 'Conversation'));
    html = html.replace(/\{\{exportDate\}\}/g, this.formatDate(new Date()));

    const messagesHtml = messages.map(m => {
      const roleLabel = m.role === 'user' ? 'Vous' : m.role === 'assistant' ? 'Lisa' : 'Système';
      const contentHtml = this.markdownToHtml(this.escapeHtml(m.content));
      const timestampHtml = includeTimestamps && m.timestamp 
        ? `<span class="timestamp">${this.formatDate(m.timestamp)}</span>` 
        : '';
      
      return `<div class="message ${m.role}">
        <strong>${roleLabel}</strong>
        <div>${contentHtml}</div>
        ${timestampHtml}
      </div>`;
    }).join('\n');

    // Replace messages block
    html = html.replace(/\{\{#messages\}\}[\s\S]*?\{\{\/messages\}\}/g, messagesHtml);

    return html;
  }

  private exportToText(conversation: Conversation, messages: Message[], includeTimestamps: boolean): string {
    const lines: string[] = [
      `${conversation.title || 'Conversation'}`,
      `${'='.repeat(50)}`,
      `Créé le ${this.formatDate(conversation.createdAt)}`,
      '',
      ''
    ];

    for (const message of messages) {
      const roleName = message.role === 'user' ? 'VOUS' : message.role === 'assistant' ? 'LISA' : 'SYSTÈME';
      
      lines.push(`[${roleName}]`);
      if (includeTimestamps && message.timestamp) {
        lines.push(`(${this.formatDate(message.timestamp)})`);
      }
      lines.push(message.content);
      lines.push('');
      lines.push('-'.repeat(50));
      lines.push('');
    }

    return lines.join('\n');
  }

  private exportToCsv(messages: Message[], includeTimestamps: boolean): string {
    const headers = includeTimestamps 
      ? ['role', 'content', 'timestamp']
      : ['role', 'content'];
    
    const rows = messages.map(m => {
      const content = `"${m.content.replace(/"/g, '""')}"`;
      if (includeTimestamps) {
        return [m.role, content, m.timestamp?.toISOString() || ''].join(',');
      }
      return [m.role, content].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  // Bulk export
  exportMultiple(conversations: Conversation[], options: ExportOptions): ExportResult[] {
    return conversations.map(c => this.exportConversation(c, options));
  }

  // Template management
  addTemplate(template: ExportTemplate): void {
    this.templates.set(template.id, template);
    this.emit('template:added', template);
  }

  removeTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      this.emit('template:removed', { id });
    }
    return deleted;
  }

  getTemplate(id: string): ExportTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values());
  }

  // Export history
  getExports(): ExportResult[] {
    return [...this.exports];
  }

  getExport(id: string): ExportResult | undefined {
    return this.exports.find(e => e.id === id);
  }

  clearHistory(): void {
    this.exports = [];
    this.emit('history:cleared');
  }

  // Download helper (for browser)
  download(result: ExportResult): void {
    if (typeof window === 'undefined') return;

    const mimeTypes: Record<ExportFormat, string> = {
      json: 'application/json',
      markdown: 'text/markdown',
      html: 'text/html',
      txt: 'text/plain',
      csv: 'text/csv',
      pdf: 'application/pdf'
    };

    const blob = new Blob([result.content], { type: mimeTypes[result.format] });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.emit('export:downloaded', result);
  }

  // Quick export methods
  toJson(conversation: Conversation): string {
    return this.exportConversation(conversation, { format: 'json' }).content;
  }

  toMarkdown(conversation: Conversation): string {
    return this.exportConversation(conversation, { format: 'markdown' }).content;
  }

  toHtml(conversation: Conversation): string {
    return this.exportConversation(conversation, { format: 'html' }).content;
  }

  toText(conversation: Conversation): string {
    return this.exportConversation(conversation, { format: 'txt' }).content;
  }

  toCsv(conversation: Conversation): string {
    return this.exportConversation(conversation, { format: 'csv' }).content;
  }
}

// Singleton
let exportManagerInstance: ExportManager | null = null;

export function getExportManager(): ExportManager {
  if (!exportManagerInstance) {
    exportManagerInstance = new ExportManager();
  }
  return exportManagerInstance;
}

export function resetExportManager(): void {
  if (exportManagerInstance) {
    exportManagerInstance.removeAllListeners();
    exportManagerInstance = null;
  }
}

