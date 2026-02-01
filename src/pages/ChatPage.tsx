/**
 * Chat Page
 * Page principale du chat fullscreen - Style moderne avec Markdown/LaTeX
 */

import { useEffect, useRef } from 'react';
import { ChatLayoutSimple } from '../components/chat/ChatLayoutSimple';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import { useIsMobile } from '../hooks/useIsMobile';
import ChatPageMobile from './ChatPageMobile';

export const ChatPage = () => {
  const conversations = useChatHistoryStore(state => state.conversations);
  const currentConversationId = useChatHistoryStore(state => state.currentConversationId);
  const createConversation = useChatHistoryStore(state => state.createConversation);
  const setCurrentConversation = useChatHistoryStore(state => state.setCurrentConversation);
  const isMobile = useIsMobile();
  const hasInitialized = useRef(false);

  // Auto-create first conversation if none exists, or select first one
  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) return;

    // Wait a tick for hydration to complete
    const timer = setTimeout(() => {
      const state = useChatHistoryStore.getState();

      if (state.conversations.length === 0) {
        // No conversations exist, create one
        const id = state.createConversation();
        state.setCurrentConversation(id);
        hasInitialized.current = true;
      } else if (!state.currentConversationId) {
        // Conversations exist but none selected, select the first one
        state.setCurrentConversation(state.conversations[0].id);
        hasInitialized.current = true;
      } else {
        hasInitialized.current = true;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  if (isMobile) {
    return <ChatPageMobile />;
  }

  return <ChatLayoutSimple />;
};

export default ChatPage;
