/**
 * Chat Page Mobile - Style ChatGPT
 * Page principale du chat pour mobile avec design ChatGPT-like
 */

import { useEffect, useRef } from 'react';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import { ChatLayoutMobile } from '../components/chat/ChatLayoutMobile';

export const ChatPageMobile = () => {
  const hasInitialized = useRef(false);

  // Auto-create first conversation if none exists (run once)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const { conversations, currentConversationId, createConversation, setCurrentConversation } =
      useChatHistoryStore.getState();

    if (conversations.length === 0) {
      const id = createConversation();
      setCurrentConversation(id);
    } else if (!currentConversationId && conversations.length > 0) {
      setCurrentConversation(conversations[0].id);
    }
  }, []);

  return <ChatLayoutMobile />;
};

export default ChatPageMobile;
