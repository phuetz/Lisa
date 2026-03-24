/**
 * Chat Messages Component
 * Zone d'affichage des messages avec scroll automatique - Style moderne
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { Bot, User, Sparkles, Code, FileText, Lightbulb, Zap, Copy, Check, Clock, Hash, Edit2, RefreshCw, Trash2, Package, Play, Brain, Search, GitFork } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { parseArtifacts } from '../../utils/artifactParser';
import { useArtifactPanelStore } from '../../store/chatHistoryStore';
import type { AIProvider } from '../../services/aiService';

const PROMPT_SUGGESTIONS = [
  { icon: Code, text: "Aide-moi à écrire du code Python", color: '#3b82f6' },
  { icon: FileText, text: "Résume ce document pour moi", color: '#8b5cf6' },
  { icon: Lightbulb, text: "Explique-moi un concept complexe", color: '#f59e0b' },
  { icon: Zap, text: "Automatise une tâche répétitive", color: '#10b981' },
];

/* ── Message Actions ── */

interface MessageActionsProps {
  content: string;
  messageId: string;
  role: 'user' | 'assistant';
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onFork?: (messageId: string) => void;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
}

const MessageActions = ({ content, messageId, role, onEdit, onRegenerate, onDelete, onFork, cost, inputTokens, outputTokens }: MessageActionsProps) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== content) {
      onEdit(messageId, editContent.trim());
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="msg-edit">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          aria-label="Modifier le message"
          className="msg-edit-textarea"
        />
        <div className="msg-edit-actions">
          <button onClick={handleSaveEdit} className="btn-save">Sauvegarder</button>
          <button onClick={() => { setEditContent(content); setIsEditing(false); }} className="btn-cancel">Annuler</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="message-actions"
      role="toolbar"
      aria-label={`Actions pour le message de ${role === 'assistant' ? 'Lisa' : 'vous'}`}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', opacity: 0, transition: 'opacity var(--transition-normal)' }}
    >
      <button
        onClick={handleCopy}
        className="msg-action-btn"
        aria-label={copied ? 'Copié' : 'Copier le message'}
        style={copied ? { color: '#10b981', borderColor: '#10b981' } : undefined}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copié !' : 'Copier'}
      </button>

      {role === 'user' && onEdit && (
        <button onClick={() => setIsEditing(true)} className="msg-action-btn" aria-label="Modifier le message">
          <Edit2 size={12} /> Modifier
        </button>
      )}

      {role === 'assistant' && onRegenerate && (
        <button onClick={() => onRegenerate(messageId)} className="msg-action-btn" aria-label="Régénérer la réponse">
          <RefreshCw size={12} /> Régénérer
        </button>
      )}

      {onFork && (
        <button onClick={() => onFork(messageId)} className="msg-action-btn" aria-label="Dupliquer la conversation depuis ce message">
          <GitFork size={12} /> Fork
        </button>
      )}

      {onDelete && (
        <button onClick={() => onDelete(messageId)} className="msg-action-btn danger" aria-label="Supprimer le message">
          <Trash2 size={12} />
        </button>
      )}

      {cost != null && cost > 0 && (
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {inputTokens || 0}→{outputTokens || 0} · ${cost.toFixed(4)}
        </span>
      )}
    </div>
  );
};

/* ── Message Content with Artifact Detection ── */

