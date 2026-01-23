/**
 * Markdown Renderer Component
 * Renders markdown content with support for code blocks, LaTeX math, GFM, and charts
 */

import { useState, useMemo, useRef, Children, isValidElement, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChartData } from '../../utils/chartUtils';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useArtifactPanelStore } from '../../store/artifactPanelStore';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-dark.css';

// Styles personnalisés pour KaTeX (améliorer l'espacement des formules)
const katexStyles = `
  .katex-display {
    margin: 16px 0 !important;
    padding: 12px 0 !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
  }
  .katex-display > .katex {
    text-align: left !important;
    padding-left: 8px !important;
  }
  .katex {
    font-size: 1.1em !important;
    color: inherit !important;
  }
  .katex-html {
    color: inherit !important;
  }
  /* Améliorer les accolades et parenthèses */
  .katex .delimsizing,
  .katex .delimsizinginner {
    color: #888 !important;
  }
  /* Style pour les fractions */
  .katex .frac-line {
    border-color: currentColor !important;
  }
`;
// Lazy load ChartRenderer (recharts = ~150KB)
const ChartRenderer = lazy(() => import('./ChartRenderer').then(m => ({ default: m.ChartRenderer })));
import { parseChartData } from '../../utils/chartUtils';
import { InlineCodeCell } from './InlineCodeCell';

// Chart loading fallback
const ChartFallback = () => (
  <div style={{ 
    backgroundColor: '#1a1a1a', 
    borderRadius: '12px', 
    padding: '24px', 
    textAlign: 'center',
    color: '#888'
  }}>
    Chargement du graphique...
  </div>
);

interface MarkdownRendererProps {
  content: string;
}

// Interface pour les props des éléments code
interface CodeElementProps {
  className?: string;
  children?: ReactNode;
}

// Extraire le texte brut d'un ReactNode (pour la copie)
// Version améliorée qui gère les spans de rehype-highlight
const extractTextFromChildren = (children: ReactNode): string => {
  let text = '';
  
  const extractText = (node: ReactNode): void => {
    if (node === null || node === undefined) return;
    
    if (typeof node === 'string') {
      text += node;
    } else if (typeof node === 'number') {
      text += String(node);
    } else if (Array.isArray(node)) {
      node.forEach(extractText);
    } else if (isValidElement(node)) {
      const props = node.props as { children?: ReactNode };
      if (props.children) {
        extractText(props.children);
      }
    }
  };
  
  extractText(children);
  return text;
};

