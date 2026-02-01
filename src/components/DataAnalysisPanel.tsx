/**
 * DataAnalysisPanel - Data visualization and analysis interface
 */

import { useState } from 'react';
import { useDataAnalysis } from '../hooks/useDataAnalysis';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';

export const DataAnalysisPanel = () => {
  const { loading, error, analyzeData, calculateStatistics, detectTrends } = useDataAnalysis();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dataInput, setDataInput] = useState('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [resultType, setResultType] = useState<string>('');

  const parseData = (): number[] => {
    return dataInput.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  };

  const handleAnalyze = async () => {
    const data = parseData();
    if (data.length === 0) return;
    const res = await analyzeData(data);
    if (res.success) {
      setResult(res.output);
      setResultType('analyze');
    }
  };

  const handleCalculateStats = async () => {
    const data = parseData();
    if (data.length === 0) return;
    const res = await calculateStatistics(data);
    if (res.success) {
      setResult(res.output);
      setResultType('stats');
    }
  };

  const handleDetectTrends = async () => {
    const data = parseData();
    if (data.length === 0) return;
    const res = await detectTrends(data);
    if (res.success) {
      setResult(res.output);
      setResultType('trends');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">📊 Data Analysis</h3>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold mb-1 block">Data (comma-separated):</label>
            <textarea
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm font-mono"
              placeholder="1, 2, 3, 4, 5"
            />
            <div className="text-xs text-gray-500 mt-1">
              {parseData().length} data points
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
            >
              <Activity className="w-3 h-3" />
              Analyze
            </button>
            <button
              onClick={handleCalculateStats}
              disabled={loading}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              Stats
            </button>
            <button
              onClick={handleDetectTrends}
              disabled={loading}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm flex items-center justify-center gap-1"
            >
              <TrendingUp className="w-3 h-3" />
              Trends
            </button>
          </div>

          {result && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded max-h-60 overflow-y-auto">
              {resultType === 'stats' && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-semibold">Min:</span> {result.min?.toFixed(2)}</div>
                    <div><span className="font-semibold">Max:</span> {result.max?.toFixed(2)}</div>
                    <div><span className="font-semibold">Mean:</span> {result.mean?.toFixed(2)}</div>
                    <div><span className="font-semibold">Median:</span> {result.median?.toFixed(2)}</div>
                    <div><span className="font-semibold">Std Dev:</span> {result.stdDev?.toFixed(2)}</div>
                    <div><span className="font-semibold">Sum:</span> {result.sum?.toFixed(2)}</div>
                  </div>
                </div>
              )}
              {resultType === 'trends' && (
                <div className="text-sm">
                  <div className="font-semibold mb-1">Trend Analysis:</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`w-4 h-4 ${result.trend === 'increasing' ? 'text-green-500' : result.trend === 'decreasing' ? 'text-red-500' : 'text-gray-500'}`} />
                    <span className="capitalize">{result.trend}</span>
                  </div>
                  {result.changePercent && (
                    <div className="text-xs mt-1">Change: {result.changePercent}%</div>
                  )}
                </div>
              )}
              {resultType === 'analyze' && result.statistics && (
                <div className="space-y-2">
                  <div className="font-semibold">Statistics:</div>
                  <div className="text-xs space-y-1">
                    <div>Mean: {result.statistics.mean?.toFixed(2)}</div>
                    <div>Data Points: {result.dataPoints}</div>
                  </div>
                  {result.trends && (
                    <div className="mt-2">
                      <div className="font-semibold text-xs">Trend:</div>
                      <div className="text-xs capitalize">{result.trends.trend}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
