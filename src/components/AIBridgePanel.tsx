/**
 * AIBridgePanel - Interface utilisateur pour le pont Lisa ↔ ChatGPT ↔ Claude
 * 
 * Permet de tester et utiliser le bridge AI depuis l'interface Lisa.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAIBridge, type BridgeMessage } from '../hooks/useAIBridge';

type AITarget = 'lisa' | 'chatgpt' | 'claude';

interface MessageBubbleProps {
  message: BridgeMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.source === 'user';
  const sourceLabels: Record<string, string> = {
    user: 'Vous',
    lisa: 'Lisa',
    chatgpt: 'ChatGPT',
    claude: 'Claude'
  };

  const sourceColors: Record<string, string> = {
    user: 'bg-[var(--color-brand,#10a37f)]',
    lisa: 'bg-[var(--color-purple,#8b5cf6)]',
    chatgpt: 'bg-[var(--color-brand,#10a37f)]',
    claude: 'bg-[var(--color-warning,#f59e0b)]'
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`text-xs mb-1 ${isUser ? 'text-right' : 'text-left'} text-[var(--text-muted,#666)]`}>
          {sourceLabels[message.source] || message.source}
        </div>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-[var(--color-brand,#10a37f)] text-white rounded-br-md'
              : `${sourceColors[message.source] || 'bg-[var(--bg-tertiary,#1a1a1a)]'} text-white rounded-bl-md`
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {message.toolsUsed && message.toolsUsed.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-80">
              <span className="font-medium">Outils utilisés:</span>{' '}
              {message.toolsUsed.join(', ')}
            </div>
          )}
        </div>
        <div className="text-xs mt-1 text-[var(--text-muted,#666)]">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export const AIBridgePanel: React.FC = () => {
  const [input, setInput] = useState('');
  const [target, setTarget] = useState<AITarget>('lisa');
  const [streamingContent, setStreamingContent] = useState('');
  const [useStreaming, setUseStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    session,
    messages,
    isLoading,
    isStreaming,
    error,
    createSession,
    sendMessage,
    streamMessage,
    cancelStream,
    invokeTool,
    getTools,
    clearMessages,
    clearError
  } = useAIBridge({
    defaultTarget: target,
    autoCreateSession: true
  });

  const [tools, setTools] = useState<Array<{ name: string; description: string }>>([]);
  const [showTools, setShowTools] = useState(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Load tools on mount
  useEffect(() => {
    getTools()
      .then((data) => {
        if (data.openai) {
          setTools(data.openai.map((t: { function: { name: string; description: string } }) => ({
            name: t.function.name,
            description: t.function.description
          })));
        }
      })
      .catch(() => {
        // Ignore errors loading tools
      });
  }, [getTools]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const message = input.trim();
    setInput('');
    setStreamingContent('');

    try {
      if (useStreaming) {
        await streamMessage(message, target, (chunk) => {
          setStreamingContent(prev => prev + chunk);
        });
        setStreamingContent('');
      } else {
        await sendMessage(message, target);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [input, target, useStreaming, isLoading, isStreaming, sendMessage, streamMessage]);

  const handleToolInvoke = useCallback(async (toolName: string) => {
    try {
      const result = await invokeTool(toolName, {});
      console.log('Tool result:', result);
      alert(`Résultat de ${toolName}:\n${JSON.stringify(result, null, 2)}`);
    } catch (err) {
      console.error('Error invoking tool:', err);
    }
  }, [invokeTool]);

  const handleNewSession = useCallback(() => {
    clearMessages();
    createSession([target]);
  }, [clearMessages, createSession, target]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary,#212121)] text-white">
      {/* Header */}
      <div className="flex-none p-4 border-b border-[var(--border-primary,#424242)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">AI Bridge</h2>
            <p className="text-sm text-[var(--text-muted,#666)]">
              Lisa ↔ ChatGPT ↔ Claude
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Target selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-muted,#666)]">Cible:</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as AITarget)}
                className="bg-[var(--bg-secondary,#2d2d2d)] border border-[var(--border-secondary,#555)] rounded px-3 py-1.5 text-sm"
              >
                <option value="lisa">Lisa</option>
                <option value="chatgpt">ChatGPT</option>
                <option value="claude">Claude</option>
              </select>
            </div>
            
            {/* Streaming toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useStreaming}
                onChange={(e) => setUseStreaming(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Streaming</span>
            </label>

            {/* Tools button */}
            <button
              onClick={() => setShowTools(!showTools)}
              aria-expanded={showTools}
              aria-label={`Outils (${tools.length})`}
              className="px-3 py-1.5 bg-[var(--bg-tertiary,#1a1a1a)] hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))] rounded text-sm"
            >
              🔧 Outils ({tools.length})
            </button>

            {/* New session button */}
            <button
              onClick={handleNewSession}
              className="px-3 py-1.5 bg-[var(--color-purple,#8b5cf6)] hover:opacity-90 rounded text-sm"
            >
              Nouvelle session
            </button>
          </div>
        </div>

        {/* Session info */}
        {session && (
          <div className="mt-2 text-xs text-[var(--text-muted,#666)]">
            Session: {session.id.slice(0, 8)}... | 
            Participants: {session.participants.join(', ')} |
            Messages: {messages.length}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-2 p-2 bg-[var(--color-error-subtle,rgba(239,68,68,0.12))] border border-[var(--color-error,#ef4444)]/30 rounded text-sm text-[var(--color-error,#ef4444)] flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={clearError} className="text-[var(--color-error,#ef4444)] hover:text-[var(--color-error,#ef4444)] p-1"><X size={14} /></button>
          </div>
        )}
      </div>

      {/* Tools panel */}
      {showTools && (
        <div className="flex-none p-4 border-b border-[var(--border-primary,#424242)] bg-[var(--bg-secondary,#2d2d2d)]/50 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2">Outils disponibles:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {tools.map((tool) => (
              <button
                key={tool.name}
                onClick={() => handleToolInvoke(tool.name)}
                className="p-2 bg-[var(--bg-tertiary,#1a1a1a)] hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))] rounded text-left text-xs"
                title={tool.description}
              >
                <div className="font-mono text-[var(--color-purple,#8b5cf6)]">{tool.name.replace('lisa_', '')}</div>
                <div className="text-[var(--text-muted,#666)] truncate">{tool.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !streamingContent && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-[var(--text-muted,#666)]">
              <div className="text-6xl mb-4">🌉</div>
              <h3 className="text-xl font-semibold mb-2">AI Bridge</h3>
              <p className="max-w-md">
                Communiquez avec Lisa, ChatGPT ou Claude depuis une interface unifiée.
                Les messages peuvent être routés entre les différentes IA.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && streamingContent && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%]">
              <div className="text-xs mb-1 text-[var(--text-muted,#666)]">
                {target === 'chatgpt' ? 'ChatGPT' : target === 'claude' ? 'Claude' : 'Lisa'}
              </div>
              <div className="rounded-2xl px-4 py-3 bg-[var(--bg-tertiary,#1a1a1a)] text-white rounded-bl-md">
                <p className="whitespace-pre-wrap">{streamingContent}</p>
                <span className="inline-block w-2 h-4 bg-white/50 animate-pulse ml-1" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex-none p-4 border-t border-[var(--border-primary,#424242)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message à ${target === 'chatgpt' ? 'ChatGPT' : target === 'claude' ? 'Claude' : 'Lisa'}...`}
            className="flex-1 bg-[var(--bg-secondary,#2d2d2d)] border border-[var(--border-secondary,#555)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--color-brand,#10a37f)]"
            disabled={isLoading || isStreaming}
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={cancelStream}
              className="px-6 py-3 bg-[var(--color-error,#ef4444)] hover:opacity-90 rounded-lg font-medium"
            >
              Annuler
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-[var(--color-purple,#8b5cf6)] hover:opacity-90 disabled:bg-[var(--bg-tertiary,#1a1a1a)] disabled:cursor-not-allowed rounded-lg font-medium"
            >
              {isLoading ? '...' : 'Envoyer'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AIBridgePanel;
