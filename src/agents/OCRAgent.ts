/**
 * OCRAgent - Types et classe de base pour l'agent OCR
 */

export interface OCRResult {
  text: string;
  confidence?: number;
  language?: string;
  blocks?: Array<{
    text: string;
    confidence: number;
    bbox?: [number, number, number, number];
  }>;
  processingTimeMs?: number;
}

export class OCRAgent {
  name = 'OCRAgent';

  async execute(params: Record<string, unknown>): Promise<{ success: boolean; output?: OCRResult; error?: string }> {
    return { success: false, error: 'OCRAgent not fully implemented' };
  }
}
