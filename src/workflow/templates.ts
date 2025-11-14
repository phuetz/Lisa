/**
 * Pre-configured workflow templates
 * Common task patterns ready to use
 */

import type { WorkflowPlan, WorkflowStep } from '../types/Planner';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  plan: WorkflowPlan;
}

/**
 * Morning routine workflow
 */
export const morningRoutineTemplate: WorkflowTemplate = {
  id: 'morning-routine',
  name: 'Morning Routine',
  description: 'Complete morning briefing with weather, calendar, and news',
  category: 'Productivity',
  tags: ['daily', 'routine', 'briefing'],
  plan: {
    goal: 'Morning briefing',
    steps: [
      {
        id: 'weather',
        agentName: 'WeatherAgent',
        action: 'Get current weather and forecast',
        input: { location: 'auto' },
        dependencies: [],
      },
      {
        id: 'calendar',
        agentName: 'CalendarAgent',
        action: 'Get today\'s events',
        input: { timeframe: 'today' },
        dependencies: [],
      },
      {
        id: 'news',
        agentName: 'NewsAgent',
        action: 'Get top headlines',
        input: { count: 5 },
        dependencies: [],
      },
      {
        id: 'summary',
        agentName: 'ContentGeneratorAgent',
        action: 'Generate morning summary',
        input: {
          weather: '${weather.output}',
          calendar: '${calendar.output}',
          news: '${news.output}',
        },
        dependencies: ['weather', 'calendar', 'news'],
      },
    ],
  },
};

/**
 * Research task workflow
 */
export const researchTemplate: WorkflowTemplate = {
  id: 'research-task',
  name: 'Research Task',
  description: 'Comprehensive research with web search and summarization',
  category: 'Research',
  tags: ['research', 'web', 'analysis'],
  plan: {
    goal: 'Research topic',
    steps: [
      {
        id: 'search',
        agentName: 'WebSearchAgent',
        action: 'Search for information',
        input: { query: '${topic}' },
        dependencies: [],
      },
      {
        id: 'read',
        agentName: 'WebContentReaderAgent',
        action: 'Read top results',
        input: { urls: '${search.output.urls}' },
        dependencies: ['search'],
      },
      {
        id: 'analyze',
        agentName: 'DataAnalysisAgent',
        action: 'Analyze content',
        input: { data: '${read.output}' },
        dependencies: ['read'],
      },
      {
        id: 'summarize',
        agentName: 'ContentGeneratorAgent',
        action: 'Generate summary',
        input: { analysis: '${analyze.output}' },
        dependencies: ['analyze'],
      },
    ],
  },
};

/**
 * Meeting preparation workflow
 */
export const meetingPrepTemplate: WorkflowTemplate = {
  id: 'meeting-prep',
  name: 'Meeting Preparation',
  description: 'Prepare for upcoming meeting with agenda and materials',
  category: 'Productivity',
  tags: ['meeting', 'preparation', 'productivity'],
  plan: {
    goal: 'Prepare for meeting',
    steps: [
      {
        id: 'get-event',
        agentName: 'CalendarAgent',
        action: 'Get next meeting',
        input: { timeframe: 'next' },
        dependencies: [],
      },
      {
        id: 'search-materials',
        agentName: 'WebSearchAgent',
        action: 'Search for related materials',
        input: { query: '${get-event.output.title}' },
        dependencies: ['get-event'],
      },
      {
        id: 'generate-notes',
        agentName: 'NotesAgent',
        action: 'Create meeting notes template',
        input: { meeting: '${get-event.output}' },
        dependencies: ['get-event'],
      },
      {
        id: 'prep-summary',
        agentName: 'ContentGeneratorAgent',
        action: 'Generate preparation summary',
        input: {
          meeting: '${get-event.output}',
          materials: '${search-materials.output}',
        },
        dependencies: ['get-event', 'search-materials'],
      },
    ],
  },
};

/**
 * Code analysis workflow
 */
