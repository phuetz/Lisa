/**
 * 💻 Code Assistant Page - Assistant Code
 */

import { useState, useCallback } from 'react';
import { ModernLayout } from '../components/layout/ModernLayout';
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

const IssueItem = ({ issue }: { issue: CodeIssue }) => {
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
  const colors = severityColors[issue.severity];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px',
        backgroundColor: colors.bg,
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <Icon size={16} color={colors.color} style={{ marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', color: '#fff', margin: 0 }}>
          {issue.message}
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: '#888' }}>
            Ligne {issue.line}
          </span>
          {issue.rule && (
            <span style={{ fontSize: '11px', color: '#666' }}>
              {issue.rule}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SuggestionItem = ({ suggestion }: { suggestion: CodeSuggestion }) => {
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
        backgroundColor: '#1a1a1a',
        borderRadius: '10px',
        borderLeft: `3px solid ${typeColors[suggestion.type] || '#666'}`,
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
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>
          {suggestion.title}
        </span>
      </div>
      <p style={{ fontSize: '13px', color: '#aaa', margin: 0, lineHeight: 1.5 }}>
        {suggestion.description}
      </p>
    </div>
  );
};

const MetricsDisplay = ({ metrics }: { metrics: CodeReview['metrics'] }) => {
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
        backgroundColor: '#1a1a1a',
        borderRadius: '10px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '24px', fontWeight: 600, color: '#fff', margin: 0 }}>
          {metrics.linesOfCode}
        </p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Lignes de code</p>
      </div>
      <div style={{
        padding: '16px',
        backgroundColor: '#1a1a1a',
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
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Complexité</p>
      </div>
      <div style={{
        padding: '16px',
        backgroundColor: '#1a1a1a',
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
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Maintenabilité</p>
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
    console.log('Tests générés:', tests);
    // TODO: Afficher les tests générés
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
    <ModernLayout title="Assistant Code">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <Code size={24} color="#8b5cf6" />
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: 0 }}>
            Assistant Code
          </h2>
          <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
            Review de code, analyse statique et génération de tests
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
      }}>
        {/* Code Input */}
        <div
          style={{
            backgroundColor: '#2d2d2d',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={18} color="#888" />
              <input
                type="text"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="filename.ts"
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #3d3d3d',
                  borderRadius: '6px',
                  color: '#fff',
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
                  backgroundColor: '#1a1a1a',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#888',
                }}
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => setCode(exampleCode)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#1a1a1a',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#888',
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
              backgroundColor: '#0d0d0d',
              border: '1px solid #2d2d2d',
              borderRadius: '8px',
              color: '#e0e0e0',
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
                backgroundColor: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: isAnalyzing ? 'wait' : 'pointer',
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
                backgroundColor: '#1a1a1a',
                color: '#fff',
                border: '1px solid #3d3d3d',
                borderRadius: '8px',
                cursor: 'pointer',
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
            backgroundColor: '#2d2d2d',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}>
            <Zap size={18} color="#10a37f" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
              Résultats
            </h3>
          </div>

          {review ? (
            <>
              {/* Metrics */}
              <MetricsDisplay metrics={review.metrics} />

              {/* Tabs */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid #3d3d3d',
                paddingBottom: '12px',
              }}>
                <button
                  onClick={() => setActiveTab('issues')}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: activeTab === 'issues' ? '#8b5cf6' : 'transparent',
                    color: activeTab === 'issues' ? '#fff' : '#888',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Problèmes ({review.issues.length})
                </button>
                <button
                  onClick={() => setActiveTab('suggestions')}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: activeTab === 'suggestions' ? '#8b5cf6' : 'transparent',
                    color: activeTab === 'suggestions' ? '#fff' : '#888',
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
                      <IssueItem key={i} issue={issue} />
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      <CheckCircle size={32} color="#10a37f" style={{ marginBottom: '12px' }} />
                      <p style={{ margin: 0 }}>Aucun problème détecté</p>
                    </div>
                  )
                )}

                {activeTab === 'suggestions' && (
                  review.suggestions.length > 0 ? (
                    review.suggestions.map((suggestion, i) => (
                      <SuggestionItem key={i} suggestion={suggestion} />
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
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
              color: '#666',
            }}>
              <Code size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '15px', marginBottom: '8px' }}>
                Collez votre code et cliquez sur Analyser
              </p>
              <p style={{ fontSize: '13px' }}>
                Obtenez des suggestions d'amélioration et détectez les problèmes
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
    </ModernLayout>
  );
}
