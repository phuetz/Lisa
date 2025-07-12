/**
 * Tests pour le composant ProactiveSuggestionsPanel
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProactiveSuggestionsPanel from '../ProactiveSuggestionsPanel';

// Mocks
vi.mock('../../hooks/useProactiveSuggestions', () => ({
  useProactiveSuggestions: vi.fn(() => ({
    suggestions: mockSuggestions,
    isLoading: false,
    error: null,
    generateSuggestions: vi.fn(),
    getSuggestions: vi.fn(),
    dismissSuggestion: vi.fn(),
    clearAllSuggestions: vi.fn(),
    executeSuggestion: vi.fn().mockResolvedValue({ success: true, intent: 'test_intent', parameters: { test: 'value' } }),
  }))
}));

vi.mock('../../hooks/useSilenceTriggers', () => ({
  useSilenceTriggers: vi.fn(() => ({
    isSilent: mockIsSilent,
    silenceDuration: 10000,
    isActive: true,
    silenceThreshold: 30000,
    startSilenceDetection: vi.fn(),
    stopSilenceDetection: vi.fn(),
    resetSilenceTimer: vi.fn()
  }))
}));

vi.mock('../../store/visionAudioStore', () => ({
  useVisionAudioStore: vi.fn(() => ({
    lastIntent: null,
    setLastIntent: vi.fn()
  }))
}));

// Variables mockées pour les tests
let mockSuggestions = [];
let mockIsSilent = false;

describe('ProactiveSuggestionsPanel', () => {
  beforeEach(() => {
    mockSuggestions = [];
    mockIsSilent = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('devrait afficher un message lorsqu\'il n\'y a pas de suggestions', () => {
    mockSuggestions = [];
    render(<ProactiveSuggestionsPanel />);
    
    expect(screen.getByText('Aucune suggestion disponible pour le moment.')).toBeInTheDocument();
  });

  it('devrait afficher les suggestions lorsqu\'elles sont disponibles', () => {
    mockSuggestions = [
      {
        id: '1',
        title: 'Suggestion Test',
        description: 'Description de la suggestion',
        intent: 'test_intent',
        parameters: {},
        contextSource: 'test',
        confidence: 0.8,
        timestamp: Date.now(),
        category: 'info',
        dismissed: false
      }
    ];
    
    render(<ProactiveSuggestionsPanel />);
    
    expect(screen.getByText('Suggestion Test')).toBeInTheDocument();
    expect(screen.getByText('Description de la suggestion')).toBeInTheDocument();
  });

  it('devrait afficher l\'indicateur de silence lorsque la période de silence est détectée', () => {
    mockSuggestions = [
      {
        id: '1',
        title: 'Suggestion Test',
        description: 'Description de la suggestion',
        intent: 'test_intent',
        parameters: {},
        contextSource: 'test',
        confidence: 0.8,
        timestamp: Date.now(),
        category: 'info',
        dismissed: false
      }
    ];
    mockIsSilent = true;
    
    render(<ProactiveSuggestionsPanel />);
    
    // L'emoji silencieux (🔇) devrait être affiché
    const heading = screen.getByText(/Suggestions/i);
    expect(heading.innerHTML).toContain('🔇');
  });

  it('devrait exécuter la suggestion lorsqu\'on clique dessus', async () => {
    const mockExecuteSuggestion = vi.fn().mockResolvedValue({
      success: true,
      intent: 'test_intent',
      parameters: { test: 'value' }
    });
    
    vi.mock('../../hooks/useProactiveSuggestions', () => ({
      useProactiveSuggestions: () => ({
        suggestions: [
          {
            id: '1',
            title: 'Suggestion Test',
            description: 'Description de la suggestion',
            intent: 'test_intent',
            parameters: { test: 'value' },
            contextSource: 'test',
            confidence: 0.8,
            timestamp: Date.now(),
            category: 'info',
            dismissed: false
          }
        ],
        isLoading: false,
        error: null,
        generateSuggestions: vi.fn(),
        getSuggestions: vi.fn(),
        dismissSuggestion: vi.fn(),
        clearAllSuggestions: vi.fn(),
        executeSuggestion: mockExecuteSuggestion
      })
    }));
    
    mockSuggestions = [
      {
        id: '1',
        title: 'Suggestion Test',
        description: 'Description de la suggestion',
        intent: 'test_intent',
        parameters: { test: 'value' },
        contextSource: 'test',
        confidence: 0.8,
        timestamp: Date.now(),
        category: 'info',
        dismissed: false
      }
    ];
    
    render(<ProactiveSuggestionsPanel />);
    
    // Trouver et cliquer sur la suggestion
    const suggestionContent = screen.getByText('Suggestion Test').closest('.suggestion-content');
    fireEvent.click(suggestionContent);
    
    // Vérifier que la fonction executeSuggestion a été appelée
    await waitFor(() => {
      expect(mockExecuteSuggestion).toHaveBeenCalledWith('1');
    });
  });

  it('devrait ignorer la suggestion lorsqu\'on clique sur le bouton de fermeture', () => {
    const mockDismissSuggestion = vi.fn();
    
    vi.mock('../../hooks/useProactiveSuggestions', () => ({
      useProactiveSuggestions: () => ({
        suggestions: [
          {
            id: '1',
            title: 'Suggestion Test',
            description: 'Description de la suggestion',
            intent: 'test_intent',
            parameters: {},
            contextSource: 'test',
            confidence: 0.8,
            timestamp: Date.now(),
            category: 'info',
            dismissed: false
          }
        ],
        isLoading: false,
        error: null,
        generateSuggestions: vi.fn(),
        getSuggestions: vi.fn(),
        dismissSuggestion: mockDismissSuggestion,
        clearAllSuggestions: vi.fn(),
        executeSuggestion: vi.fn()
      })
    }));
    
    mockSuggestions = [
      {
        id: '1',
        title: 'Suggestion Test',
        description: 'Description de la suggestion',
        intent: 'test_intent',
        parameters: {},
        contextSource: 'test',
        confidence: 0.8,
        timestamp: Date.now(),
        category: 'info',
        dismissed: false
      }
    ];
    
    render(<ProactiveSuggestionsPanel />);
    
    // Trouver et cliquer sur le bouton de fermeture
    const dismissButton = screen.getAllByTitle('Ignorer cette suggestion')[0];
    fireEvent.click(dismissButton);
    
    // Vérifier que la fonction dismissSuggestion a été appelée
    expect(mockDismissSuggestion).toHaveBeenCalledWith('1');
  });
});
