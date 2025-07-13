/**
 * OCRAgent: Agent spécialisé pour la reconnaissance optique de caractères.
 * 
 * Cet agent permet à Lisa de lire et d'extraire du texte à partir d'images,
 * captures d'écran, ou zones sélectionnées à l'écran.
 */

// L'import de agentRegistry est supprimé car il n'est pas utilisé directement dans ce fichier
import { createWorker, OEM } from 'tesseract.js';
import type { 
  AgentCapability, 
  AgentDomain,
  AgentExecuteProps, 
  AgentExecuteResult, 
  BaseAgent
} from './types';
import { AgentDomains } from './types';

// Types spécifiques à l'OCR
export type OCRSource = 'screenshot' | 'webcam' | 'file' | 'clipboard' | 'selection';
export type OCRIntent = 'extract_text' | 'recognize_text' | 'get_capabilities';
export type OCRLanguage = 'auto' | 'en' | 'fr' | 'es' | 'de' | string;

export interface OCROptions {
  language?: OCRLanguage;
  enhanceImage?: boolean;
  confidence?: number; // Seuil de confiance minimum (0-1)
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OCRResult {
  text: string;
  confidence?: number;
  regions?: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  language?: string;
  processingTimeMs?: number;
}

/**
 * Agent pour la reconnaissance optique de caractères (OCR)
 */
export class OCRAgent implements BaseAgent {
  name = 'OCRAgent';
  description = 'Reads and extracts text from images, screenshots, or selected areas on screen';
  version = '1.0.0';
  domain = AgentDomains.ANALYSIS as AgentDomain;
  capabilities = ['text_recognition', 'text_extraction', 'image_analysis'];
  valid = true;
  
  // Vérifie si l'OCR est disponible
  private checkAvailability(): boolean {
    // Dans une vraie implémentation, vérifier si les APIs nécessaires sont disponibles
    // Par exemple Tesseract.js ou une API cloud comme Google Vision
    
    // Pour cette démo, on va simplement retourner true
    return true;
  }

  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker() {
    try {
      const worker = await createWorker({
        logger: m => console.log(m), // Optional: log progress
      });
      await worker.loadLanguage('eng+fra');
      await worker.initialize('eng+fra');
      this.worker = worker;
      this.isInitialized = true;
      console.log('Tesseract worker initialized.');
    } catch (error) {
      console.error('Failed to initialize Tesseract worker:', error);
    }
  }

  // Extrait du texte d'une image
  private async extractTextFromImage(
    _imageSource: OCRSource,
    imageData: string | Blob | File,
    options?: OCROptions
  ): Promise<OCRResult> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('Tesseract worker is not initialized.');
    }

    const lang = options?.language === 'fr' ? 'fra' : 'eng';

    const { data } = await this.worker.recognize(imageData, {
      tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    }, { imageColor: true, imageGrey: true, imageBinary: true });

