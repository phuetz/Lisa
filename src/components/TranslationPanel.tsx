/**
 * TranslationPanel - Multi-language translation interface
 */

import { useState, useEffect } from 'react';
import { useTranslationAgent } from '../hooks/useTranslation';
import { Languages, ArrowRight } from 'lucide-react';

export const TranslationPanel = () => {
  const { loading, error, translate, detectLanguage, getSupportedLanguages } = useTranslationAgent();
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [languages, setLanguages] = useState<any[]>([]);

  useEffect(() => {
    if (isExpanded && languages.length === 0) {
      getSupportedLanguages().then(res => {
        if (res.success && res.output) {
          setLanguages(res.output.languages || []);
        }
      });
    }
  }, [isExpanded]);

  const handleTranslate = async () => {
    const res = await translate(text, targetLang);
    if (res.success) {
      setResult(res.output);
    }
  };

  const handleDetectLanguage = async () => {
    const res = await detectLanguage(text);
    if (res.success) {
      setResult({ detectedLanguage: res.output });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold">🌐 Translation</h3>
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
            <textarea
              placeholder="Enter text to translate..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
            
            <div className="flex items-center gap-2">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <ArrowRight className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTranslate}
              disabled={loading || !text}
              className="flex-1 px-3 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              Translate
            </button>
            <button
              onClick={handleDetectLanguage}
              disabled={loading || !text}
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Detect
            </button>
          </div>

          {result && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              {result.translatedText && (
                <div>
                  <div className="font-semibold text-sm mb-2">Translation:</div>
                  <div className="p-2 bg-white dark:bg-gray-800 rounded">
                    {result.translatedText}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {result.sourceLang} → {result.targetLang} ({(result.confidence * 100).toFixed(0)}%)
                  </div>
                </div>
              )}
              {result.detectedLanguage && (
                <div>
                  <div className="font-semibold text-sm mb-1">Detected Language:</div>
                  <div className="text-lg">
                    {result.detectedLanguage.languageName} ({result.detectedLanguage.language})
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Confidence: {(result.detectedLanguage.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
