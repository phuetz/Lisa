/**
 * Chat Input Mobile - Style ChatGPT
 * Input simplifié optimisé pour mobile avec intégration LM Studio
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Mic, StopCircle, MicOff, ImagePlus, X } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { useChatSettingsStore, DEFAULT_MODELS } from '../../store/chatSettingsStore';
import { aiService } from '../../services/aiService';
import type { AIProvider } from '../../services/aiService';
import { useMobile } from '../../hooks/useMobile';
import { useCamera } from '../../hooks/useCamera';
import { useOffline } from '../../hooks/useOffline';

export const ChatInputMobile = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  
  // Haptic feedback pour mobile natif
  const { hapticTap, hapticSuccess, hapticError, hapticSelection } = useMobile();
  
  // Camera pour envoyer des images
  const { captureWithPrompt, isCapturing } = useCamera();
  
  // Mode hors-ligne
  const { isOnline, queueMessage: _queueMessage } = useOffline();
  
  // État pour l'image attachée
  const [attachedImage, setAttachedImage] = useState<{ base64: string; format: string } | null>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setRecordingSupported(!!SpeechRecognition);
  }, []);
  
  const { 
    currentConversationId, 
    addMessage, 
    getCurrentConversation, 
    setStreamingMessage, 
    setTyping, 
    updateMessage,
    createConversation 
  } = useChatHistoryStore();

  const { selectedModelId, streamingEnabled, temperature, maxTokens } = useChatSettingsStore();
  const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    // Haptic feedback au tap
    hapticTap();
    
    let convId = currentConversationId;
    if (!convId) {
      convId = createConversation();
    }

    const userMessage = message.trim();
    setMessage('');

    addMessage({
      role: 'user',
      content: userMessage,
      conversationId: convId,
    });

    setIsLoading(true);
    setTyping(true);
    const startTime = performance.now();
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const conversation = getCurrentConversation();
      const history = (conversation?.messages || [])
        .slice(-10)
        .map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }));
      
      // DEBUG: Log to verify execution
      console.log('[ChatInputMobile] Starting AI request, provider:', currentModel.provider, 'model:', currentModel.id);
      console.log('[ChatInputMobile] History length:', history.length, 'streamingEnabled:', streamingEnabled);
      
      // Configure Unified AI Service - uses networkConfig for mobile-compatible URLs
      aiService.updateConfig({
        provider: currentModel.provider as AIProvider,
        model: currentModel.id,
        temperature,
        maxTokens,
        // Don't override baseURL - aiService uses networkConfig.getLMStudioUrl() internally
      });

      console.log('[ChatInputMobile] Config updated, calling streamMessage...');

      if (streamingEnabled) {
        let fullResponse = '';
        const assistantMsgId = addMessage({
          role: 'assistant',
          content: '',
          conversationId: convId,
        });

        try {
          console.log('[ChatInputMobile] Entering streaming loop...');
          for await (const chunk of aiService.streamMessage(history)) {
            console.log('[ChatInputMobile] Got chunk:', chunk);
            if (controller.signal.aborted) break;
            if (chunk.done) break;
            fullResponse += chunk.content;
            setStreamingMessage(fullResponse);
            updateMessage(assistantMsgId, fullResponse);
          }
          console.log('[ChatInputMobile] Streaming complete');
        } catch (error) {
          console.error('[ChatInputMobile] Streaming error:', error);
          if (!controller.signal.aborted) throw error;
        }

        const duration = Math.round(performance.now() - startTime);
        if (fullResponse) {
          updateMessage(assistantMsgId, fullResponse, {
            model: currentModel.id,
            duration,
            tokens: Math.round(fullResponse.length / 4),
          });
          hapticSuccess(); // Haptic feedback on success
        }
      } else {
        const fullResponse = await aiService.sendMessage(history);
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
        }
      }
    } catch (error) {
      console.error('[ChatInputMobile] Error:', error);
      hapticError(); // Haptic feedback on error
      addMessage({
        role: 'assistant',
        content: `❌ Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        conversationId: convId,
      });
    } finally {
      setIsLoading(false);
      setTyping(false);
      setStreamingMessage(null);
      setAbortController(null);
    }
  };

  const stopStreaming = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setTyping(false);
      setStreamingMessage(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    hapticSelection();
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      hapticError();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setMessage(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      hapticTap();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Handler pour capturer une image
  const handleCaptureImage = async () => {
    hapticTap();
    const result = await captureWithPrompt();
    if (result) {
      hapticSuccess();
      setAttachedImage({ base64: result.base64, format: result.format });
    }
  };

  // Supprimer l'image attachée
  const removeAttachedImage = () => {
    hapticTap();
    setAttachedImage(null);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Offline indicator */}
      {!isOnline && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#ef4444',
        }}>
          <span>📵</span>
          Mode hors-ligne - Messages en attente
        </div>
      )}

      {/* Attached image preview */}
      {attachedImage && (
        <div style={{
          position: 'relative',
          width: '80px',
          height: '80px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid rgba(86, 88, 105, 0.3)',
        }}>
          <img
            src={`data:image/${attachedImage.format};base64,${attachedImage.base64}`}
            alt="Attached"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <button
            onClick={removeAttachedImage}
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        width: '100%',
      }}>
      {/* Pulse animation for recording */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
      {/* Text Input */}
      <div style={{
        flex: 1,
        position: 'relative',
        minHeight: '44px',
        minWidth: 0
      }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isLoading ? "Génération en cours..." : "Message..."}
          disabled={isLoading}
          style={{
            width: '100%',
            minHeight: '44px',
            maxHeight: '120px',
            padding: '12px 14px',
            backgroundColor: 'rgba(52, 53, 65, 0.6)',
            border: '1px solid rgba(86, 88, 105, 0.3)',
            borderRadius: '12px',
            color: '#e8e8f0',
            fontSize: '16px',
            lineHeight: '1.4',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease',
            WebkitAppearance: 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(86, 88, 105, 0.6)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(86, 88, 105, 0.3)';
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        {/* Camera Button */}
        {!isLoading && (
          <button
            onClick={handleCaptureImage}
            disabled={isCapturing}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(86, 88, 105, 0.3)',
              border: '1px solid rgba(86, 88, 105, 0.3)',
              color: '#8e8ea0',
              cursor: isCapturing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              opacity: isCapturing ? 0.5 : 1,
            }}
          >
            <ImagePlus size={20} />
          </button>
        )}

        {/* Microphone Button */}
        {!isLoading && recordingSupported && (
          <button
            onClick={toggleRecording}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: isRecording 
                ? 'rgba(239, 68, 68, 0.9)' 
                : 'rgba(86, 88, 105, 0.3)',
              border: isRecording
                ? '1px solid rgba(239, 68, 68, 0.5)'
                : '1px solid rgba(86, 88, 105, 0.3)',
              color: isRecording ? '#ffffff' : '#8e8ea0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none'
            }}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}

        {/* Send / Stop Button */}
        {isLoading ? (
          <button
            onClick={stopStreaming}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.9)', // Red for stop
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            <StopCircle size={20} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: message.trim() 
                ? 'rgba(25, 195, 125, 0.9)' 
                : 'rgba(86, 88, 105, 0.3)',
              border: message.trim()
                ? '1px solid rgba(25, 195, 125, 0.3)'
                : '1px solid rgba(86, 88, 105, 0.3)',
              color: message.trim() ? '#ffffff' : '#8e8ea0',
              cursor: message.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            <Send size={20} />
          </button>
        )}
      </div>
      </div>
    </div>
  );
};

export default ChatInputMobile;
