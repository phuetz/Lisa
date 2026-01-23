/**
 * Markdown Export Service
 * Export conversations and notebooks to Markdown format
 * 
 * @module MarkdownExportService
 * @example
 * ```typescript
 * import { markdownExportService } from './MarkdownExportService';
 * 
 * // Export conversation
 * const md = markdownExportService.exportConversation(messages);
 * 
 * // Export notebook
 * const md = markdownExportService.exportNotebook(cells);
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
  metadata?: {
    model?: string;
    duration?: number;
    tokens?: number;
  };
}

export interface NotebookCell {
  id: string;
  cell_type: 'code' | 'markdown';
  source: string | string[];
  outputs?: CellOutput[];
  execution_count?: number;
}

export interface CellOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error';
  name?: 'stdout' | 'stderr';
  text?: string;
  data?: Record<string, string>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export interface MarkdownExportOptions {
  /** Document title */
  title?: string;
  /** Include timestamps */
  includeTimestamps?: boolean;
  /** Include metadata */
  includeMetadata?: boolean;
  /** Include table of contents */
  includeTOC?: boolean;
  /** Code language for syntax highlighting */
  codeLanguage?: string;
  /** Include frontmatter (YAML) */
  includeFrontmatter?: boolean;
  /** Author name */
  author?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<MarkdownExportOptions> = {
  title: 'Lisa AI Export',
  includeTimestamps: true,
  includeMetadata: true,
  includeTOC: false,
  codeLanguage: 'python',
  includeFrontmatter: true,
  author: 'Lisa AI',
};

// ============================================================================
// Markdown Export Service
// ============================================================================

class MarkdownExportService {
  /**
   * Export a conversation to Markdown
   */
  exportConversation(
    messages: ChatMessage[],
    options: MarkdownExportOptions = {}
  ): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lines: string[] = [];

    // Frontmatter
    if (opts.includeFrontmatter) {
      lines.push('---');
      lines.push(`title: "${opts.title}"`);
      lines.push(`author: "${opts.author}"`);
      lines.push(`date: "${new Date().toISOString()}"`);
      lines.push(`type: conversation`);
      lines.push(`messages: ${messages.length}`);
      lines.push('---');
      lines.push('');
    }

    // Title
    lines.push(`# ${opts.title}`);
    lines.push('');

    // TOC
    if (opts.includeTOC && messages.length > 0) {
      lines.push('## Table des matières');
      lines.push('');
      messages.forEach((msg, i) => {
        const role = msg.role === 'user' ? '👤 Utilisateur' : '🤖 Lisa';
        lines.push(`- [Message ${i + 1} - ${role}](#message-${i + 1})`);
      });
      lines.push('');
    }

    // Messages
    lines.push('## Conversation');
    lines.push('');

    messages.forEach((msg, i) => {
      const role = msg.role === 'user' ? '👤 **Utilisateur**' : '🤖 **Lisa**';
      
      lines.push(`### Message ${i + 1}`);
      lines.push('');
      lines.push(role);
      
      if (opts.includeTimestamps && msg.timestamp) {
        const date = new Date(msg.timestamp);
        lines.push(`*${date.toLocaleString('fr-FR')}*`);
      }
      lines.push('');

      // Content with code block detection
      lines.push(this.formatContent(msg.content));
      lines.push('');

      // Metadata
      if (opts.includeMetadata && msg.metadata) {
        const meta: string[] = [];
        if (msg.metadata.model) meta.push(`Modèle: ${msg.metadata.model}`);
        if (msg.metadata.duration) meta.push(`Durée: ${msg.metadata.duration}ms`);
        if (msg.metadata.tokens) meta.push(`Tokens: ${msg.metadata.tokens}`);
        if (meta.length > 0) {
          lines.push(`> ${meta.join(' | ')}`);
          lines.push('');
        }
      }

      lines.push('---');
      lines.push('');
    });

    // Footer
    lines.push('');
    lines.push(`*Exporté depuis Lisa AI le ${new Date().toLocaleString('fr-FR')}*`);

    return lines.join('\n');
  }

  /**
   * Export a notebook to Markdown
   */
  exportNotebook(
    cells: NotebookCell[],
    options: MarkdownExportOptions = {}
  ): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lines: string[] = [];

    // Frontmatter
    if (opts.includeFrontmatter) {
      lines.push('---');
      lines.push(`title: "${opts.title}"`);
      lines.push(`author: "${opts.author}"`);
      lines.push(`date: "${new Date().toISOString()}"`);
      lines.push(`type: notebook`);
      lines.push(`cells: ${cells.length}`);
      lines.push(`jupyter:`);
      lines.push(`  kernelspec:`);
      lines.push(`    display_name: Python 3`);
      lines.push(`    language: python`);
      lines.push(`    name: python3`);
      lines.push('---');
      lines.push('');
    }

    // Title
    lines.push(`# ${opts.title}`);
    lines.push('');

    // TOC
    if (opts.includeTOC && cells.length > 0) {
      lines.push('## Table des matières');
      lines.push('');
      cells.forEach((cell, i) => {
        const type = cell.cell_type === 'code' ? '💻 Code' : '📝 Markdown';
        lines.push(`- [Cellule ${i + 1} - ${type}](#cellule-${i + 1})`);
      });
      lines.push('');
    }

    // Cells
    cells.forEach((cell, i) => {
      const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      
      if (cell.cell_type === 'code') {
        // Code cell
        const execCount = cell.execution_count ? `[${cell.execution_count}]` : `[${i + 1}]`;
        lines.push(`### Cellule ${i + 1} ${execCount}`);
        lines.push('');
        lines.push(`\`\`\`${opts.codeLanguage}`);
        lines.push(source);
        lines.push('```');
        lines.push('');

        // Outputs
        if (cell.outputs && cell.outputs.length > 0) {
          lines.push('**Sortie:**');
          lines.push('');
          
          for (const output of cell.outputs) {
            lines.push(this.formatOutput(output));
          }
          lines.push('');
        }
      } else {
        // Markdown cell - render as-is
        lines.push(`### Cellule ${i + 1}`);
        lines.push('');
        lines.push(source);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });

    // Footer
    lines.push('');
    lines.push(`*Notebook exporté depuis Lisa AI le ${new Date().toLocaleString('fr-FR')}*`);

    return lines.join('\n');
  }

  /**
   * Download markdown as file
   */
  download(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy markdown to clipboard
   */
  async copyToClipboard(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private formatContent(content: string): string {
    // Detect and format code blocks that might not be properly formatted
    return content;
  }

  private formatOutput(output: CellOutput): string {
    if (output.output_type === 'stream') {
      const text = output.text || '';
      const prefix = output.name === 'stderr' ? '⚠️ ' : '';
      return `\`\`\`\n${prefix}${text}\n\`\`\``;
    }
    
    if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      const text = output.data?.['text/plain'] || '';
      if (output.data?.['image/png']) {
        return `![Output](data:image/png;base64,${output.data['image/png']})`;
      }
      return `\`\`\`\n${text}\n\`\`\``;
    }
    
    if (output.output_type === 'error') {
      return `\`\`\`\n❌ ${output.ename}: ${output.evalue}\n\`\`\``;
    }
    
    return '';
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const markdownExportService = new MarkdownExportService();

export default markdownExportService;
