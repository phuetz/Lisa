/**
 * Chat Layout Component
 * Layout principal fullscreen avec sidebar et chat - Style moderne
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Menu, X, Plus, MessageSquare, Settings, Trash2, LayoutDashboard, Eye, Mic, Workflow, Bot, Search, Edit2, Download, Pin, Archive, EyeOff, FileText, Wrench, Home, Code, Activity, Brain, Globe, Puzzle, Zap } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { useChatSettingsStore } from '../../store/chatSettingsStore';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { ConnectionStatus } from './ConnectionStatus';
import { ArtifactPanel } from './ArtifactPanel';

export const ChatLayout = () => {
  // Responsive: détection mobile via MUI useMediaQuery (dynamique)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // < 900px
  const [sidebarOpen, setSidebarOpen] = useState(false); // Toujours fermée par défaut

  // Fermer la sidebar automatiquement quand on passe en mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
    const editInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { incognitoMode } = useChatSettingsStore();
  
  const {
    conversations,
    currentConversationId,
    createConversation,
    setCurrentConversation,
    deleteConversation,
    pinConversation,
    archiveConversation,
  } = useChatHistoryStore();

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  // Filtrer les conversations par recherche
  const filteredConversations = conversations.filter(conv => 
    !conv.archived && (
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  // Trier: épinglées en premier, puis par date
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleNewChat = () => {
    const id = createConversation();
    setCurrentConversation(id);
  };

  // Commencer l'édition du titre
  const startEditTitle = (conv: typeof conversations[0]) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  // Sauvegarder le titre
  const saveTitle = () => {
    if (editingId && editTitle.trim()) {
      // Mise à jour du titre via le store
      useChatHistoryStore.setState(state => ({
        conversations: state.conversations.map(c =>
          c.id === editingId ? { ...c, title: editTitle.trim() } : c
        )
      }));
    }
    setEditingId(null);
    setEditTitle('');
  };

  // Export conversation en Markdown
  const handleExport = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    
    let markdown = `# ${conv.title}\n\n`;
    markdown += `*Créé le ${new Date(conv.createdAt).toLocaleDateString('fr-FR')}*\n\n---\n\n`;
    
    conv.messages.forEach(msg => {
      const role = msg.role === 'user' ? '**Vous**' : '**Lisa**';
      markdown += `${role}:\n\n${msg.content}\n\n---\n\n`;
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Focus sur l'input d'édition
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  
  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: sidebarOpen ? (isMobile ? '250px 1fr' : '260px 1fr') : '1fr',
      gridTemplateRows: '1fr',
      height: '100%', 
      width: '100%',
      backgroundColor: '#212121',
      color: '#fff',
      overflow: 'hidden'
    }}>
      {/* Sidebar */}
      {/* Mobile overlay when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 40
          }}
        />
      )}
      
      <aside style={{
        width: sidebarOpen ? (isMobile ? '65vw' : '260px') : '0px',
        minWidth: sidebarOpen ? (isMobile ? '65vw' : '260px') : '0px',
        maxWidth: isMobile ? '250px' : '260px',
        backgroundColor: '#171717',
        borderRight: '1px solid #2d2d2d',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        position: isMobile ? 'fixed' : 'relative',
        left: 0,
        top: 0,
        height: '100%',
        zIndex: isMobile ? 50 : 'auto'
      }}>
        {/* Sidebar Header */}
        <div style={{ 
          padding: '12px', 
          borderBottom: '1px solid #2d2d2d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={handleNewChat}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #4d4d4d',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <Plus size={18} />
            Nouveau chat
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              marginLeft: '8px',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            border: '1px solid #404040'
          }}>
            <Search size={16} color="#888" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '13px'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  padding: '2px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '8px'
        }}>
          <div style={{ fontSize: '12px', color: '#888', padding: '8px 12px', marginBottom: '4px' }}>
            {searchQuery ? `Résultats (${sortedConversations.length})` : 'Conversations récentes'}
          </div>
          {sortedConversations.slice(0, 30).map((conv) => (
            <div
              key={conv.id}
              onClick={() => !editingId && setCurrentConversation(conv.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: conv.id === currentConversationId ? '#2d2d2d' : 'transparent',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                marginBottom: '2px',
                position: 'relative'
              }}
            >
              {conv.pinned && <Pin size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />}
              <MessageSquare size={16} style={{ color: '#888', flexShrink: 0 }} />
              
              {/* Title - editable */}
              {editingId === conv.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') { setEditingId(null); setEditTitle(''); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #10a37f',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              ) : (
                <span style={{ 
                  flex: 1, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  fontSize: '14px'
                }}>
                  {conv.title || 'Nouvelle conversation'}
                </span>
              )}
              
              {/* Actions */}
              {conv.id === currentConversationId && editingId !== conv.id && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditTitle(conv); }}
                    style={{ padding: '4px', backgroundColor: 'transparent', border: 'none', color: '#888', cursor: 'pointer', borderRadius: '4px' }}
                    title="Renommer"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); pinConversation(conv.id); }}
                    style={{ padding: '4px', backgroundColor: 'transparent', border: 'none', color: conv.pinned ? '#f59e0b' : '#888', cursor: 'pointer', borderRadius: '4px' }}
                    title={conv.pinned ? 'Désépingler' : 'Épingler'}
                  >
                    <Pin size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(conv.id); }}
                    style={{ padding: '4px', backgroundColor: 'transparent', border: 'none', color: '#888', cursor: 'pointer', borderRadius: '4px' }}
                    title="Exporter en Markdown"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); archiveConversation(conv.id); }}
                    style={{ padding: '4px', backgroundColor: 'transparent', border: 'none', color: '#888', cursor: 'pointer', borderRadius: '4px' }}
                    title="Archiver"
                  >
                    <Archive size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    style={{ padding: '4px', backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '4px' }}
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {sortedConversations.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
              {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
            </div>
          )}
        </div>

        {/* Navigation Links - hidden on mobile (use bottom nav instead) */}
        {!isMobile && (
          <div style={{ 
            padding: '8px', 
            borderTop: '1px solid #2d2d2d'
          }}>
            <div style={{ fontSize: '12px', color: '#888', padding: '8px 12px', marginBottom: '4px' }}>
              Navigation
            </div>
            {[
              { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
              { icon: Globe, label: 'Gateway', path: '/gateway' },
              { icon: Puzzle, label: 'Skills', path: '/skills' },
              { icon: Zap, label: 'Automation', path: '/automation' },
              { icon: Eye, label: 'Vision', path: '/vision' },
              { icon: Mic, label: 'Audio', path: '/audio' },
              { icon: Bot, label: 'Agents', path: '/agents' },
              { icon: Workflow, label: 'Workflows', path: '/workflows' },
              { icon: FileText, label: 'Documents', path: '/documents' },
              { icon: Wrench, label: 'Outils', path: '/tools' },
              { icon: Code, label: 'Playground', path: '/playground' },
              { icon: Brain, label: 'Personas', path: '/personas' },
              { icon: Activity, label: 'Monitoring', path: '/monitoring' },
              { icon: Home, label: 'Smart Home', path: '/smart-home' },
            ].map((item) => (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                className="nav-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'background-color 0.2s'
                }}
              >
                <item.icon size={16} />
                {item.label}
              </div>
            ))}
          </div>
        )}

        {/* Sidebar Footer - hidden on mobile */}
        {!isMobile && (
          <div style={{ 
            padding: '12px', 
            borderTop: '1px solid #2d2d2d'
          }}>
            <div
              onClick={() => setSettingsOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: 'transparent',
                borderRadius: '8px',
                color: '#888',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Settings size={16} />
              Paramètres
            </div>
          </div>
        )}
      </aside>

      {/* Main Content - 3 zones: header, messages, composer */}
      <main style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        height: '100%',
        backgroundColor: '#212121',
        overflow: 'hidden'
      }}>
        {/* Header - responsive */}
        <header style={{
          padding: isMobile ? '8px 12px' : '12px 16px',
          borderBottom: '1px solid #2d2d2d',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '12px',
          paddingTop: isMobile ? 'max(8px, env(safe-area-inset-top))' : '12px'
        }}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              <Menu size={20} />
            </button>
          )}
          <h1 style={{ 
            fontSize: '16px', 
            fontWeight: 500,
            color: '#fff',
            margin: 0,
            flex: 1
          }}>
            {currentConversation?.title || 'Lisa AI'}
          </h1>
          
          {/* Connection Status */}
          <ConnectionStatus />
          
          {/* Incognito indicator */}
          {incognitoMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#8b5cf620',
              borderRadius: '16px',
              color: '#8b5cf6',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <EyeOff size={14} />
              Incognito
            </div>
          )}
          
          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              borderRadius: '6px'
            }}
            title="Paramètres"
          >
            <Settings size={20} />
          </button>
        </header>

        {/* Zone 1: Messages Area - scrollable */}
        <div style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <ChatMessages />
        </div>

        {/* Zone 2: Composer - always at bottom */}
        <div style={{ 
          padding: '16px 24px',
          paddingBottom: '24px',
          maxWidth: '1100px',
          margin: '0 auto',
          width: '100%',
          backgroundColor: '#212121',
          borderTop: '1px solid #2d2d2d',
          boxSizing: 'border-box'
        }}>
          <ChatInput />
        </div>
      </main>

      {/* Settings Panel */}
      <ChatSettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Artifact Panel - Style Playground */}
      <ArtifactPanel />
    </div>
  );
};

export default ChatLayout;
