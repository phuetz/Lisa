/**
 * Chat Settings Panel
 * Panneau de configuration du chat (modèle, system prompt, thème, etc.)
 */

import { useState } from 'react';
import {
  X,
  Settings,
  Bot,
  MessageSquare,
  Moon,
  Sun,
  Monitor,
  Zap,
  EyeOff,
  Volume2,
  Brain,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Sliders,
  Edit3,
} from 'lucide-react';
import {
  useChatSettingsStore,
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_PROMPTS,
  type ThemeMode,
} from '../../store/chatSettingsStore';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { ApiKeysSettings } from '../settings/ApiKeysSettings';

interface ChatSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'model' | 'prompt' | 'theme' | 'features' | 'apikeys' | 'data';

export const ChatSettingsPanel = ({ isOpen, onClose }: ChatSettingsPanelProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('model');
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [showNewPromptForm, setShowNewPromptForm] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editPromptName, setEditPromptName] = useState('');
  const [editPromptContent, setEditPromptContent] = useState('');
  const [previewPromptId, setPreviewPromptId] = useState<string | null>(null);

  const {
    selectedModelId,
    setSelectedModel,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    selectedSystemPromptId,
    setSelectedSystemPrompt,
    customSystemPrompts,
    addCustomSystemPrompt,
    removeCustomSystemPrompt,
    updateCustomSystemPrompt,
    theme,
    setTheme,
    streamingEnabled,
    toggleStreaming,
    incognitoMode,
    toggleIncognito,
    autoSpeakEnabled,
    toggleAutoSpeak,
    longTermMemoryEnabled,
    toggleLongTermMemory,
    exportSettings,
    importSettings,
    resetSettings,
  } = useChatSettingsStore();

  const { conversations, exportConversation, importConversation } = useChatHistoryStore();

  const allSystemPrompts = [...DEFAULT_SYSTEM_PROMPTS, ...customSystemPrompts];

  const handleAddPrompt = () => {
    if (newPromptName.trim() && newPromptContent.trim()) {
      addCustomSystemPrompt({ name: newPromptName.trim(), prompt: newPromptContent.trim() });
      setNewPromptName('');
      setNewPromptContent('');
      setShowNewPromptForm(false);
    }
  };

  const handleStartEdit = (prompt: { id: string; name: string; prompt: string }) => {
    setEditingPromptId(prompt.id);
    setEditPromptName(prompt.name);
    setEditPromptContent(prompt.prompt);
  };

  const handleSaveEdit = () => {
    if (editingPromptId && editPromptName.trim() && editPromptContent.trim()) {
      updateCustomSystemPrompt(editingPromptId, {
        name: editPromptName.trim(),
        prompt: editPromptContent.trim(),
      });
      setEditingPromptId(null);
      setEditPromptName('');
      setEditPromptContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingPromptId(null);
    setEditPromptName('');
    setEditPromptContent('');
  };

  const handleExportAllData = () => {
    const data = {
      settings: JSON.parse(exportSettings()),
      conversations: conversations.map((c) => JSON.parse(exportConversation(c.id))),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.settings) {
          importSettings(JSON.stringify(data.settings));
        }
        if (data.conversations) {
          data.conversations.forEach((c: unknown) => {
            importConversation(JSON.stringify(c));
          });
        }
        alert('Import réussi !');
      } catch (error) {
        alert('Erreur lors de l\'import');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'model', label: 'Modèle', icon: <Bot size={16} /> },
    { id: 'prompt', label: 'System Prompt', icon: <MessageSquare size={16} /> },
    { id: 'theme', label: 'Thème', icon: <Moon size={16} /> },
    { id: 'features', label: 'Fonctionnalités', icon: <Sliders size={16} /> },
    { id: 'apikeys', label: 'Clés API', icon: <Settings size={16} /> },
    { id: 'data', label: 'Données', icon: <Download size={16} /> },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '700px',
          maxHeight: '85vh',
          backgroundColor: '#1a1a1a',
          borderRadius: '16px',
          border: '1px solid #333',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #333',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color="#10a37f" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>
              Paramètres
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '12px 16px',
            borderBottom: '1px solid #333',
            overflowX: 'auto',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: activeTab === tab.id ? '#10a37f20' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeTab === tab.id ? '#10a37f' : '#888',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {/* Model Tab */}
          {activeTab === 'model' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Modèle LLM
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                >
                  {DEFAULT_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', color: '#888' }}>Température</label>
                  <span style={{ fontSize: '13px', color: '#fff' }}>{temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  Plus haut = plus créatif, plus bas = plus précis
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', color: '#888' }}>Tokens max</label>
                  <span style={{ fontSize: '13px', color: '#fff' }}>{maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="16384"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* System Prompt Tab - 2 Column Layout */}
          {activeTab === 'prompt' && (
            <div style={{ display: 'flex', gap: '16px', height: '500px' }}>
              {/* Left Column - Prompt List */}
              <div style={{ 
                width: '280px', 
                flexShrink: 0,
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                overflowY: 'auto',
                paddingRight: '8px',
              }}>
                {allSystemPrompts.map((prompt) => {
                  const isCustom = !DEFAULT_SYSTEM_PROMPTS.find((p) => p.id === prompt.id);
                  const isSelected = selectedSystemPromptId === prompt.id;
                  const isPreviewing = previewPromptId === prompt.id;

                  return (
                    <div
                      key={prompt.id}
                      onClick={() => setPreviewPromptId(prompt.id)}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: isPreviewing ? '#10a37f20' : isSelected ? '#2d4a3d' : '#2d2d2d',
                        border: `1px solid ${isPreviewing ? '#10a37f' : isSelected ? '#10a37f50' : '#404040'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isSelected && <Check size={12} color="#10a37f" />}
                          <span style={{ 
                            color: isSelected ? '#10a37f' : '#fff', 
                            fontWeight: isSelected ? 600 : 500, 
                            fontSize: '13px' 
                          }}>
                            {prompt.name}
                          </span>
                        </div>
                        {isCustom && (
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(prompt);
                                setPreviewPromptId(prompt.id);
                              }}
                              style={{
                                padding: '4px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#3b82f6',
                                cursor: 'pointer',
                              }}
                              title="Éditer"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCustomSystemPrompt(prompt.id);
                              }}
                              style={{
                                padding: '4px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                              }}
                              title="Supprimer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add New Prompt Button */}
                <button
                  onClick={() => {
                    setShowNewPromptForm(true);
                    setPreviewPromptId(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    backgroundColor: '#2d2d2d',
                    border: '1px dashed #404040',
                    borderRadius: '8px',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginTop: '4px',
                  }}
                >
                  <Plus size={14} />
                  Nouveau prompt
                </button>
              </div>

              {/* Right Column - Prompt Content */}
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #333',
                overflow: 'hidden',
              }}>
                {/* Editing Mode */}
                {editingPromptId && (
                  <>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#252525',
                      borderBottom: '1px solid #333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <input
                        type="text"
                        value={editPromptName}
                        onChange={(e) => setEditPromptName(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #404040',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10a37f',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#404040',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editPromptContent}
                      onChange={(e) => setEditPromptContent(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '16px',
                        backgroundColor: '#1a1a1a',
                        border: 'none',
                        color: '#e0e0e0',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        resize: 'none',
                        fontFamily: "'Fira Code', monospace",
                      }}
                    />
                  </>
                )}

                {/* New Prompt Form */}
                {showNewPromptForm && !editingPromptId && (
                  <>
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: '#252525',
                      borderBottom: '1px solid #333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <input
                        type="text"
                        placeholder="Nom du nouveau prompt..."
                        value={newPromptName}
                        onChange={(e) => setNewPromptName(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #404040',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '14px',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                        <button
                          onClick={handleAddPrompt}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#10a37f',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Créer
                        </button>
                        <button
                          onClick={() => setShowNewPromptForm(false)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#404040',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                    <textarea
                      placeholder="Contenu du system prompt..."
                      value={newPromptContent}
                      onChange={(e) => setNewPromptContent(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '16px',
                        backgroundColor: '#1a1a1a',
                        border: 'none',
                        color: '#e0e0e0',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        resize: 'none',
                        fontFamily: "'Fira Code', monospace",
                      }}
                    />
                  </>
                )}

                {/* Preview Mode */}
                {!editingPromptId && !showNewPromptForm && previewPromptId && (() => {
                  const previewPrompt = allSystemPrompts.find(p => p.id === previewPromptId);
                  if (!previewPrompt) return null;
                  const isCurrentlySelected = selectedSystemPromptId === previewPromptId;
                  
                  return (
                    <>
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#252525',
                        borderBottom: '1px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MessageSquare size={16} color="#10a37f" />
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                            {previewPrompt.name}
                          </span>
                          {isCurrentlySelected && (
                            <span style={{
                              padding: '2px 8px',
                              backgroundColor: '#10a37f30',
                              color: '#10a37f',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}>
                              Actif
                            </span>
                          )}
                        </div>
                        {!isCurrentlySelected && (
                          <button
                            onClick={() => setSelectedSystemPrompt(previewPromptId)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#10a37f',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#fff',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Check size={14} />
                            Utiliser ce prompt
                          </button>
                        )}
                      </div>
                      <div style={{
                        flex: 1,
                        padding: '16px',
                        overflowY: 'auto',
                        color: '#e0e0e0',
                        fontSize: '13px',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        fontFamily: "'Fira Code', monospace",
                      }}>
                        {previewPrompt.prompt}
                      </div>
                    </>
                  );
                })()}

                {/* Empty State */}
                {!editingPromptId && !showNewPromptForm && !previewPromptId && (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    gap: '12px',
                  }}>
                    <MessageSquare size={48} strokeWidth={1} />
                    <span style={{ fontSize: '14px' }}>Sélectionnez un prompt pour le visualiser</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { id: 'dark' as ThemeMode, label: 'Sombre', icon: <Moon size={18} /> },
                { id: 'light' as ThemeMode, label: 'Clair', icon: <Sun size={18} /> },
                { id: 'system' as ThemeMode, label: 'Système', icon: <Monitor size={18} /> },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: theme === t.id ? '#10a37f20' : '#2d2d2d',
                    border: `1px solid ${theme === t.id ? '#10a37f' : '#404040'}`,
                    borderRadius: '8px',
                    color: theme === t.id ? '#10a37f' : '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                  }}
                >
                  {t.icon}
                  {t.label}
                  {theme === t.id && <Check size={16} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                {
                  label: 'Streaming des réponses',
                  description: 'Afficher les tokens au fur et à mesure',
                  icon: <Zap size={18} />,
                  enabled: streamingEnabled,
                  toggle: toggleStreaming,
                },
                {
                  label: 'Mode incognito',
                  description: 'Les messages ne sont pas sauvegardés',
                  icon: <EyeOff size={18} />,
                  enabled: incognitoMode,
                  toggle: toggleIncognito,
                },
                {
                  label: 'Lecture vocale auto',
                  description: 'Lire automatiquement les réponses',
                  icon: <Volume2 size={18} />,
                  enabled: autoSpeakEnabled,
                  toggle: toggleAutoSpeak,
                },
                {
                  label: 'Mémoire long-terme',
                  description: 'Lisa se souvient entre les sessions',
                  icon: <Brain size={18} />,
                  enabled: longTermMemoryEnabled,
                  toggle: toggleLongTermMemory,
                },
              ].map((feature) => (
                <div
                  key={feature.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    backgroundColor: '#2d2d2d',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: feature.enabled ? '#10a37f' : '#666' }}>{feature.icon}</div>
                    <div>
                      <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{feature.label}</div>
                      <div style={{ color: '#888', fontSize: '12px' }}>{feature.description}</div>
                    </div>
                  </div>
                  <button
                    onClick={feature.toggle}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: feature.enabled ? '#10a37f' : '#404040',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        position: 'absolute',
                        top: '2px',
                        left: feature.enabled ? '22px' : '2px',
                        transition: 'left 0.2s',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'apikeys' && (
            <ApiKeysSettings />
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={handleExportAllData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #404040',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                }}
              >
                <Download size={18} color="#10a37f" />
                <div>
                  <div style={{ fontWeight: 500 }}>Exporter toutes les données</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    Télécharger un fichier JSON avec tous vos paramètres et conversations
                  </div>
                </div>
              </button>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #404040',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <Upload size={18} color="#3b82f6" />
                <div>
                  <div style={{ fontWeight: 500 }}>Importer des données</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Restaurer depuis un fichier de sauvegarde</div>
                </div>
                <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
              </label>

              <button
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
                    resetSettings();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  backgroundColor: '#2d2d2d',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                }}
              >
                <RotateCcw size={18} />
                <div>
                  <div style={{ fontWeight: 500 }}>Réinitialiser les paramètres</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Remettre tous les paramètres par défaut</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsPanel;
