/**
 * ChatLayoutSimple - Chat content area (sidebar/topbar provided by MainLayout)
 */

import { useState, useMemo, lazy, Suspense } from 'react';
import { Plus, Trash2, MessageSquare, X, FileDown, Search, Download, Upload, Keyboard, Settings, Loader2 } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { ArtifactPanel } from './ArtifactPanel';
import { Modal } from '../ui/Modal';

// Lazy load heavy components (html2canvas + jspdf = ~450KB)
const ExportPDF = lazy(() => import('./ExportPDF').then(m => ({ default: m.ExportPDF })));

// Loading fallback for lazy components
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

  const {
    conversations,
    currentConversationId,
    createConversation,
    setCurrentConversation,
    deleteConversation,
  } = useChatHistoryStore();

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  // Filtrer les conversations par recherche
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv =>
      conv.title.toLowerCase().includes(query) ||
      conv.messages.some(m => m.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  // Export conversations to JSON
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

  // Import conversations from JSON
  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            alert(`Import de ${imported.length} conversations réussi!`);
          }
        } catch {
          alert('Erreur: fichier JSON invalide');
        }
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      backgroundColor: 'var(--bg-deep)',
      color: 'var(--text-primary)',
    }}>
      {/* Chat toolbar */}
      <div
        style={{
          height: '44px',
          minHeight: '44px',
          padding: '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <button
          onClick={() => setConversationPanelOpen(!conversationPanelOpen)}
          className="chat-icon-btn"
          aria-label="Conversations"
          style={{ padding: '6px' }}
        >
          <MessageSquare size={18} />
        </button>

        <h2 style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: 0,
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {currentConversation?.title || 'Nouvelle conversation'}
        </h2>

        <button onClick={handleNewChat} className="chat-icon-btn" aria-label="Nouvelle conversation" style={{ padding: '6px' }}>
          <Plus size={18} />
        </button>
        <button
          onClick={() => setExportOpen(true)}
          disabled={!currentConversation || currentConversation.messages.length === 0}
          className="chat-icon-btn"
          aria-label="Exporter en PDF"
          style={{ padding: '6px' }}
        >
          <FileDown size={18} />
        </button>
        <button onClick={() => setShowShortcuts(true)} className="chat-icon-btn" aria-label="Raccourcis" style={{ padding: '6px' }}>
          <Keyboard size={18} />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="chat-icon-btn" aria-label="Paramètres du chat" style={{ padding: '6px' }}>
          <Settings size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div
        role="main"
        aria-label="Messages de conversation"
        style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
      >
        <ChatMessages />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '8px 16px 16px',
        backgroundColor: 'var(--bg-deep)',
      }}>
        <div style={{ maxWidth: '768px', margin: '0 auto' }}>
          <ChatInput />
        </div>
      </div>

      {/* Conversation panel overlay */}
      {conversationPanelOpen && (
        <>
          <div
            onClick={() => setConversationPanelOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(10, 10, 15, 0.5)',
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '300px',
              backgroundColor: 'var(--bg-surface)',
              borderRight: '1px solid var(--border-primary)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Panel Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleNewChat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: 'var(--color-accent)',
                    color: '#0a0a0f',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flex: 1,
                    fontFamily: 'inherit',
                  }}
                  aria-label="Nouvelle conversation"
                >
                  <Plus size={16} />
                  Nouvelle conversation
                </button>
                <button
                  onClick={() => setConversationPanelOpen(false)}
                  className="chat-icon-btn"
                  aria-label="Fermer"
                  style={{ padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Rechercher..."
                  aria-label="Rechercher dans les conversations"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 34px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Import/Export buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleExportJSON} className="msg-action-btn" style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }} aria-label="Exporter JSON">
                  <Download size={14} />
                  Export
                </button>
                <button onClick={handleImportJSON} className="msg-action-btn" style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }} aria-label="Importer JSON">
                  <Upload size={14} />
                  Import
                </button>
              </div>
            </div>

            {/* Conversations List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px', marginBottom: '4px' }}>
                Conversations récentes
              </div>
              {filteredConversations.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Aucune conversation
                </div>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {conv.title}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Supprimer cette conversation ?')) {
                          deleteConversation(conv.id);
                        }
                      }}
                      className="chat-icon-btn"
                      style={{ padding: '4px', opacity: 0.6 }}
                      aria-label={`Supprimer la conversation ${conv.title}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Settings Panel */}
      <ChatSettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Export PDF Modal - Lazy loaded (~450KB) */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { keys: 'Ctrl + Enter', action: 'Envoyer le message' },
            { keys: 'Enter', action: 'Envoyer le message' },
            { keys: 'Shift + Enter', action: 'Nouvelle ligne' },
            { keys: 'Ctrl + N', action: 'Nouvelle conversation' },
            { keys: 'Ctrl + /', action: 'Focus sur l\'input' },
            { keys: 'Escape', action: 'Annuler / Effacer' },
          ].map(({ keys, action }) => (
            <div key={keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{action}</span>
              <kbd style={{
                backgroundColor: 'var(--bg-panel)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
              }}>{keys}</kbd>
            </div>
          ))}
        </div>
      </Modal>

      {/* Artifact Panel */}
      <ArtifactPanel />
    </div>
  );
};

export default ChatLayoutSimple;
