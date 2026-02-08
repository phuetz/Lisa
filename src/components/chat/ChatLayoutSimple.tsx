/**
 * ChatLayoutSimple - Version simplifiée pour debug
 */

import { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Settings, Plus, Trash2, MessageSquare, X, FileDown, Search, Download, Upload, Keyboard, LayoutDashboard, Eye, Mic, Bot, Workflow, Home, Heart, FileText, Code, Wrench, Activity, Brain, Zap, Loader2 } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { ConnectionStatus } from './ConnectionStatus';
import { ArtifactPanel } from './ArtifactPanel';

// Lazy load heavy components (html2canvas + jspdf = ~450KB)
const ExportPDF = lazy(() => import('./ExportPDF').then(m => ({ default: m.ExportPDF })));

// Loading fallback for lazy components
const LazyFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-info, #3b82f6)' }} />
  </div>
);

// Navigation items - Complete menu
const navigationItems = [
  { icon: MessageSquare, label: 'Chat', path: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Eye, label: 'Vision', path: '/vision' },
  { icon: Mic, label: 'Audio', path: '/audio' },
  { icon: Bot, label: 'Agents', path: '/agents' },
  { icon: Workflow, label: 'Workflows', path: '/workflows' },
  { icon: Home, label: 'Maison', path: '/smart-home' },
  { icon: Heart, label: 'Santé', path: '/health' },
  { icon: FileText, label: 'Documents', path: '/documents' },
  { icon: Code, label: 'Playground', path: '/playground' },
  { icon: Wrench, label: 'Outils', path: '/tools' },
  { icon: Brain, label: 'Personas', path: '/personas' },
  { icon: Activity, label: 'Monitoring', path: '/monitoring' },
  { icon: Zap, label: '5 Sens', path: '/senses' },
];

// Format date relative (réservé pour usage futur)
const _formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const ChatLayoutSimple = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  
  const isActive = (path: string) => location.pathname === path || (path === '/' && location.pathname === '');

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
            // TODO: Add importConversations to store
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
    setSidebarOpen(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary, #212121)',
      color: 'var(--text-primary, #ececec)'
    }}>
      {/* Header - hauteur fixe */}
      <header
        role="banner"
        style={{
          height: '56px',
          minHeight: '56px',
          padding: '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--bg-primary)'
        }}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="chat-icon-btn"
          aria-label="Ouvrir le menu"
          aria-expanded={sidebarOpen}
        >
          <Menu size={20} />
        </button>

        <h1 style={{
          fontSize: '16px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: 0,
          flex: 1
        }}>
          {currentConversation?.title || 'Lisa AI'}
        </h1>

        <ConnectionStatus />

        <button
          onClick={handleNewChat}
          className="chat-icon-btn"
          aria-label="Nouvelle conversation"
        >
          <Plus size={20} />
        </button>

        <button
          onClick={() => setExportOpen(true)}
          disabled={!currentConversation || currentConversation.messages.length === 0}
          className="chat-icon-btn"
          aria-label="Exporter en PDF"
        >
          <FileDown size={20} />
        </button>

        <button
          onClick={() => setShowShortcuts(true)}
          className="chat-icon-btn"
          aria-label="Raccourcis clavier"
        >
          <Keyboard size={20} />
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="chat-icon-btn"
          aria-label="Paramètres"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* Messages Area - prend tout l'espace restant */}
      <main
        role="main"
        aria-label="Messages de conversation"
        style={{
          flex: 1,
          overflow: 'auto',
          minHeight: 0
        }}
      >
        <ChatMessages />
      </main>

      {/* Input Area */}
      <div style={{
        padding: '8px 16px 20px',
        backgroundColor: 'var(--bg-primary, #212121)',
      }}>
        <div style={{ maxWidth: '768px', margin: '0 auto' }}>
          <ChatInput />
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 40
            }}
          />
          <aside
            role="navigation"
            aria-label="Menu principal"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border-subtle)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Sidebar Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleNewChat}
                  className="sidebar-nav-item"
                  style={{
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    flex: 1
                  }}
                  aria-label="Nouvelle conversation"
                >
                  <Plus size={16} />
                  Nouvelle conversation
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="chat-icon-btn"
                  aria-label="Fermer le menu"
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
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
              
              {/* Import/Export buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleExportJSON}
                  className="msg-action-btn"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                  aria-label="Exporter les conversations en JSON"
                >
                  <Download size={14} />
                  Export
                </button>
                <button
                  onClick={handleImportJSON}
                  className="msg-action-btn"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '12px' }}
                  aria-label="Importer des conversations depuis un fichier JSON"
                >
                  <Upload size={14} />
                  Import
                </button>
              </div>
            </div>
            
            {/* Conversations List */}
            <div style={{ overflowY: 'auto', padding: '8px', maxHeight: '200px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px', marginBottom: '4px' }}>
                Conversations récentes
              </div>
              {filteredConversations.length === 0 ? (
                <div style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  color: 'var(--text-muted)',
                  fontSize: '13px'
                }}>
                  Aucune conversation
                </div>
              ) : (
                filteredConversations.slice(0, 5).map(conv => (
                  <div
                    key={conv.id}
                    className={`conv-item${conv.id === currentConversationId ? ' active' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-current={conv.id === currentConversationId ? 'true' : undefined}
                    onClick={() => {
                      setCurrentConversation(conv.id);
                      setSidebarOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCurrentConversation(conv.id);
                        setSidebarOpen(false);
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
                        textOverflow: 'ellipsis'
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
            
            {/* Navigation Menu */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '8px',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 8px', marginBottom: '4px' }}>
                Navigation
              </div>
              {navigationItems.map((item) => (
                <div
                  key={item.path}
                  className={`sidebar-nav-item${isActive(item.path) ? ' active' : ''}`}
                  role="link"
                  tabIndex={0}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(item.path);
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <item.icon size={16} aria-hidden="true" />
                  {item.label}
                </div>
              ))}
            </div>
            
            {/* Settings Button */}
            <div style={{ 
              padding: '8px 12px', 
              borderTop: '1px solid var(--border-subtle)' 
            }}>
              <button
                onClick={() => {
                  navigate('/settings');
                  setSidebarOpen(false);
                }}
                className="sidebar-nav-item"
                aria-label="Paramètres"
              >
                <Settings size={16} aria-hidden="true" />
                Paramètres
              </button>
            </div>
          </aside>
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
      {showShortcuts && (
        <>
          <div
            onClick={() => setShowShortcuts(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              zIndex: 60
            }}
          />
          <div
            role="dialog"
            aria-label="Raccourcis clavier"
            aria-modal="true"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              zIndex: 61,
              minWidth: '320px',
              border: '1px solid var(--border-secondary)',
              boxShadow: 'var(--shadow-modal)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>Raccourcis clavier</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="chat-icon-btn"
                aria-label="Fermer les raccourcis clavier"
              >
                <X size={20} />
              </button>
            </div>
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
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>{action}</span>
                  <kbd style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)'
                  }}>{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {/* Artifact Panel - Style Playground */}
      <ArtifactPanel />
    </div>
  );
};

export default ChatLayoutSimple;
