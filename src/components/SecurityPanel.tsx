/**
 * SecurityPanel - Security monitoring dashboard
 */

import { useState } from 'react';
import { useSecurity } from '../hooks/useSecurity';
import { Shield, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export const SecurityPanel = () => {
  const { loading, error, securityScore, scanSecurity, detectRisks, getRecommendations } = useSecurity();
  const [isExpanded, setIsExpanded] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [risks, setRisks] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);

  const handleScan = async () => {
    const result = await scanSecurity();
    if (result.success) {
      setScanResult(result.output);
    }
  };

  const handleDetectRisks = async () => {
    const result = await detectRisks();
    if (result.success) {
      setRisks(result.output);
    }
  };

  const handleGetRecommendations = async () => {
    const result = await getRecommendations();
    if (result.success) {
      setRecommendations(result.output);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">🔒 Security Monitor</h3>
        </div>
        {securityScore !== null && (
          <div className={`font-bold ${getScoreColor(securityScore)}`}>
            {securityScore}/100
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleScan}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Scan
            </button>
            <button
              onClick={handleDetectRisks}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              Detect Risks
            </button>
          </div>

          {scanResult && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Security Score:</span>
                <span className={`text-xl font-bold ${getScoreColor(scanResult.score)}`}>
                  {scanResult.score}/100
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Passed: {scanResult.passed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>Failed: {scanResult.failed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span>Warnings: {scanResult.warnings}</span>
                </div>
              </div>
              {scanResult.risks && scanResult.risks.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <div className="font-semibold text-sm mb-1">Risks Found:</div>
                  {scanResult.risks.map((risk: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-white dark:bg-gray-800 rounded mb-1">
                      <div className="font-semibold text-red-500">{risk.type}</div>
                      <div>{risk.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {risks && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
              <div className="font-semibold mb-2">Risks Detected: {risks.risksDetected}</div>
              <div className="text-sm">{risks.summary}</div>
            </div>
          )}

          <button
            onClick={handleGetRecommendations}
            disabled={loading}
            className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Get Recommendations
          </button>

          {recommendations && recommendations.recommendations && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {recommendations.recommendations.map((rec: any, i: number) => (
                <div key={i} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                  <div className="font-semibold">{rec.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{rec.description}</div>
                  <div className="text-xs text-blue-600 mt-1">Priority: {rec.priority}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
