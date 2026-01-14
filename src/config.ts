/**
 * Application Configuration
 * Centralized configuration for feature flags and app settings
 */

export const AVAILABLE_LLMS = [
  { id: 'gpt-4o', name: 'OpenAI GPT-4o', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'OpenAI GPT-3.5 Turbo', provider: 'openai' },
  { id: 'claude-3-opus', name: 'Anthropic Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-3-sonnet', name: 'Anthropic Claude 3 Sonnet', provider: 'anthropic' },
  { id: 'llama-3-70b', name: 'Meta Llama 3 70B (Groq)', provider: 'groq' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'mistral' },
  { id: 'local-llm', name: 'Local LLM (Ollama/LM Studio)', provider: 'local' },
  { id: 'mock', name: 'Mock (Test)', provider: 'mock' },
];

export const AVAILABLE_VISION_MODELS = [
  { id: 'yolov8n', name: 'YOLOv8 Nano (Cloud)', url: 'https://tfhub.dev/tensorflow/tfjs-model/yolov8n/1/default/1', type: 'tfjs' },
  { id: 'yolov8n-local', name: 'YOLOv8 Nano (Local)', url: '/models/vision/yolov8n/model.json', type: 'tfjs' },
  { id: 'yolov8s', name: 'YOLOv8 Small (Cloud)', url: 'https://tfhub.dev/tensorflow/tfjs-model/yolov8s/1/default/1', type: 'tfjs' }, 
  { id: 'mediapipe', name: 'MediaPipe EfficientDet (CPU)', url: '', type: 'mediapipe' },
];

export interface AppConfig {
  features: {
    advancedVision: boolean;
    advancedHearing: boolean;
    fallDetector: boolean;
  };
  vision: {
    modelUrl: string;
    inputSize: number;
    confidenceThreshold: number;
    iouThreshold: number;
  };
  hearing: {
    enableWhisper: boolean;
    enableSentiment: boolean;
    enableEmotion: boolean;
  };
  fallDetection: {
    enabled: boolean;
    angleThreshold: number;
    velocityThreshold: number;
    groundTimeThreshold: number;
  };
}

export const config: AppConfig = {
  features: {
    advancedVision: false, // Disabled by default - tfhub.dev has CORS issues
    advancedHearing: false, // Disabled by default - HuggingFace models require auth
    fallDetector: true, // Enable fall detection system
  },
  vision: {
    // YOLOv8n model URL - using a publicly available TFJS model
    modelUrl: 'https://tfhub.dev/tensorflow/tfjs-model/yolov8n/1/default/1',
    inputSize: 640,
    confidenceThreshold: 0.5,
    iouThreshold: 0.45,
  },
  hearing: {
    enableWhisper: true,
    enableSentiment: true,
    enableEmotion: true,
  },
  fallDetection: {
    enabled: true,
    angleThreshold: 30, // degrees
    velocityThreshold: 60, // degrees/second
    groundTimeThreshold: 3000, // milliseconds
  },
};

export default config;

