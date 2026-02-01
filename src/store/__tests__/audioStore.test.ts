import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore } from '../audioStore';

describe('audioStore', () => {
    beforeEach(() => {
        useAudioStore.setState({
            audio: undefined,
            audioEnabled: true,
            hearingPercepts: [],
        });
    });

    it('should have initial state', () => {
        const state = useAudioStore.getState();
        expect(state.audioEnabled).toBe(true);
        expect(state.hearingPercepts).toEqual([]);
    });

    it('should toggle audio enabled', () => {
        const { toggleAudioEnabled } = useAudioStore.getState();
        toggleAudioEnabled();
        expect(useAudioStore.getState().audioEnabled).toBe(false);
        toggleAudioEnabled();
        expect(useAudioStore.getState().audioEnabled).toBe(true);
    });

    it('should add hearing percepts', () => {
        const { addHearingPercept } = useAudioStore.getState();
        addHearingPercept({
            modality: 'hearing',
            payload: { text: 'hello' } as any,
            confidence: 0.9,
            ts: Date.now()
        });

        const state = useAudioStore.getState();
        expect(state.hearingPercepts).toHaveLength(1);
        expect((state.hearingPercepts[0].payload as any).text).toBe('hello');
    });
});
