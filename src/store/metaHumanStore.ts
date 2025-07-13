import { create } from 'zustand';

interface MetaHumanState {
  blendShapeWeights: Record<string, number>;
  pose: string;
  currentAnimation: string;
  speechText: string;
  isSpeaking: boolean;
  
  setExpression: (expression: string, intensity?: number) => void;
  setPose: (pose: string) => void;
  setSpeech: (text: string, isSpeaking: boolean) => void;
  setBlendShapeWeight: (key: string, weight: number) => void;
}

export const useMetaHumanStore = create<MetaHumanState>((set) => ({
  blendShapeWeights: {},
  pose: 'default',
  currentAnimation: 'idle',
  speechText: '',
  isSpeaking: false,

  setExpression: (expression, intensity = 1) => {
    set((state) => {
      const newWeights = { ...state.blendShapeWeights };
      for (const key in newWeights) {
        newWeights[key] = 0;
      }
      if (expression !== 'neutral') {
        newWeights[expression] = intensity;
      }
      return { blendShapeWeights: newWeights };
    });
  },
  setPose: (pose) => set({ pose, currentAnimation: pose }),
  setSpeech: (text, isSpeaking) => {
    set({ speechText: text, isSpeaking });
    if (isSpeaking) {
      set({ currentAnimation: 'speaking' });
    } else {
      set((state) => ({ currentAnimation: state.pose !== 'default' ? state.pose : 'idle' }));
    }
  },
  setBlendShapeWeight: (key, weight) => {
    set((state) => ({
      blendShapeWeights: {
        ...state.blendShapeWeights,
        [key]: weight,
      },
    }));
  },
}));
