/**
 * useUnrealEngine.ts
 * 
 * React hook for managing Unreal Engine 5.6 MetaHuman integration
 * Provides easy-to-use interface for controlling MetaHuman avatar
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { unrealEngineService } from '../services/UnrealEngineService';
import type { MetaHumanExpression, MetaHumanSpeech, MetaHumanPose, MetaHumanBlendShape } from '../services/UnrealEngineService';
import { useMetaHumanStore } from '../store/metaHumanStore';

export interface UnrealEngineStatus {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastMessage: any;
  reconnectAttempts: number;
}

export const useUnrealEngine = () => {
  const [status, setStatus] = useState<UnrealEngineStatus>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastMessage: null,
    reconnectAttempts: 0
  });

  const {
    blendShapeWeights,
    pose,
    currentAnimation,
    speechText,
    isSpeaking,
    setExpression,
    setPose,
    setSpeech,
    setBlendShapeWeight
  } = useMetaHumanStore();

  const connectionAttempted = useRef(false);

  // Initialize connection to Unreal Engine
  const connect = useCallback(async () => {
    if (status.isConnecting) return;

    setStatus(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const success = await unrealEngineService.connect();
      setStatus(prev => ({
        ...prev,
        isConnected: success,
        isConnecting: false,
        error: success ? null : 'Failed to connect to Unreal Engine'
      }));
      return success;
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
      return false;
    }
  }, [status.isConnecting]);

  // Disconnect from Unreal Engine
  const disconnect = useCallback(() => {
    unrealEngineService.disconnect();
    setStatus(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      error: null
    }));
  }, []);

  // Send expression to MetaHuman
  const sendExpression = useCallback((name: string, intensity: number = 1, duration?: number) => {
    const expression: MetaHumanExpression = {
      name,
      intensity,
      duration,
      blendMode: 'replace'
    };

    const success = unrealEngineService.setExpression(expression);
    if (success) {
      // Update local store
      setExpression(name, intensity);
    }
    return success;
  }, [setExpression]);

  // Send speech to MetaHuman with lip sync
  const sendSpeech = useCallback((text: string, audioUrl?: string, voice?: string) => {
    const speech: MetaHumanSpeech = {
      text,
      audioUrl,
      voice: voice || 'default',
      duration: text.length * 50 // Rough estimate: 50ms per character
    };

    const success = unrealEngineService.speak(speech);
    if (success) {
      // Update local store
      setSpeech(text, true);
      
      // Auto-stop speaking after estimated duration
      setTimeout(() => {
        setSpeech('', false);
      }, speech.duration);
    }
    return success;
  }, [setSpeech]);

  // Send pose/animation to MetaHuman
  const sendPose = useCallback((name: string, transition: number = 0.5, loop: boolean = true) => {
    const pose: MetaHumanPose = {
      name,
      transition,
      loop
    };

    const success = unrealEngineService.setPose(pose);
    if (success) {
      // Update local store
      setPose(name);
    }
    return success;
  }, [setPose]);

  // Send individual blend shape
  const sendBlendShape = useCallback((name: string, value: number, transition: number = 0.2) => {
    const blendShape: MetaHumanBlendShape = {
      name,
      value,
      transition
    };

    const success = unrealEngineService.setBlendShape(blendShape);
    if (success) {
      // Update local store
      setBlendShapeWeight(name, value);
    }
    return success;
  }, [setBlendShapeWeight]);

  // Control camera
  const setCamera = useCallback((
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number }
  ) => {
    return unrealEngineService.setCamera(position, rotation);
  }, []);

  const playAnimation = useCallback((animationName: string, loop: boolean = false) => {
    return unrealEngineService.setPose({ name: animationName, loop });
  }, []);

  // UE 5.6 specific methods
  const configureLumen = useCallback((settings: {
    globalIllumination?: boolean;
    reflections?: boolean;
    quality?: 'low' | 'medium' | 'high' | 'epic';
    updateRate?: number;
  }) => {
    return unrealEngineService.configureLumen(settings);
  }, []);

  const configureNanite = useCallback((settings: {
    enabled?: boolean;
    clusterCulling?: boolean;
    programmableRaster?: boolean;
    maxTriangles?: number;
  }) => {
    return unrealEngineService.configureNanite(settings);
  }, []);

  const configureChaosPhysics = useCallback((settings: {
    enabled?: boolean;
    clothSimulation?: boolean;
    hairPhysics?: boolean;
    fluidSimulation?: boolean;
  }) => {
    return unrealEngineService.configureChaosPhysics(settings);
  }, []);

  const playMetaSound = useCallback((settings: {
    soundAsset: string;
    volume?: number;
    pitch?: number;
    spatialAudio?: boolean;
    position?: { x: number; y: number; z: number };
  }) => {
    return unrealEngineService.playMetaSound(settings);
  }, []);

  // Control lighting
  const setLighting = useCallback((
    intensity: number,
    color: string = '#ffffff',
    direction?: { x: number; y: number; z: number }
  ) => {
    return unrealEngineService.setLighting({ intensity, color, direction });
  }, []);

  // Preset expressions for common emotions
  const expressionPresets = {
    happy: () => sendExpression('joy', 0.8),
    sad: () => sendExpression('sadness', 0.7),
    surprised: () => sendExpression('surprise', 0.9),
    angry: () => sendExpression('anger', 0.6),
    confused: () => sendExpression('confusion', 0.5),
    thinking: () => sendExpression('concentration', 0.4),
    neutral: () => sendExpression('neutral', 0.0),
    excited: () => sendExpression('excitement', 1.0),
    worried: () => sendExpression('worry', 0.6),
    calm: () => sendExpression('calm', 0.3)
  };

  // Preset poses for common actions
  const posePresets = {
    idle: () => sendPose('idle', 0.5, true),
    greeting: () => sendPose('wave_hello', 0.3, false),
    thinking: () => sendPose('hand_to_chin', 0.4, true),
    explaining: () => sendPose('gesturing', 0.3, true),
    listening: () => sendPose('attentive', 0.4, true),
    nodding: () => sendPose('nod_yes', 0.2, false),
    shaking: () => sendPose('shake_no', 0.2, false),
    pointing: () => sendPose('point_forward', 0.3, false)
  };

  // Setup event listeners
  useEffect(() => {
    const handleConnected = () => {
      setStatus(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }));
    };

    const handleDisconnected = () => {
      setStatus(prev => ({ ...prev, isConnected: false }));
    };

    const handleError = (error: any) => {
      setStatus(prev => ({
        ...prev,
        error: error?.message || 'Unknown error',
        isConnecting: false
      }));
    };

    const handleMessage = (message: any) => {
      setStatus(prev => ({ ...prev, lastMessage: message }));
    };

    const handleSpeechComplete = () => {
      setSpeech('', false);
    };

    // Add event listeners
    unrealEngineService.on('connected', handleConnected);
    unrealEngineService.on('disconnected', handleDisconnected);
    unrealEngineService.on('error', handleError);
    unrealEngineService.on('message', handleMessage);
    unrealEngineService.on('speechComplete', handleSpeechComplete);

    // Cleanup
    return () => {
      unrealEngineService.off('connected', handleConnected);
      unrealEngineService.off('disconnected', handleDisconnected);
      unrealEngineService.off('error', handleError);
      unrealEngineService.off('message', handleMessage);
      unrealEngineService.off('speechComplete', handleSpeechComplete);
    };
  }, [setSpeech]);

  // Auto-connect on mount (optional)
  useEffect(() => {
    if (!connectionAttempted.current) {
      connectionAttempted.current = true;
      // Attempt to connect automatically
      connect().catch(error => {
        console.log('Auto-connect failed, manual connection required:', error);
      });
    }
  }, [connect]);

  // Sync local state changes to Unreal Engine
  useEffect(() => {
    if (!status.isConnected) return;

    // Sync blend shapes
    Object.entries(blendShapeWeights).forEach(([name, weight]) => {
      if (weight > 0) {
        sendBlendShape(name, weight);
      }
    });
  }, [blendShapeWeights, status.isConnected, sendBlendShape]);

  return {
    // Connection status
    status,
    isConnected: status.isConnected,
    isConnecting: status.isConnecting,
    error: status.error,

    // Connection control
    connect,
    disconnect,

    // MetaHuman control
    sendExpression,
    sendSpeech,
    sendPose,
    sendBlendShape,
    setCamera,
    setLighting,

    // UE 5.6 specific methods
    playAnimation,
    configureLumen,
    configureNanite,
    configureChaosPhysics,
    playMetaSound,

    // Presets
    expressionPresets,
    posePresets,

    // Current state from store
    currentState: {
      blendShapeWeights,
      pose,
      currentAnimation,
      speechText,
      isSpeaking
    }
  };
};

export default useUnrealEngine;
