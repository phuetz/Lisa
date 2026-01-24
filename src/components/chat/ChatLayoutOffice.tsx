/**
 * ChatLayoutOffice - Office 365 Style Chat Layout
 * Beautiful chat interface inspired by Microsoft Teams
 */

import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, X, FileDown, Palette, MessageSquare } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { useChatSettingsStore } from '../../store/chatSettingsStore';
import { useOfficeThemeStore, useIsDarkMode } from '../../store/officeThemeStore';
import { useAIChat } from '../../hooks/useAIChat';
import { ConnectionStatus } from './ConnectionStatus';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { ArtifactPanel } from './ArtifactPanel';
import { OfficeTopBar, OfficeThemePanel } from '../office';
import {
  FluentButton,
  FluentMessageBubble,
  FluentChatInput,
  FluentConversationList,
} from '../fluent';
import type { FluentConversationItem } from '../fluent/FluentConversationList';

// Lazy load heavy components
const ExportPDF = lazy(() => import('./ExportPDF').then(m => ({ default: m.ExportPDF })));

const LazyFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
    <Loader2 className="fluent-spinner" style={{ width: '24px', height: '24px' }} />
  </div>
);

export const ChatLayoutOffice = () => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    currentConversationId,
    createConversation,
    setCurrentConversation,
    deleteConversation,
  } = useChatHistoryStore();

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const { sendMessage, isStreaming } = useAIChat();
  const { model } = useChatSettingsStore();

  // Office Theme
  const { getCurrentColors, getCurrentTheme, transitionsEnabled } = useOfficeThemeStore();
  const isDark = useIsDarkMode();
  const colors = getCurrentColors();
  const theme = getCurrentTheme();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  // Convert conversations to Fluent format
  const fluentConversations: FluentConversationItem[] = useMemo(() => {
    return conversations.map(conv => ({
      id: conv.id,
      title: conv.title || 'Nouvelle conversation',
      lastMessage: conv.messages.length > 0
        ? conv.messages[conv.messages.length - 1].content.substring(0, 100)
        : 'Aucun message',
      timestamp: new Date(conv.updatedAt || conv.createdAt),
      unreadCount: 0,
      online: true,
    }));
  }, [conversations]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return fluentConversations;
    const query = searchQuery.toLowerCase();
    return fluentConversations.filter(conv =>
      conv.title.toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query)
    );
  }, [fluentConversations, searchQuery]);

  const handleNewChat = () => {
    const id = createConversation();
    setCurrentConversation(id);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    await sendMessage(content);
  };

  const handleSelectConversation = (conv: FluentConversationItem) => {
    setCurrentConversation(conv.id);
  };

  const transition = transitionsEnabled ? 'all 0.2s ease' : 'none';

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.editor,
      color: colors.editorText,
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
      transition,
    },
    main: {
      display: 'flex',
      flex: 1,
      marginTop: 48, // TopBar height
      overflow: 'hidden',
    },
    sidebar: {
      width: sidebarCollapsed ? 0 : 320,
      minWidth: sidebarCollapsed ? 0 : 320,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.sidebar,
      borderRight: `1px solid ${colors.border}`,
      overflow: 'hidden',
      transition,
    },
    sidebarHeader: {
      padding: 16,
      borderBottom: `1px solid ${colors.border}`,
    },
    chatArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    chatHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      height: 56,
      borderBottom: `1px solid ${colors.border}`,
      backgroundColor: colors.sidebar,
    },
    chatTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    titleText: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
      color: colors.editorText,
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    iconButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: 8,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: colors.editorSecondary,
      transition,
    },
    messagesContainer: {
      flex: 1,
      overflow: 'auto',
      padding: 24,
    },
    messagesWrapper: {
      maxWidth: 800,
      margin: '0 auto',
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 400,
      textAlign: 'center',
      color: colors.editorSecondary,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 20,
      background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentHover} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      color: '#fff',
    },
    emptyTitle: {
      margin: 0,
      marginBottom: 8,
      fontSize: 24,
      fontWeight: 600,
      color: colors.editorText,
    },
    emptyText: {
      margin: 0,
      fontSize: 14,
      maxWidth: 400,
    },
    inputContainer: {
      padding: 24,
      borderTop: `1px solid ${colors.border}`,
      backgroundColor: colors.sidebar,
    },
    inputWrapper: {
      maxWidth: 800,
      margin: '0 auto',
    },
  };

  return (
    <div style={styles.container} className="office-chat-layout">
      {/* Top App Bar */}
      <OfficeTopBar
        appName="Lisa"
        appIcon={<MessageSquare size={20} />}
        appColor={colors.ribbon}
        onNavigate={navigate}
        showNotifications
        notificationCount={0}
      />

      <div style={styles.main}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          {/* Sidebar Header */}
          <div style={styles.sidebarHeader}>
            <FluentButton
              variant="primary"
              icon={<Plus size={16} />}
              fullWidth
              onClick={handleNewChat}
              style={{ backgroundColor: colors.accent }}
            >
              Nouvelle conversation
            </FluentButton>
          </div>

          {/* Conversation List */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <FluentConversationList
              conversations={filteredConversations}
              selectedId={currentConversationId || undefined}
              onSelect={handleSelectConversation}
              onDelete={(id) => {
                if (confirm('Supprimer cette conversation ?')) {
                  deleteConversation(id);
                }
              }}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              emptyMessage="Aucune conversation"
            />
          </div>

          {/* Sidebar Footer */}
          <div style={{ padding: 12, borderTop: `1px solid ${colors.border}` }}>
            <FluentButton
              variant="subtle"
              icon={<Palette size={16} />}
              fullWidth
              onClick={() => setThemeOpen(true)}
            >
              Personnaliser
            </FluentButton>
          </div>
        </aside>

        {/* Chat Area */}
        <main style={styles.chatArea}>
          {/* Chat Header */}
          <header style={styles.chatHeader}>
            <div style={styles.chatTitle}>
              <h1 style={styles.titleText}>
                {currentConversation?.title || 'Lisa AI'}
              </h1>
              <ConnectionStatus />
            </div>

            <div style={styles.headerActions}>
              <button
                onClick={() => setExportOpen(true)}
                disabled={!currentConversation || currentConversation.messages.length === 0}
                style={{
                  ...styles.iconButton,
                  opacity: currentConversation?.messages.length ? 1 : 0.5,
                  cursor: currentConversation?.messages.length ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                title="Exporter en PDF"
              >
                <FileDown size={18} />
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                style={styles.iconButton}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.sidebarHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                title="Paramètres du chat"
              >
                <X size={18} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div style={styles.messagesContainer}>
            <div style={styles.messagesWrapper}>
              {!currentConversation || currentConversation.messages.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>
                    <MessageSquare size={40} />
                  </div>
                  <h2 style={styles.emptyTitle}>Bienvenue sur Lisa</h2>
                  <p style={styles.emptyText}>
                    Commencez une conversation en tapant un message ci-dessous.
                    Je peux vous aider avec des questions, des tâches, ou simplement discuter.
                  </p>
                </div>
              ) : (
                currentConversation.messages.map((message, index) => (
                  <FluentMessageBubble
                    key={message.id || index}
                    id={message.id || String(index)}
                    content={message.content}
                    sender={{
                      name: message.role === 'user' ? 'Vous' : 'Lisa',
                      isUser: message.role === 'user',
                    }}
                    timestamp={new Date(message.timestamp || Date.now())}
                    status={message.role === 'user' ? 'read' : undefined}
                    isStreaming={isStreaming && index === currentConversation.messages.length - 1 && message.role === 'assistant'}
                    onCopy={() => navigator.clipboard.writeText(message.content)}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div style={styles.inputContainer}>
            <div style={styles.inputWrapper}>
              <FluentChatInput
                onSend={handleSendMessage}
                placeholder={`Message Lisa (${model})...`}
                disabled={isStreaming}
                loading={isStreaming}
                showToolbar
              />
            </div>
          </div>
        </main>
      </div>

      {/* Panels & Modals */}
      <ChatSettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <OfficeThemePanel isOpen={themeOpen} onClose={() => setThemeOpen(false)} />

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

      {/* Artifact Panel */}
      <ArtifactPanel />
    </div>
  );
};

export default ChatLayoutOffice;