    return {
      text: data.text,
      confidence: data.confidence,
      regions: data.words.map(w => ({
        text: w.text,
        confidence: w.confidence,
        boundingBox: {
          x: w.bbox.x0,
          y: w.bbox.y0,
          width: w.bbox.x1 - w.bbox.x0,
          height: w.bbox.y1 - w.bbox.y0,
        },
      })),
      language: lang,
    };
  }

  // Prendre une capture d'écran
  private async captureScreenshot(
    region?: { x: number; y: number; width: number; height: number }
  ): Promise<string> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop(); // Stop the screen sharing

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      if (region) {
        context.drawImage(bitmap, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
        canvas.width = region.width;
        canvas.height = region.height;
      } else {
        context.drawImage(bitmap, 0, 0);
      }

      return canvas.toDataURL();
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw new Error('Failed to capture screenshot.');
    }
  }

  // Capture an image from the webcam
  private async captureWebcamImage(): Promise<string> {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          stream.getTracks().forEach(track => track.stop());
          return reject(new Error('Could not get canvas context'));
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        stream.getTracks().forEach(track => track.stop());
        resolve(canvas.toDataURL('image/png'));
      };
      video.onerror = (err) => {
        stream.getTracks().forEach(track => track.stop());
        reject(new Error(`Video error: ${err}`));
      };
    });
  }

  // Read image data from clipboard
  private async readClipboardImage(): Promise<Blob> {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            return await clipboardItem.getType(type);
          }
        }
      }
      throw new Error('No image found in clipboard.');
    } catch (error) {
      console.error('Error reading clipboard image:', error);
      throw new Error('Failed to read image from clipboard.');
    }
  }

  // Read image data from a File object
  private async readFileImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Exécution de l'agent
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as OCRIntent;
    const parameters = props.parameters || {};

    // Si l'OCR n'est pas disponible, on retourne une erreur
    if (!this.checkAvailability()) {
      return {
        success: false,
        error: "OCR capabilities are not available in this environment",
        output: null
      };
    }

    try {
      // Traiter les différentes intentions
      switch (intent) {
        case 'extract_text': {
          const source = parameters.source as OCRSource || 'screenshot';
          const options = parameters.options as OCROptions || {};
          let imageData: string | Blob | File;
          
          // Obtenir l'image selon la source
          if (source === 'screenshot') {
            imageData = await this.captureScreenshot(options.region);
          } else if (source === 'webcam') {
            imageData = await this.captureWebcamImage();
          } else if (source === 'clipboard') {
            imageData = await this.readClipboardImage();
          } else if (source === 'file') {
            if (!parameters.file) throw new Error('File object is required for file source.');
            imageData = await this.readFileImage(parameters.file as File);
          } else {
            return {
              success: false,
              error: `Unknown OCR source: ${source}`,
              output: null
            };
          }
          
          // Extraire le texte de l'image
          const result = await this.extractTextFromImage(source, imageData, options);
          
          return {
            success: true,
            output: result,
            metadata: {
              executionTime: Date.now() - startTime,
              confidence: result.confidence,
              source: source
            }
          };
        }
        
        case 'get_capabilities': {
          return {
            success: true,
            output: {
              availableSources: ['screenshot'],
              availableLanguages: ['auto', 'en', 'fr', 'es', 'de'],
              imageEnhancementAvailable: true
            }
          };
        }
        
        default:
          return {
            success: false,
            error: `Unknown intent: ${intent}`,
            output: null
          };
      }
    } catch (error: any) {
      console.error(`${this.name} execution error:`, error);
      return {
        success: false,
        error: error.message || 'An unknown error occurred',
        output: null,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  // Vérifier si l'agent peut traiter une requête
  async canHandle(query: string): Promise<number> {
    // Mots-clés liés à l'OCR
    const ocrKeywords = [
      'ocr', 'text recognition', 'extract text', 'read text', 
      'recognize text', 'text from image', 'image text', 'scan text',
      'capture text', 'screen text'
    ];
    
    // Vérifier la présence de mots-clés dans la requête
    const lowerQuery = query.toLowerCase();
    const matchCount = ocrKeywords.filter(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    ).length;
    
    // Calculer un score de confiance basique
    if (matchCount > 2) return 0.9;  // Très forte probabilité
    if (matchCount > 0) return 0.7;  // Probabilité moyenne à forte
    
    // Vérifier les modèles de requêtes courants
    if (lowerQuery.match(/what (does|do|is) .* say/)) return 0.8;
    if (lowerQuery.match(/read .* (screen|image|picture|photo)/)) return 0.8;
    
    return 0.2; // Faible probabilité par défaut
  }

  // Obtenir les capacités de l'agent
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: "extract_text",
        description: "Extract text from images, screenshots, or selected areas",
        requiredParameters: [
          {
            name: "source",
            type: "string",
            required: false,
            description: "Source of the image (screenshot, webcam, file, clipboard, selection)",
            defaultValue: "screenshot"
          },
          {
            name: "options",
            type: "object",
            required: false,
            description: "OCR options including language, region, etc."
          }
        ]
      },
      {
        name: "get_capabilities",
        description: "Get available OCR capabilities",
        requiredParameters: []
      }
    ];
  }
}

// Enregistrer l'agent dans le registre
// L'enregistrement centralisé se fait via src/agents/index.ts
