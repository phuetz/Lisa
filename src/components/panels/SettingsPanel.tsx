import React, { useState } from 'react';
import { featureFlags } from '../../utils/featureFlags';
import { useFeatureFlag } from '../../utils/featureFlags';
import { logInfo } from '../../utils/logger';

/**
 * SettingsPanel - Panel for managing application settings and feature flags
 *
 * Provides a UI for:
 * - Viewing all available feature flags
 * - Toggling features on/off
 * - Viewing feature descriptions and categories
 * - Exporting/importing flag configurations
 */
export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get all flags grouped by category
  const allFlags = featureFlags.getAllFlags();
  const categories = Array.from(new Set(allFlags.map(f => f.category)));

  const handleToggle = (key: string) => {
    const isCurrentlyEnabled = featureFlags.isEnabled(key);
    if (isCurrentlyEnabled) {
      featureFlags.disable(key);
      logInfo(`Feature flag disabled: ${key}`, 'Settings');
    } else {
      featureFlags.enable(key);
      logInfo(`Feature flag enabled: ${key}`, 'Settings');
    }
  };

  const handleExport = () => {
    const config = featureFlags.export();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lisa-feature-flags.json';
    a.click();
    URL.revokeObjectURL(url);
    logInfo('Feature flags configuration exported', 'Settings');
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        featureFlags.import(config);
        logInfo('Feature flags configuration imported', 'Settings');
        // Force re-render
        setSearchTerm(searchTerm);
      } catch (error) {
        console.error('Failed to import feature flags:', error);
        logInfo('Failed to import feature flags configuration', 'Settings');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all feature flags to defaults?')) {
      featureFlags.resetToDefaults();
      logInfo('Feature flags reset to defaults', 'Settings');
      // Force re-render
      setSearchTerm(searchTerm);
    }
  };

  const filteredFlags = allFlags.filter(flag =>
    flag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flag.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors z-50"
        title="Open Settings"
      >
        ⚙️ Settings
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <p className="text-blue-100 text-sm mt-1">Manage feature flags and application settings</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-20 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 bg-gray-800 border-b border-gray-700">
          <button
            onClick={handleExport}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
          >
            📥 Export Config
          </button>
          <label className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm cursor-pointer transition-colors">
            📤 Import Config
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
          >
            🔄 Reset to Defaults
          </button>
        </div>

        {/* Feature Flags List */}
        <div className="flex-1 overflow-y-auto p-6">
          {categories.map(category => {
            const categoryFlags = filteredFlags.filter(f => f.category === category);
            if (categoryFlags.length === 0) return null;

            return (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3 capitalize">
                  {category} Features
                </h3>
                <div className="space-y-2">
                  {categoryFlags.map(flag => (
                    <FeatureFlagItem
                      key={flag.key}
                      flag={flag}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredFlags.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No features found matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {filteredFlags.filter(f => featureFlags.isEnabled(f.key)).length} of {allFlags.length} features enabled
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureFlagItemProps {
  flag: {
    key: string;
    description: string;
    defaultEnabled: boolean;
    category: string;
    dependencies?: string[];
  };
  onToggle: (key: string) => void;
}

function FeatureFlagItem({ flag, onToggle }: FeatureFlagItemProps) {
  const isEnabled = useFeatureFlag(flag.key);
  const hasDependencies = flag.dependencies && flag.dependencies.length > 0;

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 border ${
        isEnabled ? 'border-green-500' : 'border-gray-700'
      } transition-colors`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-blue-400">{flag.key}</span>
            {!flag.defaultEnabled && (
              <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-0.5 rounded">
                EXPERIMENTAL
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 mt-1">{flag.description}</p>
          {hasDependencies && (
            <p className="text-xs text-gray-500 mt-2">
              Depends on: {flag.dependencies!.join(', ')}
            </p>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-4">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={() => onToggle(flag.key)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>
    </div>
  );
}
