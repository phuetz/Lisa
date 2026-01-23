/**
 * Artifact Panel Store
 * Gère l'état du panneau latéral d'artefact style Claude.ai
 */

import { create } from 'zustand';
import type { ArtifactData } from '../components/chat/Artifact';

interface ArtifactPanelState {
  isOpen: boolean;
  artifact: ArtifactData | null;
  view: 'preview' | 'code';
  
  // Actions
  openArtifact: (artifact: ArtifactData) => void;
  closePanel: () => void;
  setView: (view: 'preview' | 'code') => void;
  updateCode: (code: string) => void;
}

export const useArtifactPanelStore = create<ArtifactPanelState>((set) => ({
  isOpen: false,
  artifact: null,
  view: 'preview',
  
  openArtifact: (artifact) => set({ 
    isOpen: true, 
    artifact,
    view: 'preview' 
  }),
  
  closePanel: () => set({ 
    isOpen: false,
    artifact: null 
  }),
  
  setView: (view) => set({ view }),
  
  updateCode: (code) => set((state) => ({
    artifact: state.artifact ? { ...state.artifact, code } : null
  })),
}));

export default useArtifactPanelStore;
