/**
 * Chat Page
 * Page principale du chat fullscreen - Style Fluent Design
 */

import { useEffect } from 'react';
import { ChatLayoutFluent } from '../components/chat/ChatLayoutFluent';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import { useIsMobile } from '../hooks/useIsMobile';
import ChatPageMobile from './ChatPageMobile';

export const ChatPage = () => {
  const { conversations, currentConversationId, createConversation, setCurrentConversation } = useChatHistoryStore();
  const isMobile = useIsMobile();

  // Auto-create first conversation if none exists
  useEffect(() => {
    if (conversations.length === 0) {
      const id = createConversation();
      setCurrentConversation(id);
    } else if (!currentConversationId && conversations.length > 0) {
      setCurrentConversation(conversations[0].id);
    }
  }, []);

  if (isMobile) {
    return <ChatPageMobile />;
  }

  return <ChatLayoutFluent />;
};

export default ChatPage;
