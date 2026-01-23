/**
 * Chat Page Mobile - Style ChatGPT
 * Page principale du chat pour mobile avec design ChatGPT-like
 */

import { useEffect } from 'react';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import { ChatLayoutMobile } from '../components/chat/ChatLayoutMobile';

export const ChatPageMobile = () => {
  const { conversations, currentConversationId, createConversation, setCurrentConversation } = useChatHistoryStore();

  // Auto-create first conversation if none exists
  useEffect(() => {
    if (conversations.length === 0) {
      const id = createConversation();
      setCurrentConversation(id);
    } else if (!currentConversationId && conversations.length > 0) {
      setCurrentConversation(conversations[0].id);
    }
  }, [conversations, currentConversationId, createConversation, setCurrentConversation]);

  return <ChatLayoutMobile />;
};

export default ChatPageMobile;
