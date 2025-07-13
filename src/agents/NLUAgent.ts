import { AgentDomains } from './types';
import type {
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentParameter,
  BaseAgent
} from './types';
import { pipeline, env } from '@xenova/transformers';

// Disable local model caching
env.use  Cache = false;

// Define the NLU tasks
export type NLUTask = 'sentiment_analysis' | 'zero_shot_classification' | 'feature_extraction' | 'emotion_detection';

export class NLUAgent implements BaseAgent {
  name = 'NLUAgent';
  description = 'Performs various Natural Language Understanding (NLU) tasks like sentiment analysis and emotion detection.';
  version = '1.0.0';
  domain = AgentDomains.ANALYSIS;
  capabilities = ['sentiment_analysis', 'zero_shot_classification', 'feature_extraction', 'emotion_detection'];

  private sentimentPipeline: any = null;
  private emotionPipeline: any = null;

  constructor() {
    this.initializePipelines();
  }

  private async initializePipelines() {
    try {
      // Load the sentiment analysis pipeline
      this.sentimentPipeline = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst2');
      console.log('NLUAgent: Sentiment analysis pipeline initialized.');

      // Load the emotion detection pipeline (using an audio classification model for speech emotion)
      // This model is a placeholder, a more specific SER model might be needed.
      this.emotionPipeline = await pipeline('audio-classification', 'Xenova/wav2vec2-base-960h-finetuned-emotion');
      console.log('NLUAgent: Emotion detection pipeline initialized.');

    } catch (error) {
      console.error('NLUAgent: Failed to initialize NLU pipelines:', error);
    }
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const task = props.task as NLUTask;
    const parameters = props.parameters || {};

    if (!task) {
      return { success: false, error: 'NLU task not specified.', output: null };
    }

    try {
      let resultOutput: any;

      switch (task) {
        case 'sentiment_analysis':
          if (!this.sentimentPipeline) {
            throw new Error('Sentiment analysis pipeline not initialized.');
          }
          if (!parameters.text) {
            throw new Error('Text is required for sentiment analysis.');
          }
          const sentimentResult = await this.sentimentPipeline(parameters.text);
          resultOutput = sentimentResult;
          break;

        case 'emotion_detection':
          if (!this.emotionPipeline) {
            throw new Error('Emotion detection pipeline not initialized.');
          }
          if (!parameters.audio) {
            throw new Error('Audio data is required for emotion detection.');
          }
          // Assuming parameters.audio is a Blob or AudioBuffer
          const emotionResult = await this.emotionPipeline(parameters.audio);
          resultOutput = emotionResult;
          break;

        case 'zero_shot_classification':
          // Placeholder for zero-shot classification
          resultOutput = { message: 'Zero-shot classification not yet implemented.' };
          break;

        case 'feature_extraction':
          // Placeholder for feature extraction
          resultOutput = { message: 'Feature extraction not yet implemented.' };
          break;

        default:
          return { success: false, error: `Unknown NLU task: ${task}`, output: null };
      }

      return {
        success: true,
        output: resultOutput,
        metadata: {
          executionTime: Date.now() - startTime,
          task: task,
        },
      };
    } catch (error: any) {
      console.error(`${this.name} execution error for task ${task}:`, error);
      return {
        success: false,
        error: error.message || 'An unknown error occurred during NLU task.',
        output: null,
        metadata: {
          executionTime: Date.now() - startTime,
          task: task,
        },
      };
    }
  }

  async canHandle(query: string): Promise<number> {
    const lowerQuery = query.toLowerCase();
    const keywords = ['sentiment', 'analyse de sentiment', 'emotion', 'classification', 'nlu', 'language understanding', 'tonalité', 'humeur'];
    const matchCount = keywords.filter(keyword => lowerQuery.includes(keyword)).length;
    return matchCount > 0 ? 0.7 : 0;
  }

  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    switch (task) {
      case 'sentiment_analysis':
        return [{ name: 'text', type: 'string', required: true, description: 'The text to analyze for sentiment.' }];
      case 'emotion_detection':
        return [{ name: 'audio', type: 'object', required: true, description: 'The audio data (Blob or AudioBuffer) to analyze for emotion.' }];
      case 'zero_shot_classification':
        return [
          { name: 'text', type: 'string', required: true, description: 'The text to classify.' },
          { name: 'candidate_labels', type: 'array', required: true, description: 'A list of candidate labels.' },
        ];
      case 'feature_extraction':
        return [{ name: 'text', type: 'string', required: true, description: 'The text to extract features from.' }];
      default:
        return [];
    }
  }

  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'sentiment_analysis',
        description: 'Analyzes the sentiment of a given text (positive, negative, neutral).',
        requiredParameters: await this.getRequiredParameters('sentiment_analysis'),
      },
      {
        name: 'emotion_detection',
        description: 'Detects emotions from speech audio.',
        requiredParameters: await this.getRequiredParameters('emotion_detection'),
      },
      {
        name: 'zero_shot_classification',
        description: 'Classifies text into categories without explicit training data.',
        requiredParameters: await this.getRequiredParameters('zero_shot_classification'),
      },
      {
        name: 'feature_extraction',
        description: 'Extracts numerical features from text for use in other models.',
        requiredParameters: await this.getRequiredParameters('feature_extraction'),
      },
    ];
  }
}
