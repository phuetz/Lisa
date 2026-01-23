/**
 * Types for Markdown Renderer
 */

import type { ReactNode, CSSProperties } from 'react';

export interface MarkdownRendererProps {
  /** Markdown content to render */
  content: string;
  /** Theme mode */
  theme?: 'dark' | 'light';
  /** Enable syntax highlighting */
  syntaxHighlight?: boolean;
  /** Enable code execution for Python blocks */
  enableCodeExecution?: boolean;
  /** Allow raw HTML in markdown */
  allowHtml?: boolean;
  /** Link target for external links */
  linkTarget?: '_blank' | '_self';
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: CSSProperties;
  /** Callback when code is executed */
  onCodeExecute?: (code: string, language: string, result: unknown) => void;
  /** Callback when a link is clicked */
  onLinkClick?: (href: string) => void;
  /** Custom component overrides */
  components?: Record<string, React.ComponentType<unknown>>;
}

export interface SyntaxHighlighterProps {
  /** Code to highlight */
  code: string;
  /** Programming language */
  language: string;
  /** Theme mode */
  theme?: 'dark' | 'light';
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Starting line number */
  startingLineNumber?: number;
  /** Lines to highlight */
  highlightLines?: number[];
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: CSSProperties;
  /** Wrap long lines */
  wrapLongLines?: boolean;
}

export interface CodeBlockProps {
  code: string;
  language: string;
  theme?: 'dark' | 'light';
  enableExecution?: boolean;
  onExecute?: (code: string, result: unknown) => void;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  function: string;
  operator: string;
  variable: string;
  class: string;
  punctuation: string;
}

export const DARK_THEME: ThemeColors = {
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  comment: '#6c7086',
  keyword: '#cba6f7',
  string: '#a6e3a1',
  number: '#fab387',
  function: '#89b4fa',
  operator: '#89dceb',
  variable: '#f5e0dc',
  class: '#f9e2af',
  punctuation: '#9399b2'
};

export const LIGHT_THEME: ThemeColors = {
  background: '#ffffff',
  foreground: '#1a1a1a',
  comment: '#6a737d',
  keyword: '#d73a49',
  string: '#22863a',
  number: '#005cc5',
  function: '#6f42c1',
  operator: '#d73a49',
  variable: '#24292e',
  class: '#6f42c1',
  punctuation: '#24292e'
};
