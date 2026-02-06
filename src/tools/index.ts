/**
 * Tools Index - Export all Lisa tools
 */

// Weather
export { WeatherTool, weatherTool } from './WeatherTool';

// Reminders & Alarms
export { ReminderTool, reminderTool } from './ReminderTool';

// Calculator
export { CalculatorTool, calculatorTool } from './CalculatorTool';

// Translator
export { TranslatorTool, translatorTool } from './TranslatorTool';

// Dictionary
export { DictionaryTool, dictionaryTool } from './DictionaryTool';

// Web Summarizer
export { SummarizerTool, summarizerTool } from './SummarizerTool';

// Image Generator
export { ImageGeneratorTool, imageGeneratorTool } from './ImageGeneratorTool';

// Web Search
export { WebSearchTool } from './WebSearchTool';

// Web Content Reader
export { WebContentReaderTool } from './WebContentReaderTool';

// Code Interpreter
export { CodeInterpreterTool } from './CodeInterpreterTool';

// Create singleton instances for tools that don't export them
import { WebSearchTool as WST } from './WebSearchTool';
import { WebContentReaderTool as WCRT } from './WebContentReaderTool';
import { CodeInterpreterTool as CIT } from './CodeInterpreterTool';

export const webSearchTool = new WST();
export const webContentReaderTool = new WCRT();
export const codeInterpreterTool = new CIT();

// Re-import for registry
import { weatherTool } from './WeatherTool';
import { reminderTool } from './ReminderTool';
import { calculatorTool } from './CalculatorTool';
import { translatorTool } from './TranslatorTool';
import { dictionaryTool } from './DictionaryTool';
import { summarizerTool } from './SummarizerTool';
import { imageGeneratorTool } from './ImageGeneratorTool';

// Tool Registry - All available tools
// Legacy tool registry (simple object)
export const toolRegistry = {
  weather: weatherTool,
  reminder: reminderTool,
  calculator: calculatorTool,
  translator: translatorTool,
  dictionary: dictionaryTool,
  summarizer: summarizerTool,
  imageGenerator: imageGeneratorTool,
  webSearch: webSearchTool,
  webContent: webContentReaderTool,
  codeInterpreter: codeInterpreterTool,
};

export type ToolName = keyof typeof toolRegistry;

// New unified ToolRegistry (recommended)
export { toolRegistry as unifiedToolRegistry, ToolRegistry } from '../features/tools';
export type { Tool, ToolResult, ToolCategory } from '../features/tools';
