/**
 * SenseProvider - Initializes and manages all 5 senses
 *
 * Extracts sense initialization logic from App.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { hearingSense } from '../features/hearing/api';
import { visionSense, processVideoFrame } from '../features/vision/api';
import { proprioceptionSense } from '../senses/proprioception';
import { touchSense } from '../senses/touch';
import { environmentSense } from '../senses/environment';
import { useAppStore } from '../store/appStore';
import type { Percept } from '../types';
import config from '../config';
import { useIsMobile } from '../hooks/useIsMobile';

interface SenseProviderProps {
  children: React.ReactNode;
}

export function SenseProvider({ children }: SenseProviderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [micStream, setMicStream] = useState<MediaStream>();
  const [audioCtx] = useState(() => new AudioContext());
  const isMobile = useIsMobile();

  // Disable heavy features by default on mobile unless explicitly enabled in config
  const [advancedVision] = useState(config.features.advancedVision && !isMobile);
  const [advancedHearing] = useState(config.features.advancedHearing);

  /* ---------- Sense Initialization ---------- */

  // Subscribe to all senses
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateStore = (percept: Percept<any>) => {
      useAppStore.setState((state) => ({
        percepts: [...(state.percepts || []), percept].slice(-100),
      }));
    };

    // Proprioception
    proprioceptionSense.setOnPerceptCallback(updateStore);
    proprioceptionSense.initialize();

    // Touch
    touchSense.setOnPerceptCallback(updateStore);
    touchSense.initialize();

    // Environment
    environmentSense.setOnPerceptCallback(updateStore);
    environmentSense.initialize();

    return () => {
      proprioceptionSense.terminate();
      touchSense.terminate();
      environmentSense.terminate();
    };
  }, []);

  // Get media streams
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 640, height: 360, facingMode: 'user' },
        audio: true,
      })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        setMicStream(stream);
      })
      .catch((error) => {
        console.error('[SenseProvider] Failed to get media devices:', error);
      });
  }, [advancedVision]);

  // Advanced Vision processing loop
  useEffect(() => {
    if (!advancedVision) return;

    visionSense.start();

    let rafId: number;
    const processLoop = () => {
      // Pause processing if document is hidden to save resources
      if (document.visibilityState === 'hidden') {
        rafId = requestAnimationFrame(processLoop);
        return;
      }

      if (videoRef.current && videoRef.current.readyState >= 2) {
        processVideoFrame(videoRef.current);
      }
      rafId = requestAnimationFrame(processLoop);
    };
    rafId = requestAnimationFrame(processLoop);

    return () => {
      visionSense.stop();
      cancelAnimationFrame(rafId);
    };
  }, [advancedVision]);

  // Advanced Hearing processing
  useEffect(() => {
    let audioWorkletNode: AudioWorkletNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    const startAudioProcessing = async () => {
      if (micStream && audioCtx) {
        try {
          const { getAudioProcessorUrl } = await import('../senses/runtime/hearing.factory');
          await audioCtx.audioWorklet.addModule(getAudioProcessorUrl());
          source = audioCtx.createMediaStreamSource(micStream);
          audioWorkletNode = new AudioWorkletNode(audioCtx, 'audio-processor');

          audioWorkletNode.port.onmessage = (event) => {
            // Pause processing if document is hidden
            if (document.visibilityState === 'hidden') return;

            const audioData = event.data as Float32Array;
            hearingSense.processAudio(audioData);
          };

          source.connect(audioWorkletNode);
        } catch (e) {
          console.error('[SenseProvider] Failed to initialize AudioWorklet for HearingSense:', e);
        }
      }
    };

    if (advancedHearing) {
      hearingSense.start();
      startAudioProcessing();
    } else {
      hearingSense.stop();
    }

    return () => {
      hearingSense.stop();
      source?.disconnect();
      audioWorkletNode?.disconnect();
    };
  }, [advancedHearing, audioCtx, micStream]);

  /* ---------- Render ---------- */

  return <>{children}</>;
}

/**
 * Hook to access video and audio refs from SenseProvider
 * (For components that need direct access to media streams)
 */
export function useSenseRefs() {
  // Note: This is a simplified version. In production, you'd want to use Context
  // to properly pass refs without prop drilling
  return {
    videoRef: useRef<HTMLVideoElement>(null),
    micStream: null,
    audioCtx: null,
  };
}
