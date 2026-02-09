/**
 * PDF Export Service
 * Export conversations and notebooks to PDF format
 * 
 * @module PDFExportService
 * @example
 * ```typescript
 * import { pdfExportService } from './PDFExportService';
 * 
 * // Export conversation
 * await pdfExportService.exportConversation(messages, 'conversation.pdf');
 * 
 * // Export notebook
 * await pdfExportService.exportNotebook(cells, 'notebook.pdf');
 * ```
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

export interface PDFExportOptions {
  /** Document title */
  title?: string;
  /** Author name */
  author?: string;
  /** Include timestamps */
  includeTimestamps?: boolean;
  /** Include metadata (model, duration, tokens) */
  includeMetadata?: boolean;
  /** Page format */
  format?: 'a4' | 'letter';
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** Theme for code blocks */
  codeTheme?: 'dark' | 'light';
  /** Font size */
  fontSize?: number;
  /** Header text */
  headerText?: string;
  /** Footer text */
  footerText?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<PDFExportOptions> = {
  title: 'Lisa AI Export',
  author: 'Lisa AI',
  includeTimestamps: true,
  includeMetadata: true,
  format: 'a4',
  orientation: 'portrait',
  codeTheme: 'dark',
  fontSize: 10,
  headerText: 'Lisa AI',
  footerText: '',
};

const COLORS = {
  primary: '#f5a623',
  primaryLight: '#f5c563',
  userBg: '#374151',
  userBorder: '#4b5563',
  assistantBg: '#1f2937',
  assistantBorder: '#f5a623',
  codeBg: '#0f172a',
  codeBorder: '#1e293b',
  text: '#ffffff',
  textMuted: '#9ca3af',
  textDark: '#6b7280',
  border: '#2d2d44',
  error: '#ef4444',
  errorBg: '#7f1d1d',
  success: '#22c55e',
  successBg: '#14532d',
  warning: '#f59e0b',
  info: '#3b82f6',
  // Syntax highlighting colors
  syntax: {
    keyword: '#c678dd',
    string: '#98c379',
    number: '#d19a66',
    comment: '#5c6370',
    function: '#61afef',
    variable: '#e06c75',
    operator: '#56b6c2',
    class: '#e5c07b',
  },
};

const PAGE_MARGINS = {
  top: 20,
  right: 15,
  bottom: 20,
  left: 15,
};

// ============================================================================
// PDF Export Service
// ============================================================================

class PDFExportService {
  private pdf: jsPDF | null = null;
  private currentY: number = 0;
  private pageWidth: number = 0;
  private pageHeight: number = 0;
  private contentWidth: number = 0;

  /**
   * Export a conversation to PDF
   */
  async exportConversation(
    messages: ChatMessage[],
    filename: string = 'conversation.pdf',
    options: PDFExportOptions = {}
  ): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    this.initPDF(opts);
    this.addHeader(opts.title, opts.headerText);
    
    for (const message of messages) {
      this.addMessage(message, opts);
    }
    
    this.addFooter(opts.footerText);
    
    const blob = this.pdf!.output('blob');
    
    // Trigger download
    this.downloadBlob(blob, filename);
    
