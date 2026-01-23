/**
 * Core Types for Lisa AI Components
 */

// Base component props
export interface LisaComponentProps {
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark' | 'auto';
}

// Output types for code execution
export interface CellOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error';
  name?: 'stdout' | 'stderr';
  text?: string;
  data?: Record<string, string>;
  execution_count?: number;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

// Vision types
export interface DetectionResult {
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FaceDetectionResult extends DetectionResult {
  landmarks?: Array<{ x: number; y: number; z?: number }>;
  expressions?: Record<string, number>;
}

export interface PoseDetectionResult {
  keypoints: Array<{
    name: string;
    x: number;
    y: number;
    z?: number;
    confidence: number;
  }>;
  confidence: number;
}

export interface GestureResult {
  gesture: string;
  confidence: number;
  handedness?: 'left' | 'right';
}

// Audio types
export interface AudioAnalysisResult {
  type: 'speech' | 'music' | 'noise' | 'silence';
  confidence: number;
  transcript?: string;
  language?: string;
  duration?: number;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  language?: string;
}

export interface AudioClassificationResult {
  label: string;
  confidence: number;
  timestamp?: number;
}

// Markdown types
export interface MarkdownRendererOptions {
  syntaxHighlight?: boolean;
  allowHtml?: boolean;
  linkTarget?: '_blank' | '_self';
  codeTheme?: 'dark' | 'light' | 'github' | 'monokai';
  onCodeExecute?: (code: string, language: string) => Promise<CellOutput[]>;
  onLinkClick?: (href: string) => void;
  customComponents?: Record<string, React.ComponentType<unknown>>;
}

// Event types
export interface LisaEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source: string;
}

// Service types
export interface ServiceConfig {
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  options?: Record<string, unknown>;
}

// Error types
export interface LisaError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}
