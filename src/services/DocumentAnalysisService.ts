/**
 * 📄 Document Analysis Service - Analyse de Documents
 * OCR + Extraction d'entités + Résumé automatique
 * Supports: PDF, DOCX, Images (OCR), Text files
 */

import { agentRegistry } from '../features/agents/core/registry';
import { memoryService } from './MemoryService';

// Dynamic imports for PDF and DOCX parsing
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
let mammoth: typeof import('mammoth') | null = null;

// Initialize PDF.js worker
async function initPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  return pdfjsLib;
}

// Initialize Mammoth
async function initMammoth() {
  if (!mammoth) {
    mammoth = await import('mammoth');
  }
  return mammoth;
}

export interface DocumentAnalysis {
  id: string;
  filename: string;
  type: 'pdf' | 'image' | 'text' | 'docx';
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  content?: {
    text: string;
    pages?: number;
    wordCount: number;
  };
  entities?: ExtractedEntity[];
  summary?: string;
  keywords?: string[];
  error?: string;
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'location' | 'date' | 'amount' | 'email' | 'phone' | 'url';
  value: string;
  confidence: number;
  position?: { start: number; end: number };
}

class DocumentAnalysisServiceImpl {
  private analyses: Map<string, DocumentAnalysis> = new Map();
  private listeners: Set<(analyses: DocumentAnalysis[]) => void> = new Set();

  /**
   * Analyser un document (image ou texte)
   */
  async analyzeDocument(
    file: File | Blob,
    filename: string,
    options: { extractEntities?: boolean; generateSummary?: boolean } = {}
  ): Promise<DocumentAnalysis> {
    const { extractEntities = true, generateSummary = true } = options;

    const analysis: DocumentAnalysis = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename,
      type: this.detectFileType(filename),
      timestamp: new Date(),
      status: 'pending',
    };

    this.analyses.set(analysis.id, analysis);
    this.notifyListeners();

    try {
      analysis.status = 'processing';
      this.notifyListeners();

      // Étape 1: Extraction du texte (OCR si image)
      const text = await this.extractText(file, analysis.type);
      analysis.content = {
        text,
        wordCount: text.split(/\s+/).length,
        pages: analysis.type === 'pdf' ? (this as { _lastPdfPages?: number })._lastPdfPages : undefined,
      };

      // Étape 2: Extraction des entités
      if (extractEntities) {
        analysis.entities = this.extractEntities(text);
      }

      // Étape 3: Génération du résumé
      if (generateSummary && text.length > 200) {
        analysis.summary = await this.generateSummary(text);
      }

      // Étape 4: Extraction des mots-clés
      analysis.keywords = this.extractKeywords(text);

      // Sauvegarder en mémoire
      memoryService.createMemory(
        'document',
        `Document: ${filename}\nRésumé: ${analysis.summary || 'N/A'}\nMots-clés: ${analysis.keywords?.join(', ')}`,
        'DocumentAnalysisService',
        analysis.keywords || []
      );

      analysis.status = 'completed';
    } catch (error) {
      analysis.status = 'error';
      analysis.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    this.analyses.set(analysis.id, analysis);
    this.notifyListeners();

    return analysis;
  }

  /**
   * Détecter le type de fichier
   */
  private detectFileType(filename: string): DocumentAnalysis['type'] {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'image';
    return 'text';
  }

  /**
   * Extraire le texte d'un document
   */
  private async extractText(file: File | Blob, type: DocumentAnalysis['type']): Promise<string> {
    if (type === 'text') {
      return await file.text();
    }

    if (type === 'image') {
      return await this.extractTextFromImage(file);
    }

    if (type === 'pdf') {
      return await this.extractTextFromPDF(file);
    }

    if (type === 'docx') {
      return await this.extractTextFromDOCX(file);
    }

    throw new Error('Type de document non supporté');
  }

  /**
   * Extract text from image using OCR
   */
  private async extractTextFromImage(file: File | Blob): Promise<string> {
    // Utiliser l'OCRAgent
    const ocrAgent = await agentRegistry.getAgentAsync('OCRAgent');
    if (ocrAgent) {
      const result = await ocrAgent.execute({
        intent: 'extract_text',
        image: file,
      });
      if (result.success && result.output?.text) {
        return result.output.text;
      }
    }
    throw new Error('OCR non disponible');
  }

