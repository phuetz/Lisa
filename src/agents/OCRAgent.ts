/**
 * OCRAgent: Agent spécialisé pour la reconnaissance optique de caractères.
 * 
 * Cet agent permet à Lisa de lire et d'extraire du texte à partir d'images,
 * captures d'écran, ou zones sélectionnées à l'écran.
 */

// L'import de agentRegistry est supprimé car il n'est pas utilisé directement dans ce fichier
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

  // Extrait du texte d'une image
  private async extractTextFromImage(
    _imageSource: OCRSource,
    _imageData: string | Blob | File,
    options?: OCROptions
  ): Promise<OCRResult> {
    // Dans une implémentation réelle, on utiliserait Tesseract.js ou une API cloud
    
    // Simulation d'une réponse OCR
    return {
      text: "Ceci est un texte extrait d'une image par l'OCRAgent",
      confidence: 0.95,
      regions: [
        {
          text: "Ceci est un texte extrait d'une image par l'OCRAgent",
          confidence: 0.95,
          boundingBox: {
            x: 10,
            y: 10,
            width: 300,
            height: 50
          }
        }
      ],
      language: options?.language || 'auto',
      processingTimeMs: 120
    };
  }

  // Prendre une capture d'écran
  private async captureScreenshot(
    _region?: { x: number; y: number; width: number; height: number }
  ): Promise<string> {
    // Dans une vraie implémentation, on utiliserait des APIs comme:
    // - MediaDevices.getDisplayMedia() pour la capture d'écran dans le navigateur
    // - Ou une extension navigateur spécifique avec des permissions
    
    // Pour cette démo, on simule une capture d'écran encodée en base64
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
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
            // Implémentation future: capture webcam
            return {
              success: false,
              error: "Webcam capture not implemented yet",
              output: null
            };
          } else if (source === 'clipboard') {
            // Implémentation future: récupération du presse-papiers
            return {
              success: false,
              error: "Clipboard capture not implemented yet",
              output: null
            };
          } else if (source === 'file') {
            // Implémentation future: chargement de fichier
            return {
              success: false,
              error: "File loading not implemented yet",
              output: null
            };
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
