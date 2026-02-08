/**
 * SenseProvider - Initializes and manages all 5 senses
 *
 * Uses dynamic imports for heavy senses (vision, hearing, touch, environment)
 * to reduce the main bundle size. Only proprioception is loaded eagerly (lightweight).
 */

import { useEffect, useRef, useState } from 'react';
import { proprioceptionSense } from '../senses/proprioception';
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

    // Proprioception (lightweight, eagerly loaded)
    proprioceptionSense.setOnPerceptCallback(updateStore);
    proprioceptionSense.initialize();

    // Touch & Environment (dynamically loaded — pulls in mqtt package)
    let touchCleanup: (() => void) | undefined;
    let envCleanup: (() => void) | undefined;

    import('../senses/touch').then(({ touchSense }) => {
      touchSense.setOnPerceptCallback(updateStore);
      touchSense.initialize();
      touchCleanup = () => touchSense.terminate();
    }).catch(err => console.warn('[SenseProvider] Touch sense failed to load:', err));

    import('../senses/environment').then(({ environmentSense }) => {
      environmentSense.setOnPerceptCallback(updateStore);
      environmentSense.initialize();
      envCleanup = () => environmentSense.terminate();
    }).catch(err => console.warn('[SenseProvider] Environment sense failed to load:', err));

    return () => {
      proprioceptionSense.terminate();
      touchCleanup?.();
      envCleanup?.();
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

  // Advanced Vision processing loop (dynamically loaded)
  useEffect(() => {
    if (!advancedVision) return;

    let rafId: number;
    let stopped = false;

    import('../features/vision/api').then(({ visionSense, processVideoFrame }) => {
      if (stopped) return;
      visionSense.start();

      const processLoop = () => {
        if (stopped) return;
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
    });

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      import('../features/vision/api').then(({ visionSense }) => visionSense.stop());
    };
  }, [advancedVision]);

  // Advanced Hearing processing (dynamically loaded)
  useEffect(() => {
    let audioWorkletNode: AudioWorkletNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let stopped = false;

    const startAudioProcessing = async () => {
      if (micStream && audioCtx) {
        try {
          const [{ hearingSense }, { getAudioProcessorUrl }] = await Promise.all([
            import('../features/hearing/api'),
            import('../senses/runtime/hearing.factory'),
          ]);

          if (stopped) return;

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
      import('../features/hearing/api').then(({ hearingSense }) => {
        if (!stopped) hearingSense.start();
      });
      startAudioProcessing();
    }

    return () => {
      stopped = true;
      import('../features/hearing/api').then(({ hearingSense }) => hearingSense.stop());
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
