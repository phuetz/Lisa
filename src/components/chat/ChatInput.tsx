/**
 * Chat Input Component
 * Zone de saisie avec intégration LM Studio (Devstral) et reconnaissance vocale
 */

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type DragEvent, type ClipboardEvent } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Send, Mic, MicOff, Volume2, VolumeX, Settings2, Paperclip, Image, X, StopCircle, Camera, Wand2, Edit3 } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { useChatSettingsStore } from '../../store/chatSettingsStore';
import { aiService, type AIMessage, type AIProvider } from '../../services/aiService';
import { aiWithToolsService } from '../../services/AIWithToolsService';
// LMStudioService importé via aiService
import { agentRouterService } from '../../services/AgentRouterService';
import { DEFAULT_MODELS } from '../../store/chatSettingsStore';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import { longTermMemoryService } from '../../services/LongTermMemoryService';
import { screenCaptureService } from '../../services/ScreenCaptureService';
import { ArtifactCreator } from './ArtifactCreator';
import type { ArtifactData } from './Artifact';
import { AudioRecordButton } from './AudioRecordButton';
import { ImageEditor } from './ImageEditor';

export const ChatInput = () => {
  // ... (previous state and hooks)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showArtifactCreator, setShowArtifactCreator] = useState(false);
  const [lastResponse] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ type: 'image' | 'file'; data: string; name: string }[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Settings store
  const { streamingEnabled, autoSpeakEnabled, toggleAutoSpeak, incognitoMode, longTermMemoryEnabled, selectedModelId, temperature, maxTokens } = useChatSettingsStore();
  
  // Get current model config
  const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];

  // Voice Chat Hook
  const {
    isListening,
    transcript,
    interimTranscript,
    toggleListening,
    isSpeaking,
    speak,
    stopSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    isSupported: voiceSupported,
  } = useVoiceChat({ language: 'fr-FR' });

  // French voices for TTS
  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
  const displayVoices = frenchVoices.length > 0 ? frenchVoices : voices.slice(0, 5);
  
  const { currentConversationId, addMessage, getCurrentConversation, setStreamingMessage, setTyping, createConversation } = useChatHistoryStore();

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  // Handle file attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const isImage = file.type.startsWith('image/');
        setAttachments((prev) => [
          ...prev,
          {
            type: isImage ? 'image' : 'file',
            data: reader.result as string,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle screen capture
  const handleScreenCapture = async () => {
    if (!screenCaptureService.isSupported()) {
      alert('La capture d\'écran n\'est pas supportée dans ce navigateur.');
      return;
    }

    try {
      const capture = await screenCaptureService.captureScreen({ maxWidth: 1920, maxHeight: 1080 });
      setAttachments((prev) => [
        ...prev,
        {
          type: 'image',
          data: capture.imageData,
          name: `capture-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`,
        },
      ]);
    } catch (error) {
      console.error('[ChatInput] Screen capture failed:', error);
    }
  };

  // Handle paste for images
  const handlePaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setAttachments((prev) => [
              ...prev,
              {
                type: 'image',
                data: reader.result as string,
                name: `pasted-image-${Date.now()}.png`,
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  // Handle drag events
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone entirely
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const isImage = file.type.startsWith('image/');
          setAttachments((prev) => [
            ...prev,
            {
              type: isImage ? 'image' : 'file',
              data: reader.result as string,
              name: file.name,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  // Handle audio recording
  const handleAudioReady = useCallback((audioBlob: Blob, base64: string) => {
    setAttachments((prev) => [
      ...prev,
      {
        type: 'file',
        data: base64,
        name: `audio-${Date.now()}.webm`,
      },
    ]);
    // Optionally, add a placeholder message about the audio
    setMessage((prev) => prev + (prev ? ' ' : '') + '[Message vocal joint]');
  }, []);

  // Handle image editing
  const handleEditImage = useCallback((index: number) => {
    setEditingImageIndex(index);
  }, []);

  const handleSaveEditedImage = useCallback((editedImageBase64: string) => {
    if (editingImageIndex !== null) {
      setAttachments((prev) => prev.map((att, idx) =>
        idx === editingImageIndex
          ? { ...att, data: editedImageBase64, name: `edited-${att.name}` }
          : att
      ));
    }
    setEditingImageIndex(null);
  }, [editingImageIndex]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    // Create conversation if none exists
    let convId = currentConversationId;
    if (!convId) {
      convId = createConversation();
    }

    const userMessage = message.trim();
    const currentAttachments = [...attachments];
    setMessage('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Build message content with attachments
    let messageContent = userMessage;
    if (currentAttachments.length > 0) {
      const attachmentInfo = currentAttachments
        .map((a) => `[${a.type === 'image' ? '🖼️ Image' : '📎 Fichier'}: ${a.name}]`)
        .join(' ');
      messageContent = `${userMessage}\n\n${attachmentInfo}`;
    }

    // Add user message
    if (!incognitoMode) {
      addMessage({
        role: 'user',
        content: messageContent,
        conversationId: convId,
        image: currentAttachments.find((a) => a.type === 'image')?.data,
      });
    }

    setIsLoading(true);
    setTyping(true);
    const startTime = performance.now();
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Get conversation history for context
      const conversation = getCurrentConversation();
      const history: AIMessage[] = (conversation?.messages || [])
        .slice(-10)
        .map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          image: m.image
        }));

      // Add system prompt for tool calling
      // This is critical - tells the LLM to use tools for web searches
      const toolCallingSystemPrompt = `Tu es Lisa, une assistante IA avec accès à des outils.

## RÈGLE CRITIQUE - APPEL DE FONCTIONS OBLIGATOIRE

Tu as accès à ces fonctions que tu DOIS APPELER:

### RECHERCHE WEB
- **web_search(query)** - Recherche actualités, météo, TV, prix, événements
- **fetch_url(url)** - Récupère le contenu d'une page web
- **get_current_datetime()** - Date et heure actuelle

### GESTION DES TÂCHES (TODOS)
- **add_todo(text, priority?)** - Ajouter une tâche. Priority: "low", "medium", "high"
- **list_todos(filter?)** - Lister les tâches. Filter: "all", "active", "completed"
- **complete_todo(id?, text?)** - Marquer une tâche terminée (par ID ou texte)
- **remove_todo(id?, text?)** - Supprimer une tâche
- **clear_completed_todos()** - Supprimer toutes les tâches terminées

## COMPORTEMENT OBLIGATOIRE

1. "Ajoute une tâche..." → APPELLE add_todo
2. "Liste mes tâches" / "Quelles tâches" → APPELLE list_todos
3. "J'ai fini..." / "Terminé..." → APPELLE complete_todo
4. "Supprime la tâche..." → APPELLE remove_todo
5. Question actualités/TV/météo → APPELLE web_search

NE DIS JAMAIS "je n'ai pas de système de tâches" - TU AS add_todo et list_todos!
NE DIS JAMAIS "je n'ai pas accès aux informations en temps réel" - TU AS web_search!

Réponds en français, sois concis.`;

      history.unshift({
        role: 'system',
        content: toolCallingSystemPrompt,
      });

      // Add long-term memory context if enabled
      if (longTermMemoryEnabled) {
        try {
          const memoryContext = await longTermMemoryService.buildContextForPrompt();
          if (memoryContext.trim()) {
            history.unshift({
              role: 'system',
              content: `[Contexte de mémoire long-terme]\n${memoryContext}\n[Fin du contexte]`,
            });
          }
        } catch (error) {
          console.warn('[ChatInput] Failed to load memory context:', error);
        }
      }

      // Add current message
      const imageAttachment = currentAttachments.find(a => a.type === 'image');
      history.push({ 
        role: 'user', 
        content: userMessage,
        image: imageAttachment?.data
      });

      // First, try to route to specialized agents (weather, calendar, etc.)
      const routeResult = await agentRouterService.route(userMessage);
      
      if (routeResult.handled && routeResult.response) {
        const duration = Math.round(performance.now() - startTime);
        if (!incognitoMode) {
          addMessage({
            role: 'assistant',
            content: routeResult.response,
            conversationId: convId,
            metadata: { model: routeResult.agentName || 'agent', duration },
          });
        }
        if (autoSpeakEnabled) speak(routeResult.response.replace(/[*#_`]/g, ''));
        setIsLoading(false);
        setTyping(false);
        return;
      }

      // Configure Unified AI Service
      // Determine if we should use native tool calling
      const TOOL_CALLING_PROVIDERS = ['gemini', 'openai', 'anthropic'];
      let effectiveProvider = currentModel.provider as AIProvider;
      let effectiveModel = currentModel.id;

      // If provider doesn't support tool calling, switch to Gemini for web search capabilities
      const providerSupportsTools = TOOL_CALLING_PROVIDERS.includes(effectiveProvider);
      if (!providerSupportsTools) {
        console.log('[ChatInput] Provider', effectiveProvider, 'does not support tool calling. Switching to Gemini.');
        effectiveProvider = 'gemini' as AIProvider;
        effectiveModel = 'gemini-2.0-flash';
      }

      aiService.updateConfig({
        provider: effectiveProvider,
        model: effectiveModel,
        temperature,
        maxTokens,
        baseURL: currentModel.provider === 'lmstudio' ? '/lmstudio/v1' : undefined
      });

      // Configure tool calling service
      aiWithToolsService.setConfig({
        enableTools: true,
        showToolUsage: true,
        maxIterations: 5
      });

      console.log('[ChatInput] Using provider:', effectiveProvider, 'model:', effectiveModel, 'useNativeTools:', true);

      if (streamingEnabled) {
        let fullResponse = '';

        // Show streaming message while receiving
        // Use aiWithToolsService for native tool calling
        try {
          for await (const chunk of aiWithToolsService.streamMessage(history)) {
            if (controller.signal.aborted) break;

            // Check for API errors
            if (chunk.error) {
              console.error('[ChatInput] Stream error:', chunk.error);
              throw new Error(chunk.error);
            }

            if (chunk.content) {
              fullResponse += chunk.content;
              setStreamingMessage(fullResponse);
            }

            if (chunk.done) break;
          }
        } catch (error) {
          // Save partial response on error before rethrowing
          if (fullResponse && !incognitoMode) {
            setStreamingMessage(null);
            addMessage({
              role: 'assistant',
              content: fullResponse + '\n\n⚠️ *(Réponse interrompue)*',
              conversationId: convId,
            });
          }
          if (!controller.signal.aborted) throw error;
          return; // Exit early on abort
        }

        // Clear streaming and add final message
        setStreamingMessage(null);

        if (!fullResponse) {
          addMessage({
            role: 'assistant',
            content: 'Désolé, je n\'ai pas pu générer de réponse.',
            conversationId: convId,
          });
          return;
        }

        addMessage({
          role: 'assistant',
          content: fullResponse,
          conversationId: convId,
        });

        const duration = Math.round(performance.now() - startTime);
        if (!incognitoMode) {
          if (longTermMemoryEnabled) {
            longTermMemoryService.extractAndRemember(userMessage, fullResponse).catch(console.warn);
          }
          if (autoSpeakEnabled) speak(fullResponse.replace(/[*#_`]/g, ''));
        }
      } else {
        // Non-streaming mode also uses tool calling
        const result = await aiWithToolsService.sendMessage(history);
        const fullResponse = result.content;
        const duration = Math.round(performance.now() - startTime);
        if (!incognitoMode) {
          addMessage({
            role: 'assistant',
            content: fullResponse || 'Désolé, je n\'ai pas pu générer de réponse.',
            conversationId: convId,
            metadata: { model: effectiveModel, duration, tokens: Math.round(fullResponse.length / 4), toolsUsed: result.toolsUsed.length },
          });
          if (longTermMemoryEnabled && fullResponse) {
            longTermMemoryService.extractAndRemember(userMessage, fullResponse).catch(console.warn);
          }
          if (autoSpeakEnabled && fullResponse) speak(fullResponse.replace(/[*#_`]/g, ''));
        }
      }
    } catch (error) {
      console.error('[ChatInput] Error:', error);
      if (!incognitoMode) {
        addMessage({
          role: 'assistant',
          content: `❌ Erreur: ${error instanceof Error ? error.message : 'Inconnue'}\n\nVérifiez que votre moteur IA (LM Studio, Ollama ou API) est bien configuré.`,
          conversationId: convId,
        });
      }
    } finally {
      setIsLoading(false);
      setTyping(false);
      setStreamingMessage(null);
      setAbortController(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === 'Escape') {
      if (isLoading) {
        stopStreaming();
      } else {
        setMessage('');
        setAttachments([]);
      }
      return;
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createConversation();
        textareaRef.current?.focus();
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [createConversation]);

  useEffect(() => {
    if (transcript) {
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [transcript]);

  const displayText = message + (interimTranscript ? (message ? ' ' : '') + interimTranscript : '');

  return (
    <div
      ref={dropZoneRef}
      style={{ position: 'relative' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(16, 163, 127, 0.1)',
          border: '2px dashed #10a37f',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          pointerEvents: 'none',
        }}>
          <span style={{ color: '#10a37f', fontSize: '14px', fontWeight: 500 }}>
            Déposez vos fichiers ici
          </span>
        </div>
      )}

      {/* Image Editor Modal */}
      {editingImageIndex !== null && attachments[editingImageIndex]?.type === 'image' && (
        <ImageEditor
          imageUrl={attachments[editingImageIndex].data}
          onSave={handleSaveEditedImage}
          onCancel={() => setEditingImageIndex(null)}
        />
      )}
      {showVoiceSettings && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          marginBottom: '8px',
          padding: '16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '16px',
          border: '1px solid #404040',
          zIndex: 10
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Voix</label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                if (voice) setSelectedVoice(voice);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#2d2d2d',
                border: '1px solid #404040',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px'
              }}
            >
              {displayVoices.map(voice => (
                <option key={voice.name} value={voice.name}>{voice.name}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', color: '#888' }}>Vitesse</label>
              <span style={{ fontSize: '12px', color: '#fff' }}>{speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#888' }}>Lecture auto des réponses</span>
            <button
              onClick={toggleAutoSpeak}
              style={{
                width: '40px',
                height: '22px',
                borderRadius: '11px',
                backgroundColor: autoSpeakEnabled ? '#10a37f' : '#404040',
                border: 'none',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                position: 'absolute',
                top: '2px',
                left: autoSpeakEnabled ? '20px' : '2px',
                transition: 'left 0.2s'
              }} />
            </button>
          </div>
        </div>
      )}

      {isListening && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          right: 0,
          marginBottom: '8px',
          padding: '8px 16px',
          backgroundColor: '#10a37f20',
          borderRadius: '12px',
          border: '1px solid #10a37f40',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10a37f',
            animation: 'pulse 1s infinite'
          }} />
          <span style={{ fontSize: '13px', color: '#10a37f' }}>
            Écoute en cours... Parlez maintenant
          </span>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: isMobile ? '8px' : '8px',
        padding: isMobile ? '10px 14px' : '12px 16px',
        backgroundColor: '#2d2d2d',
        borderRadius: '24px',
        border: isListening ? '1px solid #10a37f' : '1px solid #404040',
        transition: 'border-color 0.2s'
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.md,.json,.csv"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {!isMobile && (
          <>
            {voiceSupported && (
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                style={{
                  padding: '8px',
                  backgroundColor: showVoiceSettings ? '#10a37f20' : 'transparent',
                  border: 'none',
                  color: showVoiceSettings ? '#10a37f' : '#888',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Paramètres vocaux"
              >
                <Settings2 size={18} />
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="Joindre un fichier"
            >
              <Paperclip size={18} />
            </button>

            <button
              onClick={handleScreenCapture}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="Capturer l'écran"
            >
              <Camera size={18} />
            </button>

            <button
              onClick={() => setShowArtifactCreator(true)}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#10a37f',
                cursor: 'pointer',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="Créer un artefact (code exécutable)"
            >
              <Wand2 size={18} />
            </button>

            {voiceSupported && (
              <button
                onClick={toggleAutoSpeak}
                style={{
                  padding: '8px',
                  backgroundColor: autoSpeakEnabled ? '#8b5cf620' : 'transparent',
                  border: 'none',
                  color: autoSpeakEnabled ? '#8b5cf6' : '#555',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={autoSpeakEnabled ? 'Désactiver la synthèse vocale' : 'Activer la synthèse vocale'}
              >
                {autoSpeakEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            )}

            {voiceSupported && (
              <button
                onClick={toggleListening}
                style={{
                  padding: '8px',
                  backgroundColor: isListening ? '#ef4444' : 'transparent',
                  border: 'none',
                  color: isListening ? '#fff' : '#888',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={isListening ? 'Arrêter la dictée' : 'Dicter un message'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            {/* Audio Recording Button */}
            <AudioRecordButton
              onAudioReady={handleAudioReady}
              disabled={isLoading}
            />
          </>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attachments.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    padding: '4px 8px',
                    backgroundColor: '#404040',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#fff'
                  }}
                >
                  {att.type === 'image' ? <Image size={14} /> : <Paperclip size={14} />}
                  <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {att.name}
                  </span>
                  {att.type === 'image' && (
                    <button
                      onClick={() => handleEditImage(idx)}
                      style={{
                        padding: '2px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Annoter l'image"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => removeAttachment(idx)}
                    style={{
                      padding: '2px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isListening ? 'Parlez...' : (isMobile ? 'Message' : (incognitoMode ? '🕶️ Mode incognito - Envoyer un message...' : 'Envoyer un message à Lisa...'))}
            disabled={isLoading}
            rows={1}
            style={{
              flex: 1,
              padding: isMobile ? '4px 0' : '8px 0',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: isMobile ? '16px' : '15px',
              lineHeight: '1.5',
              resize: 'none',
              minHeight: isMobile ? '20px' : '24px',
              maxHeight: '150px'
            }}
          />
        </div>

        {isMobile && voiceSupported && (
          <button
            onClick={toggleListening}
            style={{
              padding: '8px',
              backgroundColor: isListening ? '#ef4444' : 'transparent',
              border: 'none',
              color: isListening ? '#fff' : '#888',
              cursor: 'pointer',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '36px',
              minHeight: '36px'
            }}
            title={isListening ? 'Arrêter' : 'Micro'}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}

        {voiceSupported && !isMobile && (
          <button
            onClick={() => isSpeaking ? stopSpeaking() : (lastResponse && speak(lastResponse))}
            disabled={!lastResponse && !isSpeaking}
            style={{
              padding: '8px',
              backgroundColor: isSpeaking ? '#8b5cf620' : 'transparent',
              border: 'none',
              color: isSpeaking ? '#8b5cf6' : (lastResponse ? '#888' : '#555'),
              cursor: (lastResponse || isSpeaking) ? 'pointer' : 'not-allowed',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isSpeaking ? 'Arrêter la lecture' : 'Relire la dernière réponse'}
          >
            {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
        
        {isLoading ? (
          <button
            onClick={stopStreaming}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 500
            }}
            title="Arrêter la génération (Escape)"
          >
            <StopCircle size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: message.trim() ? '#10a37f' : '#404040',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              cursor: message.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 500,
              opacity: message.trim() ? 1 : 0.5
            }}
            title="Envoyer (Enter)"
          >
            <Send size={16} />
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {showArtifactCreator && (
        <ArtifactCreator
          onClose={() => setShowArtifactCreator(false)}
          onInsert={(artifact: ArtifactData) => {
            const artifactBlock = `\`\`\`artifact:${artifact.type} ${artifact.title}\n${artifact.code}\n\`\`\``;
            setMessage(prev => prev + (prev ? '\n\n' : '') + artifactBlock);
            setShowArtifactCreator(false);
            textareaRef.current?.focus();
          }}
        />
      )}
    </div>
  );
};

export default ChatInput;