export const codeAnalysisTemplate: WorkflowTemplate = {
  id: 'code-analysis',
  name: 'Code Analysis',
  description: 'Analyze code for issues and improvements',
  category: 'Development',
  tags: ['code', 'analysis', 'development'],
  plan: {
    goal: 'Analyze code',
    steps: [
      {
        id: 'read-code',
        agentName: 'CodeInterpreterAgent',
        action: 'Read code file',
        input: { file: '${filePath}' },
        dependencies: [],
      },
      {
        id: 'analyze',
        agentName: 'DataAnalysisAgent',
        action: 'Analyze code structure',
        input: { code: '${read-code.output}' },
        dependencies: ['read-code'],
      },
      {
        id: 'security-check',
        agentName: 'SecurityAgent',
        action: 'Check for security issues',
        input: { code: '${read-code.output}' },
        dependencies: ['read-code'],
      },
      {
        id: 'generate-report',
        agentName: 'ContentGeneratorAgent',
        action: 'Generate analysis report',
        input: {
          analysis: '${analyze.output}',
          security: '${security-check.output}',
        },
        dependencies: ['analyze', 'security-check'],
      },
    ],
  },
};

/**
 * Data processing workflow
 */
export const dataProcessingTemplate: WorkflowTemplate = {
  id: 'data-processing',
  name: 'Data Processing',
  description: 'Process and analyze data with visualization',
  category: 'Data',
  tags: ['data', 'analysis', 'visualization'],
  plan: {
    goal: 'Process data',
    steps: [
      {
        id: 'load',
        agentName: 'DataAnalysisAgent',
        action: 'Load data',
        input: { source: '${dataSource}' },
        dependencies: [],
      },
      {
        id: 'clean',
        agentName: 'DataAnalysisAgent',
        action: 'Clean data',
        input: { data: '${load.output}' },
        dependencies: ['load'],
      },
      {
        id: 'analyze',
        agentName: 'DataAnalysisAgent',
        action: 'Analyze patterns',
        input: { data: '${clean.output}' },
        dependencies: ['clean'],
      },
      {
        id: 'visualize',
        agentName: 'VisualizationAgent',
        action: 'Create visualizations',
        input: { analysis: '${analyze.output}' },
        dependencies: ['analyze'],
      },
      {
        id: 'report',
        agentName: 'ContentGeneratorAgent',
        action: 'Generate report',
        input: {
          analysis: '${analyze.output}',
          visualizations: '${visualize.output}',
        },
        dependencies: ['analyze', 'visualize'],
      },
    ],
  },
};

/**
 * Smart home automation workflow
 */
export const smartHomeTemplate: WorkflowTemplate = {
  id: 'smart-home-routine',
  name: 'Smart Home Routine',
  description: 'Automated smart home actions based on conditions',
  category: 'IoT',
  tags: ['smart-home', 'automation', 'iot'],
  plan: {
    goal: 'Execute smart home routine',
    steps: [
      {
        id: 'check-presence',
        agentName: 'SmartHomeAgent',
        action: 'Check presence',
        input: {},
        dependencies: [],
      },
      {
        id: 'get-weather',
        agentName: 'WeatherAgent',
        action: 'Get current weather',
        input: {},
        dependencies: [],
      },
      {
        id: 'adjust-lights',
        agentName: 'SmartHomeAgent',
        action: 'Adjust lighting',
        input: {
          presence: '${check-presence.output}',
          weather: '${get-weather.output}',
        },
        dependencies: ['check-presence', 'get-weather'],
      },
      {
        id: 'adjust-climate',
        agentName: 'SmartHomeAgent',
        action: 'Adjust climate',
        input: {
          presence: '${check-presence.output}',
          weather: '${get-weather.output}',
        },
        dependencies: ['check-presence', 'get-weather'],
      },
    ],
  },
};

/**
 * Email processing workflow
 */
