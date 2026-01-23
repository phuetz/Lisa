/**
 * Share Service
 * Share conversations via links, clipboard, or social media
 * 
 * @module ShareService
 * @example
 * ```typescript
 * import { shareService } from './ShareService';
 * 
 * // Copy conversation to clipboard
 * await shareService.copyToClipboard(messages);
 * 
 * // Share via Web Share API
 * await shareService.shareNative(messages, { title: 'Ma conversation' });
 * 
 * // Generate shareable link
 * const link = shareService.generateShareLink(conversationId);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date | string;
}

export interface ShareOptions {
  /** Share title */
  title?: string;
  /** Share description */
  description?: string;
  /** Format: 'text' | 'markdown' | 'json' */
  format?: 'text' | 'markdown' | 'json';
  /** Include timestamps */
  includeTimestamps?: boolean;
  /** Base URL for share links */
  baseUrl?: string;
}

export interface ShareResult {
  success: boolean;
  method: 'clipboard' | 'native' | 'link' | 'download';
  message?: string;
  url?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<ShareOptions> = {
  title: 'Conversation Lisa AI',
  description: 'Conversation partagée depuis Lisa AI',
  format: 'text',
  includeTimestamps: false,
  baseUrl: typeof window !== 'undefined' ? window.location.origin : 'https://lisa.ai',
};

// ============================================================================
// Share Service
// ============================================================================

class ShareService {
  /**
   * Copy conversation to clipboard
   */
  async copyToClipboard(
    messages: ChatMessage[],
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const content = this.formatMessages(messages, opts);

    try {
      await navigator.clipboard.writeText(content);
      return {
        success: true,
        method: 'clipboard',
        message: 'Conversation copiée dans le presse-papiers',
      };
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);

      return {
        success,
        method: 'clipboard',
        message: success 
          ? 'Conversation copiée dans le presse-papiers' 
          : 'Échec de la copie',
      };
    }
  }

  /**
   * Share via native Web Share API (mobile/desktop)
   */
  async shareNative(
    messages: ChatMessage[],
    options: ShareOptions = {}
  ): Promise<ShareResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!navigator.share) {
      return {
        success: false,
        method: 'native',
        message: 'Le partage natif n\'est pas supporté sur ce navigateur',
      };
    }

    const content = this.formatMessages(messages, opts);

    try {
      await navigator.share({
        title: opts.title,
        text: content,
      });

      return {
        success: true,
        method: 'native',
        message: 'Conversation partagée',
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return {
          success: false,
          method: 'native',
          message: 'Partage annulé',
        };
      }
      return {
        success: false,
        method: 'native',
        message: 'Échec du partage',
      };
    }
  }

  /**
   * Generate a shareable link (stores in localStorage for demo)
   */
  generateShareLink(
    conversationId: string,
    messages: ChatMessage[],
    options: ShareOptions = {}
  ): ShareResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Generate unique share ID
    const shareId = this.generateShareId();
    
    // Store conversation data
    const shareData = {
      id: shareId,
      conversationId,
      title: opts.title,
      messages,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    // Store in localStorage (in production, this would be a backend API)
    try {
      const shares = JSON.parse(localStorage.getItem('lisa_shares') || '{}');
      shares[shareId] = shareData;
      localStorage.setItem('lisa_shares', JSON.stringify(shares));

      const url = `${opts.baseUrl}/share/${shareId}`;

      return {
        success: true,
        method: 'link',
        message: 'Lien de partage généré',
        url,
      };
    } catch {
      return {
        success: false,
        method: 'link',
        message: 'Échec de la génération du lien',
      };
    }
  }

  /**
   * Get shared conversation by ID
   */
  getSharedConversation(shareId: string): { messages: ChatMessage[]; title: string } | null {
    try {
      const shares = JSON.parse(localStorage.getItem('lisa_shares') || '{}');
      const share = shares[shareId];
      
      if (!share) return null;
      
      // Check expiration
      if (new Date(share.expiresAt) < new Date()) {
        delete shares[shareId];
        localStorage.setItem('lisa_shares', JSON.stringify(shares));
        return null;
      }

      return {
        messages: share.messages,
        title: share.title,
      };
    } catch {
      return null;
    }
  }

  /**
   * Download conversation as file
   */
  downloadAsFile(
    messages: ChatMessage[],
    filename: string,
    options: ShareOptions = {}
  ): ShareResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const content = this.formatMessages(messages, opts);
    
    const mimeTypes = {
      text: 'text/plain',
      markdown: 'text/markdown',
      json: 'application/json',
    };

    const extensions = {
      text: '.txt',
      markdown: '.md',
      json: '.json',
    };

    const blob = new Blob([content], { type: `${mimeTypes[opts.format]};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.includes('.') ? filename : `${filename}${extensions[opts.format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      method: 'download',
      message: 'Fichier téléchargé',
    };
  }

  /**
   * Check if native share is available
   */
  isNativeShareAvailable(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.share;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private formatMessages(messages: ChatMessage[], options: Required<ShareOptions>): string {
    switch (options.format) {
      case 'json':
        return JSON.stringify({
          title: options.title,
          exportedAt: new Date().toISOString(),
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            ...(options.includeTimestamps && m.timestamp ? { timestamp: m.timestamp } : {}),
          })),
        }, null, 2);

      case 'markdown':
        return this.formatAsMarkdown(messages, options);

      case 'text':
      default:
        return this.formatAsText(messages, options);
    }
  }

  private formatAsText(messages: ChatMessage[], options: Required<ShareOptions>): string {
    const lines: string[] = [];
    
    lines.push(`=== ${options.title} ===`);
    lines.push('');

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'Vous' : 'Lisa';
      
      if (options.includeTimestamps && msg.timestamp) {
        const date = new Date(msg.timestamp);
        lines.push(`[${date.toLocaleString('fr-FR')}]`);
      }
      
      lines.push(`${role}:`);
      lines.push(msg.content);
      lines.push('');
    }

    lines.push('---');
    lines.push(`Exporté depuis Lisa AI - ${new Date().toLocaleString('fr-FR')}`);

    return lines.join('\n');
  }

  private formatAsMarkdown(messages: ChatMessage[], options: Required<ShareOptions>): string {
    const lines: string[] = [];
    
    lines.push(`# ${options.title}`);
    lines.push('');

    for (const msg of messages) {
      const role = msg.role === 'user' ? '**👤 Vous**' : '**🤖 Lisa**';
      
      lines.push(role);
      
      if (options.includeTimestamps && msg.timestamp) {
        const date = new Date(msg.timestamp);
        lines.push(`*${date.toLocaleString('fr-FR')}*`);
      }
      
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    lines.push(`*Exporté depuis Lisa AI - ${new Date().toLocaleString('fr-FR')}*`);

    return lines.join('\n');
  }

  private generateShareId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 12; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const shareService = new ShareService();

export default shareService;
