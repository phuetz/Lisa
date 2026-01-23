/**
 * Chat Message Component
 * Affichage d'un message individuel
 */

import { useState } from 'react';
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCw } from 'lucide-react';
import type { Message } from '../../types/chat';
import { MessageRenderer } from './MessageRenderer';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../utils/cn';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm max-w-[600px]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'flex gap-4 group',
        isUser && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white text-lg',
          isUser 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
            : 'bg-gradient-to-r from-blue-500 to-purple-500'
        )}>
          {isUser ? '👤' : '🤖'}
        </div>
      </div>
      
      {/* Message bubble */}
      <div className={cn(
        'flex-1 max-w-[600px]',
        isUser && 'flex flex-col items-end'
      )}>
        {/* Name and time */}
        <div className={cn(
          'flex items-center gap-2 mb-1 text-xs text-gray-500',
          isUser && 'flex-row-reverse'
        )}>
          <span className="font-medium text-gray-400">
            {isUser ? 'Vous' : 'Lisa'}
          </span>
          <span>·</span>
          <span>{formatDistanceToNow(message.timestamp, { addSuffix: true, locale: fr })}</span>
        </div>
        
        {/* Message content */}
        <div className={cn(
          'rounded-xl px-4 py-3 break-words',
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-[#2a2a2a] text-white'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MessageRenderer content={message.content} />
          )}
        </div>
        
        {/* Actions */}
        {!isUser && (
          <div className={cn(
            'flex items-center gap-2 mt-2 transition-opacity',
            showActions ? 'opacity-100' : 'opacity-0'
          )}>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-[#2a2a2a] rounded text-gray-400 hover:text-white transition-colors"
              title="Copier"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              className="p-1.5 hover:bg-[#2a2a2a] rounded text-gray-400 hover:text-white transition-colors"
              title="Bon"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              className="p-1.5 hover:bg-[#2a2a2a] rounded text-gray-400 hover:text-white transition-colors"
              title="Mauvais"
            >
              <ThumbsDown size={14} />
            </button>
            <button
              className="p-1.5 hover:bg-[#2a2a2a] rounded text-gray-400 hover:text-white transition-colors"
              title="Régénérer"
            >
              <RotateCw size={14} />
            </button>
          </div>
        )}
        
        {/* Metadata */}
        {message.metadata && (
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            {message.metadata.model && <span>Model: {message.metadata.model}</span>}
            {message.metadata.tokens && <span>·</span>}
            {message.metadata.tokens && <span>{message.metadata.tokens} tokens</span>}
            {message.metadata.duration && <span>·</span>}
            {message.metadata.duration && <span>{message.metadata.duration}ms</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