  /**
   * Extract text from PDF using pdf.js
   */
  private async extractTextFromPDF(file: File | Blob): Promise<string> {
    try {
      const pdfjs = await initPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      const textParts: string[] = [];
      const numPages = pdf.numPages;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: { str?: string }) => item.str || '')
          .join(' ');
        textParts.push(pageText);
      }

      // Store page count in a way we can access later
      (this as { _lastPdfPages?: number })._lastPdfPages = numPages;

      return textParts.join('\n\n');
    } catch (error) {
      console.error('[DocumentAnalysis] PDF extraction failed:', error);
      throw new Error(`Impossible de lire le PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Extract text from DOCX using mammoth
   */
  private async extractTextFromDOCX(file: File | Blob): Promise<string> {
    try {
      const mammothLib = await initMammoth();
      const arrayBuffer = await file.arrayBuffer();

      const result = await mammothLib.extractRawText({ arrayBuffer });

      if (result.messages.length > 0) {
        console.warn('[DocumentAnalysis] DOCX warnings:', result.messages);
      }

      return result.value;
    } catch (error) {
      console.error('[DocumentAnalysis] DOCX extraction failed:', error);
      throw new Error(`Impossible de lire le DOCX: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Extract text from DOCX with formatting (HTML)
   */
  async extractFormattedTextFromDOCX(file: File | Blob): Promise<{ html: string; text: string }> {
    try {
      const mammothLib = await initMammoth();
      const arrayBuffer = await file.arrayBuffer();

      const [htmlResult, textResult] = await Promise.all([
        mammothLib.convertToHtml({ arrayBuffer }),
        mammothLib.extractRawText({ arrayBuffer }),
      ]);

      return {
        html: htmlResult.value,
        text: textResult.value,
      };
    } catch (error) {
      console.error('[DocumentAnalysis] DOCX formatted extraction failed:', error);
      throw new Error(`Impossible de lire le DOCX: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Extraire les entités du texte
   */
  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        type: 'email',
        value: match[0],
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Téléphones (format français et international)
    const phoneRegex = /(?:\+33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        type: 'phone',
        value: match[0],
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // URLs
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    while ((match = urlRegex.exec(text)) !== null) {
      entities.push({
        type: 'url',
        value: match[0],
        confidence: 0.95,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Dates (formats courants)
    const dateRegex = /\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/gi;
    while ((match = dateRegex.exec(text)) !== null) {
      entities.push({
        type: 'date',
        value: match[0],
        confidence: 0.85,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    // Montants (euros)
    const amountRegex = /\d+(?:[.,]\d{1,2})?\s*€|\d+(?:\s\d{3})*(?:[.,]\d{1,2})?\s*(?:euros?|EUR)/gi;
    while ((match = amountRegex.exec(text)) !== null) {
      entities.push({
        type: 'amount',
        value: match[0],
        confidence: 0.9,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }

    return entities;
  }

  /**
   * Générer un résumé du texte
   */
  private async generateSummary(text: string): Promise<string> {
    // Utiliser le NLUAgent ou un service LLM
    const nluAgent = await agentRegistry.getAgentAsync('NLUAgent');
    if (nluAgent) {
      const result = await nluAgent.execute({
        intent: 'summarize',
        text: text.substring(0, 5000), // Limiter la taille
      });
      if (result.success && result.output?.summary) {
        return result.output.summary;
      }
    }

    // Fallback: résumé simple (premières phrases)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).join('. ') + '.';
  }

  /**
   * Extraire les mots-clés
   */
  private extractKeywords(text: string): string[] {
    // Mots à ignorer (stopwords français)
    const stopwords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
      'donc', 'car', 'ni', 'que', 'qui', 'quoi', 'dont', 'où', 'ce', 'cette',
      'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
      'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'je', 'tu', 'il',
      'elle', 'nous', 'vous', 'ils', 'elles', 'on', 'se', 'en', 'y', 'à',
      'au', 'aux', 'avec', 'sans', 'sous', 'sur', 'dans', 'par', 'pour',
      'est', 'sont', 'être', 'avoir', 'fait', 'faire', 'dit', 'dire',
      'plus', 'moins', 'très', 'bien', 'tout', 'tous', 'toute', 'toutes',
    ]);

    // Compter les mots
    const words = text.toLowerCase()
      .replace(/[^\wàâäéèêëïîôùûüç\s-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopwords.has(w));

    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Retourner les 10 mots les plus fréquents
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Obtenir une analyse par ID
   */
  getAnalysis(id: string): DocumentAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Obtenir toutes les analyses
   */
  getAllAnalyses(): DocumentAnalysis[] {
    return Array.from(this.analyses.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Supprimer une analyse
   */
  deleteAnalysis(id: string): void {
    this.analyses.delete(id);
    this.notifyListeners();
  }

  /**
   * S'abonner aux changements
   */
  subscribe(callback: (analyses: DocumentAnalysis[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifier les listeners
   */
  private notifyListeners(): void {
    const analyses = this.getAllAnalyses();
    this.listeners.forEach(callback => callback(analyses));
  }
}

// Export singleton
export const documentAnalysisService = new DocumentAnalysisServiceImpl();