const MessageContent = ({ content, role }: { content: string; role: string }) => {
  const { openArtifact } = useArtifactPanelStore();
  const parsed = useMemo(() => parseArtifacts(content), [content]);

  if (role !== 'assistant' || parsed.artifacts.length === 0) {
    return (
      <div className="msg-text">
        {role === 'assistant' ? <MarkdownRenderer content={content} /> : <span className="msg-text-pre">{content}</span>}
      </div>
    );
  }

  return (
    <div>
      {parsed.text && (
        <div className="msg-text" style={{ marginBottom: parsed.artifacts.length > 0 ? '16px' : 0 }}>
          <MarkdownRenderer content={parsed.text} />
        </div>
      )}

      {parsed.artifacts.map((artifact) => {
        const codeLines = artifact.code.split('\n');
        const previewLines = codeLines.slice(0, 8);
        const hasMore = codeLines.length > 8;

        return (
          <div key={artifact.id} className="artifact-card">
            <div
              role="button"
              tabIndex={0}
              aria-label={`Ouvrir l'artefact ${artifact.title}`}
              onClick={() => openArtifact(artifact)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openArtifact(artifact); } }}
              className="artifact-header"
            >
              <div className="artifact-icon" style={{ backgroundColor: getArtifactColor(artifact.type) + '20', color: getArtifactColor(artifact.type) }}>
                <Package size={18} />
              </div>
              <div className="artifact-info">
                <div className="artifact-title">{artifact.title}</div>
                <div className="artifact-meta">
                  <span className="artifact-type-badge" style={{ color: getArtifactColor(artifact.type) }}>{artifact.type}</span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span>{codeLines.length} lignes</span>
                </div>
              </div>
              <div className="artifact-run-btn" style={{ backgroundColor: getArtifactColor(artifact.type) + '20', color: getArtifactColor(artifact.type) }}>
                <Play size={14} fill="currentColor" /> Exécuter
              </div>
            </div>

            <div className="artifact-code-preview">
              <pre>
                {previewLines.map((line, i) => (
                  <div key={i} className="code-line">
                    <span className="code-line-num">{i + 1}</span>
                    <span>{line || ' '}</span>
                  </div>
                ))}
              </pre>
              {hasMore && (
                <button onClick={() => openArtifact(artifact)} className="artifact-show-more">
                  <span>Voir les {codeLines.length - 8} lignes restantes</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const getArtifactColor = (type: string): string => {
  const colors: Record<string, string> = {
    html: '#e34c26', react: '#61dafb', javascript: '#f7df1e', typescript: '#3178c6',
    css: '#264de4', python: '#3776ab', svg: '#ffb13b', mermaid: '#ff3670',
  };
  return colors[type] || '#f5a623';
};

/* ── Main ChatMessages Component ── */

export const ChatMessages = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { getCurrentConversation, currentConversationId, streamingMessage, isTyping, updateMessage, deleteMessage, addMessage, setTyping, setStreamingMessage } = useChatHistoryStore();

  const conversation = getCurrentConversation();
  const messages = useMemo(() => conversation?.messages || [], [conversation?.messages]);

  const handleEditMessage = (messageId: string, newContent: string) => {
    updateMessage(messageId, newContent);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (confirm('Supprimer ce message ?')) {
      deleteMessage(messageId);
    }
  };

  const handleFork = async (messageId: string) => {
    if (!currentConversationId) return;
    try {
      const store = useChatHistoryStore.getState();
      const conv = store.conversations.find(c => c.id === currentConversationId);
      if (!conv) return;

      const msgIndex = conv.messages.findIndex(m => m.id === messageId);
      if (msgIndex === -1) return;

      const forkedMessages = conv.messages.slice(0, msgIndex + 1);
      const newId = crypto.randomUUID();
      const now = new Date();

      const newConv = {
        id: newId,
        title: `${conv.title} (fork)`,
        messages: forkedMessages.map(m => ({ ...m, id: `${newId}-${m.id}`, conversationId: newId })),
        createdAt: now,
        updatedAt: now,
        tags: [...(conv.tags || [])],
        parentConversationId: currentConversationId,
        forkedFromMessageId: messageId,
      };

      // Add directly to store state
      useChatHistoryStore.setState(state => ({
        conversations: [newConv, ...state.conversations],
        currentConversationId: newId,
      }));

      // Persist to Dexie (non-blocking)
      import('../../db/database').then(({ db }) => {
        db.conversations.put({
          id: newId, title: newConv.title, status: 'active',
          isPinned: false, isArchived: false, tags: [], webSearchEnabled: false,
          totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0,
          messageCount: forkedMessages.length, parentConversationId: currentConversationId,
          forkedFromMessageId: messageId,
          createdAt: now.getTime(), updatedAt: now.getTime(), lastOpenedAt: now.getTime(),
        }).catch(() => {});
      }).catch(() => {});
    } catch (error) {
      console.error('[Fork] Failed:', error);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!currentConversationId || isRegenerating) return;

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }
    if (userMessageIndex < 0) return;

    deleteMessage(messageId);
    setIsRegenerating(true);
    setTyping(true);

    try {
      const history = messages.slice(0, userMessageIndex + 1).map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        image: m.image
      }));

      const { useChatSettingsStore, DEFAULT_MODELS } = await import('../../store/chatSettingsStore');
      const { aiService } = await import('../../services/aiService');
      const { selectedModelId, temperature, maxTokens } = useChatSettingsStore.getState();
      const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];

      aiService.updateConfig({
        provider: currentModel.provider as AIProvider,
        model: currentModel.id,
        temperature,
        maxTokens,
        baseURL: currentModel.provider === 'lmstudio' ? '/lmstudio/v1' : undefined
      });

      let fullResponse = '';
      for await (const chunk of aiService.streamMessage(history)) {
        if (chunk.done) break;
        fullResponse += chunk.content;
        setStreamingMessage(fullResponse);
      }

      setStreamingMessage(null);
      if (fullResponse) {
        addMessage({
          role: 'assistant',
          content: fullResponse,
          conversationId: currentConversationId,
          metadata: { regenerated: true }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la régénération:', error);
      setStreamingMessage(null);
      addMessage({
        role: 'assistant',
        content: 'Erreur lors de la régénération. Veuillez réessayer.',
        conversationId: currentConversationId,
      });
    } finally {
      setIsRegenerating(false);
      setTyping(false);
    }
  };

  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    let container: HTMLElement | null = el.parentElement;
    while (container) {
      const { overflowY } = getComputedStyle(container);
      if (overflowY === 'auto' || overflowY === 'scroll') break;
      container = container.parentElement;
    }
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, streamingMessage, isTyping]);

  const handleSuggestionClick = (text: string) => {
    if (!currentConversationId) return;
    const input = document.querySelector('textarea[aria-label="Message à envoyer"]') as HTMLTextAreaElement;
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(input, text);
      } else {
        input.value = text;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }
  };

  /* ── Welcome Screen ── */
  if (!currentConversationId || messages.length === 0) {
    return (
      <div className="welcome-container">
        <div className="welcome-content">
          <div className="welcome-logo">
            <Sparkles size={48} color="#fff" />
          </div>
          <h2 className="welcome-title">Bonjour ! Je suis Lisa</h2>
          <p className="welcome-subtitle">
            Votre assistante IA intelligente. Je peux vous aider à coder, analyser, créer et bien plus encore.
          </p>
          <div className="welcome-suggestions">
            {PROMPT_SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="suggestion-chip welcome-suggestion"
                aria-label={`Suggestion : ${suggestion.text}`}
              >
                <div className="welcome-suggestion-icon" style={{ backgroundColor: `${suggestion.color}20` }}>
                  <suggestion.icon size={18} color={suggestion.color} aria-hidden="true" />
                </div>
                <span>{suggestion.text}</span>
              </button>
            ))}
          </div>
          <div className="welcome-shortcuts">
            <span><kbd className="welcome-kbd">Enter</kbd> Envoyer</span>
            <span><kbd className="welcome-kbd">Shift+Enter</kbd> Nouvelle ligne</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Messages List ── */
  return (
    <div className="chat-messages-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message-row msg-row${message.role === 'assistant' ? ' assistant' : ''}`}
          role="article"
          aria-label={`Message de ${message.role === 'assistant' ? 'Lisa' : 'vous'}`}
        >
          <div className="msg-inner">
            <div className={`msg-avatar ${message.role}`}>
              {message.role === 'assistant' ? (
                <Bot size={18} color="#fff" aria-hidden="true" />
              ) : (
                <User size={18} color="#fff" aria-hidden="true" />
              )}
            </div>

            <div className="msg-body">
              <div className="msg-header">
                <span className="msg-author">
                  {message.role === 'assistant' ? 'Lisa' : 'Vous'}
                </span>
                {message.role === 'assistant' && message.metadata && (
                  <div className="msg-meta">
                    {(message.metadata as { model?: string }).model && (
                      <span className="msg-meta-item"><Bot size={10} />{(message.metadata as { model?: string }).model}</span>
                    )}
                    {(message.metadata as { duration?: number }).duration && (
                      <span className="msg-meta-item"><Clock size={10} />{(message.metadata as { duration?: number }).duration}ms</span>
                    )}
                    {(message.metadata as { tokens?: number }).tokens && (
                      <span className="msg-meta-item"><Hash size={10} />~{(message.metadata as { tokens?: number }).tokens} tokens</span>
                    )}
                  </div>
                )}
              </div>
              <MessageContent content={message.content} role={message.role} />
              <MessageActions
                content={message.content}
                messageId={message.id}
                role={message.role as 'user' | 'assistant'}
                onEdit={handleEditMessage}
                onRegenerate={handleRegenerate}
                onDelete={handleDeleteMessage}
                onFork={handleFork}
                cost={message.cost}
                inputTokens={message.inputTokens}
                outputTokens={message.outputTokens}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Streaming message */}
      {streamingMessage && (
        <div className="msg-row assistant" role="status" aria-label="Lisa est en train de répondre">
          <div className="msg-inner">
            <div className="msg-avatar assistant">
              <Bot size={18} color="#fff" aria-hidden="true" />
            </div>
            <div className="msg-body">
              <div className="msg-author" style={{ marginBottom: '8px' }}>Lisa</div>
              <div className="msg-text">
                <MarkdownRenderer content={streamingMessage} />
                <span className="streaming-cursor" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thinking indicator */}
      {isTyping && !streamingMessage && (
        <div className="msg-row assistant" role="status" aria-label="Lisa réfléchit">
          <div className="msg-inner">
            <div className="msg-avatar thinking">
              <Brain size={18} color="#fff" aria-hidden="true" />
            </div>
            <div className="msg-body">
              <div className="thinking-header">
                Lisa
                <span className="thinking-label">réfléchit...</span>
              </div>
              <div className="thinking-stages">
                <div className="thinking-stage">
                  <div className="thinking-dot" aria-hidden="true" />
                  <span className="thinking-stage-text active">Réflexion</span>
                </div>
                <div className="thinking-stage inactive">
                  <Search size={12} color="var(--color-info)" aria-hidden="true" />
                  <span className="thinking-stage-text inactive">Mémoire</span>
                </div>
                <div className="thinking-stage inactive">
                  <Sparkles size={12} color="var(--color-accent)" aria-hidden="true" />
                  <span className="thinking-stage-text inactive">Génération</span>
                </div>
                <div className="thinking-dots" aria-hidden="true">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} className="bounce-dot" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
