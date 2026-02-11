/**
 * CopilotPage.tsx — Copilote du Quotidien
 *
 * Page WAOUH affichant en temps réel les 4 sens de Lisa
 * (Je vois, J'entends, Je comprends, J'agis) + timeline + memoire + agent board.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Mic, Brain, Zap, Timer, FileText, MessageSquare,
  Bell, Sparkles, Clock, Bot, Pin,
} from 'lucide-react';
import { useVisionStore, visionSelectors } from '../store/visionStore';
import { useAudioStore } from '../store/audioStore';
import { useAppStore } from '../store/appStore';
import type { Timer as TimerType } from '../store/appStore';
import { useCopilotStore } from '../store/copilotStore';
import { GlowingCard } from '../components/ui/GlowingCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MemoryDrawer } from '../components/copilot/MemoryDrawer';
import { AgentBoard } from '../components/copilot/AgentBoard';
import type { Percept, VisionPayload } from '../types';
import type { LegacyHearingPerceptPayload } from '../features/hearing/types';

/* ================================================================
   TYPES
   ================================================================ */

interface SuggestedAction {
  label: string;
  icon: typeof Timer;
  handler: () => void;
  primary?: boolean;
}

/* ================================================================
   HELPERS
   ================================================================ */

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function summarizeVision(percepts: Percept<VisionPayload>[], now: number): { text: string; tags: string[] } {
  if (percepts.length === 0) return { text: 'En attente de donnees visuelles...', tags: [] };

  // Check staleness — if most recent percept is older than 5s, show idle state
  const latest = percepts[percepts.length - 1];
  if (now - latest.ts > 5000) return { text: 'Aucune activite visuelle recente', tags: ['Inactif'] };

  const recent = percepts.slice(-5);
  const tags = new Set<string>();
  const sentences: string[] = [];

  for (const p of recent) {
    const pl = p.payload;
    switch (pl.type) {
      case 'object':
        pl.classes.forEach(c => tags.add(c));
        if (pl.classes.length > 0 && sentences.length === 0) {
          sentences.push(`Je detecte : ${pl.classes.slice(0, 3).join(', ')}`);
        }
        break;
      case 'face':
        tags.add('Visage');
        pl.faces.forEach(f => { if (f.emotion) tags.add(f.emotion); });
        if (sentences.length === 0) {
          const count = pl.faces.length;
          sentences.push(`${count} visage${count > 1 ? 's' : ''} detecte${count > 1 ? 's' : ''}`);
        }
        break;
      case 'hand':
        pl.hands.forEach(h => {
          tags.add(h.handedness === 'Left' ? 'Main gauche' : 'Main droite');
          if (h.gesture) tags.add(h.gesture);
        });
        if (sentences.length === 0) sentences.push('Main detectee');
        break;
      case 'pose':
        pl.poses.forEach(po => { if (po.activity) tags.add(po.activity); });
        if (sentences.length === 0) sentences.push('Posture detectee');
        break;
    }
  }

  return {
    text: sentences[0] || 'Analyse en cours...',
    tags: Array.from(tags).slice(0, 6),
  };
}

function summarizeHearing(
  percepts: Percept<LegacyHearingPerceptPayload>[],
  isListening: boolean,
  now: number,
): { text: string; tags: string[] } {
  if (!isListening && percepts.length === 0) {
    return { text: 'Microphone inactif', tags: ['Inactif'] };
  }

  const tags: string[] = [];
  const latest = percepts.length > 0 ? percepts[percepts.length - 1] : null;

  if (!latest || (now - latest.ts > 5000)) {
    tags.push('Silence');
    return { text: 'Silence detecte', tags };
  }

  if (latest.payload.text) {
    tags.push('Parole');
    if (latest.payload.emotion) tags.push(latest.payload.emotion);
    const truncated = latest.payload.text.length > 60
      ? latest.payload.text.slice(0, 57) + '...'
      : latest.payload.text;
    return { text: `"${truncated}"`, tags };
  }

  if (latest.payload.emotion) {
    tags.push(latest.payload.emotion);
    return { text: `Ton ${latest.payload.emotion} detecte`, tags };
  }

  tags.push('Bruit');
  return { text: 'Activite sonore detectee', tags };
}

