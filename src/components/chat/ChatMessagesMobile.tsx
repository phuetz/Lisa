/**
 * Chat Messages Mobile - Style ChatGPT
 * Messages optimisés pour mobile avec design ChatGPT-like
 */

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Bot, User, Copy, Volume2, Share2 } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { useChatSettingsStore, DEFAULT_MODELS } from '../../store/chatSettingsStore';
import { aiService } from '../../services/aiService';
import type { AIProvider } from '../../services/aiService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useMobile } from '../../hooks/useMobile';
import { MessageBubble, ScrollToBottom, TypingIndicator } from '../mobile';
import { useTTS } from '../../hooks/useTTS';
import { shareService } from '../../services/ShareService';

export const ChatMessagesMobile = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const { 
    getCurrentConversation, 
    currentConversationId, 
    streamingMessage,
    createConversation,
    setCurrentConversation,
    addMessage,
    setStreamingMessage,
    setTyping,
    updateMessage
  } = useChatHistoryStore();
  
  const { selectedModelId, streamingEnabled, temperature, maxTokens } = useChatSettingsStore();
  const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];
  const { hapticTap, hapticSuccess } = useMobile();
  const { speakResponse, isSpeaking, stop: stopTTS, isSupported: ttsSupported } = useTTS();
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  
  const conversation = getCurrentConversation();
  const messages = useMemo(() => conversation?.messages || [], [conversation?.messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Handle suggestion click - sends the suggestion as a message
  const handleSuggestionClick = useCallback(async (suggestionText: string) => {
    hapticTap();
    
    let convId = currentConversationId;
    if (!convId) {
      convId = createConversation();
      setCurrentConversation(convId);
    }

    addMessage({
      role: 'user',
      content: suggestionText,
      conversationId: convId,
    });

    setTyping(true);
    const startTime = performance.now();

    try {
      aiService.updateConfig({
        provider: currentModel.provider as AIProvider,
        model: currentModel.id,
        temperature,
        maxTokens,
        baseURL: currentModel.provider === 'lmstudio' ? '/lmstudio/v1' : undefined
      });

      if (streamingEnabled) {
        let fullResponse = '';
        const assistantMsgId = addMessage({
          role: 'assistant',
          content: '',
          conversationId: convId,
        });

        for await (const chunk of aiService.streamMessage([{ role: 'user', content: suggestionText }])) {
          if (chunk.done) break;
          fullResponse += chunk.content;
          setStreamingMessage(fullResponse);
          updateMessage(assistantMsgId, fullResponse);
        }

        const duration = Math.round(performance.now() - startTime);
        if (fullResponse) {
          updateMessage(assistantMsgId, fullResponse, {
            model: currentModel.id,
            duration,
            tokens: Math.round(fullResponse.length / 4),
          });
          hapticSuccess();
        }
      } else {
        const fullResponse = await aiService.sendMessage([{ role: 'user', content: suggestionText }]);
        const duration = Math.round(performance.now() - startTime);

        if (fullResponse) {
          addMessage({
            role: 'assistant',
            content: fullResponse,
            conversationId: convId,
            metadata: {
              model: currentModel.id,
              duration,
              tokens: Math.round(fullResponse.length / 4),
            },
          });
          hapticSuccess();
        }
      }
    } catch (error) {
      console.error('[ChatMessagesMobile] Suggestion error:', error);
      addMessage({
        role: 'assistant',
        content: `❌ Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        conversationId: convId,
      });
    } finally {
      setTyping(false);
      setStreamingMessage(null);
    }
  }, [currentConversationId, createConversation, setCurrentConversation, addMessage, setTyping, 
      setStreamingMessage, updateMessage, currentModel, streamingEnabled, temperature, maxTokens,
      hapticTap, hapticSuccess]);

  if (!currentConversationId || (messages.length === 0 && !streamingMessage)) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        minHeight: '100%'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          {/* Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 32px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #f5a623 0%, #e6951a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(245, 166, 35, 0.3)',
            animation: 'float 3s ease-in-out infinite'
          }}>
            <Bot size={40} color="#fff" />
          </div>
          
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 600, 
            marginBottom: '12px', 
            color: '#ffffff',
            margin: '0 0 12px 0'
          }}>
            Comment puis-je vous aider aujourd'hui ?
          </h2>
          
          {/* Suggestions */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(1, 1fr)', 
            gap: '12px',
            maxWidth: '400px',
            margin: '32px auto 0'
          }}>
            <button
              onClick={() => handleSuggestionClick("Explique-moi un concept complexe simplement")}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'rgba(52, 53, 65, 0.6)',
                border: '1px solid rgba(86, 88, 105, 0.3)',
                borderRadius: '12px',
                color: '#e8e8f0',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                lineHeight: '1.4'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(86, 88, 105, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(86, 88, 105, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(52, 53, 65, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(86, 88, 105, 0.3)';
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(25, 195, 125, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <span style={{ fontSize: '16px' }}>💡</span>
              </div>
              <span>Explique-moi un concept complexe simplement</span>
            </button>
            
            <button
              onClick={() => handleSuggestionClick("Aide-moi à écrire un e-mail professionnel")}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'rgba(52, 53, 65, 0.6)',
                border: '1px solid rgba(86, 88, 105, 0.3)',
                borderRadius: '12px',
                color: '#e8e8f0',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                lineHeight: '1.4'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(86, 88, 105, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(86, 88, 105, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(52, 53, 65, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(86, 88, 105, 0.3)';
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(25, 195, 125, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <span style={{ fontSize: '16px' }}>📝</span>
              </div>
              <span>Aide-moi à écrire un e-mail professionnel</span>
            </button>
            
            <button
              onClick={() => handleSuggestionClick("Recherche des informations sur un sujet")}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                backgroundColor: 'rgba(52, 53, 65, 0.6)',
                border: '1px solid rgba(86, 88, 105, 0.3)',
                borderRadius: '12px',
                color: '#e8e8f0',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                lineHeight: '1.4'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(86, 88, 105, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(86, 88, 105, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(52, 53, 65, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(86, 88, 105, 0.3)';
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(25, 195, 125, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <span style={{ fontSize: '16px' }}>🔍</span>
              </div>
              <span>Recherche des informations sur un sujet</span>
            </button>
          </div>
        </div>
        
        {/* CSS Animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    );
  }

  // Handle copy feedback
  const handleCopyMessage = async (content: string) => {
    hapticTap();
    await navigator.clipboard.writeText(content);
    setCopyFeedback('Copié !');
    hapticSuccess();
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Handle TTS for assistant messages
  const handleSpeak = async (content: string) => {
    hapticTap();
    if (isSpeaking) {
      stopTTS();
    } else {
      await speakResponse(content);
    }
  };

  // Handle share single message
  const handleShareMessage = async (content: string) => {
    hapticTap();
    const result = await shareService.shareNative(
      [{ id: '1', role: 'assistant', content }],
      { title: 'Message de Lisa' }
    );
    if (result.success) hapticSuccess();
  };

  // Toggle message action menu
  const toggleMessageMenu = (messageId: string) => {
    hapticTap();
    setActiveMessageMenu(activeMessageMenu === messageId ? null : messageId);
  };

  return (
    <div 
      ref={messagesContainerRef}
      style={{
        padding: '20px 16px',
        minHeight: '100%',
        position: 'relative'
      }}
    >
      {/* Copy feedback toast */}
      {copyFeedback && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          backgroundColor: 'rgba(16, 185, 129, 0.95)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '13px',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease'
        }}>
          Message copié !
        </div>
      )}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          content={message.content}
          isUser={message.role === 'user'}
          onCopy={() => handleCopyMessage(message.content)}
        >
          <div
            style={{
              marginBottom: '24px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: message.role === 'assistant' ? '#f5a623' : '#5436DA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '4px'
            }}>
              {message.role === 'assistant' ? (
                <Bot size={18} color="#fff" />
              ) : (
                <User size={18} color="#fff" />
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
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#8e8ea0',
                }}>
                  {message.role === 'assistant' ? 'Lisa' : 'Vous'}
                </span>
                
                {/* Action buttons for messages */}
                <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                  {/* Copy button */}
                  <button
                    onClick={() => handleCopyMessage(message.content)}
                    title="Copier"
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8e8ea0',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Copy size={14} />
                  </button>
                  
                  {/* TTS button for assistant messages */}
                  {message.role === 'assistant' && ttsSupported && (
                    <button
                      onClick={() => handleSpeak(message.content)}
                      title={isSpeaking ? "Arrêter" : "Écouter"}
                      style={{
                        padding: '4px',
                        backgroundColor: isSpeaking ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        border: 'none',
                        color: isSpeaking ? '#10b981' : '#8e8ea0',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                  
                  {/* Share button */}
                  <button
                    onClick={() => handleShareMessage(message.content)}
                    title="Partager"
                    style={{
                      padding: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8e8ea0',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Share2 size={14} />
                  </button>
                  
                  {/* More options (long press menu indicator) */}
                  {activeMessageMenu === message.id && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#12121a',
                      borderRadius: '8px',
                      padding: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      zIndex: 50,
                    }}>
                      <button
                        onClick={() => { handleCopyMessage(message.content); setActiveMessageMenu(null); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        }}
                      >
                        <Copy size={14} /> Copier
                      </button>
                      {message.role === 'assistant' && ttsSupported && (
                        <button
                          onClick={() => { handleSpeak(message.content); setActiveMessageMenu(null); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            whiteSpace: 'nowrap',
                            width: '100%',
                          }}
                        >
                          <Volume2 size={14} /> Écouter
                        </button>
                      )}
                      <button
                        onClick={() => { handleShareMessage(message.content); setActiveMessageMenu(null); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '13px',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        }}
                      >
                        <Share2 size={14} /> Partager
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{
                fontSize: '16px',
                lineHeight: 1.6,
                color: '#e8e8f0',
                wordBreak: 'break-word'
              }}>
                <MarkdownRenderer content={message.content} />
              </div>
            </div>
          </div>
        </MessageBubble>
      ))}
      
      {/* Streaming Message */}
      {streamingMessage && (
        <div
          style={{
            marginBottom: '24px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          {/* Avatar */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#f5a623',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '4px'
          }}>
            <Bot size={18} color="#fff" />
          </div>
          
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#8e8ea0',
              marginBottom: '8px'
            }}>
              ChatGPT
            </div>
            <div style={{
              fontSize: '16px',
              lineHeight: 1.6,
              color: '#e8e8f0',
              wordBreak: 'break-word'
            }}>
              <MarkdownRenderer content={streamingMessage} />
              <span className="cursor-blink" style={{
                display: 'inline-block',
                width: '8px',
                height: '16px',
                backgroundColor: '#e8e8f0',
                marginLeft: '2px',
                verticalAlign: 'middle',
                animation: 'blink 1s step-end infinite'
              }} />
            </div>
          </div>
        </div>
      )}
      
      {/* Typing indicator */}
      {!streamingMessage && messages.length > 0 && useChatHistoryStore.getState().isTyping && (
        <TypingIndicator />
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div ref={messagesEndRef} />
      
      {/* Scroll to bottom button */}
      {messagesContainerRef.current && (
        <ScrollToBottom containerRef={messagesContainerRef as React.RefObject<HTMLDivElement>} />
      )}
    </div>
  );
};

export default ChatMessagesMobile;
