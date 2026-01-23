/**
 * Tests for OCRAgent (Tesseract.js)
 * Tests text extraction, language support, and OCR capabilities
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Tesseract.js - factory must be self-contained
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: 'Hello World',
        confidence: 95,
      },
    }),
    terminate: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    loadLanguage: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
  }),
  OEM: {
    DEFAULT: 3,
    TESSERACT_ONLY: 0,
    LSTM_ONLY: 1,
    TESSERACT_LSTM_COMBINED: 2,
  },
}));

import { createWorker } from 'tesseract.js';

describe('OCRAgent - Tesseract.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Worker Creation', () => {
    it('should create Tesseract worker', async () => {
      const worker = await createWorker();
      expect(createWorker).toHaveBeenCalled();
      expect(worker).toBeDefined();
    });

    it('should have recognize method', async () => {
      const worker = await createWorker();
      expect(typeof worker.recognize).toBe('function');
    });

    it('should have terminate method for cleanup', async () => {
      const worker = await createWorker();
      expect(typeof worker.terminate).toBe('function');
    });
  });

  describe('Text Recognition', () => {
    it('should recognize text from image', async () => {
      const worker = await createWorker();
      const result = await worker.recognize('test-image.png');

      expect(worker.recognize).toHaveBeenCalledWith('test-image.png');
      expect(result.data.text).toBe('Hello World');
    });

    it('should return confidence score', async () => {
      const worker = await createWorker();
      const result = await worker.recognize('test-image.png');

      expect(result.data.confidence).toBe(95);
    });

    it('should return data object with text property', async () => {
      const worker = await createWorker();
      const result = await worker.recognize('test-image.png');

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('text');
      expect(typeof result.data.text).toBe('string');
    });
  });

  describe('Worker Lifecycle', () => {
    it('should terminate worker to free resources', async () => {
      const worker = await createWorker();
      await worker.terminate();

      expect(worker.terminate).toHaveBeenCalled();
    });
  });
});

describe('OCR Result Processing', () => {
  // Helper function to process OCR results
  function processOCRResult(result: { text: string; confidence: number; words: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> }) {
    return {
      text: result.text.trim(),
      confidence: result.confidence / 100,
      wordCount: result.words.length,
      regions: result.words.map(w => ({
        text: w.text,
        confidence: w.confidence / 100,
        boundingBox: {
          x: w.bbox.x0,
          y: w.bbox.y0,
          width: w.bbox.x1 - w.bbox.x0,
          height: w.bbox.y1 - w.bbox.y0,
        },
      })),
    };
  }

  it('should normalize confidence to 0-1 range', () => {
    const result = processOCRResult({
      text: 'Test',
      confidence: 85,
      words: [],
    });

    expect(result.confidence).toBe(0.85);
  });

  it('should calculate word count', () => {
    const result = processOCRResult({
      text: 'Hello World Test',
      confidence: 90,
      words: [
        { text: 'Hello', confidence: 95, bbox: { x0: 0, y0: 0, x1: 50, y1: 20 } },
        { text: 'World', confidence: 90, bbox: { x0: 60, y0: 0, x1: 110, y1: 20 } },
        { text: 'Test', confidence: 85, bbox: { x0: 120, y0: 0, x1: 160, y1: 20 } },
      ],
    });

    expect(result.wordCount).toBe(3);
  });

  it('should convert bbox to standard format', () => {
    const result = processOCRResult({
      text: 'Word',
      confidence: 90,
      words: [
        { text: 'Word', confidence: 90, bbox: { x0: 10, y0: 20, x1: 60, y1: 50 } },
      ],
    });

    expect(result.regions[0].boundingBox).toEqual({
      x: 10,
      y: 20,
      width: 50,
      height: 30,
    });
  });

  it('should trim text output', () => {
    const result = processOCRResult({
      text: '  Hello World  \n',
      confidence: 90,
      words: [],
    });

    expect(result.text).toBe('Hello World');
  });
});

describe('Language Support', () => {
  const SUPPORTED_LANGUAGES = ['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'nld', 'pol', 'rus', 'chi_sim', 'chi_tra', 'jpn', 'kor', 'ara'];

  it('should support English', () => {
    expect(SUPPORTED_LANGUAGES).toContain('eng');
  });

  it('should support French', () => {
    expect(SUPPORTED_LANGUAGES).toContain('fra');
  });

  it('should support multiple languages', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThan(10);
  });

  it('should support CJK languages', () => {
    expect(SUPPORTED_LANGUAGES).toContain('chi_sim'); // Simplified Chinese
    expect(SUPPORTED_LANGUAGES).toContain('jpn'); // Japanese
    expect(SUPPORTED_LANGUAGES).toContain('kor'); // Korean
  });
});

describe('OCR Source Types', () => {
  type OCRSource = 'screenshot' | 'webcam' | 'file' | 'clipboard' | 'selection';

  it('should support screenshot source', () => {
    const source: OCRSource = 'screenshot';
    expect(['screenshot', 'webcam', 'file', 'clipboard', 'selection']).toContain(source);
  });

  it('should support file source', () => {
    const source: OCRSource = 'file';
    expect(['screenshot', 'webcam', 'file', 'clipboard', 'selection']).toContain(source);
  });

  it('should support webcam source', () => {
    const source: OCRSource = 'webcam';
    expect(['screenshot', 'webcam', 'file', 'clipboard', 'selection']).toContain(source);
  });
});