function inferIntent(
  visionPercepts: Percept<VisionPayload>[],
  hearingPercepts: Percept<LegacyHearingPerceptPayload>[],
  smileDetected: boolean,
  speechDetected: boolean,
  now: number,
): { intent: string; confidence: number } {
  const latestV = visionPercepts.length > 0 ? visionPercepts[visionPercepts.length - 1] : null;
  const latestH = hearingPercepts.length > 0 ? hearingPercepts[hearingPercepts.length - 1] : null;

  if (speechDetected && latestH?.payload.text) {
    const lower = latestH.payload.text.toLowerCase();
    if (/\b(quoi|comment|pourquoi|o[uù]|quand|est-ce)\b/.test(lower)) {
      return { intent: 'Tu poses une question', confidence: 0.85 };
    }
    return { intent: 'Tu parles', confidence: 0.75 };
  }

  if (latestV && latestV.payload.type === 'hand' && (now - latestV.ts < 3000)) {
    const gesture = latestV.payload.hands[0]?.gesture;
    if (gesture) return { intent: `Geste detecte : ${gesture}`, confidence: 0.7 };
    return { intent: 'Tu veux attirer mon attention', confidence: 0.65 };
  }

  if (smileDetected) {
    return { intent: 'Tu as l\'air content', confidence: 0.6 };
  }

  if (latestV && latestV.payload.type === 'object' && (now - latestV.ts < 3000)) {
    const classes = latestV.payload.classes.map(c => c.toLowerCase());
    if (classes.some(c => c.includes('phone') || c.includes('cell') || c.includes('telephone'))) {
      return { intent: 'Tu sembles utiliser ton telephone', confidence: 0.6 };
    }
    if (classes.some(c => c.includes('book') || c.includes('laptop') || c.includes('keyboard'))) {
      return { intent: 'Tu es concentre sur quelque chose', confidence: 0.55 };
    }
  }

  if (latestV && latestV.payload.type === 'pose' && (now - latestV.ts < 3000)) {
    const activity = latestV.payload.poses[0]?.activity?.toLowerCase();
    if (activity?.includes('sit')) return { intent: 'Tu es assis, concentre', confidence: 0.5 };
    if (activity?.includes('stand')) return { intent: 'Tu es debout', confidence: 0.5 };
  }

  const hasRecentVision = latestV && (now - latestV.ts < 10000);
  const hasRecentAudio = latestH && (now - latestH.ts < 10000);
  if (!hasRecentVision && !hasRecentAudio) {
    return { intent: 'Tout semble calme', confidence: 0.3 };
  }

  return { intent: 'J\'observe...', confidence: 0.2 };
}

function getSuggestedActions(
  intent: string,
  handlers: {
    addTimer: (min: number) => void;
    addNote: () => void;
    addReminder: () => void;
    openChat: () => void;
  },
): SuggestedAction[] {
  const question = intent.includes('question');
  const attention = intent.includes('attention') || intent.includes('Geste');
  const content = intent.includes('content');
  const telephone = intent.includes('telephone');
  const concentre = intent.includes('concentre') || intent.includes('assis');
  const calme = intent.includes('calme');
  const parles = intent.includes('parles');

  if (question || parles) return [
    { label: 'Ouvrir le chat', icon: MessageSquare, handler: handlers.openChat, primary: true },
    { label: 'Creer une note', icon: FileText, handler: handlers.addNote },
  ];
  if (attention) return [
    { label: 'Ouvrir le chat', icon: MessageSquare, handler: handlers.openChat, primary: true },
    { label: 'Rappel dans 5 min', icon: Bell, handler: handlers.addReminder },
  ];
  if (content) return [
    { label: 'Creer une note', icon: FileText, handler: handlers.addNote, primary: true },
    { label: 'Ouvrir le chat', icon: MessageSquare, handler: handlers.openChat },
  ];
  if (telephone) return [
    { label: 'Timer 10 min', icon: Timer, handler: () => handlers.addTimer(10), primary: true },
    { label: 'Creer une note', icon: FileText, handler: handlers.addNote },
  ];
  if (concentre) return [
    { label: 'Pomodoro 25 min', icon: Timer, handler: () => handlers.addTimer(25), primary: true },
    { label: 'Creer une note', icon: FileText, handler: handlers.addNote },
  ];
  if (calme) return [
    { label: 'Rappel', icon: Bell, handler: handlers.addReminder, primary: true },
    { label: 'Ouvrir le chat', icon: MessageSquare, handler: handlers.openChat },
  ];

  return [
    { label: 'Creer une note', icon: FileText, handler: handlers.addNote, primary: true },
    { label: 'Timer 10 min', icon: Timer, handler: () => handlers.addTimer(10) },
    { label: 'Ouvrir le chat', icon: MessageSquare, handler: handlers.openChat },
  ];
}

