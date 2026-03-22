/**
 * File Attachments Hook
 * Processes uploaded files into MessagePart arrays for multipart messages.
 * Supports: images, PDF, DOCX (mammoth), text/code files, CSV.
 * Adapted from PromptCommander's useFileAttachments.
 */

import { useState, useCallback } from 'react';
import type { MessagePart } from '../types/promptcommander';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TEXT_LENGTH = 100_000; // 100K chars

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
const TEXT_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.log', '.env'];
const CODE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.swift', '.kt', '.sql', '.sh', '.bash', '.ps1', '.html', '.css', '.scss'];

export interface FileAttachment {
  part: MessagePart;
  preview?: string; // For display in UI
}

export function useFileAttachments() {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [processing, setProcessing] = useState(false);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setProcessing(true);
    const newAttachments: FileAttachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`[FileAttachments] File too large (${(file.size / 1024 / 1024).toFixed(1)}MB): ${file.name}`);
        continue;
      }

      try {
        const attachment = await processFile(file);
        if (attachment) newAttachments.push(attachment);
      } catch (error) {
        console.error(`[FileAttachments] Failed to process ${file.name}:`, error);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setProcessing(false);
    return newAttachments;
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const getMessageParts = useCallback((): MessagePart[] => {
    return attachments.map(a => a.part);
  }, [attachments]);

  return {
    attachments,
    processing,
    processFiles,
    removeAttachment,
    clearAttachments,
    getMessageParts,
    hasAttachments: attachments.length > 0,
  };
}

// ─── File Processing ──────────────────────────────────────────────

async function processFile(file: File): Promise<FileAttachment | null> {
  // Images → base64
  if (IMAGE_TYPES.includes(file.type)) {
    const data = await fileToBase64(file);
    return {
      part: { type: 'image', mimeType: file.type, data, fileName: file.name },
      preview: `data:${file.type};base64,${data}`,
    };
  }

  // PDF → text extraction
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const text = await extractPDFText(file);
    if (text) {
      return {
        part: { type: 'file', text: truncateText(text), fileName: file.name, mimeType: 'application/pdf' },
        preview: `📄 ${file.name} (${text.length} chars)`,
      };
    }
    return null;
  }

  // DOCX → text extraction via mammoth
  if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const text = await extractDOCXText(file);
    if (text) {
      return {
        part: { type: 'file', text: truncateText(text), fileName: file.name, mimeType: file.type },
        preview: `📝 ${file.name} (${text.length} chars)`,
      };
    }
    return null;
  }

  // Text/code files
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (file.type.startsWith('text/') || TEXT_EXTENSIONS.includes(ext) || CODE_EXTENSIONS.includes(ext)) {
    const text = await file.text();
    return {
      part: { type: 'file', text: truncateText(text), fileName: file.name, mimeType: file.type || 'text/plain' },
      preview: `📎 ${file.name} (${text.length} chars)`,
    };
  }

  // CSV
  if (file.name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    return {
      part: { type: 'file', text: truncateText(text), fileName: file.name, mimeType: 'text/csv' },
      preview: `📊 ${file.name} (${text.length} chars)`,
    };
  }

  console.warn(`[FileAttachments] Unsupported file type: ${file.type} (${file.name})`);
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Strip data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return text.slice(0, MAX_TEXT_LENGTH) + '\n\n[... tronqué à 100K caractères]';
}

async function extractPDFText(file: File): Promise<string | null> {
  try {
    const pdfjsLib = await import(/* @vite-ignore */ 'pdfjs-dist');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    const maxPages = Math.min(pdf.numPages, 50); // Cap at 50 pages
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item: { str?: string }) => item.str || '').join(' ');
      pages.push(text);
    }

    return pages.join('\n\n');
  } catch (error) {
    console.warn('[FileAttachments] PDF extraction failed:', error);
    return null;
  }
}

async function extractDOCXText(file: File): Promise<string | null> {
  try {
    const mammoth = await import(/* @vite-ignore */ 'mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.warn('[FileAttachments] DOCX extraction failed:', error);
    return null;
  }
}
