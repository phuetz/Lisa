/**
 * Image Generation Agent
 * Generates images using OpenAI's DALL-E 3 API.
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';

export class ImageGenerationAgent implements BaseAgent {
  name = 'ImageGenerationAgent';
  description = 'Génère des images à partir de descriptions textuelles via DALL-E 3';
  version = '1.0.0';
  domain = 'media';
  capabilities = ['generate_image'];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { parameters } = props;
    const prompt = parameters?.prompt as string;
    const size = (parameters?.size as string) || '1024x1024';

    if (!prompt) {
      return { success: false, output: null, error: 'Le paramètre "prompt" est requis' };
    }

    const validSizes = ['1024x1024', '1792x1024', '1024x1792'];
    if (!validSizes.includes(size)) {
      return {
        success: false,
        output: null,
        error: `Taille invalide. Valeurs acceptées: ${validSizes.join(', ')}`,
      };
    }

    try {
      // Get API key from settings store
      const { useSettingsStore } = await import('../../../store/settingsStore');
      const apiKey = useSettingsStore.getState().getApiKey('openai');

      if (!apiKey) {
        return {
          success: false,
          output: null,
          error: 'Clé API OpenAI non configurée. Ajoutez-la dans les paramètres.',
        };
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
        const err = await response.json().catch(() => ({}));
        throw new Error((err as Record<string, Record<string, string>>).error?.message || `Erreur ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;
      const revisedPrompt = data.data?.[0]?.revised_prompt;

      if (!imageUrl) {
        throw new Error('Aucune image retournée par DALL-E');
      }

      return {
        success: true,
        output: {
          imageUrl,
          revisedPrompt,
          size,
          message: `Image générée avec succès (${size})`,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: `Erreur de génération d'image: ${(error as Error).message}`,
      };
    }
  }
}
