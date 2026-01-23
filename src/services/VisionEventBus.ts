/**
 * Vision Event Bus - Pipeline perception → événements → agent
 * 
 * Architecture:
 * MediaPipe → VisionEventBus → EventFilter → AgentContext → LLM
 * 
 * Ne jamais envoyer le flux brut au LLM.
 * Seulement des événements sémantiques filtrés.
 */

// ============================================================================
// Types d'événements
// ============================================================================

export type VisionEventType = 
  | 'FACE_DETECTED'
  | 'FACE_LOST'
  | 'HAND_GESTURE'
  | 'BODY_POSE'
  | 'OBJECT_DETECTED'
  | 'TEXT_DETECTED'
  | 'FALL_DETECTED'
  | 'MOTION_DETECTED'
  | 'PERSON_COUNT_CHANGED'
  | 'EMOTION_DETECTED';

export interface VisionEvent {
  id: string;
  type: VisionEventType;
  timestamp: string;
  confidence: number;
  value: unknown;
  source: 'camera' | 'image' | 'video';
  metadata?: Record<string, unknown>;
}

export interface FaceDetectedEvent extends VisionEvent {
  type: 'FACE_DETECTED';
  value: {
    faceId: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    landmarks?: Array<{ x: number; y: number; z: number }>;
    isKnown: boolean;
    personName?: string;
  };
}

export interface HandGestureEvent extends VisionEvent {
  type: 'HAND_GESTURE';
  value: {
    gesture: 'OPEN_PALM' | 'CLOSED_FIST' | 'POINTING' | 'THUMBS_UP' | 'THUMBS_DOWN' | 'PEACE' | 'OK' | 'WAVE' | 'UNKNOWN';
    hand: 'left' | 'right';
    landmarks?: Array<{ x: number; y: number; z: number }>;
  };
}

export interface BodyPoseEvent extends VisionEvent {
  type: 'BODY_POSE';
  value: {
    pose: 'STANDING' | 'SITTING' | 'LYING' | 'WALKING' | 'RUNNING' | 'UNKNOWN';
    landmarks?: Array<{ x: number; y: number; z: number; visibility: number }>;
  };
}

export interface ObjectDetectedEvent extends VisionEvent {
  type: 'OBJECT_DETECTED';
  value: {
    label: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    count?: number;
  };
}

export interface EmotionDetectedEvent extends VisionEvent {
  type: 'EMOTION_DETECTED';
  value: {
    emotion: 'HAPPY' | 'SAD' | 'ANGRY' | 'SURPRISED' | 'NEUTRAL' | 'FEARFUL' | 'DISGUSTED';
    intensity: number; // 0-1
  };
}

// ============================================================================
// Event Filter Configuration
// ============================================================================

export interface EventFilterConfig {
  throttleMs: number;           // Minimum interval entre événements du même type
  deduplicateWindow: number;    // Fenêtre de déduplication (ms)
  minConfidence: number;        // Confidence minimale (0-1)
  enabledEventTypes: VisionEventType[];
  maxEventsPerSecond: number;
}

const DEFAULT_FILTER_CONFIG: EventFilterConfig = {
  throttleMs: 200,              // 5 Hz max
  deduplicateWindow: 1000,      // 1 seconde
  minConfidence: 0.7,           // 70% minimum
  enabledEventTypes: [
    'FACE_DETECTED',
    'HAND_GESTURE',
    'BODY_POSE',
    'OBJECT_DETECTED',
    'EMOTION_DETECTED',
    'FALL_DETECTED'
  ],
  maxEventsPerSecond: 10
};

// ============================================================================
// Vision Event Bus
// ============================================================================

type EventListener = (event: VisionEvent) => void;
type FilteredEventListener = (events: VisionEvent[]) => void;

class VisionEventBus {
  private listeners: Map<VisionEventType | '*', Set<EventListener>> = new Map();
  private filteredListeners: Set<FilteredEventListener> = new Set();
  private filterConfig: EventFilterConfig;
  
  // État pour throttle et déduplication
  private lastEventByType: Map<VisionEventType, { event: VisionEvent; timestamp: number }> = new Map();
  private eventCountThisSecond: number = 0;
  private lastSecondReset: number = Date.now();
  
  // Buffer pour les événements filtrés (pour l'agent)
  private eventBuffer: VisionEvent[] = [];
  private bufferFlushInterval: ReturnType<typeof setInterval>;

  constructor(config?: Partial<EventFilterConfig>) {
    this.filterConfig = { ...DEFAULT_FILTER_CONFIG, ...config };
    
    // Flush le buffer toutes les 500ms pour l'agent
    this.bufferFlushInterval = setInterval(() => this.flushBuffer(), 500);
  }

  // ============================================================================
  // Event Emission
  // ============================================================================

