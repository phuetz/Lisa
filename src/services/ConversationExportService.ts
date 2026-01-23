/**
 * ConversationExportService - Export conversations in various formats
 * Supports PDF, Markdown, JSON, and plain text
 */

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date | string;
}

interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface ExportOptions {
  format: 'pdf' | 'markdown' | 'json' | 'text';
  includeTimestamps?: boolean;
  includeSystemMessages?: boolean;
  filename?: string;
}

class ConversationExportService {
  /**
   * Export a conversation to the specified format
   */
  async export(conversation: Conversation, options: ExportOptions): Promise<Blob> {
    const { format } = options;

    switch (format) {
      case 'markdown':
        return this.exportToMarkdown(conversation, options);
      case 'json':
        return this.exportToJSON(conversation, options);
      case 'text':
        return this.exportToText(conversation, options);
      case 'pdf':
        return this.exportToPDF(conversation, options);
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  }

  /**
   * Export to Markdown format
   */
  private exportToMarkdown(conversation: Conversation, options: ExportOptions): Blob {
    const { includeTimestamps = true, includeSystemMessages = false } = options;
    
    let markdown = '';
    
    // Header
    markdown += `# ${conversation.title || 'Conversation Lisa'}\n\n`;
    
    if (conversation.createdAt) {
      const date = new Date(conversation.createdAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      markdown += `*${date}*\n\n`;
    }
    
    markdown += '---\n\n';
    
    // Messages
    for (const message of conversation.messages) {
      if (message.role === 'system' && !includeSystemMessages) continue;
      
      const role = message.role === 'user' ? '👤 **Vous**' : 
                   message.role === 'assistant' ? '🤖 **Lisa**' : 
                   '⚙️ *Système*';
      
      markdown += `${role}\n\n`;
      markdown += `${message.content}\n\n`;
      
      if (includeTimestamps && message.timestamp) {
        const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        markdown += `*${time}*\n\n`;
      }
      
      markdown += '---\n\n';
    }
    
    // Footer
    markdown += `\n*Exporté depuis Lisa - ${new Date().toLocaleDateString('fr-FR')}*\n`;
    
    return new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(conversation: Conversation, options: ExportOptions): Blob {
    const { includeSystemMessages = true } = options;
    
    const data = {
      ...conversation,
      messages: includeSystemMessages 
        ? conversation.messages 
        : conversation.messages.filter(m => m.role !== 'system'),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json;charset=utf-8' });
  }

  /**
   * Export to plain text format
   */
  private exportToText(conversation: Conversation, options: ExportOptions): Blob {
    const { includeTimestamps = false, includeSystemMessages = false } = options;
    
    let text = '';
    
    // Header
    text += `${conversation.title || 'Conversation Lisa'}\n`;
    text += '='.repeat(50) + '\n\n';
    
    if (conversation.createdAt) {
      text += `Date: ${new Date(conversation.createdAt).toLocaleDateString('fr-FR')}\n\n`;
    }
    
    // Messages
    for (const message of conversation.messages) {
      if (message.role === 'system' && !includeSystemMessages) continue;
      
      const role = message.role === 'user' ? 'Vous' : 
                   message.role === 'assistant' ? 'Lisa' : 
                   'Système';
      
      text += `[${role}]\n`;
      text += `${message.content}\n`;
      
      if (includeTimestamps && message.timestamp) {
        text += `(${new Date(message.timestamp).toLocaleTimeString('fr-FR')})\n`;
      }
      
      text += '\n' + '-'.repeat(30) + '\n\n';
    }
    
    return new Blob([text], { type: 'text/plain;charset=utf-8' });
  }

  /**
   * Export to PDF format (using browser print)
   */
  private async exportToPDF(conversation: Conversation, options: ExportOptions): Promise<Blob> {
    const { includeTimestamps = true, includeSystemMessages = false } = options;
    
    // Create HTML content for PDF
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${conversation.title || 'Conversation Lisa'}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            color: #10b981;
            border-bottom: 2px solid #10b981;
            padding-bottom: 10px;
          }
          .meta {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 8px;
          }
          .user {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
          }
          .assistant {
            background: #f0fdf4;
            border-left: 4px solid #10b981;
          }
          .system {
            background: #f5f5f5;
            border-left: 4px solid #9ca3af;
            font-style: italic;
          }
          .role {
            font-weight: bold;
            margin-bottom: 8px;
          }
          .user .role { color: #3b82f6; }
          .assistant .role { color: #10b981; }
          .system .role { color: #9ca3af; }
          .timestamp {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 8px;
          }
          .content {
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
          }
          @media print {
            body { padding: 20px; }
            .message { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>${conversation.title || 'Conversation Lisa'}</h1>
    `;
    
    if (conversation.createdAt) {
      const date = new Date(conversation.createdAt).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      html += `<p class="meta">${date}</p>`;
    }
    
    for (const message of conversation.messages) {
      if (message.role === 'system' && !includeSystemMessages) continue;
      
      const roleLabel = message.role === 'user' ? '👤 Vous' : 
                        message.role === 'assistant' ? '🤖 Lisa' : 
                        '⚙️ Système';
      
      html += `
        <div class="message ${message.role}">
          <div class="role">${roleLabel}</div>
          <div class="content">${this.escapeHtml(message.content)}</div>
          ${includeTimestamps && message.timestamp ? 
            `<div class="timestamp">${new Date(message.timestamp).toLocaleTimeString('fr-FR')}</div>` : 
            ''}
        </div>
      `;
    }
    
    html += `
        <div class="footer">
          Exporté depuis Lisa - ${new Date().toLocaleDateString('fr-FR')}
        </div>
      </body>
      </html>
    `;
    
    // For PDF, we return HTML that can be printed to PDF
    // In a real implementation, you might use a library like jsPDF or html2pdf
    return new Blob([html], { type: 'text/html;charset=utf-8' });
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }

  /**
   * Download the exported file
   */
  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get file extension for format
   */
  getExtension(format: ExportOptions['format']): string {
    const extensions: Record<ExportOptions['format'], string> = {
      pdf: 'html', // Will be printed to PDF
      markdown: 'md',
      json: 'json',
      text: 'txt',
    };
    return extensions[format];
  }

  /**
   * Generate filename with date
   */
  generateFilename(conversation: Conversation, format: ExportOptions['format']): string {
    const title = conversation.title || 'conversation';
    const date = new Date().toISOString().split('T')[0];
    const safeName = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `lisa_${safeName}_${date}.${this.getExtension(format)}`;
  }
}

export const conversationExportService = new ConversationExportService();
export default ConversationExportService;
