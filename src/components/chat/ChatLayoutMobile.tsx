/**
 * Chat Layout Mobile - Style ChatGPT
 * Layout 3 zones optimisé pour mobile Android
 * Utilise les mêmes stores que la version web
 */

import { useState, useMemo, useEffect } from 'react';
import { Menu, X, Plus, Settings, MessageSquare, Search, Download } from 'lucide-react';
import { SwipeableItem } from './SwipeableItem';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { ChatMessagesMobile } from './ChatMessagesMobile';
import { ChatInputMobile } from './ChatInputMobile';
import { ConnectionIndicator } from '../mobile/ConnectionIndicator';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { ArtifactPanel } from './ArtifactPanel';
import { useMobile } from '../../hooks/useMobile';

// Format date relative (commun web/mobile)
const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const ChatLayoutMobile = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { hapticTap } = useMobile();
  
  const { 
    conversations,
    currentConversationId,
    createConversation,
    setCurrentConversation,
    deleteConversation,
    getCurrentConversation 
  } = useChatHistoryStore();
  
  const currentConversation = getCurrentConversation();

  // Android back button handler
  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      if (settingsOpen) {
        e.preventDefault();
        setSettingsOpen(false);
        hapticTap();
      } else if (sidebarOpen) {
        e.preventDefault();
        setSidebarOpen(false);
        hapticTap();
      }
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, [sidebarOpen, settingsOpen, hapticTap]);

  // Filtrer les conversations par recherche
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(query) ||
      conv.messages.some(m => m.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  const handleNewChat = () => {
    const id = createConversation();
    setCurrentConversation(id);
    setSidebarOpen(false);
  };

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

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      maxHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000000',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden'
    }}>
      {/* Header - Style ChatGPT */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        backgroundColor: 'rgba(52, 53, 65, 0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(86, 88, 105, 0.3)',
        zIndex: 40,
        flexShrink: 0,
        minHeight: '56px',
        boxSizing: 'border-box'
      }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ececf1',
            cursor: 'pointer',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={20} />
        </button>
        
        <h1 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#ececf1',
          margin: 0,
          flex: 1,
          textAlign: 'center'
        }}>
          {currentConversation?.title || 'Lisa AI'}
        </h1>
        
        <ConnectionIndicator />
      </header>

      {/* Messages Area - Scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        backgroundColor: '#000000',
        position: 'relative'
      }}>
        <ChatMessagesMobile />
      </div>

      {/* Composer - Sticky at bottom of flex container */}
      <div style={{
        flexShrink: 0,
        backgroundColor: 'rgba(52, 53, 65, 0.98)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(86, 88, 105, 0.3)',
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        zIndex: 40
      }}>
        <ChatInputMobile />
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 70
            }}
          />
          
          {/* Sidebar Panel */}
          <aside style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '280px',
            maxWidth: '80vw',
            backgroundColor: '#171717',
            borderRight: '1px solid #2d2d2d',
            zIndex: 80,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Sidebar Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #2d2d2d',
              paddingTop: 'max(12px, env(safe-area-inset-top))',
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
              
              {/* Export button */}
              <button
                onClick={handleExportJSON}
                style={{
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
              >
                <Download size={14} />
                Exporter les conversations
              </button>
            </div>
            
            {/* Conversations List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {filteredConversations.length === 0 ? (
                <div style={{ 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Aucune conversation
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <SwipeableItem
                    key={conv.id}
                    onDelete={() => deleteConversation(conv.id)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        backgroundColor: conv.id === currentConversationId ? '#2d2d2d' : 'transparent'
                      }}
                      onClick={() => {
                        setCurrentConversation(conv.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <MessageSquare size={16} style={{ color: '#666', marginRight: '10px', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          color: '#fff',
                          fontSize: '14px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {conv.title}
                        </div>
                        <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                          {formatRelativeDate(conv.updatedAt)}
                        </div>
                      </div>
                      {/* Swipe left indicator */}
                      <div style={{ 
                        color: '#444', 
                        fontSize: '10px',
                        opacity: 0.5
                      }}>
                        ←
                      </div>
                    </div>
                  </SwipeableItem>
                ))
              )}
            </div>
            
            {/* Sidebar Footer */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #2d2d2d',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
            }}>
              <button
                onClick={() => setSettingsOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: 'pointer'
                }}
              >
                <Settings size={20} />
                <span>Paramètres</span>
              </button>
            </div>
          </aside>
        </>
      )}
      
      {/* Settings Panel - Réutilise le composant web */}
      <ChatSettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      {/* Artifact Panel - Style Playground */}
      <ArtifactPanel />
    </div>
  );
};

export default ChatLayoutMobile;
