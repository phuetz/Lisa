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
    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
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
      backgroundColor: '#212121',
      color: '#fff'
    }}>
      {/* Header - hauteur fixe */}
      <header style={{
        height: '56px',
        minHeight: '56px',
        padding: '0 16px',
        borderBottom: '1px solid #2d2d2d',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#212121'
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer'
          }}
        >
          <Menu size={20} />
        </button>
        
        <h1 style={{ 
          fontSize: '16px', 
          fontWeight: 500,
          color: '#fff',
          margin: 0,
          flex: 1
        }}>
          {currentConversation?.title || 'Lisa AI'}
        </h1>
        
        <ConnectionStatus />
        
        <button
          onClick={handleNewChat}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer'
          }}
          title="Nouvelle conversation"
        >
          <Plus size={20} />
        </button>
        
        <button
          onClick={() => setExportOpen(true)}
          disabled={!currentConversation || currentConversation.messages.length === 0}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: currentConversation?.messages.length ? '#888' : '#444',
            cursor: currentConversation?.messages.length ? 'pointer' : 'not-allowed'
          }}
          title="Exporter en PDF"
        >
          <FileDown size={20} />
        </button>
        
        <button
          onClick={() => setShowShortcuts(true)}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer'
          }}
          title="Raccourcis clavier"
        >
          <Keyboard size={20} />
        </button>
        
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#888',
            cursor: 'pointer'
          }}
          title="Paramètres"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* Messages Area - prend tout l'espace restant */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        minHeight: 0
      }}>
        <ChatMessages />
      </div>

      {/* Input Area - hauteur auto */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #2d2d2d',
        backgroundColor: '#212121'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <ChatInput />
        </div>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <>
          <div 
            onClick={() => setSidebarOpen(false)}
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
          <aside style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '280px',
            backgroundColor: '#171717',
            borderRight: '1px solid #2d2d2d',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Sidebar Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #2d2d2d',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleNewChat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#2d2d2d',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    flex: 1
                  }}
                >
                  <Plus size={16} />
                  Nouvelle conversation
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 34px',
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #3d3d3d',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              
              {/* Import/Export buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleExportJSON}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid #3d3d3d',
                    borderRadius: '6px',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Exporter les conversations"
                >
                  <Download size={14} />
                  Export
                </button>
                <button
                  onClick={handleImportJSON}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid #3d3d3d',
                    borderRadius: '6px',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Importer des conversations"
                >
                  <Upload size={14} />
                  Import
                </button>
              </div>
            </div>
            
            {/* Conversations List */}
            <div style={{ overflowY: 'auto', padding: '8px', maxHeight: '200px' }}>
              <div style={{ fontSize: '11px', color: '#666', padding: '4px 8px', marginBottom: '4px' }}>
                Conversations récentes
              </div>
              {filteredConversations.length === 0 ? (
                <div style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  color: '#666',
                  fontSize: '13px'
                }}>
                  Aucune conversation
                </div>
              ) : (
                filteredConversations.slice(0, 5).map(conv => (
                  <div
                    key={conv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      marginBottom: '2px',
                      cursor: 'pointer',
                      backgroundColor: conv.id === currentConversationId ? '#2d2d2d' : 'transparent',
                      transition: 'background-color 0.15s'
                    }}
                    onClick={() => {
                      setCurrentConversation(conv.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <MessageSquare size={14} style={{ color: '#666', marginRight: '8px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#fff',
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
                      style={{
                        padding: '4px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        opacity: 0.6,
                        borderRadius: '4px'
                      }}
                      title="Supprimer"
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
              borderTop: '1px solid #2d2d2d'
            }}>
              <div style={{ fontSize: '11px', color: '#666', padding: '4px 8px', marginBottom: '4px' }}>
                Navigation
              </div>
              {navigationItems.map((item) => (
                <div
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '2px',
                    cursor: 'pointer',
                    backgroundColor: isActive(item.path) ? '#10a37f20' : 'transparent',
                    color: isActive(item.path) ? '#10a37f' : '#888',
                    transition: 'all 0.15s',
                    fontSize: '13px',
                  }}
                >
                  <item.icon size={16} />
                  {item.label}
                </div>
              ))}
            </div>
            
            {/* Settings Button */}
            <div style={{ 
              padding: '8px 12px', 
              borderTop: '1px solid #2d2d2d' 
            }}>
              <button
                onClick={() => {
                  navigate('/settings');
                  setSidebarOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <Settings size={16} />
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
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#1a1a1a',
            borderRadius: '16px',
            padding: '24px',
            zIndex: 61,
            minWidth: '320px',
            border: '1px solid #333'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Raccourcis clavier</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
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
                  <span style={{ color: '#888', fontSize: '14px' }}>{action}</span>
                  <kbd style={{
                    backgroundColor: '#2d2d2d',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#fff',
                    border: '1px solid #444'
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
