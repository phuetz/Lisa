// src/hooks/useSenses.ts
/**
 * HOOK UNIFIÉ POUR LES 5 SENS DE LISA
 * 
 * Fournit un accès React aux 5 modalités sensorielles:
 * - Vision: perception visuelle
 * - Hearing: perception auditive
 * - Touch: perception tactile
 * - Environment: perception environnementale
 * - Proprioception: conscience de soi
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SenseModality,
  Percept,
  AnyPercept,
  TouchPayload,
  EnvironmentPayload,
  ProprioceptionPayload,
} from '../types';
import type { HearingPerceptPayload } from '../features/hearing/api';
import type { VisionPayload } from '../features/vision/api';

// Lazy imports for code splitting
const importVision = () => import('../features/vision/api');
const importHearing = () => import('../features/hearing/api');
const importTouch = () => import('../senses/touch');
const importEnvironment = () => import('../senses/environment');
const importProprioception = () => import('../senses/proprioception');

export interface SensesState {
  vision: Percept<VisionPayload>[];
  hearing: Percept<HearingPerceptPayload>[];
  touch: Percept<TouchPayload>[];
  environment: Percept<EnvironmentPayload>[];
  proprioception: Percept<ProprioceptionPayload>[];
}

export interface SensesStatus {
  vision: boolean;
  hearing: boolean;
  touch: boolean;
  environment: boolean;
  proprioception: boolean;
}

export interface UseSensesOptions {
  enableVision?: boolean;
  enableHearing?: boolean;
  enableTouch?: boolean;
  enableEnvironment?: boolean;
  enableProprioception?: boolean;
  maxPerceptsPerSense?: number;
  onPercept?: (percept: AnyPercept) => void;
}

export interface UseSensesReturn {
  percepts: SensesState;
  status: SensesStatus;
  latestPercepts: Record<SenseModality, AnyPercept | null>;
  isReady: boolean;
  enableSense: (modality: SenseModality) => Promise<void>;
  disableSense: (modality: SenseModality) => void;
  clearPercepts: (modality?: SenseModality) => void;
  // Touch-specific
  triggerHaptic: (pattern?: 'vibrate' | 'pulse' | 'impact' | 'selection', intensity?: number) => void;
  // Environment-specific
  refreshWeather: () => Promise<void>;
  refreshAirQuality: () => Promise<void>;
  getLocation: () => { latitude: number; longitude: number } | null;
  // Proprioception-specific
  recordError: () => void;
  startTask: (agentId?: string) => void;
  endTask: (agentId?: string) => void;
}

const DEFAULT_OPTIONS: Required<UseSensesOptions> = {
  enableVision: false,
  enableHearing: false,
  enableTouch: true,
  enableEnvironment: false,
  enableProprioception: true,
  maxPerceptsPerSense: 100,
  onPercept: () => {},
};

export function useSenses(options: UseSensesOptions = {}): UseSensesReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [percepts, setPercepts] = useState<SensesState>({
    vision: [],
    hearing: [],
    touch: [],
    environment: [],
    proprioception: [],
  });

  const [status, setStatus] = useState<SensesStatus>({
    vision: false,
    hearing: false,
    touch: false,
    environment: false,
    proprioception: false,
  });

  const [latestPercepts, setLatestPercepts] = useState<Record<SenseModality, AnyPercept | null>>({
    vision: null,
    hearing: null,
    touch: null,
    environment: null,
    proprioception: null,
  });

  const sensesRef = useRef<{
    vision: Awaited<ReturnType<typeof importVision>>['visionSense'] | null;
    hearing: Awaited<ReturnType<typeof importHearing>>['hearingSense'] | null;
    touch: Awaited<ReturnType<typeof importTouch>>['touchSense'] | null;
    environment: Awaited<ReturnType<typeof importEnvironment>>['environmentSense'] | null;
    proprioception: Awaited<ReturnType<typeof importProprioception>>['proprioceptionSense'] | null;
  }>({
    vision: null,
    hearing: null,
    touch: null,
    environment: null,
    proprioception: null,
  });

  const onPerceptRef = useRef(opts.onPercept);
  onPerceptRef.current = opts.onPercept;

  // Generic percept handler
  const createPerceptHandler = useCallback((modality: SenseModality) => {
    return (percept: AnyPercept) => {
      setPercepts(prev => {
        const existing = prev[modality] as AnyPercept[];
        const updated = [...existing, percept].slice(-opts.maxPerceptsPerSense);
        return { ...prev, [modality]: updated };
      });

      setLatestPercepts(prev => ({ ...prev, [modality]: percept }));
      onPerceptRef.current?.(percept);
    };
  }, [opts.maxPerceptsPerSense]);

  // Initialize vision
  const initVision = useCallback(async () => {
    if (sensesRef.current.vision) return;
    
    const { visionSense } = await importVision();
    sensesRef.current.vision = visionSense;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visionSense.setOnPerceptCallback(createPerceptHandler('vision') as any);
    visionSense.start();
    setStatus(prev => ({ ...prev, vision: true }));
  }, [createPerceptHandler]);

  // Initialize hearing
  const initHearing = useCallback(async () => {
    if (sensesRef.current.hearing) return;
    
    const { hearingSense } = await importHearing();
    sensesRef.current.hearing = hearingSense;
    hearingSense.setOnPerceptCallback(createPerceptHandler('hearing') as (p: Percept<HearingPerceptPayload>) => void);
    await hearingSense.initialize();
    setStatus(prev => ({ ...prev, hearing: true }));
  }, [createPerceptHandler]);

  // Initialize touch
  const initTouch = useCallback(async () => {
    if (sensesRef.current.touch) return;
    
    const { touchSense } = await importTouch();
    sensesRef.current.touch = touchSense;
    touchSense.setOnPerceptCallback(createPerceptHandler('touch') as (p: Percept<TouchPayload>) => void);
    touchSense.initialize();
    setStatus(prev => ({ ...prev, touch: true }));
  }, [createPerceptHandler]);

  // Initialize environment
  const initEnvironment = useCallback(async () => {
    if (sensesRef.current.environment) return;
    
    const { environmentSense } = await importEnvironment();
    sensesRef.current.environment = environmentSense;
    environmentSense.setOnPerceptCallback(createPerceptHandler('environment') as (p: Percept<EnvironmentPayload>) => void);
    await environmentSense.initialize();
    setStatus(prev => ({ ...prev, environment: true }));
  }, [createPerceptHandler]);

  // Initialize proprioception
  const initProprioception = useCallback(async () => {
    if (sensesRef.current.proprioception) return;
    
    const { proprioceptionSense } = await importProprioception();
    sensesRef.current.proprioception = proprioceptionSense;
    proprioceptionSense.setOnPerceptCallback(createPerceptHandler('proprioception') as (p: Percept<ProprioceptionPayload>) => void);
    await proprioceptionSense.initialize();
    setStatus(prev => ({ ...prev, proprioception: true }));
  }, [createPerceptHandler]);

  // Enable a specific sense
  const enableSense = useCallback(async (modality: SenseModality) => {
    switch (modality) {
      case 'vision':
        await initVision();
        break;
      case 'hearing':
        await initHearing();
        break;
      case 'touch':
        await initTouch();
        break;
      case 'environment':
        await initEnvironment();
        break;
      case 'proprioception':
        await initProprioception();
        break;
    }
  }, [initVision, initHearing, initTouch, initEnvironment, initProprioception]);

  // Disable a specific sense
  const disableSense = useCallback((modality: SenseModality) => {
    const sense = sensesRef.current[modality];
    if (!sense) return;

    if ('stop' in sense) {
      (sense as { stop: () => void }).stop();
    } else if ('terminate' in sense) {
      (sense as { terminate: () => void }).terminate();
    }

    sensesRef.current[modality] = null;
    setStatus(prev => ({ ...prev, [modality]: false }));
  }, []);

  // Clear percepts
  const clearPercepts = useCallback((modality?: SenseModality) => {
    if (modality) {
      setPercepts(prev => ({ ...prev, [modality]: [] }));
      setLatestPercepts(prev => ({ ...prev, [modality]: null }));
    } else {
      setPercepts({
        vision: [],
        hearing: [],
        touch: [],
        environment: [],
        proprioception: [],
      });
      setLatestPercepts({
        vision: null,
        hearing: null,
        touch: null,
        environment: null,
        proprioception: null,
      });
    }
  }, []);

  // Touch-specific: trigger haptic
  const triggerHaptic = useCallback((
    pattern: 'vibrate' | 'pulse' | 'impact' | 'selection' = 'vibrate',
    intensity: number = 0.5
  ) => {
    sensesRef.current.touch?.triggerHapticFeedback?.(pattern, intensity, 100);
  }, []);

  // Environment-specific methods
  const refreshWeather = useCallback(async () => {
    await sensesRef.current.environment?.refreshWeather?.();
  }, []);

  const refreshAirQuality = useCallback(async () => {
    await sensesRef.current.environment?.refreshAirQuality?.();
  }, []);

  const getLocation = useCallback(() => {
    return sensesRef.current.environment?.getCachedLocation?.() ?? null;
  }, []);

  // Proprioception-specific methods
  const recordError = useCallback(() => {
    sensesRef.current.proprioception?.recordError?.();
  }, []);

  const startTask = useCallback((agentId?: string) => {
    sensesRef.current.proprioception?.startTask?.(agentId);
  }, []);

  const endTask = useCallback((agentId?: string) => {
    sensesRef.current.proprioception?.endTask?.(agentId);
  }, []);

  // Initialize enabled senses on mount
  useEffect(() => {
    const currentSenses = sensesRef.current;
    
    const init = async () => {
      const promises: Promise<void>[] = [];
      
      if (opts.enableVision) promises.push(initVision());
      if (opts.enableHearing) promises.push(initHearing());
      if (opts.enableTouch) promises.push(initTouch());
      if (opts.enableEnvironment) promises.push(initEnvironment());
      if (opts.enableProprioception) promises.push(initProprioception());
      
      await Promise.all(promises);
    };

    void init();

    // Cleanup on unmount
    return () => {
      Object.keys(currentSenses).forEach(key => {
        const modality = key as SenseModality;
        const sense = currentSenses[modality];
        if (sense) {
          if ('stop' in sense) {
            (sense as { stop: () => void }).stop();
          } else if ('terminate' in sense) {
            (sense as { terminate: () => void }).terminate();
          }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enableVision, opts.enableHearing, opts.enableTouch, opts.enableEnvironment, opts.enableProprioception]); // Only run on mount

  const isReady = Object.values(status).some(s => s);

  return {
    percepts,
    status,
    latestPercepts,
    isReady,
    enableSense,
    disableSense,
    clearPercepts,
    triggerHaptic,
    refreshWeather,
    refreshAirQuality,
    getLocation,
    recordError,
    startTask,
    endTask,
  };
}

/**
 * Hook spécialisé pour un sens unique
 */
export function useSense<T extends SenseModality>(modality: T) {
  const enableKey = `enable${modality.charAt(0).toUpperCase() + modality.slice(1)}` as keyof UseSensesOptions;
  
  const { percepts, status, latestPercepts, enableSense, disableSense } = useSenses({
    [enableKey]: true,
    enableVision: modality === 'vision',
    enableHearing: modality === 'hearing',
    enableTouch: modality === 'touch',
    enableEnvironment: modality === 'environment',
    enableProprioception: modality === 'proprioception',
  });

  return {
    percepts: percepts[modality],
    isActive: status[modality],
    latest: latestPercepts[modality],
    enable: () => enableSense(modality),
    disable: () => disableSense(modality),
  };
}

export default useSenses;