  emit(event: Omit<VisionEvent, 'id' | 'timestamp'>): boolean {
    const now = Date.now();
    
    // Reset compteur par seconde
    if (now - this.lastSecondReset >= 1000) {
      this.eventCountThisSecond = 0;
      this.lastSecondReset = now;
    }

    // Rate limiting global
    if (this.eventCountThisSecond >= this.filterConfig.maxEventsPerSecond) {
      return false;
    }

    // Vérifier si le type d'événement est activé
    if (!this.filterConfig.enabledEventTypes.includes(event.type)) {
      return false;
    }

    // Vérifier confidence minimale
    if (event.confidence < this.filterConfig.minConfidence) {
      return false;
    }

    // Throttling par type
    const lastEvent = this.lastEventByType.get(event.type);
    if (lastEvent && now - lastEvent.timestamp < this.filterConfig.throttleMs) {
      return false;
    }

    // Déduplication
    if (lastEvent && now - lastEvent.timestamp < this.filterConfig.deduplicateWindow) {
      if (this.isDuplicate(lastEvent.event, event)) {
        return false;
      }
    }

    // Créer l'événement complet
    const fullEvent: VisionEvent = {
      ...event,
      id: `evt_${now}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // Mettre à jour l'état
    this.lastEventByType.set(event.type, { event: fullEvent, timestamp: now });
    this.eventCountThisSecond++;

    // Notifier les listeners directs
    this.notifyListeners(fullEvent);

    // Ajouter au buffer pour l'agent
    this.eventBuffer.push(fullEvent);

    return true;
  }

  private isDuplicate(prev: VisionEvent, curr: Omit<VisionEvent, 'id' | 'timestamp'>): boolean {
    // Comparaison simple basée sur le type et la valeur
    return JSON.stringify(prev.value) === JSON.stringify(curr.value);
  }

  private notifyListeners(event: VisionEvent): void {
    // Listeners pour ce type spécifique
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Vision event listener error:`, error);
        }
      });
    }

    // Listeners globaux
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Vision event listener error:`, error);
        }
      });
    }
  }

  private flushBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    this.filteredListeners.forEach(listener => {
      try {
        listener(events);
      } catch (error) {
        console.error(`Filtered event listener error:`, error);
      }
    });
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  on(type: VisionEventType | '*', listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  onFiltered(listener: FilteredEventListener): () => void {
    this.filteredListeners.add(listener);
    return () => {
      this.filteredListeners.delete(listener);
    };
  }

  off(type: VisionEventType | '*', listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  updateConfig(config: Partial<EventFilterConfig>): void {
    this.filterConfig = { ...this.filterConfig, ...config };
  }

  getConfig(): EventFilterConfig {
    return { ...this.filterConfig };
  }

  enableEventType(type: VisionEventType): void {
    if (!this.filterConfig.enabledEventTypes.includes(type)) {
      this.filterConfig.enabledEventTypes.push(type);
    }
  }

  disableEventType(type: VisionEventType): void {
    this.filterConfig.enabledEventTypes = this.filterConfig.enabledEventTypes.filter(t => t !== type);
  }

  // ============================================================================
  // Stats & Monitoring
  // ============================================================================

  getStats(): {
    eventsThisSecond: number;
    lastEventByType: Record<string, string>;
    bufferSize: number;
    listenersCount: number;
  } {
    const lastEventByType: Record<string, string> = {};
    this.lastEventByType.forEach((value, key) => {
      lastEventByType[key] = value.event.timestamp;
    });

    let listenersCount = 0;
    this.listeners.forEach(set => {
      listenersCount += set.size;
    });
    listenersCount += this.filteredListeners.size;

    return {
      eventsThisSecond: this.eventCountThisSecond,
      lastEventByType,
      bufferSize: this.eventBuffer.length,
      listenersCount
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  destroy(): void {
    clearInterval(this.bufferFlushInterval);
    this.listeners.clear();
    this.filteredListeners.clear();
    this.eventBuffer = [];
    this.lastEventByType.clear();
  }
}

// ============================================================================
// Helpers pour créer des événements
// ============================================================================

export function createFaceDetectedEvent(
  faceId: string,
  boundingBox: { x: number; y: number; width: number; height: number },
  confidence: number,
  options?: { isKnown?: boolean; personName?: string; landmarks?: Array<{ x: number; y: number; z: number }> }
): Omit<FaceDetectedEvent, 'id' | 'timestamp'> {
  return {
    type: 'FACE_DETECTED',
    confidence,
    source: 'camera',
    value: {
      faceId,
      boundingBox,
      isKnown: options?.isKnown ?? false,
      personName: options?.personName,
      landmarks: options?.landmarks
    }
  };
}

export function createHandGestureEvent(
  gesture: HandGestureEvent['value']['gesture'],
  hand: 'left' | 'right',
  confidence: number,
  landmarks?: Array<{ x: number; y: number; z: number }>
): Omit<HandGestureEvent, 'id' | 'timestamp'> {
  return {
    type: 'HAND_GESTURE',
    confidence,
    source: 'camera',
    value: { gesture, hand, landmarks }
  };
}

export function createBodyPoseEvent(
  pose: BodyPoseEvent['value']['pose'],
  confidence: number,
  landmarks?: Array<{ x: number; y: number; z: number; visibility: number }>
): Omit<BodyPoseEvent, 'id' | 'timestamp'> {
  return {
    type: 'BODY_POSE',
    confidence,
    source: 'camera',
    value: { pose, landmarks }
  };
}

export function createObjectDetectedEvent(
  label: string,
  boundingBox: { x: number; y: number; width: number; height: number },
  confidence: number,
  count?: number
): Omit<ObjectDetectedEvent, 'id' | 'timestamp'> {
  return {
    type: 'OBJECT_DETECTED',
    confidence,
    source: 'camera',
    value: { label, boundingBox, count }
  };
}

export function createEmotionDetectedEvent(
  emotion: EmotionDetectedEvent['value']['emotion'],
  intensity: number,
  confidence: number
): Omit<EmotionDetectedEvent, 'id' | 'timestamp'> {
  return {
    type: 'EMOTION_DETECTED',
    confidence,
    source: 'camera',
    value: { emotion, intensity }
  };
}

// ============================================================================
// Singleton Export
// ============================================================================

export const visionEventBus = new VisionEventBus();

export default VisionEventBus;
