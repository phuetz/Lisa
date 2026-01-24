/**
 * ChatLayoutFluent - Layout de chat style Office 365 / Teams
 */

import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, Loader2, X, FileDown, Keyboard } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { useChatSettingsStore } from '../../store/chatSettingsStore';
import { useAIChat } from '../../hooks/useAIChat';
import { ConnectionStatus } from './ConnectionStatus';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { ArtifactPanel } from './ArtifactPanel';
import {
  FluentButton,
  FluentCard,
  FluentMessageBubble,
  FluentChatInput,
  FluentConversationList,
} from '../fluent';
import type { FluentConversationItem } from '../fluent/FluentConversationList';
import { themeService } from '../../services/ThemeService';
import {
  fluentColors,
  fluentTypography,
  fluentSpacing,
  fluentBorderRadius,
  fluentElevation,
  fluentMotion,
} from '../../styles/fluentTokens';

// Lazy load heavy components
const ExportPDF = lazy(() => import('./ExportPDF').then(m => ({ default: m.ExportPDF })));

const LazyFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
    <Loader2 className="fluent-spinner" style={{ width: '24px', height: '24px', color: fluentColors.primary.light }} />
  </div>
);

export const ChatLayoutFluent = () => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isDark, setIsDark] = useState(themeService.isDark);
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

  // Apply Fluent theme on mount
  useEffect(() => {
    const currentMode = themeService.mode;
    if (!currentMode.startsWith('fluent')) {
      themeService.setMode(isDark ? 'fluentDark' : 'fluentLight');
    }
  }, []);

  // Sync with theme service
  useEffect(() => {
    const unsubscribe = themeService.subscribe((state) => {
      setIsDark(state.resolved === 'dark');
    });
    return unsubscribe;
  }, []);

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

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    backgroundColor: `var(--color-bg-primary, ${isDark ? fluentColors.neutral.backgroundDark : fluentColors.neutral.background})`,
    color: `var(--color-text-primary, ${isDark ? fluentColors.neutral.textDark : fluentColors.neutral.text})`,
    fontFamily: fluentTypography.fontFamily,
  };

  const sidebarStyle: React.CSSProperties = {
    width: sidebarWidth,
    minWidth: sidebarWidth,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: `var(--color-bg-secondary, ${isDark ? fluentColors.neutral.surfaceDark : fluentColors.neutral.surface})`,
    borderRight: `1px solid var(--color-border, ${isDark ? fluentColors.neutral.dividerDark : fluentColors.neutral.divider})`,
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${fluentSpacing.m} ${fluentSpacing.xl}`,
    height: '56px',
    borderBottom: `1px solid var(--color-border, ${isDark ? fluentColors.neutral.dividerDark : fluentColors.neutral.divider})`,
    backgroundColor: `var(--color-bg-secondary, ${isDark ? fluentColors.neutral.surfaceDark : fluentColors.neutral.surface})`,
  };

  const messagesContainerStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: fluentSpacing.l,
  };

  const inputContainerStyle: React.CSSProperties = {
    padding: fluentSpacing.l,
    borderTop: `1px solid var(--color-border, ${isDark ? fluentColors.neutral.dividerDark : fluentColors.neutral.divider})`,
    backgroundColor: `var(--color-bg-secondary, ${isDark ? fluentColors.neutral.surfaceDark : fluentColors.neutral.surface})`,
  };

  const iconButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: fluentBorderRadius.medium,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: `var(--color-text-secondary, ${isDark ? fluentColors.neutral.textSecondaryDark : fluentColors.neutral.textSecondary})`,
    transition: `all ${fluentMotion.duration.fast} ${fluentMotion.easing.standard}`,
  };

  return (
    <div style={containerStyle} className="fluent-chat-layout fluent-page-enter">
      {/* Sidebar - Conversation List */}
      <aside style={sidebarStyle}>
        {/* Sidebar Header */}
        <div style={{
          padding: fluentSpacing.m,
          borderBottom: `1px solid var(--color-border, ${isDark ? fluentColors.neutral.dividerDark : fluentColors.neutral.divider})`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: fluentSpacing.m, marginBottom: fluentSpacing.m }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: fluentBorderRadius.medium,
              background: `linear-gradient(135deg, ${fluentColors.primary.light} 0%, ${fluentColors.primary.hover} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 600,
              fontSize: fluentTypography.sizes.subtitle,
            }}>
              L
            </div>
            <span style={{
              fontSize: fluentTypography.sizes.title2,
              fontWeight: fluentTypography.weights.semibold,
            }}>
              Lisa
            </span>
          </div>

          <FluentButton
            variant="primary"
            icon={<Plus size={16} />}
            fullWidth
            onClick={handleNewChat}
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
        <div style={{
          padding: fluentSpacing.m,
          borderTop: `1px solid var(--color-border, ${isDark ? fluentColors.neutral.dividerDark : fluentColors.neutral.divider})`,
        }}>
          <FluentButton
            variant="subtle"
            icon={<Settings size={16} />}
            fullWidth
            onClick={() => navigate('/settings')}
          >
            Paramètres
          </FluentButton>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main style={mainStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: fluentSpacing.m }}>
            <h1 style={{
              margin: 0,
              fontSize: fluentTypography.sizes.title2,
              fontWeight: fluentTypography.weights.semibold,
            }}>
              {currentConversation?.title || 'Lisa AI'}
            </h1>
            <ConnectionStatus />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: fluentSpacing.xs }}>
            <button
              onClick={() => setExportOpen(true)}
              disabled={!currentConversation || currentConversation.messages.length === 0}
              style={{
                ...iconButtonStyle,
                opacity: currentConversation?.messages.length ? 1 : 0.5,
                cursor: currentConversation?.messages.length ? 'pointer' : 'not-allowed',
              }}
              className="fluent-reveal"
              title="Exporter en PDF"
            >
              <FileDown size={18} />
            </button>

            <button
              onClick={() => setShowShortcuts(true)}
              style={iconButtonStyle}
              className="fluent-reveal"
              title="Raccourcis clavier"
            >
              <Keyboard size={18} />
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              style={iconButtonStyle}
              className="fluent-reveal"
              title="Paramètres du chat"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div style={messagesContainerStyle}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {!currentConversation || currentConversation.messages.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '400px',
                textAlign: 'center',
                color: `var(--color-text-secondary)`,
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: fluentBorderRadius.large,
                  background: `linear-gradient(135deg, ${fluentColors.primary.light} 0%, ${fluentColors.primary.hover} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: fluentSpacing.l,
                  color: '#fff',
                  fontSize: '28px',
                  fontWeight: 700,
                }}>
                  L
                </div>
                <h2 style={{
                  margin: 0,
                  marginBottom: fluentSpacing.s,
                  fontSize: fluentTypography.sizes.title,
                  fontWeight: fluentTypography.weights.semibold,
                  color: `var(--color-text-primary)`,
                }}>
                  Bienvenue sur Lisa
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: fluentTypography.sizes.body,
                  maxWidth: '400px',
                }}>
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
        <div style={inputContainerStyle}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
      {showShortcuts && (
        <>
          <div
            onClick={() => setShowShortcuts(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 60,
            }}
            className="fluent-overlay-enter"
          />
          <FluentCard
            variant="elevated"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 61,
              minWidth: '360px',
              maxWidth: '90vw',
            }}
            className="fluent-dialog-enter"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: fluentSpacing.l }}>
              <h3 style={{ margin: 0, fontSize: fluentTypography.sizes.title2, fontWeight: fluentTypography.weights.semibold }}>
                Raccourcis clavier
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                style={iconButtonStyle}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: fluentSpacing.m }}>
              {[
                { keys: 'Enter', action: 'Envoyer le message' },
                { keys: 'Shift + Enter', action: 'Nouvelle ligne' },
                { keys: 'Ctrl + N', action: 'Nouvelle conversation' },
                { keys: 'Escape', action: 'Fermer les modales' },
              ].map(({ keys, action }) => (
                <div key={keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: `var(--color-text-secondary)`, fontSize: fluentTypography.sizes.body }}>{action}</span>
                  <kbd style={{
                    backgroundColor: `var(--color-bg-tertiary)`,
                    padding: '4px 10px',
                    borderRadius: fluentBorderRadius.small,
                    fontSize: fluentTypography.sizes.caption,
                    border: `1px solid var(--color-border)`,
                  }}>{keys}</kbd>
                </div>
              ))}
            </div>
          </FluentCard>
        </>
      )}

      {/* Artifact Panel */}
      <ArtifactPanel />

      <style>{`
        .fluent-chat-layout button:hover {
          background: var(--color-bg-tertiary, ${isDark ? fluentColors.neutral.surfaceHoverDark : fluentColors.neutral.surfaceHover}) !important;
          color: var(--color-accent, ${fluentColors.primary.light}) !important;
        }
      `}</style>
    </div>
  );
};

export default ChatLayoutFluent;
