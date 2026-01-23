/**
 * ImageGeneratorTool: Génération d'images via API
 * Supporte Gemini Imagen, DALL-E, et Stability AI
 */

import { useChatSettingsStore } from '../store/chatSettingsStore';

interface ExecuteProps {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'cartoon' | 'sketch' | 'photo';
  size?: 'small' | 'medium' | 'large';
  provider?: 'gemini' | 'openai' | 'stability';
}

interface ExecuteResult {
  success: boolean;
  output?: ImageResult | null;
  error?: string | null;
}

interface ImageResult {
  url: string;
  prompt: string;
  provider: string;
  size: string;
  revisedPrompt?: string;
}

// Size mappings per provider
const SIZES = {
  openai: {
    small: '256x256',
    medium: '512x512',
    large: '1024x1024',
  },
  gemini: {
    small: '512x512',
    medium: '1024x1024',
    large: '1536x1536',
  },
  stability: {
    small: '512x512',
    medium: '768x768',
    large: '1024x1024',
  },
};

// Style prompts
const STYLE_PROMPTS: Record<string, string> = {
  realistic: 'photorealistic, highly detailed, 8k resolution',
  artistic: 'artistic, painterly style, expressive brushstrokes',
  cartoon: 'cartoon style, vibrant colors, clean lines',
  sketch: 'pencil sketch, hand-drawn, black and white',
  photo: 'professional photography, studio lighting, sharp focus',
};

export class ImageGeneratorTool {
  name = 'ImageGeneratorTool';
  description = 'Générer des images à partir d\'une description textuelle.';

  private getApiKey(provider: string): string | undefined {
    const store = useChatSettingsStore.getState();
    switch (provider) {
      case 'openai':
        return store.openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY;
      case 'gemini':
        return store.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
      default:
        return undefined;
    }
  }

  private async generateWithOpenAI(
    prompt: string,
    size: string
  ): Promise<ImageResult> {
    const apiKey = this.getApiKey('openai');
    if (!apiKey) {
      throw new Error('Clé API OpenAI non configurée. Allez dans Paramètres > Clés API.');
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      url: data.data[0].url,
      prompt,
      provider: 'OpenAI DALL-E 3',
      size,
      revisedPrompt: data.data[0].revised_prompt,
    };
  }

  private async generateWithGemini(
    prompt: string,
    _size: string
  ): Promise<ImageResult> {
    const apiKey = this.getApiKey('gemini');
    if (!apiKey) {
      throw new Error('Clé API Gemini non configurée. Allez dans Paramètres > Clés API.');
    }

    // Gemini Imagen API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const imageBytes = data.predictions?.[0]?.bytesBase64Encoded;
    
    if (!imageBytes) {
      throw new Error('Aucune image générée');
    }

    return {
      url: `data:image/png;base64,${imageBytes}`,
      prompt,
      provider: 'Google Imagen 3',
      size: '1024x1024',
    };
  }

  async execute({ 
    prompt, 
    style = 'realistic', 
    size = 'medium',
    provider = 'openai' 
  }: ExecuteProps): Promise<ExecuteResult> {
    if (!prompt || typeof prompt !== 'string') {
      return { success: false, error: 'Une description est requise.', output: null };
    }

    try {
      // Enhance prompt with style
      const stylePrompt = STYLE_PROMPTS[style] || '';
      const enhancedPrompt = stylePrompt 
        ? `${prompt}, ${stylePrompt}` 
        : prompt;

      let result: ImageResult;

      switch (provider) {
        case 'openai': {
          const sizeStr = SIZES.openai[size] || SIZES.openai.medium;
          result = await this.generateWithOpenAI(enhancedPrompt, sizeStr);
          break;
        }
        case 'gemini': {
          const sizeStr = SIZES.gemini[size] || SIZES.gemini.medium;
          result = await this.generateWithGemini(enhancedPrompt, sizeStr);
          break;
        }
        default:
          return { success: false, error: `Provider "${provider}" non supporté.`, output: null };
      }

      return { success: true, output: result };
    } catch (error) {
      console.error('ImageGeneratorTool execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de génération',
        output: null,
      };
    }
  }

  formatResponse(data: ImageResult): string {
    let response = `🎨 **Image générée**\n\n`;
    response += `📝 **Prompt:** ${data.prompt}\n`;
    response += `🖼️ **Taille:** ${data.size}\n`;
    response += `🔧 **Provider:** ${data.provider}\n`;
    
    if (data.revisedPrompt && data.revisedPrompt !== data.prompt) {
      response += `\n✨ **Prompt amélioré:** ${data.revisedPrompt}\n`;
    }
    
    response += `\n![Image générée](${data.url})`;
    
    return response;
  }
}

export const imageGeneratorTool = new ImageGeneratorTool();