// Composant Pre wrapper pour les blocs de code
const PreBlock = ({ children, ...props }: { children: ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const { openArtifact } = useArtifactPanelStore();
  const preRef = useRef<HTMLPreElement>(null);
  
  // Extraire le langage depuis le className du code enfant
  let language = 'code';
  
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const childProps = child.props as CodeElementProps;
      const className = childProps.className || '';
      const match = /language-(\w+)/.exec(className);
      if (match) {
        language = match[1];
      }
    }
  });
  
  // Fonction pour obtenir le code depuis le DOM (plus fiable)
  const getCodeContent = (): string => {
    if (preRef.current) {
      return preRef.current.textContent || '';
    }
    // Fallback: extraction depuis children
    return extractTextFromChildren(children);
  };

  // Pour Python, utiliser InlineCodeCell avec exécution
  const isPython = language === 'python' || language === 'py';
  if (isPython) {
    return <InlineCodeCell code={getCodeContent()} language={language} />;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Déterminer le type d'artefact selon le langage
  const getArtifactType = (lang: string) => {
    const langLower = lang.toLowerCase();
    if (langLower === 'react' || langLower === 'jsx' || langLower === 'tsx') return 'react';
    if (langLower === 'html') return 'html';
    if (langLower === 'css') return 'css';
    if (langLower === 'javascript' || langLower === 'js') return 'javascript';
    if (langLower === 'typescript' || langLower === 'ts') return 'typescript';
    return 'javascript';
  };

  const handleViewInArtifact = () => {
    const artifactType = getArtifactType(language);
    const code = getCodeContent();
    console.log('[Artifact Debug] Opening artifact:', {
      language,
      artifactType,
      codeLength: code.length,
      codePreview: code.substring(0, 100),
      preRefExists: !!preRef.current,
    });
    openArtifact({
      id: `code-${Date.now()}`,
      type: artifactType as 'html' | 'react' | 'javascript' | 'css' | 'python' | 'mermaid' | 'svg',
      title: `${language.toUpperCase()} Code`,
      code: code,
      language: language,
    });
  };

  // Langages supportés pour l'artefact - élargi pour inclure plus de cas
  const supportedForArtifact = [
    'react', 'jsx', 'tsx', 'html', 'css', 
    'javascript', 'js', 'typescript', 'ts',
    'json', 'xml', 'svg', 'markdown', 'md',
    'code', '' // Inclure les blocs sans langage spécifié
  ];
  const canOpenInArtifact = supportedForArtifact.includes(language.toLowerCase());

  return (
    <div style={{ position: 'relative', margin: '12px 0' }}>
      {/* Header avec langage et boutons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid #333'
      }}>
        <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: 500 }}>
          {language}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canOpenInArtifact && (
            <button
              onClick={handleViewInArtifact}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#10a37f20',
                border: '1px solid #10a37f50',
                borderRadius: '4px',
                color: '#10a37f',
                cursor: 'pointer',
                fontSize: '11px',
                transition: 'all 0.2s'
              }}
            >
              <ExternalLink size={12} />
              Voir dans l'artefact
            </button>
          )}
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: '1px solid #404040',
              borderRadius: '4px',
              color: copied ? '#10b981' : '#888',
              cursor: 'pointer',
              fontSize: '11px',
              transition: 'all 0.2s'
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      </div>
      {/* Code avec coloration syntaxique (children contient le code coloré par rehype-highlight) */}
      <pre
        ref={preRef}
        {...props}
        style={{
          margin: 0,
          padding: '16px',
          backgroundColor: '#282c34',
          borderRadius: '0 0 8px 8px',
          overflow: 'auto',
          fontSize: '14px',
          lineHeight: 1.5,
          fontFamily: "'Fira Code', 'Consolas', monospace"
        }}
      >
        {children}
      </pre>
    </div>
  );
};

