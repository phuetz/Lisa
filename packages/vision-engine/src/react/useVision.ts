import { useEffect, useRef, useState } from 'react';
import { VisionService } from '../service';
import type { VisionPercept, VisionConfig } from '../types';

export function useVision(
  videoRef: React.RefObject<HTMLVideoElement>,
  config?: Partial<VisionConfig>,
  workerUrl?: string
) {
  const [percepts, setPercepts] = useState<VisionPercept[]>([]);
  const service = useRef<VisionService | null>(null);

  useEffect(() => {
    service.current = new VisionService(config);
    service.current.initialize(workerUrl);

    const unsubscribe = service.current.onPercept((p) => {
      setPercepts(prev => [...prev.slice(-20), p]);
    });

    let rafId: number;
    const loop = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        service.current?.processFrame(videoRef.current);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      unsubscribe();
      service.current?.terminate();
    };
  }, [videoRef, workerUrl]);

  return { percepts };
}
