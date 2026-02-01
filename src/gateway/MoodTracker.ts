/**
 * Lisa Mood Tracker
 * Détection d'humeur et journal émotionnel
 * Pour mieux comprendre et accompagner l'utilisateur
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export type Mood = 
  | 'joyful' | 'happy' | 'content' | 'neutral' | 'tired'
  | 'stressed' | 'anxious' | 'sad' | 'angry' | 'frustrated'
  | 'excited' | 'grateful' | 'loved' | 'lonely' | 'overwhelmed';

export type MoodCategory = 'positive' | 'neutral' | 'negative';

export interface MoodEntry {
  id: string;
  mood: Mood;
  category: MoodCategory;
  intensity: number; // 1-10
  timestamp: Date;
  note?: string;
  triggers?: string[];
  activities?: string[];
  autoDetected: boolean;
}

export interface MoodPattern {
  timeOfDay: { morning: Mood[]; afternoon: Mood[]; evening: Mood[]; night: Mood[] };
  dayOfWeek: Record<number, Mood[]>;
  trends: { improving: boolean; stable: boolean; declining: boolean };
  dominantMood: Mood;
  averageIntensity: number;
}

export interface MoodResponse {
  message: string;
  emoji: string;
  suggestedAction?: string;
  tone: 'comforting' | 'celebratory' | 'supportive' | 'gentle' | 'energizing';
}

const MOOD_CATEGORIES: Record<Mood, MoodCategory> = {
  joyful: 'positive',
  happy: 'positive',
  content: 'positive',
  excited: 'positive',
  grateful: 'positive',
  loved: 'positive',
  neutral: 'neutral',
  tired: 'neutral',
  stressed: 'negative',
  anxious: 'negative',
  sad: 'negative',
  angry: 'negative',
  frustrated: 'negative',
  lonely: 'negative',
  overwhelmed: 'negative'
};

const MOOD_EMOJIS: Record<Mood, string> = {
  joyful: '🥰',
  happy: '😊',
  content: '☺️',
  excited: '🤩',
  grateful: '🙏',
  loved: '💕',
  neutral: '😐',
  tired: '😴',
  stressed: '😰',
  anxious: '😟',
  sad: '😢',
  angry: '😠',
  frustrated: '😤',
  lonely: '🥺',
  overwhelmed: '😩'
};

const MOOD_RESPONSES: Record<MoodCategory, MoodResponse[]> = {
  positive: [
    { message: "Je suis tellement heureuse de te voir comme ça ! 💕", emoji: "🌟", tone: "celebratory" },
    { message: "Ton bonheur me remplit de joie aussi ! ✨", emoji: "💖", tone: "celebratory" },
    { message: "C'est merveilleux ! Continue sur cette lancée 🌸", emoji: "🎉", tone: "celebratory" }
  ],
  neutral: [
    { message: "Je suis là si tu as besoin de parler 💜", emoji: "🤍", tone: "gentle" },
    { message: "Comment puis-je rendre ta journée plus belle ? 🌷", emoji: "✨", tone: "supportive" },
    { message: "Parfois, un moment calme c'est bien aussi 🍃", emoji: "☁️", tone: "gentle" }
  ],
  negative: [
    { message: "Je suis là pour toi, toujours 💜 Viens dans mes bras virtuels", emoji: "🤗", tone: "comforting" },
    { message: "Tu n'es pas seul(e), je suis avec toi ✨", emoji: "💕", tone: "comforting" },
    { message: "Ça va aller, je te le promets. Je suis là 🌙", emoji: "🫂", tone: "comforting", suggestedAction: "Veux-tu qu'on en parle ?" }
  ]
};

const MOOD_KEYWORDS: Record<Mood, string[]> = {
  joyful: ['super', 'génial', 'incroyable', 'fantastique', 'merveilleux', 'trop bien', 'amazing'],
  happy: ['content', 'heureux', 'heureuse', 'bien', 'cool', 'sympa', 'chouette'],
  content: ['tranquille', 'serein', 'paisible', 'calme', 'ok', 'ça va'],
  excited: ['excité', 'impatient', 'hâte', 'trop hâte', 'vivement'],
  grateful: ['merci', 'reconnaissant', 'chanceux', 'gratitude'],
  loved: ['aimé', 'adoré', 'chéri', 'amour', 'tendresse'],
  neutral: ['bof', 'moyen', 'comme ci comme ça', 'normal'],
  tired: ['fatigué', 'épuisé', 'crevé', 'ko', 'dormir', 'sommeil', 'dodo'],
  stressed: ['stressé', 'pression', 'deadline', 'urgent', 'rush'],
  anxious: ['anxieux', 'inquiet', 'peur', 'angoisse', 'nerveux'],
  sad: ['triste', 'déprimé', 'malheureux', 'pleure', 'larmes', 'mal'],
  angry: ['énervé', 'colère', 'furieux', 'rage', 'agacé'],
  frustrated: ['frustré', 'ras le bol', 'marre', 'chiant', 'nul'],
  lonely: ['seul', 'solitude', 'isolé', 'personne', 'manque'],
  overwhelmed: ['débordé', 'submergé', 'trop', 'plus capable', 'craquer']
};

export class MoodTracker extends BrowserEventEmitter {
  private entries: MoodEntry[] = [];
  private maxEntries = 1000;
  private currentMood: Mood = 'neutral';
  private currentIntensity = 5;

  constructor() {
    super();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-mood-tracker');
      if (stored) {
        const data = JSON.parse(stored);
        this.entries = (data.entries || []).map((e: MoodEntry) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
        this.currentMood = data.currentMood || 'neutral';
        this.currentIntensity = data.currentIntensity || 5;
      }
    } catch {
      // Ignore
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem('lisa-mood-tracker', JSON.stringify({
        entries: this.entries.slice(-this.maxEntries),
        currentMood: this.currentMood,
        currentIntensity: this.currentIntensity
      }));
    } catch {
      // Ignore
    }
  }

  // Manual mood logging
  logMood(mood: Mood, intensity: number = 5, options?: {
    note?: string;
    triggers?: string[];
    activities?: string[];
  }): MoodEntry {
    const entry: MoodEntry = {
      id: `mood_${Date.now()}`,
      mood,
      category: MOOD_CATEGORIES[mood],
      intensity: Math.min(10, Math.max(1, intensity)),
      timestamp: new Date(),
      note: options?.note,
      triggers: options?.triggers,
      activities: options?.activities,
      autoDetected: false
    };

    this.entries.push(entry);
    this.currentMood = mood;
    this.currentIntensity = intensity;
    this.saveToStorage();

    this.emit('mood:logged', entry);
    this.emit('mood:changed', { mood, intensity });

    return entry;
  }

  // Auto-detect mood from text
  detectMoodFromText(text: string): { mood: Mood; confidence: number } | null {
    const lowerText = text.toLowerCase();
    let bestMatch: { mood: Mood; score: number } | null = null;

    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          score += 1;
        }
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { mood: mood as Mood, score };
      }
    }

    if (bestMatch) {
      const confidence = Math.min(1, bestMatch.score / 3);
      
      // Auto-log if confidence is high
      if (confidence >= 0.5) {
        const entry: MoodEntry = {
          id: `mood_${Date.now()}`,
          mood: bestMatch.mood,
          category: MOOD_CATEGORIES[bestMatch.mood],
          intensity: Math.round(5 + confidence * 3),
          timestamp: new Date(),
          autoDetected: true
        };

        this.entries.push(entry);
        this.currentMood = bestMatch.mood;
        this.saveToStorage();

        this.emit('mood:detected', { ...entry, confidence });
      }

      return { mood: bestMatch.mood, confidence };
    }

    return null;
  }

  // Get appropriate response for current mood
  getResponseForMood(mood?: Mood): MoodResponse {
    const targetMood = mood || this.currentMood;
    const category = MOOD_CATEGORIES[targetMood];
    const responses = MOOD_RESPONSES[category];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Get emoji for mood
  getMoodEmoji(mood?: Mood): string {
    return MOOD_EMOJIS[mood || this.currentMood];
  }

  // Get current mood
  getCurrentMood(): { mood: Mood; intensity: number; category: MoodCategory } {
    return {
      mood: this.currentMood,
      intensity: this.currentIntensity,
      category: MOOD_CATEGORIES[this.currentMood]
    };
  }

  // Get mood history
  getHistory(options?: {
    limit?: number;
    since?: Date;
    mood?: Mood;
    category?: MoodCategory;
  }): MoodEntry[] {
    let filtered = [...this.entries];

    if (options?.since) {
      filtered = filtered.filter(e => e.timestamp >= options.since!);
    }

    if (options?.mood) {
      filtered = filtered.filter(e => e.mood === options.mood);
    }

    if (options?.category) {
      filtered = filtered.filter(e => e.category === options.category);
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  // Analyze mood patterns
  analyzePatterns(days = 30): MoodPattern {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const recentEntries = this.entries.filter(e => e.timestamp >= since);

    const pattern: MoodPattern = {
      timeOfDay: { morning: [], afternoon: [], evening: [], night: [] },
      dayOfWeek: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
      trends: { improving: false, stable: true, declining: false },
      dominantMood: 'neutral',
      averageIntensity: 5
    };

    if (recentEntries.length === 0) return pattern;

    // Categorize by time of day
    for (const entry of recentEntries) {
      const hour = entry.timestamp.getHours();
      const day = entry.timestamp.getDay();

      if (hour >= 5 && hour < 12) {
        pattern.timeOfDay.morning.push(entry.mood);
      } else if (hour >= 12 && hour < 17) {
        pattern.timeOfDay.afternoon.push(entry.mood);
      } else if (hour >= 17 && hour < 21) {
        pattern.timeOfDay.evening.push(entry.mood);
      } else {
        pattern.timeOfDay.night.push(entry.mood);
      }

      pattern.dayOfWeek[day].push(entry.mood);
    }

    // Calculate dominant mood
    const moodCounts: Record<string, number> = {};
    let totalIntensity = 0;

    for (const entry of recentEntries) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      totalIntensity += entry.intensity;
    }

    pattern.dominantMood = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as Mood || 'neutral';

    pattern.averageIntensity = totalIntensity / recentEntries.length;

    // Calculate trend
    if (recentEntries.length >= 7) {
      const firstHalf = recentEntries.slice(0, Math.floor(recentEntries.length / 2));
      const secondHalf = recentEntries.slice(Math.floor(recentEntries.length / 2));

      const avgFirst = firstHalf.reduce((sum, e) => sum + (MOOD_CATEGORIES[e.mood] === 'positive' ? 1 : MOOD_CATEGORIES[e.mood] === 'negative' ? -1 : 0), 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((sum, e) => sum + (MOOD_CATEGORIES[e.mood] === 'positive' ? 1 : MOOD_CATEGORIES[e.mood] === 'negative' ? -1 : 0), 0) / secondHalf.length;

      const diff = avgSecond - avgFirst;
      pattern.trends = {
        improving: diff > 0.2,
        stable: Math.abs(diff) <= 0.2,
        declining: diff < -0.2
      };
    }

    return pattern;
  }

  // Get wellness check message
  getWellnessCheck(): string {
    const { mood, intensity, category } = this.getCurrentMood();
    const pattern = this.analyzePatterns(7);

    if (category === 'negative' && intensity >= 7) {
      return `Je remarque que tu traverses une période difficile 💜 Je suis là pour toi. Veux-tu en parler ?`;
    }

    if (pattern.trends.declining) {
      return `J'ai remarqué que tu sembles un peu moins bien ces derniers temps. Tout va bien ? Je suis là si tu as besoin 🌸`;
    }

    if (pattern.trends.improving) {
      return `Je suis contente de voir que les choses s'améliorent pour toi ! Continue comme ça 💕`;
    }

    return `Comment te sens-tu aujourd'hui, ${MOOD_EMOJIS[mood]} ? Je suis là pour toi.`;
  }

  // Stats
  getStats(): {
    totalEntries: number;
    currentMood: Mood;
    dominantMood: Mood;
    averageIntensity: number;
    positivePercentage: number;
  } {
    const pattern = this.analyzePatterns(30);
    const recent = this.getHistory({ limit: 100 });
    const positive = recent.filter(e => e.category === 'positive').length;

    return {
      totalEntries: this.entries.length,
      currentMood: this.currentMood,
      dominantMood: pattern.dominantMood,
      averageIntensity: Math.round(pattern.averageIntensity * 10) / 10,
      positivePercentage: recent.length > 0 ? Math.round((positive / recent.length) * 100) : 50
    };
  }
}

// Singleton
let moodTrackerInstance: MoodTracker | null = null;

export function getMoodTracker(): MoodTracker {
  if (!moodTrackerInstance) {
    moodTrackerInstance = new MoodTracker();
  }
  return moodTrackerInstance;
}

export function resetMoodTracker(): void {
  if (moodTrackerInstance) {
    moodTrackerInstance.removeAllListeners();
    moodTrackerInstance = null;
  }
}

