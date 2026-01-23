/**
 * Syntax Highlighter Component
 */

import React from 'react';
import type { SyntaxHighlighterProps, ThemeColors } from './types';
import { DARK_THEME, LIGHT_THEME } from './types';

// Token patterns for syntax highlighting
const TOKEN_PATTERNS: Array<{ type: keyof ThemeColors; pattern: RegExp }> = [
  { type: 'comment', pattern: /(#.*$|\/\/.*$|\/\*[\s\S]*?\*\/|"""[\s\S]*?"""|'''[\s\S]*?''')/gm },
  { type: 'string', pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g },
  { type: 'keyword', pattern: /\b(def|class|if|else|elif|for|while|return|import|from|as|try|except|finally|with|async|await|yield|lambda|pass|break|continue|raise|assert|global|nonlocal|del|in|is|not|and|or|True|False|None|const|let|var|function|export|default|interface|type|extends|implements|new|this|super|static|public|private|protected|readonly|abstract|enum|namespace|module|declare|typeof|instanceof|void|null|undefined|async|await)\b/g },
  { type: 'function', pattern: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g },
  { type: 'class', pattern: /\b([A-Z][a-zA-Z0-9_]*)\b/g },
  { type: 'number', pattern: /\b(\d+\.?\d*(?:e[+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\b/gi },
  { type: 'operator', pattern: /([+\-*/%=<>!&|^~?:]+|=>)/g },
  { type: 'punctuation', pattern: /([{}[\]();,.])/g },
];

/**
 * Highlight code with syntax colors
 */
function highlightCode(code: string, theme: ThemeColors): string {
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply token patterns
  for (const { type, pattern } of TOKEN_PATTERNS) {
    const color = theme[type];
    highlighted = highlighted.replace(pattern, (match) => {
      // Don't re-highlight already highlighted content
      if (match.includes('<span')) return match;
      return `<span style="color:${color}">${match}</span>`;
    });
  }

  return highlighted;
}

/**
 * Syntax Highlighter Component
 */
export function SyntaxHighlighter({
  code,
  language,
  theme = 'dark',
  showLineNumbers = true,
  startingLineNumber = 1,
  highlightLines = [],
  className,
  style,
  wrapLongLines = true
}: SyntaxHighlighterProps) {
  const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;
  const lines = code.split('\n');
  const highlightedCode = highlightCode(code, colors);
  const highlightedLines = highlightedCode.split('\n');

  return (
    <div
      className={className}
      style={{
        background: colors.background,
        borderRadius: '8px',
        overflow: 'auto',
        fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
        fontSize: '14px',
        lineHeight: '1.5',
        ...style
      }}
    >
      <pre style={{ margin: 0, padding: '16px' }}>
        <code>
          {highlightedLines.map((line, index) => {
            const lineNumber = startingLineNumber + index;
            const isHighlighted = highlightLines.includes(lineNumber);

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  background: isHighlighted ? 'rgba(255,255,0,0.1)' : 'transparent',
                  marginLeft: showLineNumbers ? 0 : undefined,
                  whiteSpace: wrapLongLines ? 'pre-wrap' : 'pre',
                  wordBreak: wrapLongLines ? 'break-word' : undefined
                }}
              >
                {showLineNumbers && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '40px',
                      paddingRight: '16px',
                      textAlign: 'right',
                      color: colors.comment,
                      userSelect: 'none',
                      flexShrink: 0
                    }}
                  >
                    {lineNumber}
                  </span>
                )}
                <span
                  dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                  style={{ flex: 1 }}
                />
              </div>
            );
          })}
        </code>
      </pre>
      {language && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '12px',
            fontSize: '11px',
            color: colors.comment,
            textTransform: 'uppercase'
          }}
        >
          {language}
        </div>
      )}
    </div>
  );
}

export default SyntaxHighlighter;
