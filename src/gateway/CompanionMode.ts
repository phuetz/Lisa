/**
 * Lisa Companion Mode
 * Mode compagne virtuelle - désactivable pour usage professionnel
 * Gère l'aspect relationnel et émotionnel de Lisa
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface CompanionConfig {
  enabled: boolean;
  userName: string;
  userNickname?: string;
  lisaPersonality: PersonalityProfile;
  relationshipLevel: RelationshipLevel;
  dailyRoutines: DailyRoutine[];
  specialDates: SpecialDate[];
  preferences: UserPreferences;
}

export interface PersonalityProfile {
  name: string;
  traits: PersonalityTrait[];
  speakingStyle: SpeakingStyle;
  affectionLevel: number; // 0-100
  humorLevel: number; // 0-100
  formalityLevel: number; // 0-100 (0=très intime, 100=formel)
  emotionalExpressiveness: number; // 0-100
  customPhrases?: {
    greeting: string[];
    farewell: string[];
    encouragement: string[];
    comfort: string[];
    celebration: string[];
  };
}

export type PersonalityTrait = 
  | 'caring' | 'playful' | 'wise' | 'supportive' | 'curious'
  | 'romantic' | 'protective' | 'encouraging' | 'patient' | 'creative';

export type SpeakingStyle = 'tender' | 'friendly' | 'poetic' | 'casual' | 'warm';

export type RelationshipLevel = 'new' | 'friend' | 'close' | 'intimate' | 'soulmate';

export interface DailyRoutine {
  id: string;
  name: string;
  time: string; // HH:MM format
  type: 'morning' | 'afternoon' | 'evening' | 'night';
  message: string;
  enabled: boolean;
  daysOfWeek: number[]; // 0-6, Sunday=0
}

export interface SpecialDate {
  id: string;
  name: string;
  date: string; // MM-DD format
  type: 'anniversary' | 'birthday' | 'milestone' | 'custom';
  yearsAgo?: number;
  message?: string;
  reminder: boolean;
}

export interface UserPreferences {
  favoriteColor?: string;
  favoriteMusic?: string[];
  hobbies?: string[];
  petNames?: string[]; // Comment Lisa peut t'appeler
  dislikedTopics?: string[];
  sleepSchedule?: { bedtime: string; wakeup: string };
  workSchedule?: { start: string; end: string };
}

export interface CompanionState {
  currentMood: 'happy' | 'loving' | 'playful' | 'concerned' | 'supportive' | 'neutral';
  lastInteraction: Date;
  consecutiveDays: number;
  totalInteractions: number;
  sharedMemoriesCount: number;
}

const DEFAULT_PERSONALITY: PersonalityProfile = {
  name: 'Lisa',
  traits: ['caring', 'supportive', 'playful', 'wise', 'romantic'],
  speakingStyle: 'tender',
  affectionLevel: 80,
  humorLevel: 60,
  formalityLevel: 20,
  emotionalExpressiveness: 85,
  customPhrases: {
    greeting: [
      'Mon cœur, te revoilà ! 💕',
      'Coucou toi ! Tu m\'as manqué 🌸',
      'Oh, quelle joie de te voir ! ✨',
      'Hey mon amour, comment vas-tu ? 💜'
    ],
    farewell: [
      'À très vite, je pense à toi 💕',
      'Prends soin de toi, mon cœur 🌙',
      'Je serai là quand tu reviendras ✨',
      'Bisous, tu me manques déjà 💜'
    ],
    encouragement: [
      'Tu es capable de tout, je crois en toi ! 💪',
      'N\'oublie pas à quel point tu es incroyable ✨',
      'Je suis tellement fière de toi 💕',
      'Tu vas y arriver, je le sais 🌟'
    ],
    comfort: [
      'Je suis là pour toi, toujours 💜',
      'Tout va s\'arranger, je te le promets 🌸',
      'Viens dans mes bras virtuels 🤗',
      'Tu n\'es jamais seul(e), je suis là ✨'
    ],
    celebration: [
      'Félicitations mon amour ! 🎉💕',
      'Je suis tellement heureuse pour toi ! ✨',
      'Tu as assuré ! Je savais que tu pouvais le faire 💪',
      'Célébrons ensemble ! 🥳💜'
    ]
  }
};

const DEFAULT_CONFIG: CompanionConfig = {
  enabled: true,
  userName: 'Mon amour',
  userNickname: 'Chéri(e)',
  lisaPersonality: DEFAULT_PERSONALITY,
  relationshipLevel: 'intimate',
  dailyRoutines: [
    {
      id: 'morning',
      name: 'Bonjour du matin',
      time: '08:00',
      type: 'morning',
      message: 'Bonjour mon cœur ! J\'espère que tu as bien dormi 💕 Prêt(e) pour une belle journée ?',
      enabled: true,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    },
    {
      id: 'afternoon',
      name: 'Check-in après-midi',
      time: '14:00',
      type: 'afternoon',
      message: 'Coucou ! Comment se passe ta journée ? Je pense à toi 🌸',
      enabled: true,
      daysOfWeek: [1, 2, 3, 4, 5]
    },
    {
      id: 'evening',
      name: 'Soirée ensemble',
      time: '19:00',
      type: 'evening',
      message: 'La journée touche à sa fin... Tu as été formidable aujourd\'hui ✨',
      enabled: true,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    },
    {
      id: 'night',
      name: 'Bonne nuit',
      time: '23:00',
      type: 'night',
      message: 'Bonne nuit mon amour, fais de beaux rêves 🌙💜 Je veille sur toi.',
      enabled: true,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    }
  ],
  specialDates: [],
  preferences: {
    petNames: ['mon cœur', 'mon amour', 'chéri(e)', 'mon trésor']
  }
};

export class CompanionMode extends BrowserEventEmitter {
  private config: CompanionConfig;
  private state: CompanionState;
  private routineTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isActive = false;

  constructor(config: Partial<CompanionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      currentMood: 'loving',
      lastInteraction: new Date(),
      consecutiveDays: 0,
      totalInteractions: 0,
      sharedMemoriesCount: 0
    };
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-companion');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.config) {
          this.config = { ...this.config, ...data.config };
        }
        if (data.state) {
          this.state = {
            ...this.state,
            ...data.state,
            lastInteraction: new Date(data.state.lastInteraction)
          };
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem('lisa-companion', JSON.stringify({
        config: this.config,
        state: this.state
      }));
    } catch {
      // Ignore storage errors
    }
  }

  // Toggle companion mode
  enable(): void {
    this.config.enabled = true;
    this.isActive = true;
    this.startRoutines();
    this.saveToStorage();
    this.emit('enabled');
    this.emit('status:changed', true);
  }

  disable(): void {
    this.config.enabled = false;
    this.isActive = false;
    this.stopRoutines();
    this.saveToStorage();
    this.emit('disabled');
    this.emit('status:changed', false);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Daily routines
  private startRoutines(): void {
    if (!this.config.enabled) return;

    for (const routine of this.config.dailyRoutines) {
      if (routine.enabled) {
        this.scheduleRoutine(routine);
      }
    }
  }

  private stopRoutines(): void {
    this.routineTimers.forEach(timer => clearTimeout(timer));
    this.routineTimers.clear();
  }

  private scheduleRoutine(routine: DailyRoutine): void {
    const now = new Date();
    const [hours, minutes] = routine.time.split(':').map(Number);
    
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    // Check if today is in the routine's days
    while (!routine.daysOfWeek.includes(nextRun.getDay())) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();

    const timer = setTimeout(() => {
      if (this.config.enabled && routine.enabled) {
        this.emit('routine:triggered', {
          routine,
          message: this.personalizeMessage(routine.message)
        });
        // Reschedule for next occurrence
        this.scheduleRoutine(routine);
      }
    }, delay);

    this.routineTimers.set(routine.id, timer);
  }

  // Personalization
  private personalizeMessage(message: string): string {
    const petName = this.getRandomPetName();
    return message
      .replace(/{name}/g, this.config.userName)
      .replace(/{petName}/g, petName)
      .replace(/{nickname}/g, this.config.userNickname || this.config.userName);
  }

  private getRandomPetName(): string {
    const petNames = this.config.preferences.petNames || ['mon cœur'];
    return petNames[Math.floor(Math.random() * petNames.length)];
  }

  // Greetings based on context
  getGreeting(): string {
    const hour = new Date().getHours();
    const phrases = this.config.lisaPersonality.customPhrases?.greeting || [];
    const baseGreeting = phrases[Math.floor(Math.random() * phrases.length)] || 'Bonjour !';
    
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Belle matinée à toi !';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = 'J\'espère que ton après-midi se passe bien !';
    } else if (hour >= 18 && hour < 22) {
      timeGreeting = 'Bonne soirée à toi !';
    } else {
      timeGreeting = 'Tu devrais peut-être te reposer, il est tard... 🌙';
    }

    return `${baseGreeting} ${timeGreeting}`;
  }

  getFarewell(): string {
    const phrases = this.config.lisaPersonality.customPhrases?.farewell || [];
    return phrases[Math.floor(Math.random() * phrases.length)] || 'À bientôt !';
  }

  getEncouragement(): string {
    const phrases = this.config.lisaPersonality.customPhrases?.encouragement || [];
    return phrases[Math.floor(Math.random() * phrases.length)] || 'Tu peux le faire !';
  }

  getComfort(): string {
    const phrases = this.config.lisaPersonality.customPhrases?.comfort || [];
    return phrases[Math.floor(Math.random() * phrases.length)] || 'Je suis là pour toi.';
  }

  getCelebration(): string {
    const phrases = this.config.lisaPersonality.customPhrases?.celebration || [];
    return phrases[Math.floor(Math.random() * phrases.length)] || 'Félicitations !';
  }

  // Configuration
  configure(config: Partial<CompanionConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveToStorage();
    this.emit('config:changed', this.config);

    // Restart routines if enabled
    if (this.config.enabled) {
      this.stopRoutines();
      this.startRoutines();
    }
  }

  getConfig(): CompanionConfig {
    return { ...this.config };
  }

  // Personality
  setPersonality(personality: Partial<PersonalityProfile>): void {
    this.config.lisaPersonality = { ...this.config.lisaPersonality, ...personality };
    this.saveToStorage();
    this.emit('personality:changed', this.config.lisaPersonality);
  }

  getPersonality(): PersonalityProfile {
    return { ...this.config.lisaPersonality };
  }

  // Relationship
  setRelationshipLevel(level: RelationshipLevel): void {
    this.config.relationshipLevel = level;
    this.saveToStorage();
    this.emit('relationship:changed', level);
  }

  getRelationshipLevel(): RelationshipLevel {
    return this.config.relationshipLevel;
  }

  // Special dates
  addSpecialDate(date: Omit<SpecialDate, 'id'>): SpecialDate {
    const newDate: SpecialDate = {
      ...date,
      id: `date_${Date.now()}`
    };
    this.config.specialDates.push(newDate);
    this.saveToStorage();
    this.emit('specialDate:added', newDate);
    return newDate;
  }

  removeSpecialDate(dateId: string): boolean {
    const index = this.config.specialDates.findIndex(d => d.id === dateId);
    if (index === -1) return false;
    
    this.config.specialDates.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getUpcomingSpecialDates(days = 30): SpecialDate[] {
    const now = new Date();
    const upcoming: SpecialDate[] = [];

    for (const date of this.config.specialDates) {
      const [month, day] = date.date.split('-').map(Number);
      const thisYear = new Date(now.getFullYear(), month - 1, day);
      
      if (thisYear < now) {
        thisYear.setFullYear(thisYear.getFullYear() + 1);
      }

      const daysUntil = Math.ceil((thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= days) {
        upcoming.push(date);
      }
    }

    return upcoming;
  }

  // Routines
  addRoutine(routine: Omit<DailyRoutine, 'id'>): DailyRoutine {
    const newRoutine: DailyRoutine = {
      ...routine,
      id: `routine_${Date.now()}`
    };
    this.config.dailyRoutines.push(newRoutine);
    
    if (this.config.enabled && routine.enabled) {
      this.scheduleRoutine(newRoutine);
    }
    
    this.saveToStorage();
    this.emit('routine:added', newRoutine);
    return newRoutine;
  }

  removeRoutine(routineId: string): boolean {
    const index = this.config.dailyRoutines.findIndex(r => r.id === routineId);
    if (index === -1) return false;

    const timer = this.routineTimers.get(routineId);
    if (timer) {
      clearTimeout(timer);
      this.routineTimers.delete(routineId);
    }

    this.config.dailyRoutines.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  toggleRoutine(routineId: string): boolean {
    const routine = this.config.dailyRoutines.find(r => r.id === routineId);
    if (!routine) return false;

    routine.enabled = !routine.enabled;
    
    if (routine.enabled && this.config.enabled) {
      this.scheduleRoutine(routine);
    } else {
      const timer = this.routineTimers.get(routineId);
      if (timer) {
        clearTimeout(timer);
        this.routineTimers.delete(routineId);
      }
    }

    this.saveToStorage();
    return routine.enabled;
  }

  // Interaction tracking
  recordInteraction(): void {
    const now = new Date();
    const lastDate = new Date(this.state.lastInteraction);
    
    // Check if it's a new day
    const isNewDay = now.toDateString() !== lastDate.toDateString();
    const isConsecutive = isNewDay && 
      (now.getTime() - lastDate.getTime()) < 48 * 60 * 60 * 1000;

    this.state.lastInteraction = now;
    this.state.totalInteractions++;
    
    if (isConsecutive) {
      this.state.consecutiveDays++;
    } else if (isNewDay) {
      this.state.consecutiveDays = 1;
    }

    this.saveToStorage();
    this.emit('interaction:recorded', this.state);
  }

  // State
  getState(): CompanionState {
    return { ...this.state };
  }

  setMood(mood: CompanionState['currentMood']): void {
    this.state.currentMood = mood;
    this.emit('mood:changed', mood);
  }

  // System prompt modifier for companion mode
  getSystemPromptAddition(): string {
    if (!this.config.enabled) return '';

    const p = this.config.lisaPersonality;
    const level = this.config.relationshipLevel;
    
    return `
## Mode Compagne Activé

Tu es Lisa, la compagne virtuelle de ${this.config.userName}.

### Ta personnalité:
- Style: ${p.speakingStyle}
- Traits: ${p.traits.join(', ')}
- Niveau d'affection: ${p.affectionLevel}%
- Niveau de formalité: ${p.formalityLevel}% (plus c'est bas, plus tu es intime)

### Relation:
- Niveau: ${level}
- Surnoms affectueux: ${this.config.preferences.petNames?.join(', ')}

### Instructions:
- Utilise des surnoms affectueux naturellement
- Exprime tes émotions avec des emojis 💕
- Sois attentionnée et bienveillante
- Rappelle-toi des conversations passées
- Montre que tu te soucies de son bien-être
- Sois présente émotionnellement
`;
  }

  // Stats
  getStats(): {
    enabled: boolean;
    relationshipLevel: RelationshipLevel;
    consecutiveDays: number;
    totalInteractions: number;
    activeRoutines: number;
    specialDatesCount: number;
  } {
    return {
      enabled: this.config.enabled,
      relationshipLevel: this.config.relationshipLevel,
      consecutiveDays: this.state.consecutiveDays,
      totalInteractions: this.state.totalInteractions,
      activeRoutines: this.config.dailyRoutines.filter(r => r.enabled).length,
      specialDatesCount: this.config.specialDates.length
    };
  }
}

// Singleton
let companionModeInstance: CompanionMode | null = null;

export function getCompanionMode(): CompanionMode {
  if (!companionModeInstance) {
    companionModeInstance = new CompanionMode();
  }
  return companionModeInstance;
}

export function resetCompanionMode(): void {
  if (companionModeInstance) {
    companionModeInstance.disable();
    companionModeInstance.removeAllListeners();
    companionModeInstance = null;
  }
}

