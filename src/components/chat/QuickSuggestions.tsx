/**
 * QuickSuggestions - Contextual quick action buttons
 * Shows relevant suggestions based on conversation context
 */

import { useState, useMemo } from 'react';
import { 
  Cloud, Calculator, Languages, BookOpen, Image, 
  Bell, Globe, Sparkles, Code, FileText, 
  Calendar, Music, MapPin, Lightbulb
} from 'lucide-react';

interface Suggestion {
  id: string;
  label: string;
  prompt: string;
  icon: React.ReactNode;
  category: 'tools' | 'actions' | 'questions';
}

interface QuickSuggestionsProps {
  onSelect: (prompt: string) => void;
  lastMessage?: string;
  isVisible?: boolean;
}

// Default suggestions when no context
const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { id: 'weather', label: 'Météo', prompt: 'Quelle est la météo aujourd\'hui ?', icon: <Cloud size={16} />, category: 'tools' },
  { id: 'calc', label: 'Calculer', prompt: 'Calcule ', icon: <Calculator size={16} />, category: 'tools' },
  { id: 'translate', label: 'Traduire', prompt: 'Traduis en anglais: ', icon: <Languages size={16} />, category: 'tools' },
  { id: 'define', label: 'Définir', prompt: 'Définis le mot ', icon: <BookOpen size={16} />, category: 'tools' },
  { id: 'image', label: 'Image', prompt: 'Génère une image de ', icon: <Image size={16} />, category: 'tools' },
  { id: 'remind', label: 'Rappel', prompt: 'Rappelle-moi dans 30 minutes de ', icon: <Bell size={16} />, category: 'tools' },
];

// Context-aware suggestions based on keywords
const CONTEXTUAL_SUGGESTIONS: Record<string, Suggestion[]> = {
  code: [
    { id: 'explain-code', label: 'Explique ce code', prompt: 'Peux-tu m\'expliquer ce code en détail ?', icon: <Code size={16} />, category: 'questions' },
    { id: 'debug', label: 'Débugger', prompt: 'Peux-tu m\'aider à débugger ce code ?', icon: <Code size={16} />, category: 'actions' },
    { id: 'optimize', label: 'Optimiser', prompt: 'Comment optimiser ce code ?', icon: <Sparkles size={16} />, category: 'questions' },
  ],
  weather: [
    { id: 'week-forecast', label: 'Prévisions 7 jours', prompt: 'Donne-moi les prévisions météo pour les 7 prochains jours', icon: <Cloud size={16} />, category: 'tools' },
    { id: 'rain', label: 'Risque de pluie ?', prompt: 'Y a-t-il un risque de pluie aujourd\'hui ?', icon: <Cloud size={16} />, category: 'questions' },
  ],
  travel: [
    { id: 'directions', label: 'Itinéraire', prompt: 'Comment aller à ', icon: <MapPin size={16} />, category: 'tools' },
    { id: 'places', label: 'Lieux à visiter', prompt: 'Quels sont les meilleurs endroits à visiter ?', icon: <MapPin size={16} />, category: 'questions' },
  ],
  learning: [
    { id: 'explain', label: 'Explique simplement', prompt: 'Peux-tu expliquer cela plus simplement ?', icon: <Lightbulb size={16} />, category: 'questions' },
    { id: 'example', label: 'Donne un exemple', prompt: 'Peux-tu me donner un exemple concret ?', icon: <Lightbulb size={16} />, category: 'questions' },
    { id: 'summary', label: 'Résume', prompt: 'Peux-tu résumer les points clés ?', icon: <FileText size={16} />, category: 'actions' },
  ],
  planning: [
    { id: 'schedule', label: 'Planning', prompt: 'Aide-moi à planifier ', icon: <Calendar size={16} />, category: 'actions' },
    { id: 'remind-tomorrow', label: 'Rappel demain', prompt: 'Rappelle-moi demain matin de ', icon: <Bell size={16} />, category: 'tools' },
  ],
  creative: [
    { id: 'ideas', label: 'Plus d\'idées', prompt: 'Donne-moi d\'autres idées créatives', icon: <Sparkles size={16} />, category: 'questions' },
    { id: 'variations', label: 'Variations', prompt: 'Propose des variations de cette idée', icon: <Sparkles size={16} />, category: 'questions' },
  ],
  music: [
    { id: 'recommend', label: 'Recommandations', prompt: 'Recommande-moi de la musique similaire', icon: <Music size={16} />, category: 'questions' },
    { id: 'playlist', label: 'Créer playlist', prompt: 'Crée une playlist pour ', icon: <Music size={16} />, category: 'actions' },
  ],
  web: [
    { id: 'summarize-url', label: 'Résumer page', prompt: 'Résume cette page web: ', icon: <Globe size={16} />, category: 'tools' },
    { id: 'search', label: 'Rechercher', prompt: 'Recherche sur le web: ', icon: <Globe size={16} />, category: 'tools' },
  ],
};

