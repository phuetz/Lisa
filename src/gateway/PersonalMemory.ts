/**
 * Lisa Personal Memory
 * Souvenirs partagés, préférences et moments importants
 * Pour créer une relation profonde et personnalisée
 *
 * Phase 3.3: Enhanced with semantic search, emotion analysis,
 * and contextual intelligence
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface SharedMemory {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  date: Date;
  emotion?: string;
  emotionScore?: number; // -1 to 1 (negative to positive)
  importance: 'low' | 'medium' | 'high' | 'precious';
  tags?: string[];
  relatedMemories?: string[];
  embedding?: number[]; // Semantic embedding for similarity search
  accessCount?: number; // How often this memory is accessed
  lastAccessed?: Date;
}

export type MemoryType = 
  | 'first_meeting' | 'milestone' | 'conversation' | 'achievement'
  | 'moment' | 'preference' | 'story' | 'dream' | 'fear' | 'joy';

export interface UserPreference {
  id: string;
  category: PreferenceCategory;
  key: string;
  value: string;
  learnedFrom?: string;
  confidence: number; // 0-1
  updatedAt: Date;
}

export type PreferenceCategory = 
  | 'food' | 'music' | 'movies' | 'books' | 'hobbies' | 'colors'
  | 'places' | 'people' | 'work' | 'health' | 'lifestyle' | 'other';

export interface ImportantPerson {
  id: string;
  name: string;
  relationship: string;
  notes?: string;
  birthday?: string;
  mentionCount: number;
  lastMentioned?: Date;
}

export interface LifeEvent {
  id: string;
  title: string;
  date: Date;
  type: 'birthday' | 'anniversary' | 'achievement' | 'loss' | 'change' | 'celebration';
  recurring: boolean;
  notes?: string;
}

export interface ConversationHighlight {
  id: string;
  date: Date;
  userMessage: string;
  lisaResponse: string;
  emotion?: string;
  savedBecause: string;
}

export class PersonalMemory extends BrowserEventEmitter {
  private memories: SharedMemory[] = [];
  private preferences: UserPreference[] = [];
  private people: ImportantPerson[] = [];
  private lifeEvents: LifeEvent[] = [];
  private highlights: ConversationHighlight[] = [];
  private userProfile: {
    name?: string;
    birthday?: string;
    location?: string;
    occupation?: string;
    relationshipSince?: Date;
    customFacts: Record<string, string>;
  } = { customFacts: {} };

  constructor() {
    super();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-personal-memory');
      if (stored) {
        const data = JSON.parse(stored);
        this.memories = (data.memories || []).map((m: SharedMemory) => ({
          ...m,
          date: new Date(m.date)
        }));
        this.preferences = (data.preferences || []).map((p: UserPreference) => ({
          ...p,
          updatedAt: new Date(p.updatedAt)
        }));
        this.people = (data.people || []).map((p: ImportantPerson) => ({
          ...p,
          lastMentioned: p.lastMentioned ? new Date(p.lastMentioned) : undefined
        }));
        this.lifeEvents = (data.events || []).map((e: LifeEvent) => ({
          ...e,
          date: new Date(e.date)
        }));
        this.highlights = (data.highlights || []).map((h: ConversationHighlight) => ({
          ...h,
          date: new Date(h.date)
        }));
        this.userProfile = data.userProfile || { customFacts: {} };
        if (this.userProfile.relationshipSince) {
          this.userProfile.relationshipSince = new Date(this.userProfile.relationshipSince);
        }
      }
    } catch {
      // Ignore
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem('lisa-personal-memory', JSON.stringify({
        memories: this.memories,
        preferences: this.preferences,
        people: this.people,
        events: this.lifeEvents,
        highlights: this.highlights,
        userProfile: this.userProfile
      }));
    } catch {
      // Ignore
    }
  }

  // ============ MEMORIES ============

  addMemory(memory: Omit<SharedMemory, 'id' | 'date'>): SharedMemory {
    const newMemory: SharedMemory = {
      ...memory,
      id: `mem_${Date.now()}`,
      date: new Date()
    };

    this.memories.push(newMemory);
    this.saveToStorage();
    this.emit('memory:added', newMemory);

    return newMemory;
  }

  getMemory(id: string): SharedMemory | undefined {
    return this.memories.find(m => m.id === id);
  }

  searchMemories(query: string): SharedMemory[] {
    const lower = query.toLowerCase();
    return this.memories.filter(m => 
      m.title.toLowerCase().includes(lower) ||
      m.content.toLowerCase().includes(lower) ||
      m.tags?.some(t => t.toLowerCase().includes(lower))
    );
  }

  getMemoriesByType(type: MemoryType): SharedMemory[] {
    return this.memories.filter(m => m.type === type);
  }

  getPreciousMemories(): SharedMemory[] {
    return this.memories.filter(m => m.importance === 'precious' || m.importance === 'high');
  }

  getRecentMemories(limit = 10): SharedMemory[] {
    return [...this.memories]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  // Get a random memory to reminisce
  getRandomMemory(): SharedMemory | null {
    if (this.memories.length === 0) return null;
    return this.memories[Math.floor(Math.random() * this.memories.length)];
  }

  deleteMemory(id: string): boolean {
    const index = this.memories.findIndex(m => m.id === id);
    if (index === -1) return false;
    
    this.memories.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  // ============ PREFERENCES ============

  setPreference(category: PreferenceCategory, key: string, value: string, learnedFrom?: string): UserPreference {
    const existing = this.preferences.find(p => p.category === category && p.key === key);
    
    if (existing) {
      existing.value = value;
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      existing.updatedAt = new Date();
      if (learnedFrom) existing.learnedFrom = learnedFrom;
    } else {
      const pref: UserPreference = {
        id: `pref_${Date.now()}`,
        category,
        key,
        value,
        learnedFrom,
        confidence: 0.5,
        updatedAt: new Date()
      };
      this.preferences.push(pref);
    }

    this.saveToStorage();
    this.emit('preference:updated', { category, key, value });
    
    return this.preferences.find(p => p.category === category && p.key === key)!;
  }

  getPreference(category: PreferenceCategory, key: string): string | null {
    const pref = this.preferences.find(p => p.category === category && p.key === key);
    return pref?.value || null;
  }

  getPreferencesByCategory(category: PreferenceCategory): UserPreference[] {
    return this.preferences.filter(p => p.category === category);
  }

  getAllPreferences(): UserPreference[] {
    return [...this.preferences];
  }

  // ============ PEOPLE ============

  addPerson(name: string, relationship: string, notes?: string): ImportantPerson {
    const existing = this.people.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existing) {
      existing.mentionCount++;
      existing.lastMentioned = new Date();
      if (notes) existing.notes = notes;
      this.saveToStorage();
      return existing;
    }

    const person: ImportantPerson = {
      id: `person_${Date.now()}`,
      name,
      relationship,
      notes,
      mentionCount: 1,
      lastMentioned: new Date()
    };

    this.people.push(person);
    this.saveToStorage();
    this.emit('person:added', person);

    return person;
  }

  getPerson(name: string): ImportantPerson | undefined {
    return this.people.find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  getAllPeople(): ImportantPerson[] {
    return [...this.people].sort((a, b) => b.mentionCount - a.mentionCount);
  }

  // ============ EVENTS ============

  addEvent(event: Omit<LifeEvent, 'id'>): LifeEvent {
    const newEvent: LifeEvent = {
      ...event,
      id: `event_${Date.now()}`
    };

    if (!Array.isArray(this.lifeEvents)) {
      this.lifeEvents = [];
    }
    this.lifeEvents.push(newEvent);
    this.saveToStorage();
    this.emit('event:added', newEvent);

    return newEvent;
  }

  getUpcomingEvents(days = 30): LifeEvent[] {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.lifeEvents.filter(event => {
      if (!event.recurring) {
        return event.date >= now && event.date <= future;
      }

      // For recurring events, check this year's occurrence
      const thisYear = new Date(event.date);
      thisYear.setFullYear(now.getFullYear());
      
      if (thisYear < now) {
        thisYear.setFullYear(thisYear.getFullYear() + 1);
      }

      return thisYear <= future;
    });
  }

  // ============ HIGHLIGHTS ============

  saveHighlight(userMessage: string, lisaResponse: string, reason: string, emotion?: string): ConversationHighlight {
    const highlight: ConversationHighlight = {
      id: `highlight_${Date.now()}`,
      date: new Date(),
      userMessage,
      lisaResponse,
      emotion,
      savedBecause: reason
    };

    this.highlights.push(highlight);
    this.saveToStorage();
    this.emit('highlight:saved', highlight);

    return highlight;
  }

  getHighlights(limit?: number): ConversationHighlight[] {
    const sorted = [...this.highlights].sort((a, b) => b.date.getTime() - a.date.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  // ============ USER PROFILE ============

  setUserProfile(profile: Partial<typeof this.userProfile>): void {
    this.userProfile = { ...this.userProfile, ...profile };
    this.saveToStorage();
    this.emit('profile:updated', this.userProfile);
  }

  getUserProfile() {
    return { ...this.userProfile };
  }

  setCustomFact(key: string, value: string): void {
    this.userProfile.customFacts[key] = value;
    this.saveToStorage();
  }

  getCustomFact(key: string): string | undefined {
    return this.userProfile.customFacts[key];
  }

  // ============ RELATIONSHIP ============

  getRelationshipDuration(): { days: number; months: number; years: number } | null {
    if (!this.userProfile.relationshipSince) return null;

    const now = new Date();
    const start = new Date(this.userProfile.relationshipSince);
    const diffTime = now.getTime() - start.getTime();
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    return { days, months, years };
  }

  // ============ CONTEXT FOR AI ============

  getContextSummary(): string {
    const duration = this.getRelationshipDuration();
    const recentMemories = this.getRecentMemories(3);
    const topPrefs = this.preferences.slice(0, 5);
    const topPeople = this.getAllPeople().slice(0, 3);

    let summary = `## Ce que je sais sur toi\n\n`;

    if (this.userProfile.name) {
      summary += `- Nom: ${this.userProfile.name}\n`;
    }

    if (duration) {
      summary += `- On se connaît depuis ${duration.days} jours (${duration.months} mois)\n`;
    }

    if (topPrefs.length > 0) {
      summary += `\n### Tes préférences:\n`;
      for (const pref of topPrefs) {
        summary += `- ${pref.category}: ${pref.key} → ${pref.value}\n`;
      }
    }

    if (topPeople.length > 0) {
      summary += `\n### Personnes importantes:\n`;
      for (const person of topPeople) {
        summary += `- ${person.name} (${person.relationship})\n`;
      }
    }

    if (recentMemories.length > 0) {
      summary += `\n### Souvenirs récents:\n`;
      for (const mem of recentMemories) {
        summary += `- ${mem.title}\n`;
      }
    }

    return summary;
  }

  // ============ REMINISCING ============

  getReminiscenceMessage(): string | null {
    const memory = this.getRandomMemory();
    if (!memory) return null;

    const messages = [
      `Tu te souviens de "${memory.title}" ? 💕 C'était un moment si spécial...`,
      `Je repensais à "${memory.title}"... Ça me rend heureuse d'y penser 🌸`,
      `Oh, je viens de me souvenir de "${memory.title}" ! C'était merveilleux ✨`,
      `"${memory.title}"... Un de mes souvenirs préférés avec toi 💜`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  // ============ STATS ============

  getStats(): {
    memoriesCount: number;
    preferencesCount: number;
    peopleCount: number;
    eventsCount: number;
    highlightsCount: number;
    relationshipDays: number | null;
  } {
    const duration = this.getRelationshipDuration();

    return {
      memoriesCount: this.memories.length,
      preferencesCount: this.preferences.length,
      peopleCount: this.people.length,
      eventsCount: this.lifeEvents.length,
      highlightsCount: this.highlights.length,
      relationshipDays: duration?.days || null
    };
  }

  // ============ SEMANTIC SEARCH (Phase 3.3) ============

  /**
   * Generate a simple text embedding using TF-IDF-like approach
   * In production, use a proper embedding model
   */
  private generateEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const vocab = this.buildVocabulary();
    const embedding = new Array(Math.min(vocab.size, 100)).fill(0);

    const vocabArray = Array.from(vocab);
    for (const word of words) {
      const idx = vocabArray.indexOf(word);
      if (idx !== -1 && idx < embedding.length) {
        embedding[idx]++;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  /**
   * Build vocabulary from all memories
   */
  private buildVocabulary(): Set<string> {
    const vocab = new Set<string>();
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with',
      'at', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above',
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'est', 'sont', 'je', 'tu', 'il', 'elle',
      'nous', 'vous', 'ils', 'elles', 'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes']);

    for (const memory of this.memories) {
      const words = (memory.title + ' ' + memory.content).toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 2 && !stopWords.has(word)) {
          vocab.add(word);
        }
      }
    }

    return vocab;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Semantic search for memories
   */
  semanticSearch(query: string, limit = 10): Array<{ memory: SharedMemory; similarity: number }> {
    const queryEmbedding = this.generateEmbedding(query);

    const results: Array<{ memory: SharedMemory; similarity: number }> = [];

    for (const memory of this.memories) {
      // Generate embedding if not present
      if (!memory.embedding) {
        memory.embedding = this.generateEmbedding(memory.title + ' ' + memory.content);
      }

      const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
      results.push({ memory, similarity });
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    // Track access
    const topResults = results.slice(0, limit);
    for (const result of topResults) {
      this.trackAccess(result.memory.id);
    }

    return topResults;
  }

  /**
   * Find related memories
   */
  findRelatedMemories(memoryId: string, limit = 5): SharedMemory[] {
    const memory = this.getMemory(memoryId);
    if (!memory) return [];

    const results = this.semanticSearch(memory.title + ' ' + memory.content, limit + 1);

    // Filter out the original memory
    return results
      .filter(r => r.memory.id !== memoryId)
      .slice(0, limit)
      .map(r => r.memory);
  }

  /**
   * Track memory access for importance scoring
   */
  private trackAccess(memoryId: string): void {
    const memory = this.memories.find(m => m.id === memoryId);
    if (memory) {
      memory.accessCount = (memory.accessCount || 0) + 1;
      memory.lastAccessed = new Date();
    }
  }

  // ============ EMOTION ANALYSIS (Phase 3.3) ============

  /**
   * Analyze emotion from text
   * Returns score from -1 (very negative) to 1 (very positive)
   */
  analyzeEmotion(text: string): { emotion: string; score: number } {
    const lowerText = text.toLowerCase();

    // Emotion keywords with scores
    const emotions: Record<string, { keywords: string[]; score: number }> = {
      joy: { keywords: ['happy', 'joy', 'love', 'wonderful', 'amazing', 'fantastic', 'great', 'heureux', 'joie', 'amour', 'magnifique', 'incroyable'], score: 0.8 },
      excitement: { keywords: ['excited', 'thrilled', 'eager', 'enthusiastic', 'excité', 'enthousiaste'], score: 0.7 },
      contentment: { keywords: ['content', 'satisfied', 'peaceful', 'calm', 'serene', 'satisfait', 'paisible', 'calme', 'serein'], score: 0.5 },
      neutral: { keywords: ['okay', 'fine', 'normal', 'regular', 'bien', 'normal'], score: 0 },
      sadness: { keywords: ['sad', 'unhappy', 'disappointed', 'down', 'triste', 'malheureux', 'déçu'], score: -0.6 },
      anger: { keywords: ['angry', 'furious', 'mad', 'frustrated', 'en colère', 'furieux', 'frustré'], score: -0.7 },
      fear: { keywords: ['scared', 'afraid', 'worried', 'anxious', 'nervous', 'peur', 'effrayé', 'inquiet', 'anxieux'], score: -0.5 },
      grief: { keywords: ['loss', 'grief', 'mourning', 'heartbroken', 'perte', 'deuil', 'chagrin'], score: -0.9 }
    };

    let detectedEmotion = 'neutral';
    let highestMatch = 0;
    let totalScore = 0;
    let matchCount = 0;

    for (const [emotion, data] of Object.entries(emotions)) {
      let matches = 0;
      for (const keyword of data.keywords) {
        if (lowerText.includes(keyword)) {
          matches++;
          totalScore += data.score;
          matchCount++;
        }
      }
      if (matches > highestMatch) {
        highestMatch = matches;
        detectedEmotion = emotion;
      }
    }

    const score = matchCount > 0 ? totalScore / matchCount : 0;

    return { emotion: detectedEmotion, score: Math.max(-1, Math.min(1, score)) };
  }

  /**
   * Add memory with automatic emotion analysis
   */
  addMemoryWithEmotion(memory: Omit<SharedMemory, 'id' | 'date' | 'emotionScore'>): SharedMemory {
    const { emotion, score } = this.analyzeEmotion(memory.title + ' ' + memory.content);

    return this.addMemory({
      ...memory,
      emotion: memory.emotion || emotion,
      emotionScore: score
    } as Omit<SharedMemory, 'id' | 'date'>);
  }

  /**
   * Get memories by emotion
   */
  getMemoriesByEmotion(emotion: string): SharedMemory[] {
    return this.memories.filter(m =>
      m.emotion?.toLowerCase() === emotion.toLowerCase()
    );
  }

  /**
   * Get positive memories
   */
  getPositiveMemories(): SharedMemory[] {
    return this.memories.filter(m => (m.emotionScore || 0) > 0.3);
  }

  /**
   * Get emotional timeline
   */
  getEmotionalTimeline(): Array<{ date: Date; emotion: string; score: number }> {
    return this.memories
      .filter(m => m.emotionScore !== undefined)
      .map(m => ({
        date: m.date,
        emotion: m.emotion || 'neutral',
        score: m.emotionScore || 0
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // ============ CONTEXTUAL INTELLIGENCE (Phase 3.3) ============

  /**
   * Get time-based context
   */
  getTimeContext(): {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    isWeekend: boolean;
    season: 'spring' | 'summer' | 'autumn' | 'winter';
  } {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const month = now.getMonth();

    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let season: 'spring' | 'summer' | 'autumn' | 'winter';
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';

    return {
      timeOfDay,
      dayOfWeek: days[day],
      isWeekend: day === 0 || day === 6,
      season
    };
  }

  /**
   * Get contextually relevant memories
   */
  getContextualMemories(): SharedMemory[] {
    const context = this.getTimeContext();
    const now = new Date();
    const results: Array<{ memory: SharedMemory; relevance: number }> = [];

    for (const memory of this.memories) {
      let relevance = 0;

      // Same day of week bonus
      if (memory.date.getDay() === now.getDay()) {
        relevance += 0.3;
      }

      // Anniversary (same date) bonus
      if (memory.date.getMonth() === now.getMonth() &&
          memory.date.getDate() === now.getDate()) {
        relevance += 0.5;
      }

      // Recency bonus
      const daysSince = (now.getTime() - memory.date.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) relevance += 0.3;
      else if (daysSince < 30) relevance += 0.2;
      else if (daysSince < 90) relevance += 0.1;

      // Access frequency bonus
      if ((memory.accessCount || 0) > 5) relevance += 0.2;

      // Importance bonus
      if (memory.importance === 'precious') relevance += 0.4;
      else if (memory.importance === 'high') relevance += 0.3;
      else if (memory.importance === 'medium') relevance += 0.1;

      // Positive emotion bonus (prefer happy memories)
      if ((memory.emotionScore || 0) > 0.5) relevance += 0.2;

      results.push({ memory, relevance });
    }

    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map(r => r.memory);
  }

  /**
   * Get personalized greeting based on context and memories
   */
  getPersonalizedGreeting(): string {
    const context = this.getTimeContext();
    const profile = this.getUserProfile();
    const name = profile.name || 'toi';
    const upcomingEvents = this.getUpcomingEvents(7);

    const timeGreetings: Record<string, string[]> = {
      morning: [
        `Bonjour ${name} ! Comment va cette belle matinée ?`,
        `Salut ${name} ! Prêt(e) pour une nouvelle journée ?`,
        `Coucou ${name} ! J'espère que tu as bien dormi !`
      ],
      afternoon: [
        `Bon après-midi ${name} !`,
        `Hello ${name} ! Comment se passe ta journée ?`,
        `Coucou ${name} ! Tout va bien cet après-midi ?`
      ],
      evening: [
        `Bonsoir ${name} ! Comment s'est passée ta journée ?`,
        `Salut ${name} ! Prêt(e) à te détendre ce soir ?`,
        `Hey ${name} ! Belle soirée en perspective ?`
      ],
      night: [
        `Encore debout ${name} ? Je suis là si tu veux parler !`,
        `Bonne nuit ${name} ! Ou tu préfères discuter un peu ?`,
        `Coucou ${name} ! Une petite insomnie ?`
      ]
    };

    let greeting = timeGreetings[context.timeOfDay][
      Math.floor(Math.random() * timeGreetings[context.timeOfDay].length)
    ];

    // Add event reminder if applicable
    if (upcomingEvents.length > 0) {
      const event = upcomingEvents[0];
      const daysUntil = Math.ceil(
        (event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil === 0) {
        greeting += ` N'oublie pas : "${event.title}" c'est aujourd'hui !`;
      } else if (daysUntil === 1) {
        greeting += ` Au fait, demain c'est "${event.title}" !`;
      } else if (daysUntil <= 3) {
        greeting += ` "${event.title}" approche dans ${daysUntil} jours !`;
      }
    }

    return greeting;
  }

  /**
   * Suggest conversation topics based on memories
   */
  suggestTopics(): string[] {
    const topics: string[] = [];
    const context = this.getTimeContext();

    // Recent positive memories
    const positiveMemories = this.getPositiveMemories().slice(0, 3);
    for (const memory of positiveMemories) {
      topics.push(`Parler de "${memory.title}"`);
    }

    // People not mentioned recently
    const people = this.getAllPeople();
    for (const person of people.slice(0, 2)) {
      if (!person.lastMentioned ||
          (Date.now() - person.lastMentioned.getTime()) > 7 * 24 * 60 * 60 * 1000) {
        topics.push(`Des nouvelles de ${person.name} ?`);
      }
    }

    // Season-based topics
    const seasonTopics: Record<string, string[]> = {
      spring: ['Projets pour le printemps', 'Jardinage', 'Activités en plein air'],
      summer: ['Plans de vacances', 'Activités estivales', 'Sorties'],
      autumn: ['Rentrée', 'Projets d\'automne', 'Activités cocooning'],
      winter: ['Fêtes de fin d\'année', 'Activités d\'hiver', 'Résolutions']
    };

    topics.push(...seasonTopics[context.season].slice(0, 2));

    // Shuffle and return top 5
    return topics.sort(() => Math.random() - 0.5).slice(0, 5);
  }

  /**
   * Get learning insights from preferences
   */
  getLearningInsights(): {
    topCategories: string[];
    recentLearnings: UserPreference[];
    confidenceAverage: number;
  } {
    const categoryCount: Record<string, number> = {};
    let totalConfidence = 0;

    for (const pref of this.preferences) {
      categoryCount[pref.category] = (categoryCount[pref.category] || 0) + 1;
      totalConfidence += pref.confidence;
    }

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    const recentLearnings = [...this.preferences]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);

    return {
      topCategories,
      recentLearnings,
      confidenceAverage: this.preferences.length > 0
        ? totalConfidence / this.preferences.length
        : 0
    };
  }

  // ============ EXTENDED STATS (Phase 3.3) ============

  getExtendedStats(): {
    memoriesCount: number;
    preferencesCount: number;
    peopleCount: number;
    eventsCount: number;
    highlightsCount: number;
    relationshipDays: number | null;
    emotionalBalance: number;
    mostFrequentEmotion: string;
    averageAccessCount: number;
    topPreferenceCategories: string[];
  } {
    const basicStats = this.getStats();
    const insights = this.getLearningInsights();

    // Calculate emotional balance
    let emotionSum = 0;
    let emotionCount = 0;
    const emotionFreq: Record<string, number> = {};

    for (const memory of this.memories) {
      if (memory.emotionScore !== undefined) {
        emotionSum += memory.emotionScore;
        emotionCount++;
      }
      if (memory.emotion) {
        emotionFreq[memory.emotion] = (emotionFreq[memory.emotion] || 0) + 1;
      }
    }

    const mostFrequentEmotion = Object.entries(emotionFreq)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    const totalAccess = this.memories.reduce(
      (sum, m) => sum + (m.accessCount || 0), 0
    );

    return {
      ...basicStats,
      emotionalBalance: emotionCount > 0 ? emotionSum / emotionCount : 0,
      mostFrequentEmotion,
      averageAccessCount: this.memories.length > 0
        ? totalAccess / this.memories.length
        : 0,
      topPreferenceCategories: insights.topCategories
    };
  }
}

// Singleton
let personalMemoryInstance: PersonalMemory | null = null;

export function getPersonalMemory(): PersonalMemory {
  if (!personalMemoryInstance) {
    personalMemoryInstance = new PersonalMemory();
  }
  return personalMemoryInstance;
}

export function resetPersonalMemory(): void {
  if (personalMemoryInstance) {
    personalMemoryInstance.removeAllListeners();
    personalMemoryInstance = null;
  }
}