    return blob;
  }

  /**
   * Export a notebook to PDF
   */
  async exportNotebook(
    cells: NotebookCell[],
    filename: string = 'notebook.pdf',
    options: PDFExportOptions = {}
  ): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    this.initPDF(opts);
    this.addHeader(opts.title, opts.headerText);
    
    for (let i = 0; i < cells.length; i++) {
      this.addCell(cells[i], i + 1, opts);
    }
    
    this.addFooter(opts.footerText);
    
    const blob = this.pdf!.output('blob');
    
    // Trigger download
    this.downloadBlob(blob, filename);
    
    return blob;
  }

  /**
   * Export an HTML element to PDF (for complex content)
   */
  async exportElement(
    element: HTMLElement,
    filename: string = 'export.pdf',
    options: PDFExportOptions = {}
  ): Promise<Blob> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Capture element as canvas
    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1a26',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calculate dimensions
    const pdfWidth = opts.format === 'a4' ? 210 : 215.9;
    const pdfHeight = opts.format === 'a4' ? 297 : 279.4;
    const ratio = Math.min(
      (pdfWidth - PAGE_MARGINS.left - PAGE_MARGINS.right) / imgWidth,
      (pdfHeight - PAGE_MARGINS.top - PAGE_MARGINS.bottom) / imgHeight
    );
    
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;
    
    this.pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });
    
    this.pdf.addImage(
      imgData,
      'PNG',
      PAGE_MARGINS.left,
      PAGE_MARGINS.top,
      scaledWidth,
      scaledHeight
    );
    
    const blob = this.pdf.output('blob');
    this.downloadBlob(blob, filename);
    
    return blob;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initPDF(options: Required<PDFExportOptions>): void {
    this.pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: options.format,
    });
    
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - PAGE_MARGINS.left - PAGE_MARGINS.right;
    this.currentY = PAGE_MARGINS.top;
    
    // Set document properties
    this.pdf.setProperties({
      title: options.title,
      author: options.author,
      creator: 'Lisa AI',
    });
  }

  private addHeader(title: string, headerText: string): void {
    if (!this.pdf) return;
    
    // Header background gradient effect
    this.pdf.setFillColor(...this.hexToRgb('#111827'));
    this.pdf.rect(0, 0, this.pageWidth, 45, 'F');
    
    // Accent bar
    this.pdf.setFillColor(...this.hexToRgb(COLORS.primary));
    this.pdf.rect(0, 0, this.pageWidth, 4, 'F');
    
    // Logo circle
    this.pdf.setFillColor(...this.hexToRgb(COLORS.primary));
    this.pdf.circle(PAGE_MARGINS.left + 8, this.currentY + 6, 6, 'F');
    
    // Logo text
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text('L', PAGE_MARGINS.left + 5.5, this.currentY + 9);
    
    // Title
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(title, PAGE_MARGINS.left + 20, this.currentY + 8);
    
    // Header text badge
    if (headerText) {
      this.pdf.setFillColor(...this.hexToRgb('#374151'));
      const textWidth = this.pdf.getTextWidth(headerText) + 6;
      this.pdf.roundedRect(this.pageWidth - PAGE_MARGINS.right - textWidth, this.currentY + 1, textWidth, 8, 2, 2, 'F');
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(...this.hexToRgb(COLORS.primaryLight));
      this.pdf.text(headerText, this.pageWidth - PAGE_MARGINS.right - textWidth + 3, this.currentY + 6);
    }
    
    // Date with icon
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(...this.hexToRgb(COLORS.textMuted));
    const dateStr = new Date().toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    this.pdf.text(`📅 ${dateStr}`, PAGE_MARGINS.left + 20, this.currentY + 16);
    
    this.currentY = 55;
  }

  private addFooter(footerText: string): void {
    if (!this.pdf) return;
    
    const pageCount = this.pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      
      // Page number
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(136, 136, 136);
      this.pdf.text(
        `Page ${i} / ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      
      // Footer text
      if (footerText) {
        this.pdf.text(
          footerText,
          PAGE_MARGINS.left,
          this.pageHeight - 10
        );
      }
      
      // Generated by
      this.pdf.text(
        'Généré par Lisa AI',
        this.pageWidth - PAGE_MARGINS.right,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  private addMessage(message: ChatMessage, options: Required<PDFExportOptions>): void {
    if (!this.pdf) return;
    
    this.checkPageBreak(35);
    
    const isUser = message.role === 'user';
    const roleLabel = isUser ? 'Vous' : 'Lisa';
    const roleIcon = isUser ? '👤' : '🤖';
    const bgColor = isUser ? COLORS.userBg : COLORS.assistantBg;
    const borderColor = isUser ? COLORS.userBorder : COLORS.assistantBorder;
    
    // Avatar circle
    this.pdf.setFillColor(...this.hexToRgb(isUser ? '#6366f1' : COLORS.primary));
    this.pdf.circle(PAGE_MARGINS.left + 5, this.currentY + 3, 5, 'F');
    
    // Avatar icon
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(7);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(roleIcon, PAGE_MARGINS.left + 2.5, this.currentY + 5);
    
    // Role label
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(...this.hexToRgb(isUser ? '#818cf8' : COLORS.primaryLight));
    this.pdf.text(roleLabel, PAGE_MARGINS.left + 14, this.currentY + 5);
    
    // Timestamp badge
    if (options.includeTimestamps && message.timestamp) {
      const date = new Date(message.timestamp);
      const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      this.pdf.setFillColor(...this.hexToRgb('#1f2937'));
      const timeWidth = 18;
      this.pdf.roundedRect(this.pageWidth - PAGE_MARGINS.right - timeWidth, this.currentY - 1, timeWidth, 7, 1.5, 1.5, 'F');
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(7);
      this.pdf.setTextColor(...this.hexToRgb(COLORS.textMuted));
      this.pdf.text(timeStr, this.pageWidth - PAGE_MARGINS.right - timeWidth + 2, this.currentY + 4);
    }
    
    this.currentY += 10;
    
    // Message content box with border
    const contentLines = this.pdf.splitTextToSize(message.content, this.contentWidth - 16);
    const boxHeight = contentLines.length * 4.5 + 12;
    
    this.checkPageBreak(boxHeight + 15);
    
    // Left border accent
    this.pdf.setFillColor(...this.hexToRgb(borderColor));
    this.pdf.rect(PAGE_MARGINS.left, this.currentY, 3, boxHeight, 'F');
    
    // Background
    this.pdf.setFillColor(...this.hexToRgb(bgColor));
    this.pdf.roundedRect(PAGE_MARGINS.left + 3, this.currentY, this.contentWidth - 3, boxHeight, 0, 3, 'F');
    
    // Content
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(options.fontSize);
    this.pdf.setTextColor(...this.hexToRgb(COLORS.text));
    this.pdf.text(contentLines, PAGE_MARGINS.left + 10, this.currentY + 8);
    
    this.currentY += boxHeight + 3;
    
    // Metadata badges
    if (options.includeMetadata && message.metadata) {
      let metaX = PAGE_MARGINS.left + 10;
      
      if (message.metadata.model) {
        const modelText = message.metadata.model;
        const modelWidth = this.pdf.getTextWidth(modelText) + 6;
        this.pdf.setFillColor(...this.hexToRgb('#1e3a5f'));
        this.pdf.roundedRect(metaX, this.currentY, modelWidth, 6, 1.5, 1.5, 'F');
        this.pdf.setFontSize(7);
        this.pdf.setTextColor(...this.hexToRgb(COLORS.info));
        this.pdf.text(modelText, metaX + 3, this.currentY + 4);
        metaX += modelWidth + 3;
      }
      
      if (message.metadata.duration) {
        const durationText = `${message.metadata.duration}ms`;
        const durationWidth = this.pdf.getTextWidth(durationText) + 6;
        this.pdf.setFillColor(...this.hexToRgb('#1e3a3a'));
        this.pdf.roundedRect(metaX, this.currentY, durationWidth, 6, 1.5, 1.5, 'F');
        this.pdf.setTextColor(...this.hexToRgb(COLORS.primaryLight));
        this.pdf.text(durationText, metaX + 3, this.currentY + 4);
        metaX += durationWidth + 3;
      }
      
      if (message.metadata.tokens) {
        const tokensText = `${message.metadata.tokens} tokens`;
        const tokensWidth = this.pdf.getTextWidth(tokensText) + 6;
        this.pdf.setFillColor(...this.hexToRgb('#3d2f1e'));
        this.pdf.roundedRect(metaX, this.currentY, tokensWidth, 6, 1.5, 1.5, 'F');
        this.pdf.setTextColor(...this.hexToRgb(COLORS.warning));
        this.pdf.text(tokensText, metaX + 3, this.currentY + 4);
      }
      
      this.currentY += 8;
    }
    
    this.currentY += 8;
  }

  private addCell(cell: NotebookCell, index: number, options: Required<PDFExportOptions>): void {
    if (!this.pdf) return;
    
    this.checkPageBreak(45);
    
    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
    const isCode = cell.cell_type === 'code';
    
    // Cell header with badge
    const execCount = cell.execution_count || index;
    const cellIcon = isCode ? '💻' : '📝';
    const cellType = isCode ? 'Code' : 'Markdown';
    
    // Execution count badge
    this.pdf.setFillColor(...this.hexToRgb(isCode ? COLORS.primary : '#6366f1'));
    this.pdf.roundedRect(PAGE_MARGINS.left, this.currentY, 12, 7, 2, 2, 'F');
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text(`${execCount}`, PAGE_MARGINS.left + 3, this.currentY + 5);
    
    // Cell type label
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(...this.hexToRgb(isCode ? COLORS.primaryLight : '#818cf8'));
    this.pdf.text(`${cellIcon} ${cellType}`, PAGE_MARGINS.left + 16, this.currentY + 5);
    
    // Language badge for code cells
    if (isCode) {
      const langText = 'Python';
      const langWidth = this.pdf.getTextWidth(langText) + 6;
      this.pdf.setFillColor(...this.hexToRgb('#1e3a5f'));
      this.pdf.roundedRect(this.pageWidth - PAGE_MARGINS.right - langWidth, this.currentY, langWidth, 7, 2, 2, 'F');
      this.pdf.setFontSize(7);
      this.pdf.setTextColor(...this.hexToRgb(COLORS.info));
      this.pdf.text(langText, this.pageWidth - PAGE_MARGINS.right - langWidth + 3, this.currentY + 5);
    }
    
    this.currentY += 10;
    
    // Source content
    const sourceLines = this.pdf.splitTextToSize(source, this.contentWidth - 14);
    const sourceHeight = Math.min(sourceLines.length * 4 + 10, 120);
    
    this.checkPageBreak(sourceHeight + 25);
    
    // Code block with border
    this.pdf.setFillColor(...this.hexToRgb(COLORS.codeBorder));
    this.pdf.roundedRect(PAGE_MARGINS.left, this.currentY, this.contentWidth, sourceHeight + 2, 3, 3, 'F');
    this.pdf.setFillColor(...this.hexToRgb(COLORS.codeBg));
    this.pdf.roundedRect(PAGE_MARGINS.left + 1, this.currentY + 1, this.contentWidth - 2, sourceHeight, 2, 2, 'F');
    
    // Line numbers gutter
    this.pdf.setFillColor(...this.hexToRgb('#0c1222'));
    this.pdf.rect(PAGE_MARGINS.left + 1, this.currentY + 1, 10, sourceHeight, 'F');
    
    // Code content with line numbers
    this.pdf.setFont('courier', 'normal');
    this.pdf.setFontSize(8);
    
    const visibleLines = sourceLines.slice(0, Math.floor((sourceHeight - 8) / 4));
    visibleLines.forEach((line: string, i: number) => {
      if (!this.pdf) return;
      // Line number
      this.pdf.setTextColor(...this.hexToRgb(COLORS.textDark));
      this.pdf.text(`${i + 1}`, PAGE_MARGINS.left + 3, this.currentY + 6 + i * 4);
      
      // Code line with basic syntax highlighting
      this.pdf.setTextColor(...this.hexToRgb('#e2e8f0'));
      this.pdf.text(line, PAGE_MARGINS.left + 14, this.currentY + 6 + i * 4);
    });
    
    if (sourceLines.length > visibleLines.length) {
      this.pdf.setFillColor(...this.hexToRgb('#1e293b'));
      this.pdf.roundedRect(PAGE_MARGINS.left + 14, this.currentY + sourceHeight - 6, 60, 5, 1, 1, 'F');
      this.pdf.setTextColor(...this.hexToRgb(COLORS.textMuted));
      this.pdf.setFontSize(7);
      this.pdf.text(`... +${sourceLines.length - visibleLines.length} lignes`, 
        PAGE_MARGINS.left + 16, this.currentY + sourceHeight - 3);
    }
    
    this.currentY += sourceHeight + 5;
    
    // Outputs
    if (cell.outputs && cell.outputs.length > 0) {
      // Output header
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(...this.hexToRgb(COLORS.textMuted));
      this.pdf.text('Sortie:', PAGE_MARGINS.left + 2, this.currentY + 3);
      this.currentY += 6;
      
      for (const output of cell.outputs) {
        this.addOutput(output, options);
      }
    }
    
    this.currentY += 10;
  }

  private addOutput(output: CellOutput, _options: Required<PDFExportOptions>): void {
    if (!this.pdf) return;
    
    this.checkPageBreak(20);
    
    let text = '';
    let color = COLORS.text;
    
    if (output.output_type === 'stream') {
      text = output.text || '';
      color = output.name === 'stderr' ? COLORS.error : COLORS.success;
    } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      text = output.data?.['text/plain'] || '';
      color = COLORS.text;
    } else if (output.output_type === 'error') {
      text = `${output.ename}: ${output.evalue}`;
      color = COLORS.error;
    }
    
    if (!text) return;
    
    const lines = this.pdf.splitTextToSize(text, this.contentWidth - 10);
    const outputHeight = Math.min(lines.length * 4 + 6, 60);
    
    // Output indicator
    this.pdf.setFillColor(...this.hexToRgb(color));
    this.pdf.rect(PAGE_MARGINS.left, this.currentY, 2, outputHeight, 'F');
    
    // Output content
    this.pdf.setFont('courier', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(...this.hexToRgb(color));
    
    const visibleLines = lines.slice(0, Math.floor((outputHeight - 6) / 4));
    this.pdf.text(visibleLines, PAGE_MARGINS.left + 6, this.currentY + 5);
    
    this.currentY += outputHeight + 2;
  }

  private checkPageBreak(requiredHeight: number): void {
    if (!this.pdf) return;
    
    if (this.currentY + requiredHeight > this.pageHeight - PAGE_MARGINS.bottom) {
      this.pdf.addPage();
      this.currentY = PAGE_MARGINS.top;
    }
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const pdfExportService = new PDFExportService();

export default pdfExportService;