// Detect context from message
function detectContext(message: string): string[] {
  const contexts: string[] = [];
  const lower = message.toLowerCase();

  const keywords: Record<string, string[]> = {
    code: ['code', 'fonction', 'variable', 'bug', 'erreur', 'programmer', 'javascript', 'python', 'typescript'],
    weather: ['météo', 'temps', 'pluie', 'soleil', 'température', 'forecast'],
    travel: ['voyage', 'visiter', 'aller', 'destination', 'itinéraire', 'tourisme'],
    learning: ['apprendre', 'comprendre', 'expliquer', 'cours', 'leçon', 'étudier'],
    planning: ['planifier', 'organiser', 'agenda', 'rendez-vous', 'planning', 'calendrier'],
    creative: ['idée', 'créatif', 'inspiration', 'design', 'art', 'création'],
    music: ['musique', 'chanson', 'artiste', 'album', 'playlist', 'écouter'],
    web: ['site', 'page', 'url', 'lien', 'article', 'web'],
  };

  for (const [context, words] of Object.entries(keywords)) {
    if (words.some(word => lower.includes(word))) {
      contexts.push(context);
    }
  }

  return contexts;
}

export const QuickSuggestions = ({ onSelect, lastMessage, isVisible = true }: QuickSuggestionsProps) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'tools' | 'actions' | 'questions'>('all');

  // Get contextual suggestions based on last message
  const suggestions = useMemo(() => {
    if (!lastMessage) return DEFAULT_SUGGESTIONS;

    const contexts = detectContext(lastMessage);
    if (contexts.length === 0) return DEFAULT_SUGGESTIONS;

    // Combine contextual suggestions
    const contextual: Suggestion[] = [];
    for (const ctx of contexts) {
      if (CONTEXTUAL_SUGGESTIONS[ctx]) {
        contextual.push(...CONTEXTUAL_SUGGESTIONS[ctx]);
      }
    }

    // Add some defaults if we have few contextual suggestions
    if (contextual.length < 4) {
      return [...contextual, ...DEFAULT_SUGGESTIONS.slice(0, 4 - contextual.length)];
    }

    return contextual.slice(0, 6);
  }, [lastMessage]);

  // Filter by category
  const filteredSuggestions = useMemo(() => {
    if (selectedCategory === 'all') return suggestions;
    return suggestions.filter(s => s.category === selectedCategory);
  }, [suggestions, selectedCategory]);

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Suggestions rapides"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px 0',
      }}
    >
      {/* Category filters */}
      <div
        role="tablist"
        aria-label="Catégories de suggestions"
        style={{
          display: 'flex',
          gap: '6px',
          paddingLeft: '4px',
          overflowX: 'auto',
        }}
      >
        {(['all', 'tools', 'actions', 'questions'] as const).map(cat => (
          <button
            key={cat}
            role="tab"
            aria-selected={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
            className="category-pill"
            style={{
              backgroundColor: selectedCategory === cat ? 'var(--color-brand)' : 'var(--bg-secondary)',
              color: selectedCategory === cat ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {cat === 'all' ? 'Tout' : cat === 'tools' ? 'Outils' : cat === 'actions' ? 'Actions' : 'Questions'}
          </button>
        ))}
      </div>

      {/* Suggestion chips */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '4px',
      }}>
        {filteredSuggestions.map(suggestion => (
          <button
            key={suggestion.id}
            onClick={() => onSelect(suggestion.prompt)}
            className="suggestion-chip"
            aria-label={`Suggestion : ${suggestion.label}`}
          >
            {suggestion.icon}
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickSuggestions;
