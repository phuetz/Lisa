import { useEffect, useRef, useState } from 'react';
import { HearingService } from '../service';
import type { HearingPercept, HearingConfig } from '../types';

export function useHearing(
  config?: Partial<HearingConfig>,
  workerUrl?: string,
  processorUrl?: string
) {
  const [percepts, setPercepts] = useState<HearingPercept[]>([]);
  const service = useRef<HearingService | null>(null);

  useEffect(() => {
    service.current = new HearingService(config);
    service.current.initialize(workerUrl, processorUrl);

    const unsubscribe = service.current.onPercept((p) => {
      setPercepts(prev => [...prev.slice(-20), p]);
    });

    return () => {
      unsubscribe();
      service.current?.terminate();
    };
  }, [workerUrl, processorUrl]);

  const startListening = () => service.current?.startListening(processorUrl);
  const stopListening = () => service.current?.stopListening();

  return { percepts, startListening, stopListening };
}
