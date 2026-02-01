import { useState, useCallback } from 'react';
import { useIntentHandler } from './useIntentHandler';
import { useAppStore } from '../store/appStore';
import { useSpeechSynthesis } from './useSpeechSynthesis';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'lisa';
  timestamp: Date;
  type?: 'text' | 'voice' | 'system';
  metadata?: {
    intent?: string;
    confidence?: number;
    workflowId?: string;
  };
}

export const useChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      content: 'Bonjour ! Je suis Lisa, votre assistante IA intelligente. Je peux vous aider avec vos tâches, répondre à vos questions, gérer vos workflows et bien plus encore. Comment puis-je vous assister aujourd\'hui ?',
      sender: 'lisa',
      timestamp: new Date(),
      type: 'system'
    }
  ]);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  
  const { handleIntent } = useIntentHandler();
  const { speak, stop: stopSpeaking } = useSpeechSynthesis();
  // Use separate primitive selectors to avoid creating a new object each render,
  // which can trigger infinite re-renders with useSyncExternalStore.
  const intent = useAppStore(state => state.intent);
  const setState = useAppStore(state => state.setState);

  // Add a new message to the chat
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // If it's a Lisa message and speaking is enabled, speak it
    if (message.sender === 'lisa' && isSpeaking && message.type !== 'system') {
      speak(message.content);
    }
    
    return newMessage;
  }, [isSpeaking, speak]);

  // Handle user message
  const handleUserMessage = useCallback(async (content: string) => {
    // Add user message to chat
    addMessage({
      content,
      sender: 'user',
      type: 'text'
    });

    try {
      // Show typing indicator
      const typingMessage = addMessage({
        content: 'Lisa est en train de réfléchir...',
        sender: 'lisa',
        type: 'system'
      });

      // Process the intent
      await handleIntent(content);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingMessage.id));
      
      // Add Lisa's response
      addMessage({
        content: 'Votre demande a été traitée avec succès.',
        sender: 'lisa',
        type: 'text'
      });

    } catch (error) {
      console.error('Error handling user message:', error);
      
      // Remove typing indicator if it exists
      setMessages(prev => prev.filter(msg => msg.content !== 'Lisa est en train de réfléchir...'));
      
      addMessage({
        content: 'Désolée, j\'ai rencontré une erreur en traitant votre demande. Pouvez-vous essayer de reformuler ?',
        sender: 'lisa',
        type: 'text'
      });
    }
  }, [handleIntent, addMessage]);

  // Toggle listening state
  const toggleListening = useCallback(() => {
    const newListening = !isListening;
    setIsListening(newListening);
    
    if (newListening) {
      setState({ intent: 'listening' });
      addMessage({
        content: 'Je vous écoute... Parlez maintenant.',
        sender: 'lisa',
        type: 'system'
      });
    } else {
      setState({ intent: 'idle' });
      addMessage({
        content: 'Écoute arrêtée.',
        sender: 'lisa',
        type: 'system'
      });
    }
  }, [isListening, setState, addMessage]);

  // Toggle speaking state
  const toggleSpeaking = useCallback(() => {
    const newSpeaking = !isSpeaking;
    setIsSpeaking(newSpeaking);
    
    if (!newSpeaking) {
      stopSpeaking();
      addMessage({
        content: 'Mode vocal désactivé.',
        sender: 'lisa',
        type: 'system'
      });
    } else {
      addMessage({
        content: 'Mode vocal activé.',
        sender: 'lisa',
        type: 'system'
      });
    }
  }, [isSpeaking, stopSpeaking, addMessage]);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome-new',
        content: 'Chat effacé. Comment puis-je vous aider ?',
        sender: 'lisa',
        timestamp: new Date(),
        type: 'system'
      }
    ]);
  }, []);

  // Add system message (for notifications, status updates, etc.)
  const addSystemMessage = useCallback((content: string) => {
    return addMessage({
      content,
      sender: 'lisa',
      type: 'system'
    });
  }, [addMessage]);

  return {
    messages,
    isListening,
    isSpeaking,
    handleUserMessage,
    toggleListening,
    toggleSpeaking,
    clearChat,
    addMessage,
    addSystemMessage,
    currentIntent: intent
  };
};

export default useChatInterface;
