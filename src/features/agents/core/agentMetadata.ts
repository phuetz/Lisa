
import { AgentCategory } from './registryEnhanced';

export interface AgentMetadata {
  name: string;
  description: string;
  icon: string; // Icon name from Lucide
  displayName?: string;
}

export const agentMetadata: Record<string, AgentMetadata> = {
  // Core
  NLUAgent: {
    name: 'NLUAgent',
    displayName: 'NLU Core',
    description: 'Natural Language Understanding module for intent classification and entity extraction.',
    icon: 'Brain'
  },
  PlannerAgent: {
    name: 'PlannerAgent',
    displayName: 'Task Planner',
    description: 'Decomposes complex goals into executable steps and manages dependencies.',
    icon: 'Map'
  },
  MemoryAgent: {
    name: 'MemoryAgent',
    displayName: 'Memory Manager',
    description: 'Manages short-term and long-term memory (Vector DB).',
    icon: 'Database'
  },
  CoordinatorAgent: {
    name: 'CoordinatorAgent',
    displayName: 'Coordinator',
    description: 'Orchestrates agent execution and data flow.',
    icon: 'GitMerge'
  },

  // Perception - Vision
  VisionAgent: {
    name: 'VisionAgent',
    displayName: 'Vision',
    description: 'Real-time object detection and visual reasoning (YOLO/MediaPipe).',
    icon: 'Eye'
  },
  ImageAnalysisAgent: {
    name: 'ImageAnalysisAgent',
    displayName: 'Image Analyst',
    description: 'Deep analysis of static images and scene understanding.',
    icon: 'ImageIcon'
  },
  OCRAgent: {
    name: 'OCRAgent',
    displayName: 'OCR',
    description: 'Extracts text from images and documents.',
    icon: 'ScanText'
  },

  // Perception - Audio
  HearingAgent: {
    name: 'HearingAgent',
    displayName: 'Hearing',
    description: 'Speech-to-text and environmental sound classification.',
    icon: 'Ear'
  },
  AudioAnalysisAgent: {
    name: 'AudioAnalysisAgent',
    displayName: 'Audio Analyst',
    description: 'Advanced audio signal processing and analysis.',
    icon: 'Waveform'
  },
  SpeechSynthesisAgent: {
    name: 'SpeechSynthesisAgent',
    displayName: 'Voice',
    description: 'Text-to-speech generation.',
    icon: 'Mic'
  },

  // Development
  CodeInterpreterAgent: {
    name: 'CodeInterpreterAgent',
    displayName: 'Code Interpreter',
    description: 'Executes Python/JS code safely in a sandbox.',
    icon: 'Terminal'
  },
  GitHubAgent: {
    name: 'GitHubAgent',
    displayName: 'GitHub',
    description: 'Interacts with GitHub repositories (issues, PRs, code).',
    icon: 'Github'
  },
  GeminiCodeAgent: {
    name: 'GeminiCodeAgent',
    displayName: 'Gemini Code',
    description: 'Specialized coding assistant powered by Gemini.',
    icon: 'Code2'
  },
  PowerShellAgent: {
    name: 'PowerShellAgent',
    displayName: 'PowerShell',
    description: 'Executes system commands via PowerShell.',
    icon: 'Command'
  },

  // Analysis
  DataAnalysisAgent: {
    name: 'DataAnalysisAgent',
    displayName: 'Data Analysis',
    description: 'Basic statistical analysis and data processing.',
    icon: 'Calculator'
  },
  DataAnalystAgent: {
    name: 'DataAnalystAgent',
    displayName: 'Data Analyst',
    description: 'Advanced data insights, visualization, and reporting.',
    icon: 'BarChart3'
  },
  ResearchAgent: {
    name: 'ResearchAgent',
    displayName: 'Researcher',
    description: 'Conducts deep web research and summarizes findings.',
    icon: 'Search'
  },

  // Tools
  WebSearchAgent: {
    name: 'WebSearchAgent',
    displayName: 'Web Search',
    description: 'Performs google searches.',
    icon: 'Globe'
  },
  WebContentReaderAgent: {
    name: 'WebContentReaderAgent',
    displayName: 'Web Reader',
    description: 'Reads and extracts content from web pages.',
    icon: 'FileText'
  },
  WeatherAgent: {
    name: 'WeatherAgent',
    displayName: 'Weather',
    description: 'Provides weather forecasts and conditions.',
    icon: 'CloudSun'
  },
  CalendarAgent: {
    name: 'CalendarAgent',
    displayName: 'Calendar',
    description: 'Manages events and schedules.',
    icon: 'Calendar'
  },

  // IoT
  SmartHomeAgent: {
    name: 'SmartHomeAgent',
    displayName: 'Smart Home',
    description: 'Controls IoT devices (lights, thermostat, etc.).',
    icon: 'Home'
  },
  MQTTAgent: {
    name: 'MQTTAgent',
    displayName: 'MQTT',
    description: 'Publishes and subscribes to MQTT topics.',
    icon: 'Radio'
  },
  RobotAgent: {
    name: 'RobotAgent',
    displayName: 'Robot Control',
    description: 'Interface for physical robot control.',
    icon: 'Bot'
  },
  RosAgent: {
    name: 'RosAgent',
    displayName: 'ROS Bridge',
    description: 'Communicates with Robot Operating System.',
    icon: 'Cpu'
  },

  // Workflow
  ConditionAgent: {
    name: 'ConditionAgent',
    displayName: 'Logic: Condition',
    description: 'Evaluates conditions (If/Else) in workflows.',
    icon: 'Split'
  },
  UserWorkflowAgent: {
    name: 'UserWorkflowAgent',
    displayName: 'User Interaction',
    description: 'Requests user input or confirmation.',
    icon: 'UserCheck'
  },
  
  // Default fallback
  DEFAULT: {
    name: 'Unknown',
    displayName: 'Agent',
    description: 'Standard system agent.',
    icon: 'Box'
  }
};

export function getAgentMetadata(name: string): AgentMetadata {
  return agentMetadata[name] || { ...agentMetadata.DEFAULT, name };
}
