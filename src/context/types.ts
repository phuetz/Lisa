/**
 * context/types.ts
 * Types et interfaces pour le système de gestion de contexte avancé
 */

import { AgentType } from '../agents/types';

/**
 * Types de contexte supportés
 */
export const ContextTypes = {
  CONVERSATION: 'conversation',  // Contexte de conversation
  USER_PREFERENCE: 'user_preference', // Préférences utilisateur
  ENTITY: 'entity',              // Entités mentionnées (lieux, personnes, etc.)
  INTENT_HISTORY: 'intent_history', // Historique des intentions
  QUERY_RESULT: 'query_result',  // Résultats de requête
  SYSTEM_STATE: 'system_state',  // État du système
  SESSION: 'session',            // Contexte de session
  TEMPORAL: 'temporal',          // Contexte temporel (heure, date, saison)
  LOCATION: 'location'           // Contexte de localisation
} as const;

export type ContextType = typeof ContextTypes[keyof typeof ContextTypes];

/**
 * Niveaux de priorité du contexte
 */
export const ContextPriority = {
  VERY_LOW: 1,   // Peu important, peut être ignoré facilement
  LOW: 2,        // Faible importance
  MEDIUM: 3,     // Importance moyenne
  HIGH: 4,       // Haute importance
  VERY_HIGH: 5   // Critique, ne doit jamais être ignoré
} as const;

export type ContextPriorityLevel = typeof ContextPriority[keyof typeof ContextPriority];

/**
 * Durée de vie du contexte
 */
export const ContextLifespan = {
  EPHEMERAL: 'ephemeral',       // Très court terme (1 échange)
  SHORT_TERM: 'short_term',     // Court terme (session actuelle)
  MEDIUM_TERM: 'medium_term',   // Moyen terme (quelques jours)
  LONG_TERM: 'long_term',       // Long terme (plusieurs semaines)
  PERMANENT: 'permanent'        // Permanent (stocké indéfiniment)
} as const;

export type ContextLifespanType = typeof ContextLifespan[keyof typeof ContextLifespan];

/**
 * Interface de base pour les éléments de contexte
 */
export interface ContextItem {
  id: string;                     // ID unique
  type: ContextType;              // Type de contexte
  value: any;                     // Valeur du contexte
  source: string | AgentType;     // Source du contexte (utilisateur ou agent)
  timestamp: number;              // Horodatage de création
  priority: ContextPriorityLevel; // Priorité
  lifespan: ContextLifespanType;  // Durée de vie
  expiresAt?: number;             // Date d'expiration (optionnel)
  tags: string[];                 // Tags pour la recherche et le filtrage
  confidence?: number;            // Niveau de confiance (0-1)
  metadata?: Record<string, any>; // Métadonnées additionnelles
}

/**
 * Élément de contexte de conversation
 */
export interface ConversationContextItem extends ContextItem {
  type: typeof ContextTypes.CONVERSATION;
  value: {
    text: string;           // Texte de la conversation
    role: 'user' | 'assistant'; // Rôle dans la conversation
    referencedItems?: string[]; // Références à d'autres éléments de contexte
    intent?: string;        // Intention détectée
    sentiment?: string;     // Sentiment détecté
    language?: string;      // Langue détectée
  };
}

/**
 * Élément de contexte de préférence utilisateur
 */
export interface UserPreferenceContextItem extends ContextItem {
  type: typeof ContextTypes.USER_PREFERENCE;
  value: {
    category: string;       // Catégorie de préférence (e.g., 'weather', 'music')
    preference: any;        // Valeur de la préférence
    strength: number;       // Force de la préférence (0-1)
  };
}

/**
 * Élément de contexte d'entité
 */
export interface EntityContextItem extends ContextItem {
  type: typeof ContextTypes.ENTITY;
  value: {
    entityType: string;     // Type d'entité (personne, lieu, etc.)
    name: string;           // Nom de l'entité
    attributes: Record<string, any>; // Attributs de l'entité
    references: string[];   // Références textuelles à l'entité
  };
}

/**
 * Élément de contexte d'historique d'intention
 */
export interface IntentHistoryContextItem extends ContextItem {
  type: typeof ContextTypes.INTENT_HISTORY;
  value: {
    intent: string;         // Intention détectée
    parameters: Record<string, any>; // Paramètres de l'intention
    fulfilled: boolean;     // Si l'intention a été satisfaite
    timestamp: number;      // Quand l'intention a été détectée
    followUpIntent?: string; // Intention de suivi attendue
  };
}

