/**
 * Chat History Store
 * Gestion de l'historique des conversations avec persistance
 * + Gestion du panneau d'artefacts (transient, non persisté)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, Conversation } from '../types/chat';
import type { ArtifactData } from '../components/chat/Artifact';

interface ChatHistoryStore {
  // State - Conversation History (persisted)
  conversations: Conversation[];
  currentConversationId: string | null;
  isTyping: boolean;
  streamingMessage: string | null; // Message en cours de streaming

  // State - Artifact Panel (transient, not persisted)
  artifactPanelOpen: boolean;
  currentArtifact: ArtifactData | null;
  artifactView: 'preview' | 'code';
  
  // Actions
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  archiveConversation: (id: string) => void;
  pinConversation: (id: string) => void;
  setCurrentConversation: (id: string) => void;
  getCurrentConversation: () => Conversation | null;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (messageId: string, content: string, metadata?: Record<string, unknown>) => void;
  deleteMessage: (messageId: string) => void;
  clearCurrentConversation: () => void;
  setTyping: (typing: boolean) => void;
  setStreamingMessage: (content: string | null) => void; // Pour le streaming
  searchConversations: (query: string) => Conversation[];
  exportConversation: (id: string) => string;
  importConversation: (data: string) => void;

  // Artifact Panel Actions (transient)
  openArtifact: (artifact: ArtifactData) => void;
  closeArtifactPanel: () => void;
  setArtifactView: (view: 'preview' | 'code') => void;
  updateArtifactCode: (code: string) => void;
}

export const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set, get) => ({
      // Persisted state
      conversations: [],
      currentConversationId: null,
      isTyping: false,
      streamingMessage: null,

      // Transient artifact panel state (not persisted)
      artifactPanelOpen: false,
      currentArtifact: null,
      artifactView: 'preview' as const,
      
      createConversation: () => {
        const id = crypto.randomUUID();
        const newConversation: Conversation = {
          id,
          title: 'Nouvelle conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          archived: false,
          pinned: false,
          tags: [],
        };
        
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }));
        
        return id;
      },
      
      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId: 
            state.currentConversationId === id 
              ? state.conversations.find(c => c.id !== id)?.id || null
              : state.currentConversationId,
        }));
      },
      
      archiveConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, archived: !conv.archived } : conv
          ),
        }));
      },
      
      pinConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, pinned: !conv.pinned } : conv
          ),
        }));
      },
      
      setCurrentConversation: (id) => {
        set({ currentConversationId: id });
      },
      
      getCurrentConversation: () => {
        const { conversations, currentConversationId } = get();
        return conversations.find((c) => c.id === currentConversationId) || null;
      },
      
      addMessage: (message) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return '';
        
        const messageId = crypto.randomUUID();
        const newMessage: Message = {
          ...message,
          id: messageId,
          timestamp: new Date(),
        };
        
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === currentConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: new Date(),
                  // Auto-generate title from first user message
                  title: 
                    conv.messages.length === 0 && message.role === 'user'
                      ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                      : conv.title,
                }
              : conv
          ),
        }));
        
        return messageId;
      },
      
      updateMessage: (messageId, content, metadata) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;
        
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === currentConversationId
              ? {
                  ...conv,
                  messages: conv.messages.map((msg) =>
                    msg.id === messageId 
                      ? { ...msg, content, ...(metadata && { metadata: { ...msg.metadata, ...metadata } }) } 
                      : msg
                  ),
                  updatedAt: new Date(),
                }
              : conv
          ),
        }));
      },
      
      deleteMessage: (messageId) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;
        
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === currentConversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter((msg) => msg.id !== messageId),
                  updatedAt: new Date(),
                }
              : conv
          ),
        }));
      },
      
      clearCurrentConversation: () => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;
        
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === currentConversationId
              ? { ...conv, messages: [], updatedAt: new Date() }
              : conv
          ),
        }));
      },
      
      setTyping: (typing) => {
        set({ isTyping: typing });
      },
      
      setStreamingMessage: (content) => {
        set({ streamingMessage: content });
      },
      
      searchConversations: (query) => {
        const { conversations } = get();
        const lowerQuery = query.toLowerCase();
        
        return conversations.filter((conv) =>
          conv.title.toLowerCase().includes(lowerQuery) ||
          conv.messages.some((msg) => msg.content.toLowerCase().includes(lowerQuery))
        );
      },
      
      exportConversation: (id) => {
        const { conversations } = get();
        const conversation = conversations.find((c) => c.id === id);
        if (!conversation) return '';
        
        return JSON.stringify(conversation, null, 2);
      },
      
      importConversation: (data) => {
        try {
          const conversation: Conversation = JSON.parse(data);
          conversation.id = crypto.randomUUID(); // New ID
          conversation.createdAt = new Date();
          conversation.updatedAt = new Date();

          set((state) => ({
            conversations: [conversation, ...state.conversations],
          }));
        } catch (error) {
          console.error('Failed to import conversation:', error);
        }
      },

      // Artifact Panel Actions (transient, not persisted)
      openArtifact: (artifact) => set({
        artifactPanelOpen: true,
        currentArtifact: artifact,
        artifactView: 'preview',
      }),

      closeArtifactPanel: () => set({
        artifactPanelOpen: false,
        currentArtifact: null,
      }),

      setArtifactView: (view) => set({ artifactView: view }),

      updateArtifactCode: (code) => set((state) => ({
        currentArtifact: state.currentArtifact
          ? { ...state.currentArtifact, code }
          : null,
      })),
    }),
    {
      name: 'chat-history-storage',
      version: 1,
      partialize: (state) => ({
        // Only persist conversation-related state, not artifact panel
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);

/**
 * @deprecated Use useChatHistoryStore instead
 * Backward-compatible hook for artifact panel
 */
export const useArtifactPanelStore = () => {
  const {
    artifactPanelOpen,
    currentArtifact,
    artifactView,
    openArtifact,
    closeArtifactPanel,
    setArtifactView,
    updateArtifactCode,
  } = useChatHistoryStore();

  return {
    isOpen: artifactPanelOpen,
    artifact: currentArtifact,
    view: artifactView,
    openArtifact,
    closePanel: closeArtifactPanel,
    setView: setArtifactView,
    updateCode: updateArtifactCode,
  };
};
