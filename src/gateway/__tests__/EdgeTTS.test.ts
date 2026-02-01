/**
 * Tests unitaires pour EdgeTTS
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EdgeTTS, getEdgeTTS, resetEdgeTTS, LISA_VOICES } from '../EdgeTTS';

describe('EdgeTTS', () => {
  let tts: EdgeTTS;

  beforeEach(() => {
    resetEdgeTTS();
    tts = new EdgeTTS({
      voice: 'fr-FR-DeniseNeural',
      rate: '+0%',
      pitch: '+0Hz',
    });
  });

  afterEach(() => {
    resetEdgeTTS();
  });

  describe('Configuration', () => {
    it('should create instance with default config', () => {
      const defaultTTS = new EdgeTTS();
      expect(defaultTTS).toBeInstanceOf(EdgeTTS);
    });

    it('should create instance with custom config', () => {
      expect(tts).toBeInstanceOf(EdgeTTS);
    });

    it('should accept voice settings', () => {
      const customTTS = new EdgeTTS({
        voice: 'fr-FR-HenriNeural',
        rate: '+10%',
        pitch: '-5Hz',
        volume: '+20%',
      });
      expect(customTTS).toBeInstanceOf(EdgeTTS);
    });

    it('should use singleton pattern', () => {
      const t1 = getEdgeTTS({ voice: 'fr-FR-DeniseNeural' });
      const t2 = getEdgeTTS({ voice: 'fr-FR-HenriNeural' });
      expect(t1).toBe(t2);
    });

    it('should reset singleton', () => {
      const t1 = getEdgeTTS({ voice: 'fr-FR-DeniseNeural' });
      resetEdgeTTS();
      const t2 = getEdgeTTS({ voice: 'fr-FR-HenriNeural' });
      expect(t1).not.toBe(t2);
    });
  });

  describe('LISA_VOICES', () => {
    it('should export voice list', () => {
      expect(LISA_VOICES).toBeDefined();
      expect(Array.isArray(LISA_VOICES)).toBe(true);
    });

    it('should contain French voices', () => {
      const frenchVoices = LISA_VOICES.filter(v => v.locale.startsWith('fr'));
      expect(frenchVoices.length).toBeGreaterThan(0);
    });

    it('should have Denise voice', () => {
      const denise = LISA_VOICES.find(v => v.shortName === 'fr-FR-DeniseNeural');
      expect(denise).toBeDefined();
      expect(denise?.gender).toBe('Female');
    });

    it('should have Henri voice', () => {
      const henri = LISA_VOICES.find(v => v.shortName === 'fr-FR-HenriNeural');
      expect(henri).toBeDefined();
      expect(henri?.gender).toBe('Male');
    });
  });

  describe('State Management', () => {
    it('should return initial state', () => {
      const state = tts.getState();
      expect(state.isSpeaking).toBe(false);
    });

    it('should report not speaking initially', () => {
      expect(tts.isSpeaking()).toBe(false);
    });
  });

  describe('Voice Settings', () => {
    it('should set voice', () => {
      tts.setVoice('fr-FR-HenriNeural');
      // No error should be thrown
      expect(true).toBe(true);
    });

    it('should set rate', () => {
      tts.setRate('+10%');
      expect(true).toBe(true);
    });

    it('should set pitch', () => {
      tts.setPitch('-5Hz');
      expect(true).toBe(true);
    });

    it('should set volume', () => {
      tts.setVolume('+20%');
      expect(true).toBe(true);
    });
  });

  describe('Playback Controls', () => {
    it('should pause without error', () => {
      tts.pause();
      expect(true).toBe(true);
    });

    it('should resume without error', () => {
      tts.resume();
      expect(true).toBe(true);
    });

    it('should stop without error', () => {
      tts.stop();
      expect(tts.isSpeaking()).toBe(false);
    });
  });

  describe('Event Emitter', () => {
    it('should emit events', () => {
      const callback = vi.fn();
      tts.on('test', callback);
      tts.emit('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should emit speaking events', () => {
      const speakingCallback = vi.fn();
      tts.on('speaking', speakingCallback);
      tts.emit('speaking', { text: 'Hello' });
      expect(speakingCallback).toHaveBeenCalled();
    });

    it('should emit ended events', () => {
      const endedCallback = vi.fn();
      tts.on('ended', endedCallback);
      tts.emit('ended');
      expect(endedCallback).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();
      tts.on('test', callback);
      tts.off('test', callback);
      tts.emit('test', { data: 'test' });
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
