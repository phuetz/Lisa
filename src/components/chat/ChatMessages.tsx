/**
 * Chat Messages Component
 * Zone d'affichage des messages avec scroll automatique - Style moderne
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { Bot, User, Sparkles, Code, FileText, Lightbulb, Zap, Copy, Check, Clock, Hash, Edit2, RefreshCw, Trash2, Package, Play, Brain, Search } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { parseArtifacts } from '../../utils/artifactParser';
import { useArtifactPanelStore } from '../../store/chatHistoryStore';
import type { AIProvider } from '../../services/aiService';

// Suggestions de prompts pour l'écran d'accueil
const PROMPT_SUGGESTIONS = [
  { icon: Code, text: "Aide-moi à écrire du code Python", color: '#3b82f6' },
  { icon: FileText, text: "Résume ce document pour moi", color: '#8b5cf6' },
  { icon: Lightbulb, text: "Explique-moi un concept complexe", color: '#f59e0b' },
  { icon: Zap, text: "Automatise une tâche répétitive", color: '#10b981' },
];

// Composant pour les actions sur les messages
interface MessageActionsProps {
  content: string;
  messageId: string;
  role: 'user' | 'assistant';
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

const MessageActions = ({ content, messageId, role, onEdit, onRegenerate, onDelete }: MessageActionsProps) => {
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

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{ marginTop: '12px' }}>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          aria-label="Modifier le message"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            lineHeight: 1.6,
            resize: 'vertical',
            minHeight: '100px'
          }}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={handleSaveEdit}
            style={{
              padding: '6px 12px',
              backgroundColor: '#10a37f',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Sauvegarder
          </button>
          <button
            onClick={handleCancelEdit}
            style={{
              padding: '6px 12px',
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="message-actions"
      role="toolbar"
      aria-label={`Actions pour le message de ${role === 'assistant' ? 'Lisa' : 'vous'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '12px',
        opacity: 0,
        transition: 'opacity var(--transition-normal)',
      }}
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
        <button
          onClick={() => setIsEditing(true)}
          className="msg-action-btn"
          aria-label="Modifier le message"
        >
          <Edit2 size={12} />
          Modifier
        </button>
      )}

      {role === 'assistant' && onRegenerate && (
        <button
          onClick={() => onRegenerate(messageId)}
          className="msg-action-btn"
          aria-label="Régénérer la réponse"
        >
          <RefreshCw size={12} />
          Régénérer
        </button>
      )}

      {onDelete && (
        <button
          onClick={() => onDelete(messageId)}
          className="msg-action-btn danger"
          aria-label="Supprimer le message"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

// Composant pour afficher le contenu d'un message avec détection d'artefacts
interface MessageContentProps {
  content: string;
  role: string;
}

const MessageContent = ({ content, role }: MessageContentProps) => {
  const { openArtifact } = useArtifactPanelStore();
  
  // Parse le contenu pour détecter les artefacts
  const parsed = useMemo(() => parseArtifacts(content), [content]);
  
  if (role !== 'assistant' || parsed.artifacts.length === 0) {
    // Pas d'artefacts - affichage normal
    return (
      <div style={{
        fontSize: '15px',
        lineHeight: 1.7,
        color: '#d1d5db',
        wordBreak: 'break-word'
      }}>
        {role === 'assistant' ? (
          <MarkdownRenderer content={content} />
        ) : (
          <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
        )}
      </div>
    );
  }
  
  // Affichage avec artefacts - style Claude.ai avec aperçu du code
  return (
    <div>
      {/* Texte du message (sans les blocs de code des artefacts) */}
      {parsed.text && (
        <div style={{
          fontSize: '15px',
          lineHeight: 1.7,
          color: '#d1d5db',
          wordBreak: 'break-word',
          marginBottom: parsed.artifacts.length > 0 ? '16px' : 0
        }}>
          <MarkdownRenderer content={parsed.text} />
        </div>
      )}
      
      {/* Artefacts - Cards avec aperçu du code */}
      {parsed.artifacts.map((artifact) => {
        const codeLines = artifact.code.split('\n');
        const previewLines = codeLines.slice(0, 8); // Montrer les 8 premières lignes
        const hasMore = codeLines.length > 8;
        
        return (
          <div
            key={artifact.id}
            style={{
              marginBottom: '16px',
              backgroundColor: '#0d0d0d',
              border: '1px solid #333',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {/* Header cliquable */}
            <div
              role="button"
              tabIndex={0}
              aria-label={`Ouvrir l'artefact ${artifact.title}`}
              onClick={() => openArtifact(artifact)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openArtifact(artifact);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#1a1a2e',
                cursor: 'pointer',
                transition: 'background-color var(--transition-normal)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#252540';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1a1a2e';
              }}
            >
              {/* Icon */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: getArtifactColor(artifact.type) + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getArtifactColor(artifact.type),
                flexShrink: 0,
              }}>
                <Package size={18} />
              </div>
              
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#fff',
                }}>
                  {artifact.title}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#888',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ 
                    color: getArtifactColor(artifact.type),
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}>
                    {artifact.type}
                  </span>
                  <span style={{ color: '#555' }}>•</span>
                  <span>{codeLines.length} lignes</span>
                </div>
              </div>
              
              {/* Action button */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: getArtifactColor(artifact.type) + '20',
                color: getArtifactColor(artifact.type),
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                <Play size={14} fill="currentColor" />
                Exécuter
              </div>
            </div>
            
            {/* Code Preview */}
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#0d0d0d',
              fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
              fontSize: '13px',
              lineHeight: 1.5,
              overflowX: 'auto',
            }}>
              <pre style={{ margin: 0, color: '#e1e1e1' }}>
                {previewLines.map((line, i) => (
                  <div key={i} style={{ display: 'flex' }}>
                    <span style={{ 
                      color: '#555', 
                      marginRight: '16px', 
                      minWidth: '24px',
                      textAlign: 'right',
                      userSelect: 'none',
                    }}>
                      {i + 1}
                    </span>
                    <span>{line || ' '}</span>
                  </div>
                ))}
              </pre>
              
              {/* "Show more" si tronqué */}
              {hasMore && (
                <div
                  onClick={() => openArtifact(artifact)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    marginTop: '8px',
                    backgroundColor: '#1a1a2e',
                    borderRadius: '8px',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#252540';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1a2e';
                    e.currentTarget.style.color = '#888';
                  }}
                >
                  <span>Voir les {codeLines.length - 8} lignes restantes</span>
                  <span>→</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Couleurs par type d'artefact
const getArtifactColor = (type: string): string => {
  const colors: Record<string, string> = {
    html: '#e34c26',
    react: '#61dafb',
    javascript: '#f7df1e',
    typescript: '#3178c6',
    css: '#264de4',
    python: '#3776ab',
    svg: '#ffb13b',
    mermaid: '#ff3670',
  };
  return colors[type] || '#10a37f';
};

export const ChatMessages = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { getCurrentConversation, currentConversationId, streamingMessage, isTyping, updateMessage, deleteMessage, addMessage, setTyping, setStreamingMessage } = useChatHistoryStore();
  
  const conversation = getCurrentConversation();
  const messages = useMemo(() => conversation?.messages || [], [conversation?.messages]);

  // Éditer un message utilisateur
  const handleEditMessage = (messageId: string, newContent: string) => {
    updateMessage(messageId, newContent);
  };

  // Supprimer un message
  const handleDeleteMessage = (messageId: string) => {
    if (confirm('Supprimer ce message ?')) {
      deleteMessage(messageId);
    }
  };

  // Régénérer une réponse
  const handleRegenerate = async (messageId: string) => {
    if (!currentConversationId || isRegenerating) return;
    
    // Trouver l'index du message à régénérer
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    // Trouver le message utilisateur précédent
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }
    
    if (userMessageIndex < 0) return;
    
    // Supprimer le message assistant actuel
    deleteMessage(messageId);
    
    setIsRegenerating(true);
    setTyping(true);
    
    try {
      // Reconstruire l'historique jusqu'au message utilisateur
      const history = messages.slice(0, userMessageIndex + 1).map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        image: m.image
      }));
      
      const { useChatSettingsStore, DEFAULT_MODELS } = await import('../../store/chatSettingsStore');
      const { aiService } = await import('../../services/aiService');
      const { selectedModelId, temperature, maxTokens } = useChatSettingsStore.getState();
      const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];

      // Configure Unified AI Service
      aiService.updateConfig({
        provider: currentModel.provider as AIProvider,
        model: currentModel.id,
        temperature,
        maxTokens,
        baseURL: currentModel.provider === 'lmstudio' ? '/lmstudio/v1' : undefined
      });

      let fullResponse = '';

      // Utiliser streamingMessage pendant le streaming (pas de message persisté)
      for await (const chunk of aiService.streamMessage(history)) {
        if (chunk.done) break;
        fullResponse += chunk.content;
        setStreamingMessage(fullResponse);
      }
      
      // Ajouter le message final une seule fois après le streaming
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
        content: '❌ Erreur lors de la régénération. Veuillez réessayer.',
        conversationId: currentConversationId,
      });
    } finally {
      setIsRegenerating(false);
      setTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, isTyping]);

  // Utiliser une suggestion comme prompt
  const handleSuggestionClick = (text: string) => {
    if (!currentConversationId) return;
    // Simuler l'envoi d'un message (le composant ChatInput gère l'envoi réel)
    const input = document.querySelector('textarea') as HTMLTextAreaElement;
    if (input) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }
  };

  if (!currentConversationId || messages.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        flex: 1,
        minHeight: '400px',
        height: '100%'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          {/* Logo animé */}
          <div style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 32px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #10a37f 0%, #1a7f64 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(16, 163, 127, 0.3)',
            animation: 'float 3s ease-in-out infinite'
          }}>
            <Sparkles size={48} color="#fff" />
          </div>
          
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
            Bonjour ! Je suis Lisa
          </h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px' }}>
            Votre assistante IA intelligente. Je peux vous aider à coder, analyser, créer et bien plus encore.
          </p>
          
          {/* Suggestions de prompts */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            {PROMPT_SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="suggestion-chip"
                style={{
                  gap: '12px',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
                aria-label={`Suggestion : ${suggestion.text}`}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: `${suggestion.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <suggestion.icon size={18} color={suggestion.color} aria-hidden="true" />
                </div>
                <span>{suggestion.text}</span>
              </button>
            ))}
          </div>
          
          {/* Raccourcis clavier */}
          <div style={{
            marginTop: '40px',
            fontSize: '13px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'center',
            gap: '24px'
          }}>
            <span><kbd style={{ padding: '2px 6px', backgroundColor: 'var(--border-secondary)', borderRadius: 'var(--radius-sm)', marginRight: '4px', color: 'var(--text-secondary)' }}>Enter</kbd> Envoyer</span>
            <span><kbd style={{ padding: '2px 6px', backgroundColor: 'var(--border-secondary)', borderRadius: 'var(--radius-sm)', marginRight: '4px', color: 'var(--text-secondary)' }}>Shift+Enter</kbd> Nouvelle ligne</span>
          </div>
        </div>
        
        {/* CSS Animations */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px 0',
      flex: 1,
      minHeight: 0,
      overflowY: 'auto'
    }}>
      {messages.map((message) => (
        <div
          key={message.id}
          className="message-row"
          role="article"
          aria-label={`Message de ${message.role === 'assistant' ? 'Lisa' : 'vous'}`}
          style={{
            padding: '24px 0',
            backgroundColor: message.role === 'assistant' ? 'var(--bg-secondary)' : 'transparent'
          }}
        >
          <div style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            gap: '16px'
          }}>
            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: message.role === 'assistant' ? 'var(--color-brand)' : 'var(--color-user)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {message.role === 'assistant' ? (
                <Bot size={18} color="#fff" aria-hidden="true" />
              ) : (
                <User size={18} color="#fff" aria-hidden="true" />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {message.role === 'assistant' ? 'Lisa' : 'Vous'}
                </span>

                {/* Metadata for assistant messages */}
                {message.role === 'assistant' && message.metadata && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {(message.metadata as { model?: string }).model && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Bot size={10} />
                        {(message.metadata as { model?: string }).model}
                      </span>
                    )}
                    {(message.metadata as { duration?: number }).duration && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} />
                        {(message.metadata as { duration?: number }).duration}ms
                      </span>
                    )}
                    {(message.metadata as { tokens?: number }).tokens && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Hash size={10} />
                        ~{(message.metadata as { tokens?: number }).tokens} tokens
                      </span>
                    )}
                  </div>
                )}
              </div>
              <MessageContent content={message.content} role={message.role} />
              
              {/* Actions (copy, edit, regenerate, delete) */}
              <MessageActions 
                content={message.content}
                messageId={message.id}
                role={message.role as 'user' | 'assistant'}
                onEdit={handleEditMessage}
                onRegenerate={handleRegenerate}
                onDelete={handleDeleteMessage}
              />
            </div>
          </div>
        </div>
      ))}
      
      {/* Streaming message */}
      {streamingMessage && (
        <div style={{ padding: '24px 0', backgroundColor: 'var(--bg-secondary)' }} role="status" aria-label="Lisa est en train de répondre">
          <div style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            gap: '16px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Bot size={18} color="#fff" aria-hidden="true" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Lisa
              </div>
              <div style={{
                fontSize: '15px',
                lineHeight: 1.7,
                color: '#d1d5db',
                wordBreak: 'break-word'
              }}>
                <MarkdownRenderer content={streamingMessage} />
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '16px',
                    backgroundColor: 'var(--color-brand)',
                    marginLeft: '2px',
                    animation: 'blink 1s infinite'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Typing/Thinking indicator */}
      {isTyping && !streamingMessage && (
        <div style={{ padding: '24px 0', backgroundColor: 'var(--bg-secondary)' }} role="status" aria-label="Lisa réfléchit">
          <div style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            gap: '16px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              animation: 'pulse 2s infinite'
            }}>
              <Brain size={18} color="#fff" aria-hidden="true" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Lisa
                <span style={{ fontSize: '12px', color: 'var(--color-purple)', fontWeight: 400 }}>
                  réfléchit...
                </span>
              </div>

              {/* Progress stages */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-secondary)'
              }}>
                {/* Stage 1: Thinking */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div aria-hidden="true" style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-purple)',
                    animation: 'pulse 1s infinite'
                  }} />
                  <span style={{ fontSize: '12px', color: 'var(--color-purple)' }}>Réflexion</span>
                </div>

                {/* Stage 2: Searching */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.5 }}>
                  <Search size={12} color="var(--color-info)" aria-hidden="true" />
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Mémoire</span>
                </div>

                {/* Stage 3: Generating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.5 }}>
                  <Sparkles size={12} color="var(--color-brand)" aria-hidden="true" />
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Génération</span>
                </div>

                {/* Animated dots */}
                <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-purple)',
                      animation: 'bounce 1.4s infinite ease-in-out',
                      animationDelay: `${delay}s`
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />

      {/* CSS Animations */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default ChatMessages;
