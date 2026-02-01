/**
 * SchedulerPanel - Schedule optimization interface
 */

import { useState } from 'react';
import { useScheduler } from '../hooks/useScheduler';
import { Calendar, Clock } from 'lucide-react';

export const SchedulerPanel = () => {
  const { loading, error, suggestTime, findAvailability } = useScheduler();
  const [isExpanded, setIsExpanded] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [duration, setDuration] = useState(60);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availability, setAvailability] = useState<any>(null);

  const handleSuggestTime = async () => {
    const result = await suggestTime(purpose, duration);
    if (result.success) {
      setSuggestions(result.output);
    }
  };

  const handleFindAvailability = async () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result = await findAvailability(startDate, endDate, duration);
    if (result.success) {
      setAvailability(result.output);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('fr-FR', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">📅 Smart Scheduler</h3>
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
              placeholder="Meeting purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                min="15"
                max="480"
              />
              <span className="text-sm">minutes</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSuggestTime}
              disabled={loading || !purpose}
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Suggest Time
            </button>
            <button
              onClick={handleFindAvailability}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Find Slots
            </button>
          </div>

          {suggestions && suggestions.suggestions && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded max-h-60 overflow-y-auto">
              <div className="font-semibold mb-2">Suggested Times:</div>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {suggestions.suggestions.map((sug: any, i: number) => (
                <div key={i} className="p-2 bg-white dark:bg-gray-800 rounded mb-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{formatTime(sug.timeSlot.start)}</div>
                    <div className="text-xs text-green-500">{(sug.confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{sug.reason}</div>
                </div>
              ))}
            </div>
          )}

          {availability && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <div className="font-semibold mb-2">Available Slots: {availability.availableSlots?.length || 0}</div>
              {availability.bestSlot && (
                <div className="text-sm p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="font-semibold">Best Slot:</div>
                  <div>{formatTime(availability.bestSlot.start)}</div>
                  <div className="text-xs text-green-500">Score: {availability.bestSlot.score}/100</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