/**
 * Élément de contexte de résultat de requête
 */
export interface QueryResultContextItem extends ContextItem {
  type: typeof ContextTypes.QUERY_RESULT;
  value: {
    query: string;          // Requête originale
    results: any[];         // Résultats de la requête
    source: string;         // Source des résultats (e.g., 'weather-api')
    timestamp: number;      // Quand la requête a été effectuée
  };
}

/**
 * Élément de contexte d'état du système
 */
export interface SystemStateContextItem extends ContextItem {
  type: typeof ContextTypes.SYSTEM_STATE;
  value: {
    stateName: string;      // Nom de l'état
    stateValue: any;        // Valeur de l'état
    component: string;      // Composant concerné
  };
}

/**
 * Élément de contexte de session
 */
export interface SessionContextItem extends ContextItem {
  type: typeof ContextTypes.SESSION;
  value: {
    sessionId: string;      // ID de session
    startTime: number;      // Début de la session
    lastActiveTime: number; // Dernière activité
    activeAgents: AgentType[]; // Agents actifs dans la session
    sessionGoals?: string[]; // Objectifs de la session
  };
}

/**
 * Élément de contexte temporel
 */
export interface TemporalContextItem extends ContextItem {
  type: typeof ContextTypes.TEMPORAL;
  value: {
    timestamp: number;      // Horodatage
    timeOfDay?: string;     // Moment de la journée (matin, après-midi, etc.)
    dayOfWeek?: number;     // Jour de la semaine (0-6)
    season?: string;        // Saison
    isWorkday?: boolean;    // Si c'est un jour de travail
    isHoliday?: boolean;    // Si c'est un jour férié
    holidayName?: string;   // Nom du jour férié
  };
}

/**
 * Élément de contexte de localisation
 */
export interface LocationContextItem extends ContextItem {
  type: typeof ContextTypes.LOCATION;
  value: {
    type: 'current' | 'reference' | 'destination'; // Type de localisation
    name?: string;          // Nom du lieu
    address?: string;       // Adresse
    coordinates?: {         // Coordonnées géographiques
      latitude: number;
      longitude: number;
    };
    locationType?: string;  // Type de lieu (maison, bureau, restaurant)
  };
}

/**
 * Type union pour tous les types d'éléments de contexte
 */
export type SpecificContextItem = 
  | ConversationContextItem
  | UserPreferenceContextItem
  | EntityContextItem
  | IntentHistoryContextItem
  | QueryResultContextItem
  | SystemStateContextItem
  | SessionContextItem
  | TemporalContextItem
  | LocationContextItem;

/**
 * Options de requête pour la recherche de contexte
 */
export interface ContextQueryOptions {
  types?: ContextType[];           // Filtrer par types
  sources?: (string | AgentType)[]; // Filtrer par sources
  minPriority?: ContextPriorityLevel; // Priorité minimale
  tags?: string[];                 // Filtrer par tags
  fromTimestamp?: number;         // Filtrer par horodatage min
  toTimestamp?: number;           // Filtrer par horodatage max
  limit?: number;                  // Limiter le nombre de résultats
  sortBy?: 'timestamp' | 'priority'; // Trier par
  sortOrder?: 'asc' | 'desc';      // Ordre de tri
  includeExpired?: boolean;        // Inclure les contextes expirés
  searchText?: string;             // Rechercher dans le contenu
}

/**
 * Métrique d'importance du contexte
 */
export interface ContextRelevanceMetric {
  contextId: string;       // ID du contexte
  relevanceScore: number;  // Score de pertinence (0-1)
  reason: string;          // Raison de la pertinence
  expirationWeight: number; // Poids d'expiration (plus récent = plus important)
}

/**
 * Interface pour les stratégies de gestion du contexte
 */
export interface ContextStrategy {
  name: string;
  description: string;
  
  // Déterminer la pertinence d'un élément de contexte
  evaluateRelevance(item: ContextItem, currentInput: string): ContextRelevanceMetric;
  
  // Sélectionner les éléments de contexte les plus pertinents
  selectContextItems(items: ContextItem[], currentInput: string, maxItems: number): ContextItem[];
  
  // Fusionner des contextes similaires
  mergeContextItems(items: ContextItem[]): ContextItem[];
  
  // Nettoyer les contextes expirés ou non pertinents
  pruneContextItems(items: ContextItem[]): ContextItem[];
}
