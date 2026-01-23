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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">📧 Email Assistant</h3>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Subject"
              value={emailInput.subject}
              onChange={(e) => setEmailInput({ ...emailInput, subject: e.target.value })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <textarea
              placeholder="Email body"
              value={emailInput.body}
              onChange={(e) => setEmailInput({ ...emailInput, body: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleClassify}
              disabled={loading}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Classify
            </button>
            <button
              onClick={handleDetectSpam}
              disabled={loading}
              className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              Spam?
            </button>
            <button
              onClick={handleGenerateReply}
              disabled={loading}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
            >
              <Send className="w-3 h-3" />
              Reply
            </button>
          </div>

          {result && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded max-h-60 overflow-y-auto">
              {resultType === 'classify' && (
                <div>
                  <div className="font-semibold">Category: {result.category}</div>
                  <div className="text-sm">Confidence: {(result.confidence * 100).toFixed(0)}%</div>
                  {result.suggestedActions && (
                    <div className="mt-2 text-xs">
                      <div className="font-semibold">Suggested Actions:</div>
                      {result.suggestedActions.map((action: string, i: number) => (
                        <div key={i}>• {action}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {resultType === 'spam' && (
                <div>
                  <div className="font-semibold">{result.isSpam ? '⚠️ SPAM DETECTED' : '✅ Legitimate'}</div>
                  <div className="text-sm">Spam Score: {result.spamScore}/100</div>
                  <div className="text-xs mt-1">{result.recommendation}</div>
                </div>
              )}
              {resultType === 'reply' && (
                <div>
                  <div className="font-semibold">Generated Reply:</div>
                  <div className="text-sm mt-2 p-2 bg-white dark:bg-gray-800 rounded">{result.reply}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
