/**
 * @lisa-ai/markdown-renderer
 * Advanced Markdown renderer with syntax highlighting and code execution
 * 
 * @example
 * ```tsx
 * import { MarkdownRenderer, SyntaxHighlighter } from '@lisa/markdown-renderer';
 * 
 * <MarkdownRenderer 
 *   content="# Hello\n```python\nprint('Hello')\n```"
 *   theme="dark"
 *   enableCodeExecution
 * />
 * ```
 */

// Components
export { MarkdownRenderer } from './MarkdownRenderer';
export { SyntaxHighlighter } from './SyntaxHighlighter';

// Types
export type {
  MarkdownRendererProps,
  SyntaxHighlighterProps,
  CodeBlockProps,
  ThemeColors,
} from './types';

// Theme constants
export { DARK_THEME, LIGHT_THEME } from './types';

// Supported languages for syntax highlighting
export const SUPPORTED_CODE_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
  'html', 'css', 'scss', 'json', 'yaml', 'xml', 'markdown',
  'sql', 'bash', 'shell', 'powershell', 'dockerfile',
] as const;

export type SupportedCodeLanguage = typeof SUPPORTED_CODE_LANGUAGES[number];