// Préprocesseur pour convertir les délimiteurs LaTeX - version simplifiée
const preprocessLatex = (text: string): string => {
  let processed = text;
  
  // 1. Convertir \[ ... \] en $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$');
  
  // 2. Convertir \( ... \) en $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');
  
  return processed;
};

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  // Cache for successfully parsed charts - persists across re-renders
  const chartCacheRef = useRef<Map<string, ChartData>>(new Map());
  
  // Préprocesser le contenu pour le LaTeX
  const processedContent = useMemo(() => preprocessLatex(content), [content]);
  
  // Extract and cache charts from content before rendering
  // This ensures charts persist even when streaming adds text after them
  const cachedCharts = useMemo(() => {
    const chartRegex = /```(?:chart|json)\s*([\s\S]*?)```/g;
    let match;
    while ((match = chartRegex.exec(processedContent)) !== null) {
      const chartContent = match[1].trim();
      const chartData = parseChartData(chartContent);
      if (chartData) {
        // Use a hash of the chart data as key
        const key = JSON.stringify(chartData.data).substring(0, 100);
        chartCacheRef.current.set(key, chartData);
      }
    }
    return chartCacheRef.current;
  }, [processedContent]);
  
  return (
    <>
      <style>{katexStyles}</style>
      <ReactMarkdown
        remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, output: 'html' }], rehypeHighlight]}
        components={{
        // Pre wrapper pour les blocs de code (avec header et bouton copier)
        pre({ children, ...props }) {
          return <PreBlock {...props}>{children}</PreBlock>;
        },
        // Code inline et blocks
        code({ className, children, node, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !node?.position || (node.position.start.line === node.position.end.line);
          const codeContent = extractTextFromChildren(children);
          
          // Check if this is a chart code block (non-inline only)
          if (!isInline && match && (match[1] === 'chart' || match[1] === 'json')) {
            // Try to parse current content
            let chartData = parseChartData(codeContent);
            
            // If parsing fails, check cache for a matching chart
            if (!chartData && cachedCharts.size > 0) {
              // Try to find a cached chart that starts similarly
              for (const [_key, cached] of cachedCharts) {
                if (codeContent.includes('"type"') && codeContent.includes(cached.type)) {
                  chartData = cached;
                  break;
                }
              }
            }
            
            if (chartData) {
              return (
                <Suspense fallback={<ChartFallback />}>
                  <ChartRenderer chartData={chartData} />
                </Suspense>
              );
            }
          }
          
          // Only render charts for explicit ```chart blocks, not generic JSON
          // This prevents React/JS code from being mistakenly rendered as charts
          
          // Code inline
          if (isInline && !className) {
            return (
              <code
                style={{
                  backgroundColor: '#1e1e1e',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  fontFamily: "'Fira Code', 'Consolas', monospace",
                  color: '#e06c75'
                }}
                {...props}
              >
                {children}
              </code>
            );
          }
          
          // Code block - laisser rehype-highlight colorier (rendu dans PreBlock)
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        // Paragraphs
        p({ children }) {
          return (
            <p style={{ margin: '8px 0', lineHeight: 1.7 }}>
              {children}
            </p>
          );
        },
        // Strong/Bold
        strong({ children }) {
          return (
            <strong style={{ fontWeight: 600, color: '#fff' }}>
              {children}
            </strong>
          );
        },
        // Emphasis/Italic
        em({ children }) {
          return (
            <em style={{ fontStyle: 'italic', color: '#d1d5db' }}>
              {children}
            </em>
          );
        },
        // Links
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#10a37f',
                textDecoration: 'none',
                borderBottom: '1px solid transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = '#10a37f'}
              onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
            >
              {children}
            </a>
          );
        },
        // Lists
        ul({ children }) {
          return (
            <ul style={{ margin: '8px 0', paddingLeft: '24px', listStyleType: 'disc' }}>
              {children}
            </ul>
          );
        },
        ol({ children }) {
          return (
            <ol style={{ margin: '8px 0', paddingLeft: '24px', listStyleType: 'decimal' }}>
              {children}
            </ol>
          );
        },
        li({ children }) {
          return (
            <li style={{ margin: '4px 0', lineHeight: 1.6 }}>
              {children}
            </li>
          );
        },
        // Blockquotes
        blockquote({ children }) {
          return (
            <blockquote
              style={{
                borderLeft: '4px solid #10a37f',
                margin: '12px 0',
                padding: '8px 16px',
                backgroundColor: 'rgba(16, 163, 127, 0.1)',
                borderRadius: '0 8px 8px 0',
                color: '#d1d5db'
              }}
            >
              {children}
            </blockquote>
          );
        },
        // Headings
        h1({ children }) {
          return <h1 style={{ fontSize: '1.5em', fontWeight: 600, margin: '16px 0 8px', color: '#fff' }}>{children}</h1>;
        },
        h2({ children }) {
          return <h2 style={{ fontSize: '1.3em', fontWeight: 600, margin: '14px 0 8px', color: '#fff' }}>{children}</h2>;
        },
        h3({ children }) {
          return <h3 style={{ fontSize: '1.1em', fontWeight: 600, margin: '12px 0 6px', color: '#fff' }}>{children}</h3>;
        },
        // Horizontal rule
        hr() {
          return <hr style={{ border: 'none', borderTop: '1px solid #404040', margin: '16px 0' }} />;
        },
        // Tables
        table({ children }) {
          return (
            <div style={{ overflowX: 'auto', margin: '12px 0' }}>
              <table style={{ 
                borderCollapse: 'collapse', 
                width: '100%',
                fontSize: '14px'
              }}>
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th style={{
              border: '1px solid #404040',
              padding: '8px 12px',
              backgroundColor: '#2d2d2d',
              fontWeight: 600,
              textAlign: 'left'
            }}>
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td style={{
              border: '1px solid #404040',
              padding: '8px 12px'
            }}>
              {children}
            </td>
          );
        },
      }}
      >
        {processedContent}
      </ReactMarkdown>
    </>
  );
};

export default MarkdownRenderer;