export const emailProcessingTemplate: WorkflowTemplate = {
  id: 'email-processing',
  name: 'Email Processing',
  description: 'Process and categorize incoming emails',
  category: 'Productivity',
  tags: ['email', 'productivity', 'automation'],
  plan: {
    goal: 'Process emails',
    steps: [
      {
        id: 'fetch',
        agentName: 'EmailAgent',
        action: 'Fetch unread emails',
        input: { folder: 'inbox' },
        dependencies: [],
      },
      {
        id: 'categorize',
        agentName: 'ContentGeneratorAgent',
        action: 'Categorize emails',
        input: { emails: '${fetch.output}' },
        dependencies: ['fetch'],
      },
      {
        id: 'extract-tasks',
        agentName: 'TodoAgent',
        action: 'Extract tasks from emails',
        input: { emails: '${fetch.output}' },
        dependencies: ['fetch'],
      },
      {
        id: 'generate-summary',
        agentName: 'ContentGeneratorAgent',
        action: 'Summarize important emails',
        input: {
          emails: '${fetch.output}',
          categories: '${categorize.output}',
        },
        dependencies: ['fetch', 'categorize'],
      },
    ],
  },
};

/**
 * Health monitoring workflow
 */
export const healthMonitoringTemplate: WorkflowTemplate = {
  id: 'health-monitoring',
  name: 'Health Monitoring',
  description: 'Monitor and analyze health metrics',
  category: 'Health',
  tags: ['health', 'monitoring', 'wellness'],
  plan: {
    goal: 'Monitor health metrics',
    steps: [
      {
        id: 'collect',
        agentName: 'HealthMonitorAgent',
        action: 'Collect health data',
        input: {},
        dependencies: [],
      },
      {
        id: 'analyze',
        agentName: 'DataAnalysisAgent',
        action: 'Analyze trends',
        input: { data: '${collect.output}' },
        dependencies: ['collect'],
      },
      {
        id: 'recommendations',
        agentName: 'ContentGeneratorAgent',
        action: 'Generate health recommendations',
        input: { analysis: '${analyze.output}' },
        dependencies: ['analyze'],
      },
      {
        id: 'notify',
        agentName: 'NotificationAgent',
        action: 'Send health report',
        input: {
          data: '${collect.output}',
          recommendations: '${recommendations.output}',
        },
        dependencies: ['collect', 'recommendations'],
      },
    ],
  },
};

/**
 * Content creation workflow
 */
export const contentCreationTemplate: WorkflowTemplate = {
  id: 'content-creation',
  name: 'Content Creation',
  description: 'Create content with research and optimization',
  category: 'Content',
  tags: ['content', 'creation', 'writing'],
  plan: {
    goal: 'Create content',
    steps: [
      {
        id: 'research',
        agentName: 'WebSearchAgent',
        action: 'Research topic',
        input: { query: '${topic}' },
        dependencies: [],
      },
      {
        id: 'outline',
        agentName: 'ContentGeneratorAgent',
        action: 'Create outline',
        input: { research: '${research.output}' },
        dependencies: ['research'],
      },
      {
        id: 'write',
        agentName: 'ContentGeneratorAgent',
        action: 'Write content',
        input: { outline: '${outline.output}' },
        dependencies: ['outline'],
      },
      {
        id: 'optimize',
        agentName: 'ContentGeneratorAgent',
        action: 'Optimize for SEO',
        input: { content: '${write.output}' },
        dependencies: ['write'],
      },
    ],
  },
};

/**
 * All available templates
 */
export const workflowTemplates: WorkflowTemplate[] = [
  morningRoutineTemplate,
  researchTemplate,
  meetingPrepTemplate,
  codeAnalysisTemplate,
  dataProcessingTemplate,
  smartHomeTemplate,
  emailProcessingTemplate,
  healthMonitoringTemplate,
  contentCreationTemplate,
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.category === category);
}

/**
 * Get templates by tag
 */
export function getTemplatesByTag(tag: string): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.tags.includes(tag));
}

/**
 * Search templates
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(t => t.id === id);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(workflowTemplates.map(t => t.category)));
}

/**
 * Get all tags
 */
export function getAllTags(): string[] {
  return Array.from(new Set(workflowTemplates.flatMap(t => t.tags)));
}
