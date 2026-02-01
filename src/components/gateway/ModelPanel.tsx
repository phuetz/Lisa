/**
 * Lisa Model Panel
 * AI model selection and configuration UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getModelManager } from '../../gateway';
import type { AIModel, ModelConfig, ProviderConfig, ModelProvider } from '../../gateway/ModelManager';

export function ModelPanel() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'models' | 'config' | 'providers'>('models');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    const manager = getModelManager();
    setModels(manager.listModels());
    setProviders(manager.listProviders());
    setConfig(manager.getConfig());
  }, []);

  useEffect(() => {
    refreshData();
    
    const manager = getModelManager();
    manager.on('model:default-changed', refreshData);
    manager.on('config:changed', refreshData);
    manager.on('provider:configured', refreshData);
    
    return () => {
      manager.off('model:default-changed', refreshData);
      manager.off('config:changed', refreshData);
      manager.off('provider:configured', refreshData);
    };
  }, [refreshData]);

  const handleSetDefault = (modelId: string) => {
    const manager = getModelManager();
    manager.setDefaultModel(modelId);
  };

  const handleToggleModel = (modelId: string, enabled: boolean) => {
    const manager = getModelManager();
    if (enabled) {
      manager.enableModel(modelId);
    } else {
      manager.disableModel(modelId);
    }
    refreshData();
  };

  const handleConfigChange = (key: keyof ModelConfig, value: number | string | string[]) => {
    const manager = getModelManager();
    manager.setConfig({ [key]: value });
  };

  const handleApplyPreset = (preset: 'creative' | 'precise' | 'balanced' | 'code') => {
    const manager = getModelManager();
    manager.applyPreset(preset);
  };

  const getProviderIcon = (provider: ModelProvider) => {
    const icons: Record<ModelProvider, string> = {
      openai: '🤖',
      anthropic: '🧠',
      google: '🔮',
      mistral: '🌊',
      groq: '⚡',
      ollama: '🦙',
      local: '💻',
      azure: '☁️'
    };
    return icons[provider] || '🔌';
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'Gratuit';
    return `$${cost.toFixed(4)}`;
  };

  if (!config) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🤖 Modèles IA</h2>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['models', 'config', 'providers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {})
            }}
          >
            {tab === 'models' ? '📋 Modèles' : tab === 'config' ? '⚙️ Config' : '🔌 Providers'}
          </button>
        ))}
      </div>

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div style={styles.section}>
          <div style={styles.modelsList}>
            {models.map((model) => (
              <div 
                key={model.id} 
                style={{
                  ...styles.modelCard,
                  opacity: model.isEnabled ? 1 : 0.5,
                  borderColor: model.isDefault ? '#3b82f6' : 'transparent'
                }}
                onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
              >
                <div style={styles.modelHeader}>
                  <div style={styles.modelInfo}>
                    <span style={styles.providerIcon}>{getProviderIcon(model.provider)}</span>
                    <div>
                      <div style={styles.modelName}>{model.name}</div>
                      <div style={styles.modelProvider}>{model.provider}</div>
                    </div>
                  </div>
                  {model.isDefault && (
                    <span style={styles.defaultBadge}>Par défaut</span>
                  )}
                </div>

                <div style={styles.modelMeta}>
                  <span style={styles.metaItem}>📏 {(model.contextWindow / 1000)}K ctx</span>
                  <span style={styles.metaItem}>💰 {formatCost(model.costPer1kInput)}/1K</span>
                </div>

                <div style={styles.capabilities}>
                  {model.capabilities.slice(0, 4).map((cap) => (
                    <span key={cap} style={styles.capBadge}>{cap}</span>
                  ))}
                </div>

                {selectedModel === model.id && (
                  <div style={styles.modelActions}>
                    {!model.isDefault && model.isEnabled && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSetDefault(model.id); }}
                        style={styles.actionButton}
                      >
                        ⭐ Définir par défaut
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleModel(model.id, !model.isEnabled); }}
                      style={model.isEnabled ? styles.disableButton : styles.enableButton}
                      disabled={model.isDefault}
                    >
                      {model.isEnabled ? '🚫 Désactiver' : '✅ Activer'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div style={styles.section}>
          {/* Presets */}
          <div style={styles.presets}>
            <span style={styles.presetsLabel}>Presets:</span>
            {(['balanced', 'creative', 'precise', 'code'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handleApplyPreset(preset)}
                style={styles.presetButton}
              >
                {preset === 'balanced' ? '⚖️' : preset === 'creative' ? '🎨' : preset === 'precise' ? '🎯' : '💻'} {preset}
              </button>
            ))}
          </div>

          {/* Sliders */}
          <div style={styles.configList}>
            <div style={styles.configItem}>
              <div style={styles.configHeader}>
                <span>Temperature</span>
                <span style={styles.configValue}>{config.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.sliderLabels}>
                <span>Précis</span>
                <span>Créatif</span>
              </div>
            </div>

            <div style={styles.configItem}>
              <div style={styles.configHeader}>
                <span>Max Tokens</span>
                <span style={styles.configValue}>{config.maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="16384"
                step="256"
                value={config.maxTokens}
                onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                style={styles.slider}
              />
            </div>

            <div style={styles.configItem}>
              <div style={styles.configHeader}>
                <span>Top P</span>
                <span style={styles.configValue}>{config.topP}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.topP}
                onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
                style={styles.slider}
              />
            </div>

            <div style={styles.configItem}>
              <div style={styles.configHeader}>
                <span>Frequency Penalty</span>
                <span style={styles.configValue}>{config.frequencyPenalty}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.frequencyPenalty}
                onChange={(e) => handleConfigChange('frequencyPenalty', parseFloat(e.target.value))}
                style={styles.slider}
              />
            </div>
          </div>
        </div>
      )}

      {/* Providers Tab */}
      {activeTab === 'providers' && (
        <div style={styles.section}>
          <div style={styles.providersList}>
            {providers.map((provider) => (
              <div key={provider.provider} style={styles.providerCard}>
                <div style={styles.providerHeader}>
                  <span style={styles.providerIcon}>{getProviderIcon(provider.provider)}</span>
                  <span style={styles.providerName}>{provider.provider}</span>
                  <span style={{
                    ...styles.providerStatus,
                    color: provider.isConfigured ? '#10b981' : '#666'
                  }}>
                    {provider.isConfigured ? '✓ Configuré' : 'Non configuré'}
                  </span>
                </div>
                <div style={styles.providerModels}>
                  {models.filter(m => m.provider === provider.provider).length} modèles
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '24px',
    color: '#fff'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#888'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px'
  },
  tab: {
    padding: '10px 16px',
    backgroundColor: '#252525',
    border: 'none',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '13px'
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    color: '#fff'
  },
  section: {},
  modelsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  modelCard: {
    padding: '16px',
    backgroundColor: '#252525',
    borderRadius: '10px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  modelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  modelInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  providerIcon: {
    fontSize: '24px'
  },
  modelName: {
    fontSize: '15px',
    fontWeight: 600
  },
  modelProvider: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'capitalize'
  },
  defaultBadge: {
    padding: '4px 10px',
    backgroundColor: '#3b82f6',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600
  },
  modelMeta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '10px'
  },
  metaItem: {
    fontSize: '12px',
    color: '#888'
  },
  capabilities: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  capBadge: {
    padding: '3px 8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#aaa'
  },
  modelActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #333'
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#333',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px'
  },
  enableButton: {
    padding: '6px 12px',
    backgroundColor: '#153f1f',
    border: 'none',
    borderRadius: '6px',
    color: '#10b981',
    cursor: 'pointer',
    fontSize: '12px'
  },
  disableButton: {
    padding: '6px 12px',
    backgroundColor: '#3f1515',
    border: 'none',
    borderRadius: '6px',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '12px'
  },
  presets: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  presetsLabel: {
    fontSize: '13px',
    color: '#888'
  },
  presetButton: {
    padding: '6px 12px',
    backgroundColor: '#252525',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    textTransform: 'capitalize'
  },
  configList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  configItem: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    padding: '16px'
  },
  configHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '14px'
  },
  configValue: {
    fontWeight: 600,
    color: '#3b82f6'
  },
  slider: {
    width: '100%',
    accentColor: '#3b82f6'
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#666',
    marginTop: '6px'
  },
  providersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  providerCard: {
    padding: '14px 16px',
    backgroundColor: '#252525',
    borderRadius: '8px'
  },
  providerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  providerName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    textTransform: 'capitalize'
  },
  providerStatus: {
    fontSize: '12px'
  },
  providerModels: {
    fontSize: '12px',
    color: '#666',
    marginTop: '6px',
    marginLeft: '36px'
  }
};

export default ModelPanel;
