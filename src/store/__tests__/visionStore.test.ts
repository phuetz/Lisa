import { describe, it, expect, beforeEach } from 'vitest';
import { useVisionStore } from '../visionStore';

describe('visionStore', () => {
    beforeEach(() => {
        useVisionStore.setState({
            percepts: [],
            lastSilenceMs: 0,
            smileDetected: false,
            speechDetected: false,
        });
    });

    it('should have initial state', () => {
        const state = useVisionStore.getState();
        expect(state.percepts).toEqual([]);
        expect(state.smileDetected).toBe(false);
    });

    it('should update smileDetected flag', () => {
        const { setSmileDetected } = useVisionStore.getState();
        setSmileDetected(true);
        expect(useVisionStore.getState().smileDetected).toBe(true);
    });

    it('should add percepts and maintain limit', () => {
        const { addPercept } = useVisionStore.getState();

        // Add 100 dummy percepts
        for (let i = 0; i < 110; i++) {
            addPercept({
                modality: 'vision',
                payload: { type: 'test', id: i } as any,
                confidence: 1,
                ts: Date.now()
            });
        }

        const state = useVisionStore.getState();
        expect(state.percepts.length).toBeLessThanOrEqual(100);
        expect((state.percepts[state.percepts.length - 1].payload as any).id).toBe(109);
    });
});
