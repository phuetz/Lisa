/**
 * HealthMonitorPanel - Health tracking dashboard
 */

import { useState } from 'react';
import { useHealthMonitor } from '../hooks/useHealthMonitor';
import { Heart, TrendingUp } from 'lucide-react';

export const HealthMonitorPanel = () => {
  const { loading, error, trackMetric, getRecommendations } = useHealthMonitor();
  const [isExpanded, setIsExpanded] = useState(false);
  const [metric, setMetric] = useState('steps');
  const [value, setValue] = useState('');
  const [result, setResult] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);

  const handleTrackMetric = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    const res = await trackMetric(metric, numValue);
    if (res.success) {
      setResult(res.output);
      setValue('');
    }
  };

  const handleGetRecommendations = async () => {
    const res = await getRecommendations();
    if (res.success) {
      setRecommendations(res.output);
    }
  };

  const metricOptions = [
    { value: 'steps', label: 'Steps', icon: '🚶', unit: 'steps' },
    { value: 'heart_rate', label: 'Heart Rate', icon: '❤️', unit: 'bpm' },
    { value: 'sleep_duration', label: 'Sleep', icon: '😴', unit: 'hours' },
    { value: 'water_intake', label: 'Water', icon: '💧', unit: 'ml' },
    { value: 'weight', label: 'Weight', icon: '⚖️', unit: 'kg' }
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      optimal: 'text-green-500',
      normal: 'text-blue-500',
      high: 'text-orange-500',
      low: 'text-yellow-500'
    };
    return colors[status] || 'text-gray-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold">💪 Health Monitor</h3>
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
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              {metricOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Value"
                className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-500">
                {metricOptions.find(m => m.value === metric)?.unit}
              </span>
              <button
                onClick={handleTrackMetric}
                disabled={loading || !value}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Log
              </button>
            </div>
          </div>

          {result && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{result.metric}</div>
                  <div className="text-2xl font-bold">{result.value} {result.unit}</div>
                </div>
                <div className={`text-lg font-semibold ${getStatusColor(result.status)}`}>
                  {result.status}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGetRecommendations}
            disabled={loading}
            className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
              Get Health Tips
            </button>

          {recommendations && recommendations.recommendations && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {recommendations.recommendations.map((rec: any, i: number) => (
                <div key={i} className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                  <div className="font-semibold">{rec.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{rec.description}</div>
                  <div className="text-xs text-green-600 mt-1">✓ {rec.benefit}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
