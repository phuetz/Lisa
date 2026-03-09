/**
 * ChatLayoutSimple - Chat content area (sidebar/topbar provided by MainLayout)
 */

import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Plus, Trash2, MessageSquare, X, FileDown, Search, Download, Upload, Keyboard, Settings, Loader2 } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { ArtifactPanel } from './ArtifactPanel';
import { Modal } from '../ui/Modal';

const ExportPDF = lazy(() => import('./ExportPDF').then(m => ({ default: m.ExportPDF })));

const LazyFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
  </div>
);

export const ChatLayoutSimple = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversationPanelOpen, setConversationPanelOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const {
    conversations,
    currentConversationId,
    createConversation,
    setCurrentConversation,
    deleteConversation,
  } = useChatHistoryStore();

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(query) ||
      conv.messages.some(m => m.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  const handleExportJSON = () => {
    const data = JSON.stringify(conversations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa-conversations-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    const cleanup = () => { input.onchange = null; };
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { cleanup(); return; }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            showToast(`Import de ${imported.length} conversations réussi!`);
          }
        } catch {
          showToast('Erreur: fichier JSON invalide');
        }
        cleanup();
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleNewChat = () => {
    const id = createConversation();
    setCurrentConversation(id);
    setConversationPanelOpen(false);
  };

  return (
    <div className="chat-layout">
      {/* Chat toolbar */}
      <div className="chat-toolbar">
        <button
          onClick={() => setConversationPanelOpen(!conversationPanelOpen)}
          className="chat-icon-btn"
          aria-label="Conversations"
        >
          <MessageSquare size={18} />
        </button>

        <h2 className="chat-toolbar-title">
          {currentConversation?.title || 'Nouvelle conversation'}
        </h2>

        <button onClick={handleNewChat} className="chat-icon-btn" aria-label="Nouvelle conversation">
          <Plus size={18} />
        </button>
        <button
          onClick={() => setExportOpen(true)}
          disabled={!currentConversation || currentConversation.messages.length === 0}
          className="chat-icon-btn"
          aria-label="Exporter en PDF"
        >
          <FileDown size={18} />
        </button>
        <button onClick={() => setShowShortcuts(true)} className="chat-icon-btn" aria-label="Raccourcis">
          <Keyboard size={18} />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="chat-icon-btn" aria-label="Paramètres du chat">
          <Settings size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div role="main" aria-label="Messages de conversation" className="chat-messages-area">
        <ChatMessages />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <ChatInput />
        </div>
      </div>

      {/* Conversation panel overlay */}
      {conversationPanelOpen && (
        <>
          <div
            onClick={() => setConversationPanelOpen(false)}
            aria-hidden="true"
            className="conv-overlay"
          />
          <div className="conv-panel">
            {/* Panel Header */}
            <div className="conv-panel-header">
              <div className="conv-panel-header-row">
                <button onClick={handleNewChat} className="conv-new-btn" aria-label="Nouvelle conversation">
                  <Plus size={16} />
                  Nouvelle conversation
                </button>
                <button onClick={() => setConversationPanelOpen(false)} className="chat-icon-btn" aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div className="search-bar">
                <Search size={16} className="search-bar-icon" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Rechercher..."
                  aria-label="Rechercher dans les conversations"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Import/Export buttons */}
              <div className="import-export-row">
                <button onClick={handleExportJSON} className="msg-action-btn import-export-btn" aria-label="Exporter JSON">
                  <Download size={14} />
                  Export
                </button>
                <button onClick={handleImportJSON} className="msg-action-btn import-export-btn" aria-label="Importer JSON">
                  <Upload size={14} />
                  Import
                </button>
              </div>
            </div>

            {/* Conversations List */}
            <div className="conv-list">
              <div className="conv-list-label">Conversations récentes</div>
              {filteredConversations.length === 0 ? (
                <div className="conv-empty">Aucune conversation</div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`conv-item${conv.id === currentConversationId ? ' active' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-current={conv.id === currentConversationId ? 'true' : undefined}
                    onClick={() => {
                      setCurrentConversation(conv.id);
                      setConversationPanelOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCurrentConversation(conv.id);
                        setConversationPanelOpen(false);
                      }
                    }}
                  >
                    <MessageSquare size={14} style={{ color: 'var(--text-muted)', marginRight: '8px', flexShrink: 0 }} aria-hidden="true" />
                    <div className="conv-item-content">
                      <div className="conv-item-title">{conv.title}</div>
                    </div>
                    {pendingDeleteId === conv.id ? (
                      <div className="conv-delete-actions" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => { deleteConversation(conv.id); setPendingDeleteId(null); }}
                          className="chat-icon-btn conv-delete-confirm"
                          aria-label="Confirmer la suppression"
                        >
                          Oui
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(null)}
                          className="chat-icon-btn conv-delete-cancel"
                          aria-label="Annuler la suppression"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteId(conv.id);
                        }}
                        className="chat-icon-btn conv-delete-btn"
                        aria-label={`Supprimer la conversation ${conv.title}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Settings Panel */}
      <ChatSettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Export PDF Modal */}
      {exportOpen && currentConversation && (
        <Suspense fallback={<LazyFallback />}>
          <ExportPDF
            messages={currentConversation.messages}
            conversationTitle={currentConversation.title}
            onClose={() => setExportOpen(false)}
          />
        </Suspense>
      )}

      {/* Keyboard Shortcuts Modal */}
      <Modal open={showShortcuts} onClose={() => setShowShortcuts(false)} title="Raccourcis clavier">
        <div className="shortcuts-list">
          {[
            { keys: 'Ctrl + Enter', action: 'Envoyer le message' },
            { keys: 'Enter', action: 'Envoyer le message' },
            { keys: 'Shift + Enter', action: 'Nouvelle ligne' },
            { keys: 'Ctrl + N', action: 'Nouvelle conversation' },
            { keys: 'Ctrl + /', action: 'Focus sur l\'input' },
            { keys: 'Escape', action: 'Annuler / Effacer' },
          ].map(({ keys, action }) => (
            <div key={keys} className="shortcut-row">
              <span className="shortcut-action">{action}</span>
              <kbd className="shortcut-kbd">{keys}</kbd>
            </div>
          ))}
        </div>
      </Modal>

      {/* Artifact Panel */}
      <ArtifactPanel />

      {/* Toast notification */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default ChatLayoutSimple;