/* ================================================================
   COLORS
   ================================================================ */

const eventColors: Record<string, string> = {
  cyan: '#06b6d4',
  purple: '#8b5cf6',
  amber: '#f5a623',
  emerald: '#22c55e',
  blue: '#3b82f6',
};

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function CopilotPage() {
  const navigate = useNavigate();

  /* --- Sense stores --- */
  const visionPercepts = useVisionStore(s => s.percepts);
  const smileDetected = useVisionStore(visionSelectors.smileDetected);
  const speechDetected = useVisionStore(visionSelectors.speechDetected);
  const hearingPercepts = useAudioStore(s => s.hearingPercepts);
  const isListening = useAudioStore(s => s.isListening);
  const addTodo = useAppStore(s => s.addTodo);

  /* --- Copilot store --- */
  const displayEvents = useCopilotStore(s => s.events);
  const pushEvent = useCopilotStore(s => s.pushEvent);
  const updateAgentTrace = useCopilotStore(s => s.updateAgentTrace);
  const updateSessionContext = useCopilotStore(s => s.updateSessionContext);
  const pinItem = useCopilotStore(s => s.pinItem);
  const memoryDrawerOpen = useCopilotStore(s => s.memoryDrawerOpen);
  const agentBoardOpen = useCopilotStore(s => s.agentBoardOpen);
  const toggleMemoryDrawer = useCopilotStore(s => s.toggleMemoryDrawer);
  const toggleAgentBoard = useCopilotStore(s => s.toggleAgentBoard);
  const sessionStartedAt = useCopilotStore(s => s.session.startedAt);
  const lastAction = useCopilotStore(s => s.session.context.lastAction);

  /* --- Live clock --- */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* --- Vision subscription (throttled 1500ms) --- */
  const lastVisionEventRef = useRef(0);
  useEffect(() => {
    const unsub = useVisionStore.subscribe(
      (s) => s.percepts.length,
      (count) => {
        if (count === 0) return;
        const elapsed = Date.now() - lastVisionEventRef.current;
        if (elapsed < 1500) return;
        lastVisionEventRef.current = Date.now();

        const latest = useVisionStore.getState().percepts;
        const last = latest[latest.length - 1];
        if (!last) return;

        let title = 'Vision mise a jour';
        const pl = last.payload;
        if (pl.type === 'object' && pl.classes.length > 0) title = `Objet : ${pl.classes[0]}`;
        else if (pl.type === 'face') title = `Visage detecte`;
        else if (pl.type === 'hand') title = `Main detectee`;
        else if (pl.type === 'pose') title = `Posture detectee`;

        pushEvent({ type: 'vision.update', timestamp: Date.now(), title, source: 'VisionAgent', color: 'cyan' });
        updateAgentTrace('VisionAgent', { lastSummary: title, updatedAt: Date.now() });
      },
    );
    return unsub;
  }, [pushEvent, updateAgentTrace]);

  /* --- Audio subscription (throttled 2000ms) --- */
  const lastAudioEventRef = useRef(0);
  useEffect(() => {
    const unsub = useAudioStore.subscribe(
      (s) => s.hearingPercepts,
      (percepts) => {
        if (percepts.length === 0) return;
        const elapsed = Date.now() - lastAudioEventRef.current;
        if (elapsed < 2000) return;
        lastAudioEventRef.current = Date.now();

        const last = percepts[percepts.length - 1];
        if (!last) return;

        const title = last.payload.text ? 'Parole detectee' : 'Evenement audio';
        const description = last.payload.text
          ? (last.payload.text.length > 40 ? last.payload.text.slice(0, 37) + '...' : last.payload.text)
          : undefined;

        pushEvent({ type: 'audio.event', timestamp: Date.now(), title, description, source: 'AudioAgent', color: 'purple' });
        updateAgentTrace('AudioAgent', { lastSummary: title + (description ? ` — ${description}` : ''), updatedAt: Date.now() });
      },
    );
    return unsub;
  }, [pushEvent, updateAgentTrace]);

  /* --- Intent change tracking --- */
  const prevIntentRef = useRef('');

  /* --- Reset refs when session is forgotten (startedAt changes) --- */
  useEffect(() => {
    prevIntentRef.current = '';
    lastVisionEventRef.current = 0;
    lastAudioEventRef.current = 0;
  }, [sessionStartedAt]);

  /* --- Derived data --- */
  const visionSummary = useMemo(() => summarizeVision(visionPercepts, now), [visionPercepts, now]);
  const hearingSummary = useMemo(
    () => summarizeHearing(hearingPercepts, isListening, now),
    [hearingPercepts, isListening, now],
  );
  const inferredIntent = useMemo(
    () => inferIntent(visionPercepts, hearingPercepts, smileDetected, speechDetected, now),
    [visionPercepts, hearingPercepts, smileDetected, speechDetected, now],
  );

  /* --- Push intent events + update agent traces when intent changes --- */
  const intentText = inferredIntent.intent;
  const intentConfidence = inferredIntent.confidence;
  useEffect(() => {
    if (intentText !== prevIntentRef.current && intentConfidence > 0.3) {
      prevIntentRef.current = intentText;
      pushEvent({
        type: 'intent.proposed',
        timestamp: Date.now(),
        title: intentText,
        description: `Confiance : ${Math.round(intentConfidence * 100)}%`,
        source: 'PlannerAgent',
        color: 'amber',
      });
      updateAgentTrace('PlannerAgent', {
        lastSummary: intentText,
        confidence: intentConfidence,
        updatedAt: Date.now(),
      });
    }
  }, [intentText, intentConfidence, pushEvent, updateAgentTrace]);

  /* --- Update session context when summaries change (skip idle defaults) --- */
  const mountedRef = useRef(false);
  useEffect(() => {
    // Skip the initial mount to avoid overwriting existing context with idle defaults
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    updateSessionContext({
      lastVisionSummary: visionSummary.text,
      lastAudioSummary: hearingSummary.text,
      lastIntent: inferredIntent.intent,
    });
  }, [visionSummary.text, hearingSummary.text, inferredIntent.intent, updateSessionContext]);

  /* --- Action handlers --- */
  const actionHandlers = useMemo(() => ({
    addTimer: (min: number) => {
      useAppStore.getState().setState((s) => ({
        timers: [...s.timers, { id: crypto.randomUUID(), finish: Date.now() + min * 60_000, label: `Timer ${min} min` } as TimerType],
      }));
      pushEvent({ type: 'action.executed', timestamp: Date.now(), title: `Timer ${min} min lance`, source: 'ActionAgent', color: 'emerald' });
      updateAgentTrace('ActionAgent', { lastAction: `Timer ${min} min lance`, updatedAt: Date.now() });
      updateSessionContext({ lastAction: `Timer ${min} min lance` });
    },
    addNote: () => {
      addTodo({ id: crypto.randomUUID(), text: 'Nouvelle note', createdAt: new Date().toISOString() });
      pushEvent({ type: 'action.executed', timestamp: Date.now(), title: 'Note creee', source: 'ActionAgent', color: 'emerald' });
      updateAgentTrace('ActionAgent', { lastAction: 'Note creee', updatedAt: Date.now() });
      updateSessionContext({ lastAction: 'Note creee' });
    },
    addReminder: () => {
      useAppStore.getState().setState((s) => ({
        alarms: [...s.alarms, { id: crypto.randomUUID(), time: Date.now() + 5 * 60_000, label: 'Rappel' }],
      }));
      pushEvent({ type: 'action.executed', timestamp: Date.now(), title: 'Rappel dans 5 min', source: 'ActionAgent', color: 'emerald' });
      updateAgentTrace('ActionAgent', { lastAction: 'Rappel dans 5 min', updatedAt: Date.now() });
      updateSessionContext({ lastAction: 'Rappel dans 5 min' });
    },
    openChat: () => {
      pushEvent({ type: 'action.executed', timestamp: Date.now(), title: 'Chat ouvert', source: 'ActionAgent', color: 'emerald' });
      updateAgentTrace('ActionAgent', { lastAction: 'Chat ouvert', updatedAt: Date.now() });
      navigate('/chat');
    },
  }), [addTodo, navigate, pushEvent, updateAgentTrace, updateSessionContext]);

  const suggestedActions = useMemo(
    () => getSuggestedActions(inferredIntent.intent, actionHandlers),
    [inferredIntent.intent, actionHandlers],
  );

  /* --- Auto-scroll timeline to top on new events --- */
  const timelineRef = useRef<HTMLDivElement>(null);
  const prevEventCountRef = useRef(displayEvents.length);
  useEffect(() => {
    if (displayEvents.length > prevEventCountRef.current && timelineRef.current) {
      timelineRef.current.scrollTop = 0;
    }
    prevEventCountRef.current = displayEvents.length;
  }, [displayEvents.length]);

  /* --- Activity indicators --- */
  const hasVisionActivity = visionPercepts.length > 0 && (now - visionPercepts[visionPercepts.length - 1].ts < 3000);
  const hasAudioActivity = hearingPercepts.length > 0 && (now - hearingPercepts[hearingPercepts.length - 1].ts < 5000);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1200px', margin: '0 auto', position: 'relative', minHeight: '100%' }}>

      {/* ---- Aurora Background ---- */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden', opacity: 0.15 }}>
        <div style={{
          position: 'absolute', width: '600px', height: '600px', top: '-10%', left: '20%',
          borderRadius: '50%', background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          animation: 'aurora-1 15s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '500px', height: '500px', bottom: '10%', right: '10%',
          borderRadius: '50%', background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          animation: 'aurora-2 18s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '400px', top: '40%', left: '-5%',
          borderRadius: '50%', background: 'radial-gradient(circle, #f5a623 0%, transparent 70%)',
          animation: 'aurora-3 20s ease-in-out infinite',
        }} />
      </div>

      {/* ---- Header ---- */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <Sparkles size={28} style={{ color: 'var(--color-accent)' }} />
          <h1 style={{
            fontSize: '28px', fontWeight: 800, margin: 0, flex: 1,
            background: 'linear-gradient(135deg, #f5a623, #06b6d4, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', backgroundSize: '200% 200%',
            animation: 'gradient-shift 5s ease infinite',
          }}>
            Copilote du Quotidien
          </h1>

          {/* Header action buttons */}
          <button
            onClick={toggleMemoryDrawer}
            title="Memoire"
            aria-label="Ouvrir le panneau memoire"
            aria-pressed={memoryDrawerOpen}
            style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: memoryDrawerOpen ? 'var(--color-brand-subtle)' : 'var(--bg-elevated)',
              color: memoryDrawerOpen ? 'var(--color-accent)' : 'var(--text-tertiary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Brain size={16} />
          </button>
          <button
            onClick={toggleAgentBoard}
            title="Agent Board"
            aria-label="Ouvrir le panneau agents"
            aria-pressed={agentBoardOpen}
            style={{
              width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: agentBoardOpen ? 'var(--color-brand-subtle)' : 'var(--bg-elevated)',
              color: agentBoardOpen ? 'var(--color-accent)' : 'var(--text-tertiary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Bot size={16} />
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} />
          {new Date(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' — '}
          {formatTime(now)}
        </p>
      </div>

      {/* ---- 4 Cards Grid ---- */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px', marginBottom: '24px',
      }}>

        {/* Card 1: Je vois */}
        <div className="animate-fade-in stagger-1">
          <GlowingCard glowColor="cyan" intensity="medium">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(6, 182, 212, 0.15)',
                animation: hasVisionActivity ? 'pulseGlow 2s infinite' : 'none',
              }}>
                <Eye size={20} style={{ color: '#06b6d4' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Je vois</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>vision.update</span>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5, minHeight: '42px' }}>
              {visionSummary.text}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {visionSummary.tags.length > 0
                ? visionSummary.tags.map(tag => <Badge key={tag} color="cyan">{tag}</Badge>)
                : <Badge color="muted">En attente</Badge>
              }
            </div>
          </GlowingCard>
        </div>

        {/* Card 2: J'entends */}
        <div className="animate-fade-in stagger-2">
          <GlowingCard glowColor="purple" intensity="medium">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(139, 92, 246, 0.15)',
                animation: hasAudioActivity ? 'pulseGlow 2s infinite' : 'none',
              }}>
                <Mic size={20} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>J'entends</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>audio.event</span>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5, minHeight: '42px' }}>
              {hearingSummary.text}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {hearingSummary.tags.map(tag => <Badge key={tag} color="accent">{tag}</Badge>)}
            </div>
          </GlowingCard>
        </div>

        {/* Card 3: Je comprends */}
        <div className="animate-fade-in stagger-3">
          <GlowingCard glowColor="amber" intensity="medium">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(245, 166, 35, 0.15)',
              }}>
                <Brain size={20} style={{ color: '#f5a623' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Je comprends</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>intent.proposed</span>
              </div>
            </div>
            <p style={{ fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 12px 0', fontWeight: 600, minHeight: '27px' }}>
              {inferredIntent.intent}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                role="progressbar"
                aria-valuenow={Math.round(inferredIntent.confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Confiance de l'intention"
                style={{
                  flex: 1, height: '4px', borderRadius: '2px',
                  backgroundColor: 'rgba(245, 166, 35, 0.15)', overflow: 'hidden',
                }}
              >
                <div style={{
                  width: `${Math.round(inferredIntent.confidence * 100)}%`,
                  height: '100%', borderRadius: '2px',
                  background: 'linear-gradient(90deg, #f5a623, #e6951a)',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {Math.round(inferredIntent.confidence * 100)}%
              </span>
            </div>
          </GlowingCard>
        </div>

        {/* Card 4: J'agis */}
        <div className="animate-fade-in stagger-4">
          <GlowingCard glowColor="emerald" intensity="medium">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(34, 197, 94, 0.15)',
              }}>
                <Zap size={20} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>J'agis</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>action.executed</span>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
              {lastAction ? `Derniere action : ${lastAction}` : 'Suggestions basees sur le contexte :'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {suggestedActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.primary ? 'primary' : 'secondary'}
                  size="sm"
                  icon={<action.icon size={14} />}
                  onClick={action.handler}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </GlowingCard>
        </div>
      </div>

      {/* ---- Timeline Section ---- */}
      <div
        ref={timelineRef}
        className="glass"
        style={{
          position: 'relative', zIndex: 1,
          borderRadius: 'var(--radius-xl)',
          padding: '20px', maxHeight: '400px', overflowY: 'auto',
        }}
      >
        <h3 style={{
          margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700,
          color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <Clock size={16} style={{ color: 'var(--color-accent)' }} />
          Fil d'evenements
          {displayEvents.length > 0 && (
            <Badge color="muted">{displayEvents.length}</Badge>
          )}
        </h3>

        {displayEvents.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 0',
            color: 'var(--text-tertiary)', fontSize: '14px',
          }}>
            <Sparkles size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>En attente d'evenements...</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Activez la vision ou le microphone pour commencer</p>
          </div>
        ) : (
          <div role="list" aria-label="Fil d'evenements" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {displayEvents.map((event, idx) => (
              <div
                key={event.id}
                role="listitem"
                className={`timeline-row${idx < 3 ? ' animate-fade-in' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 10px', borderRadius: 'var(--radius-md)',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                {/* Colored dot */}
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: eventColors[event.color] || '#6b7280',
                  boxShadow: `0 0 6px ${(eventColors[event.color] || '#6b7280')}40`,
                }} />

                {/* Time */}
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', minWidth: '70px' }}>
                  {formatTime(event.timestamp)}
                </span>

                {/* Type badge */}
                <span style={{
                  fontSize: '10px', fontWeight: 600, color: eventColors[event.color] || '#6b7280',
                  padding: '2px 6px', borderRadius: 'var(--radius-pill)',
                  backgroundColor: `${eventColors[event.color] || '#6b7280'}15`,
                  whiteSpace: 'nowrap',
                }}>
                  {event.type}
                </span>

                {/* Title */}
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>
                  {event.title}
                </span>

                {/* Description */}
                {event.description && (
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    {event.description}
                  </span>
                )}

                {/* Pin button (on hover) */}
                <button
                  onClick={() => pinItem(event.title + (event.description ? ` — ${event.description}` : ''), event.source)}
                  title="Epingler"
                  aria-label={`Epingler : ${event.title}`}
                  className="pin-btn"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-tertiary)', padding: '2px', flexShrink: 0,
                    opacity: 0, transition: 'opacity var(--transition-fast)',
                  }}
                >
                  <Pin size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Drawers ---- */}
      {memoryDrawerOpen && <MemoryDrawer />}
      {agentBoardOpen && <AgentBoard />}

      {/* ---- Styles ---- */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
          opacity: 0;
        }
        .stagger-1 { animation-delay: 0ms; }
        .stagger-2 { animation-delay: 80ms; }
        .stagger-3 { animation-delay: 160ms; }
        .stagger-4 { animation-delay: 240ms; }
        /* Timeline row hover highlight + pin reveal */
        .timeline-row:hover { background-color: rgba(255,255,255,0.03); }
        .timeline-row:hover > .pin-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
