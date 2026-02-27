/**
 * Chat Input Component — ChatGPT-style prompt area
 * Clean, centered, minimal design with collapsible action menu
 */

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type DragEvent, type ClipboardEvent } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Send, Mic, MicOff, Volume2, VolumeX, Paperclip, X, Square, Camera, Wand2, Edit3, Plus, Globe } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { useChatSettingsStore } from '../../store/chatSettingsStore';
import { aiService, type AIMessage, type AIProvider } from '../../services/aiService';
import { aiWithToolsService } from '../../services/AIWithToolsService';
import { agentRouterService } from '../../services/AgentRouterService';
import { DEFAULT_MODELS } from '../../store/chatSettingsStore';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import { longTermMemoryService } from '../../services/LongTermMemoryService';
import { screenCaptureService } from '../../services/ScreenCaptureService';
import { ArtifactCreator } from './ArtifactCreator';
import type { ArtifactData } from './Artifact';
import { AudioRecordButton } from './AudioRecordButton';
import { ImageEditor } from './ImageEditor';
import { documentAnalysisService } from '../../services/DocumentAnalysisService';

/** Convert a DataURL (base64) string to a Blob */
function dataURLtoBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const ChatInput = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showArtifactCreator, setShowArtifactCreator] = useState(false);
  const [attachments, setAttachments] = useState<{ type: 'image' | 'file'; data: string; name: string }[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const { streamingEnabled, autoSpeakEnabled, toggleAutoSpeak, incognitoMode, longTermMemoryEnabled, selectedModelId, temperature, maxTokens } = useChatSettingsStore();
  const currentModel = DEFAULT_MODELS.find(m => m.id === selectedModelId) || DEFAULT_MODELS[0];

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

  const { currentConversationId, addMessage, getCurrentConversation, setStreamingMessage, setTyping, createConversation } = useChatHistoryStore();

  // Close actions popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    if (showActions) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showActions]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const stopStreaming = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [...prev, {
          type: file.type.startsWith('image/') ? 'image' : 'file',
          data: reader.result as string,
          name: file.name,
        }]);
      };
      reader.onerror = () => {
        console.warn('Failed to read file:', file.name);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScreenCapture = async () => {
    if (!screenCaptureService.isSupported()) {
      alert('La capture d\'écran n\'est pas supportée dans ce navigateur.');
      return;
    }
    try {
      const capture = await screenCaptureService.captureScreen({ maxWidth: 1920, maxHeight: 1080 });
      setAttachments((prev) => [...prev, {
        type: 'image',
        data: capture.imageData,
        name: `capture-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`,
      }]);
    } catch (error) {
      console.error('[ChatInput] Screen capture failed:', error);
    }
    setShowActions(false);
  };

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
            setAttachments((prev) => [...prev, {
              type: 'image',
              data: reader.result as string,
              name: `pasted-image-${Date.now()}.png`,
            }]);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  }, []);
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [...prev, {
            type: file.type.startsWith('image/') ? 'image' : 'file',
            data: reader.result as string,
            name: file.name,
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handleAudioReady = useCallback((_audioBlob: Blob, base64: string) => {
    setAttachments((prev) => [...prev, {
      type: 'file', data: base64, name: `audio-${Date.now()}.webm`,
    }]);
    setMessage((prev) => prev + (prev ? ' ' : '') + '[Message vocal joint]');
  }, []);

  const handleSaveEditedImage = useCallback((editedImageBase64: string) => {
    if (editingImageIndex !== null) {
      setAttachments((prev) => prev.map((att, idx) =>
        idx === editingImageIndex ? { ...att, data: editedImageBase64, name: `edited-${att.name}` } : att
      ));
    }
    setEditingImageIndex(null);
  }, [editingImageIndex]);

  const handleSend = async () => {
    const hasText = message.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    if ((!hasText && !hasAttachments) || isLoading) return;

    let convId = currentConversationId;
    if (!convId) convId = createConversation();

    const userMessage = message.trim();
    const currentAttachments = [...attachments];
    setMessage('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let messageContent = userMessage;
    if (currentAttachments.length > 0) {
      const attachmentInfo = currentAttachments
        .map((a) => `[${a.type === 'image' ? 'Image' : 'Fichier'}: ${a.name}]`)
        .join(' ');
      messageContent = hasText ? `${userMessage}\n\n${attachmentInfo}` : attachmentInfo;
    }

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
      const conversation = getCurrentConversation();
      const history: AIMessage[] = (conversation?.messages || [])
        .slice(-10)
        .map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          image: m.image
        }));

      const toolCallingSystemPrompt = `Tu es Lisa, une assistante IA avec accès à des outils.

## FICHIERS JOINTS

Tu peux lire les fichiers joints par l'utilisateur (PDF, DOCX, TXT, images).
Quand un fichier est joint, son contenu extrait apparaît dans le message entre balises [Contenu du fichier: nom] et [Fin du fichier].
Analyse et utilise ce contenu pour répondre. Tu peux résumer, extraire des informations, répondre à des questions sur le document, etc.
Si l'extraction a échoué, le message indiquera "Impossible d'extraire le texte" — dans ce cas, explique le problème.

## OUTILS DISPONIBLES

### RECHERCHE WEB
- **web_search(query)** - Recherche actualités, météo, TV, prix
- **fetch_url(url)** - Récupère le contenu d'une page web

### GESTION DES TÂCHES
- **add_todo(text, priority?)** - Ajouter une tâche
- **list_todos(filter?)** - Lister les tâches
- **complete_todo(id?, text?)** - Marquer une tâche terminée
- **remove_todo(id?, text?)** - Supprimer une tâche

## INTERPRÉTATION DES RÉSULTATS

Quand un outil retourne un résultat:
- Si "success": true → L'action a RÉUSSI. Confirme à l'utilisateur.
- Si "success": false → L'action a ÉCHOUÉ. Explique l'erreur.

Exemples:
- add_todo retourne {"success": true, "message": "Tâche ajoutée: X"} → Dis "J'ai ajouté 'X' à ta liste !"
- list_todos retourne {"todos": [...]} → Liste les tâches trouvées

## COMPORTEMENT

1. "Ajoute une tâche..." → APPELLE add_todo
2. "Liste mes tâches" → APPELLE list_todos
3. Question actualités/météo → APPELLE web_search
4. Fichier joint → Analyse le contenu extrait et réponds en conséquence

Réponds en français, sois concis.`;

      history.unshift({ role: 'system', content: toolCallingSystemPrompt });

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

      // Extract text from non-image file attachments (PDF, DOCX, TXT, etc.)
      let fileContentForAI = '';
      const fileAttachments = currentAttachments.filter(a => a.type === 'file');
      if (fileAttachments.length > 0) {
        for (const att of fileAttachments) {
          try {
            const blob = dataURLtoBlob(att.data);
            const analysis = await documentAnalysisService.analyzeDocument(blob, att.name, {
              extractEntities: false,
              generateSummary: false,
            });
            if (analysis.content?.text) {
              const text = analysis.content.text.substring(0, 15000);
              fileContentForAI += `\n\n[Contenu du fichier: ${att.name}]\n${text}\n[Fin du fichier]`;
            }
          } catch (err) {
            console.warn(`[ChatInput] Extraction échouée pour ${att.name}:`, err);
            fileContentForAI += `\n\n[Fichier: ${att.name} — Impossible d'extraire le texte]`;
          }
        }
      }

      const imageAttachment = currentAttachments.find(a => a.type === 'image');
      const aiUserContent = fileContentForAI ? userMessage + fileContentForAI : userMessage;
      history.push({ role: 'user', content: aiUserContent, image: imageAttachment?.data });

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

      const TOOL_CALLING_PROVIDERS = ['gemini', 'openai', 'anthropic'];
      let effectiveProvider = currentModel.provider as AIProvider;
      let effectiveModel = currentModel.id;

      if (!TOOL_CALLING_PROVIDERS.includes(effectiveProvider)) {
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

      aiWithToolsService.setConfig({ enableTools: true, showToolUsage: true, maxIterations: 5 });

      if (streamingEnabled) {
        let fullResponse = '';
        try {
          for await (const chunk of aiWithToolsService.streamMessage(history)) {
            if (controller.signal.aborted) break;
            if (chunk.error) throw new Error(chunk.error);
            if (chunk.content) {
              fullResponse += chunk.content;
              setStreamingMessage(fullResponse);
            }
            if (chunk.done) break;
          }
        } catch (error) {
          if (fullResponse && !incognitoMode) {
            setStreamingMessage(null);
            addMessage({
              role: 'assistant',
              content: fullResponse + '\n\n*(Réponse interrompue)*',
              conversationId: convId,
            });
          }
          if (!controller.signal.aborted) throw error;
          return;
        }

        setStreamingMessage(null);
        if (!fullResponse) {
          addMessage({ role: 'assistant', content: 'Désolé, je n\'ai pas pu générer de réponse.', conversationId: convId });
          return;
        }
        addMessage({ role: 'assistant', content: fullResponse, conversationId: convId });
        if (!incognitoMode) {
          if (longTermMemoryEnabled) longTermMemoryService.extractAndRemember(userMessage, fullResponse).catch(console.warn);
          if (autoSpeakEnabled) speak(fullResponse.replace(/[*#_`]/g, ''));
        }
      } else {
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
          if (longTermMemoryEnabled && fullResponse) longTermMemoryService.extractAndRemember(userMessage, fullResponse).catch(console.warn);
          if (autoSpeakEnabled && fullResponse) speak(fullResponse.replace(/[*#_`]/g, ''));
        }
      }
    } catch (error) {
      console.error('[ChatInput] Error:', error);
      if (!incognitoMode) {
        addMessage({
          role: 'assistant',
          content: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}\n\nVérifiez que votre moteur IA est bien configuré.`,
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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); return; }
    if (e.key === 'Escape') {
      if (isLoading) stopStreaming();
      else { setMessage(''); setAttachments([]); }
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); createConversation(); textareaRef.current?.focus(); }
      if (e.ctrlKey && e.key === '/') { e.preventDefault(); textareaRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [createConversation]);

  useEffect(() => {
    if (transcript) setMessage(prev => prev + (prev ? ' ' : '') + transcript);
  }, [transcript]);

  const displayText = message + (interimTranscript ? (message ? ' ' : '') + interimTranscript : '');
  const hasContent = message.trim().length > 0 || attachments.length > 0;

  return (
    <div
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '2px dashed var(--text-muted)',
          borderRadius: 'var(--radius-pill)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 20, pointerEvents: 'none',
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Déposez vos fichiers ici</span>
        </div>
      )}

      {/* Image Editor */}
      {editingImageIndex !== null && attachments[editingImageIndex]?.type === 'image' && (
        <ImageEditor
          imageUrl={attachments[editingImageIndex].data}
          onSave={handleSaveEditedImage}
          onCancel={() => setEditingImageIndex(null)}
        />
      )}

      {/* Listening indicator */}
      {isListening && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0,
          marginBottom: '8px', padding: '8px 16px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: 'var(--color-error)', animation: 'chatinput-pulse 1s infinite',
          }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Écoute en cours... Parlez maintenant
          </span>
        </div>
      )}

      {/* Main input container — ChatGPT style */}
      <div style={{
        backgroundColor: 'var(--bg-panel)',
        borderRadius: 'var(--radius-pill)',
        border: isListening ? '1px solid var(--color-error)' : '1px solid var(--border-primary)',
        transition: 'border-color var(--transition-normal)',
      }}>
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px',
            padding: '12px 16px 0',
          }}>
            {attachments.map((att, idx) => (
              <div key={idx} style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 10px', backgroundColor: 'var(--border-primary)', borderRadius: 'var(--radius-md)',
                fontSize: '12px', color: 'var(--text-primary)',
              }}>
                {att.type === 'image' ? (
                  <img src={att.data} alt={att.name} style={{
                    width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover',
                  }} />
                ) : (
                  <Paperclip size={14} style={{ color: 'var(--text-muted)' }} />
                )}
                <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.name}
                </span>
                {att.type === 'image' && (
                  <button onClick={() => setEditingImageIndex(idx)} style={iconBtnStyle} title="Annoter">
                    <Edit3 size={12} />
                  </button>
                )}
                <button onClick={() => removeAttachment(idx)} style={iconBtnStyle} title="Retirer">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div style={{ padding: isMobile ? '12px 16px 0' : '14px 20px 0' }}>
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isListening ? 'Parlez...' : (incognitoMode ? 'Mode incognito...' : 'Envoyer un message...')}
            disabled={isLoading}
            aria-label="Message à envoyer"
            aria-describedby="chat-input-hint"
            rows={1}
            style={{
              width: '100%',
              padding: 0,
              backgroundColor: 'transparent',
              border: 'none', outline: 'none',
              color: 'var(--text-primary)',
              fontSize: isMobile ? '16px' : '15px',
              lineHeight: '1.6',
              resize: 'none',
              minHeight: '24px',
              maxHeight: '200px',
              fontFamily: 'inherit',
            }}
          />
          <span id="chat-input-hint" className="sr-only">
            Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
          </span>
        </div>

        {/* Bottom toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '8px 10px' : '8px 14px',
        }}>
          {/* Left actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', position: 'relative' }} ref={actionsRef}>
            <button
              onClick={() => setShowActions(!showActions)}
              style={{
                ...toolBtnStyle,
                backgroundColor: showActions ? 'var(--border-primary)' : 'transparent',
                borderRadius: '50%',
                width: '32px', height: '32px',
                transition: 'background-color var(--transition-fast), transform var(--transition-normal)',
                transform: showActions ? 'rotate(45deg)' : 'none',
              }}
              aria-label={showActions ? 'Fermer le menu d\'options' : 'Plus d\'options'}
              aria-expanded={showActions}
              aria-haspopup="true"
            >
              <Plus size={18} />
            </button>

            {/* Actions popup */}
            {showActions && (
              <div
                role="menu"
                aria-label="Options supplémentaires"
                style={{
                  position: 'absolute', bottom: '100%', left: 0,
                  marginBottom: '6px', padding: '6px',
                  backgroundColor: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-primary)',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                  minWidth: '180px', zIndex: 30,
                  boxShadow: 'var(--shadow-elevated)',
                }}
              >
                <ActionItem icon={<Paperclip size={16} />} label="Joindre un fichier" onClick={() => { fileInputRef.current?.click(); setShowActions(false); }} />
                <ActionItem icon={<Camera size={16} />} label="Capturer l'écran" onClick={handleScreenCapture} />
                <ActionItem icon={<Wand2 size={16} />} label="Créer un artefact" onClick={() => { setShowArtifactCreator(true); setShowActions(false); }} />
                {!isMobile && (
                  <div style={{ padding: '0 4px' }}><AudioRecordButton onAudioReady={handleAudioReady} disabled={isLoading} /></div>
                )}
                {voiceSupported && (
                  <ActionItem
                    icon={autoSpeakEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    label={autoSpeakEnabled ? 'Désactiver la voix' : 'Activer la voix'}
                    onClick={() => { toggleAutoSpeak(); setShowActions(false); }}
                    active={autoSpeakEnabled}
                  />
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.md,.json,.csv"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {!isMobile && (
              <button onClick={() => fileInputRef.current?.click()} style={toolBtnStyle} aria-label="Joindre un fichier">
                <Paperclip size={16} />
              </button>
            )}

            <button
              style={{ ...toolBtnStyle, cursor: 'default', opacity: 0.5 }}
              aria-label="Recherche web (bientôt disponible)"
              aria-disabled="true"
              title="Recherche web — bientôt disponible"
            >
              <Globe size={16} />
            </button>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {voiceSupported && (
              <button
                onClick={toggleListening}
                style={{
                  ...toolBtnStyle,
                  backgroundColor: isListening ? 'var(--color-error)' : 'transparent',
                  color: isListening ? '#fff' : 'var(--text-secondary)',
                  borderRadius: '50%',
                }}
                aria-label={isListening ? 'Arrêter la dictée' : 'Dicter un message'}
                aria-pressed={isListening}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            {isLoading ? (
              <button
                onClick={stopStreaming}
                style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--text-primary)',
                  border: 'none', color: 'var(--bg-deep)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Arrêter la génération (Escape)"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={hasContent ? handleSend : undefined}
                disabled={!hasContent}
                style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  backgroundColor: hasContent ? 'var(--text-primary)' : 'transparent',
                  border: 'none',
                  color: hasContent ? 'var(--bg-deep)' : 'var(--text-muted)',
                  cursor: hasContent ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color var(--transition-normal), color var(--transition-normal)',
                }}
                aria-label="Envoyer le message (Enter)"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes chatinput-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
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

/* ── Shared styles ─────────────────────────────────── */

const toolBtnStyle: React.CSSProperties = {
  padding: 0,
  width: '36px', height: '36px',
  backgroundColor: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  borderRadius: 'var(--radius-md)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background-color var(--transition-fast), color var(--transition-fast)',
};

const iconBtnStyle: React.CSSProperties = {
  padding: '2px', backgroundColor: 'transparent',
  border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-sm)',
};

/* ── Action menu item ──────────────────────────────── */

function ActionItem({ icon, label, onClick, active }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 12px',
        backgroundColor: 'transparent',
        border: 'none',
        color: active ? 'var(--color-accent)' : 'var(--text-primary)',
        cursor: 'pointer',
        borderRadius: '10px',
        fontSize: '13px',
        width: '100%',
        textAlign: 'left',
        transition: 'background-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {icon}
      {label}
    </button>
  );
}

export default ChatInput;
