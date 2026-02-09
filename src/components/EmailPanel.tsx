/**
 * EmailPanel - Email management interface
 */

import { useState } from 'react';
import { useEmail } from '../hooks/useEmail';
import { Mail, Sparkles, AlertCircle, Send } from 'lucide-react';

export const EmailPanel = () => {
  const { loading, error, classifyEmail, suggestResponse, detectSpam, generateReply } = useEmail();
  const [isExpanded, setIsExpanded] = useState(false);
  const [emailInput, setEmailInput] = useState({ subject: '', body: '', from: 'test@example.com' });
  const [result, setResult] = useState<any>(null);
  const [resultType, setResultType] = useState<string>('');

  const handleClassify = async () => {
    const email = { ...emailInput, id: Date.now().toString(), to: 'me@example.com', timestamp: Date.now(), read: false };
    const res = await classifyEmail(email);
    if (res.success) {
      setResult(res.output);
      setResultType('classify');
    }
  };

  const handleDetectSpam = async () => {
    const email = { ...emailInput, id: Date.now().toString(), to: 'me@example.com', timestamp: Date.now(), read: false };
    const res = await detectSpam(email);
    if (res.success) {
      setResult(res.output);
      setResultType('spam');
    }
  };

  const handleGenerateReply = async () => {
    const email = { ...emailInput, id: Date.now().toString(), to: 'me@example.com', timestamp: Date.now(), read: false };
    const res = await generateReply(email);
    if (res.success) {
      setResult(res.output);
      setResultType('reply');
    }
  };

  return (
    <div className="rounded-lg p-4 max-w-md" style={{ background: 'var(--bg-panel, #1a1a26)', color: 'var(--text-primary, #e8e8f0)', border: '1px solid var(--border-primary, #2d2d44)', boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))' }}>
      <button
        className="flex items-center justify-between w-full cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="email-panel-content"
        style={{ background: 'none', border: 'none', color: 'inherit', padding: 0 }}
      >
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5" style={{ color: 'var(--color-accent, #f5a623)' }} />
          <h3 className="font-semibold">Email Assistant</h3>
        </div>
      </button>

      {isExpanded && (
        <div id="email-panel-content" className="mt-4 space-y-3">
          {error && (
            <div role="alert" className="text-sm p-2 rounded" style={{ color: 'var(--color-error, #ef4444)', background: 'var(--color-error-subtle, rgba(239,68,68,0.12))' }}>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Sujet"
              value={emailInput.subject}
              onChange={(e) => setEmailInput({ ...emailInput, subject: e.target.value })}
              className="w-full px-3 py-2 rounded"
              style={{ background: 'var(--bg-surface, #12121a)', border: '1px solid var(--border-primary, #2d2d44)', color: 'var(--text-primary, #e8e8f0)' }}
            />
            <textarea
              placeholder="Corps de l'email"
              value={emailInput.body}
              onChange={(e) => setEmailInput({ ...emailInput, body: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded"
              style={{ background: 'var(--bg-surface, #12121a)', border: '1px solid var(--border-primary, #2d2d44)', color: 'var(--text-primary, #e8e8f0)' }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleClassify}
              disabled={loading}
              className="px-3 py-2 text-white rounded disabled:opacity-50 text-sm flex items-center justify-center gap-1"
              style={{ background: 'var(--color-accent, #f5a623)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
            >
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              Classifier
            </button>
            <button
              onClick={handleDetectSpam}
              disabled={loading}
              className="px-3 py-2 text-white rounded disabled:opacity-50 text-sm flex items-center justify-center gap-1"
              style={{ background: 'var(--color-warning, #f59e0b)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
            >
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              Spam?
            </button>
            <button
              onClick={handleGenerateReply}
              disabled={loading}
              className="px-3 py-2 text-white rounded disabled:opacity-50 text-sm flex items-center justify-center gap-1"
              style={{ background: 'var(--color-info, #3b82f6)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
            >
              <Send className="w-3 h-3" aria-hidden="true" />
              Répondre
            </button>
          </div>

          {result && (
            <div className="p-3 rounded max-h-60 overflow-y-auto" style={{ background: 'var(--bg-surface, #12121a)' }}>
              {resultType === 'classify' && (
                <div>
                  <div className="font-semibold">Catégorie: {result.category}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary, #9898b0)' }}>Confiance: {(result.confidence * 100).toFixed(0)}%</div>
                  {result.suggestedActions && (
                    <div className="mt-2 text-xs" style={{ color: 'var(--text-tertiary, #6a6a82)' }}>
                      <div className="font-semibold">Actions suggérées:</div>
                      {result.suggestedActions.map((action: string, i: number) => (
                        <div key={i}>• {action}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {resultType === 'spam' && (
                <div>
                  <div className="font-semibold">{result.isSpam ? 'SPAM DÉTECTÉ' : 'Légitime'}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary, #9898b0)' }}>Score spam: {result.spamScore}/100</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary, #6a6a82)' }}>{result.recommendation}</div>
                </div>
              )}
              {resultType === 'reply' && (
                <div>
                  <div className="font-semibold">Réponse générée:</div>
                  <div className="text-sm mt-2 p-2 rounded" style={{ background: 'var(--bg-tertiary, #1a1a26)', color: 'var(--text-secondary, #9898b0)' }}>{result.reply}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
