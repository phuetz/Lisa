/**
 * Chat Input Component — ChatGPT-style prompt area
 * Clean, centered, minimal design with collapsible action menu
 */

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type DragEvent, type ClipboardEvent } from 'react';
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
import { useIsMobile } from '../../hooks/useIsMobile';
import { captureWebcamFrame, isVisionRequest } from '../../utils/webcamCapture';
import { useSnippetExpansion } from '../../hooks/useSnippets';

function dataURLtoBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/* ── Action Menu Item ── */

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
      className={`action-menu-item${active ? ' active-item' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── File Attachments Preview ── */

function AttachmentsPreview({ attachments, onRemove, onEdit }: {
  attachments: { type: 'image' | 'file'; data: string; name: string }[];
  onRemove: (index: number) => void;
  onEdit: (index: number) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="attachments-row">
      {attachments.map((att, idx) => (
        <div key={idx} className="attachment-chip">
          {att.type === 'image' ? (
            <img src={att.data} alt={att.name} className="attachment-thumb" />
          ) : (
            <Paperclip size={14} style={{ color: 'var(--text-muted)' }} />
          )}
          <span className="attachment-name">{att.name}</span>
          {att.type === 'image' && (
            <button onClick={() => onEdit(idx)} className="inline-icon-btn" title="Annoter">
              <Edit3 size={12} />
            </button>
          )}
          <button onClick={() => onRemove(idx)} className="inline-icon-btn" title="Retirer">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Main Chat Input ── */

export const ChatInput = () => {
  const isMobile = useIsMobile();

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
    isListening, transcript, interimTranscript, toggleListening,
    speak, isSupported: voiceSupported,
  } = useVoiceChat({ language: 'fr-FR' });

  const { currentConversationId, addMessage, getCurrentConversation, setStreamingMessage, setTyping, createConversation } = useChatHistoryStore();

  // PromptCommander: snippet expansion
  const { tryExpand } = useSnippetExpansion();

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
    const value = e.target.value;

    // Snippet expansion: if text matches a shortcut, replace with snippet content
    if (value.endsWith(' ') || value.endsWith('\n')) {
      const word = value.trimEnd().split(/\s/).pop() || '';
      const expanded = tryExpand(word);
      if (expanded) {
        const before = value.slice(0, value.lastIndexOf(word));
        setMessage(before + expanded);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
        return;
      }
    }

    setMessage(value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const stopStreaming = useCallback(() => {
    if (abortController) { abortController.abort(); setAbortController(null); }
  }, [abortController]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [...prev, {
          type: file.type.startsWith('image/') ? 'image' : 'file',
          data: reader.result as string, name: file.name,
        }]);
      };
      reader.onerror = () => console.warn('Failed to read file:', file.name);
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => setAttachments((prev) => prev.filter((_, i) => i !== index));

  const handleScreenCapture = async () => {
    if (!screenCaptureService.isSupported()) {
      alert('La capture d\'écran n\'est pas supportée dans ce navigateur.');
      return;
    }
    try {
      const capture = await screenCaptureService.captureScreen({ maxWidth: 1920, maxHeight: 1080 });
      setAttachments((prev) => [...prev, {
        type: 'image', data: capture.imageData,
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
              type: 'image', data: reader.result as string, name: `pasted-image-${Date.now()}.png`,
            }]);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); }, []);
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
            data: reader.result as string, name: file.name,
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handleAudioReady = useCallback((_audioBlob: Blob, base64: string) => {
    setAttachments((prev) => [...prev, { type: 'file', data: base64, name: `audio-${Date.now()}.webm` }]);
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
        role: 'user', content: messageContent, conversationId: convId,
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
        .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content, image: m.image }));

      const toolCallingSystemPrompt = `Tu es Lisa, une assistante IA avec accès à des outils.

## FICHIERS JOINTS

Tu peux lire les fichiers joints par l'utilisateur (PDF, DOCX, TXT, images).
Quand un fichier est joint, son contenu extrait apparaît dans le message entre balises [Contenu du fichier: nom] et [Fin du fichier].
Analyse et utilise ce contenu pour répondre. Tu peux résumer, extraire des informations, répondre à des questions sur le document, etc.
Si l'extraction a échoué, le message indiquera "Impossible d'extraire le texte" — dans ce cas, explique le problème.

## GRAPHIQUES ET VISUALISATIONS

Tu peux tracer des graphiques interactifs ! Pour afficher un graphique, utilise un bloc de code \`\`\`chart avec du JSON structuré :

\`\`\`chart
{
  "type": "line",
  "title": "Titre du graphique",
  "data": [
    { "annee": "2020", "valeur": 2303 },
    { "annee": "2021", "valeur": 2501 }
  ],
  "xKey": "annee",
  "yKey": "valeur"
}
\`\`\`

Types supportés : "line", "bar", "area", "pie".
- Pour les courbes d'évolution → utilise "line" ou "area"
- Pour les comparaisons → utilise "bar"
- Pour les répartitions → utilise "pie"
- Tu peux inclure plusieurs séries avec "yKey": ["serie1", "serie2"]

**RÈGLE ABSOLUE pour les graphiques** : Quand l'utilisateur demande un graphique, une courbe, ou une visualisation de données, tu DOIS TOUJOURS générer le bloc \`\`\`chart avec des données. Ne demande JAMAIS à l'utilisateur de fournir les données. Utilise tes propres connaissances pour fournir des données approximatives mais réalistes. Par exemple, pour "le PIB de la France depuis 1945", génère toi-même les valeurs approximatives du PIB pour chaque décennie ou période clé. Tu as suffisamment de connaissances pour fournir des ordres de grandeur corrects. Génère TOUJOURS le graphique, même si les données sont approximatives — précise simplement "valeurs approximatives" dans le titre ou une note.

## VISION ET CAMÉRA

Tu as accès à la caméra/webcam de l'utilisateur. Quand l'utilisateur te demande "que vois-tu ?", "regarde la caméra", "décris ce que tu vois", etc., une image de la webcam est automatiquement capturée et jointe à son message. Décris ce que tu vois dans l'image de manière détaillée et naturelle, comme si tu regardais réellement la scène. Tu peux identifier les objets, les personnes, les couleurs, l'environnement, etc.

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
            history.unshift({ role: 'system', content: `[Contexte de mémoire long-terme]\n${memoryContext}\n[Fin du contexte]` });
          }
        } catch (error) {
          console.warn('[ChatInput] Failed to load memory context:', error);
        }
      }

      let fileContentForAI = '';
      const fileAttachments = currentAttachments.filter(a => a.type === 'file');
      if (fileAttachments.length > 0) {
        for (const att of fileAttachments) {
          try {
            const blob = dataURLtoBlob(att.data);
            const analysis = await documentAnalysisService.analyzeDocument(blob, att.name, { extractEntities: false, generateSummary: false });
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

      let imageAttachment = currentAttachments.find(a => a.type === 'image');

      // Auto-capture webcam if the user asks about what Lisa sees
      if (!imageAttachment && isVisionRequest(userMessage)) {
        try {
          const frame = await captureWebcamFrame();
          if (frame) {
            imageAttachment = { type: 'image', data: frame, name: 'webcam-capture.jpg' };
          }
        } catch (err) {
          console.warn('[ChatInput] Webcam auto-capture failed:', err);
        }
      }

      const aiUserContent = fileContentForAI ? userMessage + fileContentForAI : userMessage;
      history.push({ role: 'user', content: aiUserContent, image: imageAttachment?.data });

      const routeResult = await agentRouterService.route(userMessage);
      if (routeResult.handled && routeResult.response) {
        const duration = Math.round(performance.now() - startTime);
        if (!incognitoMode) {
          addMessage({ role: 'assistant', content: routeResult.response, conversationId: convId, metadata: { model: routeResult.agentName || 'agent', duration } });
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
        provider: effectiveProvider, model: effectiveModel, temperature, maxTokens,
        baseURL: currentModel.provider === 'lmstudio' ? '/lmstudio/v1' : undefined
      });
      aiWithToolsService.setConfig({ enableTools: true, showToolUsage: true, maxIterations: 5 });

      if (streamingEnabled) {
        let fullResponse = '';
        try {
          for await (const chunk of aiWithToolsService.streamMessage(history)) {
            if (controller.signal.aborted) break;
            if (chunk.error) throw new Error(chunk.error);
            if (chunk.content) { fullResponse += chunk.content; setStreamingMessage(fullResponse); }
            if (chunk.done) break;
          }
        } catch (error) {
          if (fullResponse && !incognitoMode) {
            setStreamingMessage(null);
            addMessage({ role: 'assistant', content: fullResponse + '\n\n*(Réponse interrompue)*', conversationId: convId });
          }
          if (!controller.signal.aborted) throw error;
          return;
        }

        setStreamingMessage(null);
        if (!fullResponse) {
          addMessage({ role: 'assistant', content: 'Désolé, je n\'ai pas pu générer de réponse.', conversationId: convId });
          return;
        }
        const duration = Math.round(performance.now() - startTime);
        addMessage({ role: 'assistant', content: fullResponse, conversationId: convId, metadata: { model: effectiveModel, duration } });

        // Record usage in Dexie (non-blocking)
        import('../../hooks/useUsageRecords').then(async ({ useUsageRecords }) => {
          const { addRecord } = useUsageRecords.getState?.() || {};
          if (!addRecord) return;
          const { estimateTokens } = await import('../../services/providers/base');
          const inputTok = estimateTokens(aiUserContent);
          const outputTok = estimateTokens(fullResponse);
          addRecord({
            messageId: convId + '-' + Date.now(),
            conversationId: convId,
            provider: effectiveProvider as import('../../types/promptcommander').ProviderKey,
            modelId: effectiveModel,
            inputTokens: inputTok,
            outputTokens: outputTok,
            cost: 0, // Would need model pricing lookup
          });
        }).catch(() => {});

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
            role: 'assistant', content: fullResponse || 'Désolé, je n\'ai pas pu générer de réponse.',
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
      className="chat-drop-zone"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <span className="drag-overlay-text">Déposez vos fichiers ici</span>
        </div>
      )}

      {editingImageIndex !== null && attachments[editingImageIndex]?.type === 'image' && (
        <ImageEditor
          imageUrl={attachments[editingImageIndex].data}
          onSave={handleSaveEditedImage}
          onCancel={() => setEditingImageIndex(null)}
        />
      )}

      {isListening && (
        <div className="listening-indicator">
          <div className="listening-dot" />
          <span className="listening-text">Écoute en cours... Parlez maintenant</span>
        </div>
      )}

      <div className={`input-container${isListening ? ' listening' : ''}`}>
        <AttachmentsPreview
          attachments={attachments}
          onRemove={removeAttachment}
          onEdit={(idx) => setEditingImageIndex(idx)}
        />

        <div className={`chat-textarea-wrap${isMobile ? ' mobile' : ''}`}>
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
            className={`chat-textarea${isMobile ? ' mobile' : ''}`}
          />
          <span id="chat-input-hint" className="sr-only">
            Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
          </span>
        </div>

        <div className={`input-toolbar${isMobile ? ' mobile' : ''}`}>
          <div className="input-toolbar-left" ref={actionsRef}>
            <button
              onClick={() => setShowActions(!showActions)}
              className={`tool-btn plus${showActions ? ' open' : ''}`}
              aria-label={showActions ? 'Fermer le menu d\'options' : 'Plus d\'options'}
              aria-expanded={showActions}
              aria-haspopup="true"
            >
              <Plus size={18} />
            </button>

            {showActions && (
              <div role="menu" aria-label="Options supplémentaires" className="actions-popup">
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
              <button onClick={() => fileInputRef.current?.click()} className="tool-btn" aria-label="Joindre un fichier">
                <Paperclip size={16} />
              </button>
            )}

            <button
              className="tool-btn disabled"
              aria-label="Recherche web (bientôt disponible)"
              aria-disabled="true"
              title="Recherche web — bientôt disponible"
            >
              <Globe size={16} />
            </button>
          </div>

          <div className="input-toolbar-right">
            {voiceSupported && (
              <button
                onClick={toggleListening}
                className={`tool-btn${isListening ? ' mic-active' : ''}`}
                aria-label={isListening ? 'Arrêter la dictée' : 'Dicter un message'}
                aria-pressed={isListening}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            {isLoading ? (
              <button onClick={stopStreaming} className="send-btn stop" aria-label="Arrêter la génération (Escape)">
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={hasContent ? handleSend : undefined}
                disabled={!hasContent}
                className={`send-btn ${hasContent ? 'active' : 'inactive'}`}
                aria-label="Envoyer le message (Enter)"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

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
