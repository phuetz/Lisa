/**
 * Markdown Renderer Component
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { MarkdownRendererProps } from './types';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import { DARK_THEME, LIGHT_THEME } from './types';

/**
 * Advanced Markdown Renderer with syntax highlighting and code execution
 */
export function MarkdownRenderer({
  content,
  theme = 'dark',
  syntaxHighlight = true,
  enableCodeExecution = false,
  allowHtml = false,
  linkTarget = '_blank',
  className,
  style,
  onCodeExecute,
  onLinkClick,
  components: customComponents
}: MarkdownRendererProps) {
  const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const components = useMemo(() => ({
    // Code blocks
    code({ inline, className: codeClassName, children, ...props }: {
      inline?: boolean;
      className?: string;
      children?: React.ReactNode;
    }) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const language = match ? match[1] : '';
      const code = String(children).replace(/\n$/, '');

      if (inline) {
        return (
          <code
            style={{
              background: theme === 'dark' ? '#313244' : '#e0e0e0',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.9em',
              fontFamily: "'Fira Code', monospace"
            }}
            {...props}
          >
            {children}
          </code>
        );
      }

      if (syntaxHighlight && language) {
        return (
          <SyntaxHighlighter
            code={code}
            language={language}
            theme={theme}
            showLineNumbers={true}
          />
        );
      }

      return (
        <pre
          style={{
            background: colors.background,
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto'
          }}
        >
          <code {...props}>{children}</code>
        </pre>
      );
    },

    // Links
    a({ href, children, ...props }: {
      href?: string;
      children?: React.ReactNode;
    }) {
      const handleClick = (e: React.MouseEvent) => {
        if (onLinkClick && href) {
          e.preventDefault();
          onLinkClick(href);
        }
      };

      return (
        <a
          href={href}
          target={linkTarget}
          rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined}
          onClick={handleClick}
          style={{
            color: theme === 'dark' ? '#89b4fa' : '#1e88e5',
            textDecoration: 'none'
          }}
          {...props}
        >
          {children}
        </a>
      );
    },

    // Headings
    h1: ({ children, ...props }: { children?: React.ReactNode }) => (
      <h1 style={{ borderBottom: `1px solid ${colors.punctuation}`, paddingBottom: '8px' }} {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: { children?: React.ReactNode }) => (
      <h2 style={{ borderBottom: `1px solid ${colors.punctuation}`, paddingBottom: '6px' }} {...props}>
        {children}
      </h2>
    ),

    // Blockquotes
    blockquote: ({ children, ...props }: { children?: React.ReactNode }) => (
      <blockquote
        style={{
          borderLeft: `4px solid ${colors.keyword}`,
          margin: '16px 0',
          padding: '8px 16px',
          background: theme === 'dark' ? 'rgba(203, 166, 247, 0.1)' : 'rgba(215, 58, 73, 0.1)',
          borderRadius: '0 8px 8px 0'
        }}
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Tables
    table: ({ children, ...props }: { children?: React.ReactNode }) => (
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            margin: '16px 0'
          }}
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }: { children?: React.ReactNode }) => (
      <th
        style={{
          border: `1px solid ${colors.punctuation}`,
          padding: '8px 12px',
          background: theme === 'dark' ? '#313244' : '#f0f0f0',
          textAlign: 'left'
        }}
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }: { children?: React.ReactNode }) => (
      <td
        style={{
          border: `1px solid ${colors.punctuation}`,
          padding: '8px 12px'
        }}
        {...props}
      >
        {children}
      </td>
    ),

    // Lists
    ul: ({ children, ...props }: { children?: React.ReactNode }) => (
      <ul style={{ paddingLeft: '24px', margin: '8px 0' }} {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: { children?: React.ReactNode }) => (
      <ol style={{ paddingLeft: '24px', margin: '8px 0' }} {...props}>
        {children}
      </ol>
    ),

    // Images
    img: ({ src, alt, ...props }: { src?: string; alt?: string }) => (
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          borderRadius: '8px',
          margin: '8px 0'
        }}
        loading="lazy"
        {...props}
      />
    ),

    // Horizontal rule
    hr: () => (
      <hr
        style={{
          border: 'none',
          borderTop: `1px solid ${colors.punctuation}`,
          margin: '24px 0'
        }}
      />
    ),

    // Custom component overrides
    ...customComponents
  }), [theme, colors, syntaxHighlight, linkTarget, onLinkClick, customComponents]);

  return (
    <div
      className={className}
      style={{
        color: colors.foreground,
        lineHeight: 1.6,
        ...style
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={allowHtml ? [rehypeRaw] : []}
        components={components as never}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
