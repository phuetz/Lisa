/**
 * Code Assistant Page - Assistant Code
 */

import { useState, useCallback } from 'react';
import { OfficePageLayout } from '../components/layout/OfficePageLayout';
import { useOfficeThemeStore } from '../store/officeThemeStore';
import {
  Code, Play, AlertTriangle, CheckCircle, Info,
  FileCode, TestTube, Zap, Copy, RefreshCw
} from 'lucide-react';
import {
  codeAssistantService,
  type CodeReview,
  type CodeIssue,
  type CodeSuggestion
} from '../services/CodeAssistantService';

interface ThemeColors {
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  editor: string;
  editorText: string;
  editorSecondary: string;
  dialog: string;
  border: string;
  accent: string;
  success: string;
  error: string;
  inputBg: string;
  inputBorder: string;
}

const IssueItem = ({ issue, colors }: { issue: CodeIssue; colors: ThemeColors }) => {
  const severityColors = {
    critical: { color: '#ef4444', bg: '#ef444420' },
    major: { color: '#f59e0b', bg: '#f59e0b20' },
    minor: { color: '#3b82f6', bg: '#3b82f620' },
  };

  const typeIcons = {
    error: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = typeIcons[issue.type];
  const sColors = severityColors[issue.severity];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px',
        backgroundColor: sColors.bg,
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <Icon size={16} color={sColors.color} style={{ marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', color: colors.editorText, margin: 0 }}>
          {issue.message}
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: colors.editorSecondary }}>
            Ligne {issue.line}
          </span>
          {issue.rule && (
            <span style={{ fontSize: '11px', color: colors.editorSecondary, opacity: 0.7 }}>
              {issue.rule}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SuggestionItem = ({ suggestion, colors }: { suggestion: CodeSuggestion; colors: ThemeColors }) => {
  const typeColors: Record<string, string> = {
    refactor: '#8b5cf6',
    performance: '#10a37f',
    security: '#ef4444',
    style: '#3b82f6',
    test: '#f59e0b',
  };

  return (
    <div
      style={{
        padding: '14px',
        backgroundColor: colors.sidebar,
        borderRadius: '10px',
        borderLeft: `3px solid ${typeColors[suggestion.type] || colors.editorSecondary}`,
        marginBottom: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span
          style={{
            padding: '2px 6px',
            backgroundColor: `${typeColors[suggestion.type]}20`,
            color: typeColors[suggestion.type],
            borderRadius: '4px',
            fontSize: '10px',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {suggestion.type}
        </span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: colors.editorText }}>
          {suggestion.title}
        </span>
      </div>
      <p style={{ fontSize: '13px', color: colors.editorSecondary, margin: 0, lineHeight: 1.5 }}>
        {suggestion.description}
      </p>
    </div>
  );
};

const MetricsDisplay = ({ metrics, colors }: { metrics: CodeReview['metrics']; colors: ThemeColors }) => {
  if (!metrics) return null;

  const getColor = (value: number, thresholds: [number, number]) => {
    if (value >= thresholds[1]) return '#10a37f';
    if (value >= thresholds[0]) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '20px',
    }}>
      <div style={{
        padding: '16px',
        backgroundColor: colors.sidebar,
        borderRadius: '10px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '24px', fontWeight: 600, color: colors.editorText, margin: 0 }}>
          {metrics.linesOfCode}
        </p>
        <p style={{ fontSize: '12px', color: colors.editorSecondary, marginTop: '4px' }}>Lignes de code</p>
      </div>
      <div style={{
        padding: '16px',
        backgroundColor: colors.sidebar,
        borderRadius: '10px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '24px',
          fontWeight: 600,
          color: getColor(100 - metrics.complexity, [60, 80]),
          margin: 0,
        }}>
          {metrics.complexity}
        </p>
        <p style={{ fontSize: '12px', color: colors.editorSecondary, marginTop: '4px' }}>Complexite</p>
      </div>
      <div style={{
        padding: '16px',
        backgroundColor: colors.sidebar,
        borderRadius: '10px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '24px',
          fontWeight: 600,
          color: getColor(metrics.maintainability, [50, 70]),
          margin: 0,
        }}>
          {metrics.maintainability}%
        </p>
        <p style={{ fontSize: '12px', color: colors.editorSecondary, marginTop: '4px' }}>Maintenabilite</p>
      </div>
    </div>
  );
};

export default function CodeAssistantPage() {
  const [code, setCode] = useState('');
  const [filename, setFilename] = useState('example.ts');
  const [review, setReview] = useState<CodeReview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'issues' | 'suggestions'>('issues');

  const { getCurrentColors } = useOfficeThemeStore();
  const colors = getCurrentColors();

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) return;

    setIsAnalyzing(true);
    const result = await codeAssistantService.reviewCode(code, filename);
    setReview(result);
    setIsAnalyzing(false);
  }, [code, filename]);

  const handleGenerateTests = useCallback(async () => {
    if (!code.trim()) return;

    const tests = await codeAssistantService.generateTests(code, filename);
    console.log('Tests generes:', tests);
  }, [code, filename]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  const exampleCode = `export function calculateTotal(items: Item[]): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  console.log('Total:', total);
  return total;
}

export async function fetchUserData(userId: string) {
  const response = await fetch('/api/users/' + userId);
  return response.json();
}`;

  return (
    <OfficePageLayout
      title="Assistant Code"
      subtitle="Review de code, analyse statique et generation de tests"
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
      }}>
        {/* Code Input */}
        <div
          style={{
            backgroundColor: colors.dialog,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={18} color={colors.editorSecondary} />
              <input
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="filename.ts"
                style={{
                  padding: '6px 10px',
                  backgroundColor: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: '6px',
                  color: colors.editorText,
                  fontSize: '13px',
                  width: '150px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopyCode}
                aria-label="Copier le code"
                style={{
                  padding: '8px',
                  backgroundColor: colors.sidebar,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: colors.editorSecondary,
                }}
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => setCode(exampleCode)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.sidebar,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: colors.editorSecondary,
                  fontSize: '12px',
                }}
              >
                Exemple
              </button>
            </div>
          </div>

          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Collez votre code ici..."
            style={{
              width: '100%',
              height: '400px',
              padding: '14px',
              backgroundColor: colors.sidebar,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.editorText,
              fontSize: '13px',
              fontFamily: 'monospace',
              resize: 'none',
              lineHeight: 1.6,
            }}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !code.trim()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                backgroundColor: isAnalyzing || !code.trim() ? colors.sidebarHover : colors.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: isAnalyzing || !code.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: !code.trim() ? 0.5 : 1,
              }}
            >
              {isAnalyzing ? (
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Play size={16} />
              )}
              {isAnalyzing ? 'Analyse...' : 'Analyser'}
            </button>
            <button
              onClick={handleGenerateTests}
              disabled={!code.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: colors.sidebar,
                color: colors.editorText,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: !code.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: !code.trim() ? 0.5 : 1,
              }}
            >
              <TestTube size={16} />
              Tests
            </button>
          </div>
        </div>

        {/* Results */}
        <div
          style={{
            backgroundColor: colors.dialog,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}>
            <Zap size={18} color="#10a37f" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: colors.editorText, margin: 0 }}>
              Resultats
            </h3>
          </div>

          {review ? (
            <>
              {/* Metrics */}
              <MetricsDisplay metrics={review.metrics} colors={colors} />

              {/* Tabs */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: `1px solid ${colors.border}`,
                paddingBottom: '12px',
              }}>
                <button
                  onClick={() => setActiveTab('issues')}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: activeTab === 'issues' ? colors.accent : 'transparent',
                    color: activeTab === 'issues' ? '#fff' : colors.editorSecondary,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Problemes ({review.issues.length})
                </button>
                <button
                  onClick={() => setActiveTab('suggestions')}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: activeTab === 'suggestions' ? colors.accent : 'transparent',
                    color: activeTab === 'suggestions' ? '#fff' : colors.editorSecondary,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Suggestions ({review.suggestions.length})
                </button>
              </div>

              {/* Content */}
              <div style={{ maxHeight: '350px', overflow: 'auto' }}>
                {activeTab === 'issues' && (
                  review.issues.length > 0 ? (
                    review.issues.map((issue, i) => (
                      <IssueItem key={i} issue={issue} colors={colors} />
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: colors.editorSecondary }}>
                      <CheckCircle size={32} color="#10a37f" style={{ marginBottom: '12px' }} />
                      <p style={{ margin: 0 }}>Aucun probleme detecte</p>
                    </div>
                  )
                )}

                {activeTab === 'suggestions' && (
                  review.suggestions.length > 0 ? (
                    review.suggestions.map((suggestion, i) => (
                      <SuggestionItem key={i} suggestion={suggestion} colors={colors} />
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: colors.editorSecondary }}>
                      <CheckCircle size={32} color="#10a37f" style={{ marginBottom: '12px' }} />
                      <p style={{ margin: 0 }}>Aucune suggestion</p>
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: colors.editorSecondary,
            }}>
              <Code size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '15px', marginBottom: '8px' }}>
                Collez votre code et cliquez sur Analyser
              </p>
              <p style={{ fontSize: '13px' }}>
                Obtenez des suggestions d'amelioration et detectez les problemes
              </p>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </OfficePageLayout>
  );
}
