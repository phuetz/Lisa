/**
 * useFallDetector - Hook React pour intégrer la détection de chute
 *
 * Surveille les percepts de pose et utilise le FallDetectorService
 * pour détecter automatiquement les chutes.
 * Uses facade stores for better separation of concerns.
 */

import { useEffect, useState, useRef } from 'react';
import { useVisionStore, visionSelectors } from '../store/visionStore';
import { uiActions } from '../store/uiStore';
import { fallDetector, type FallEvent } from '../services/FallDetector';
import type { MediaPipePosePayload } from '../features/vision/api';

interface UseFallDetectorOptions {
    enabled?: boolean;
    onFallDetected?: (event: FallEvent) => void;
    onFalsePositive?: (event: FallEvent) => void;
}

export function useFallDetector(options: UseFallDetectorOptions = {}) {
    const { enabled = true, onFallDetected, onFalsePositive } = options;
    const [lastEvent, setLastEvent] = useState<FallEvent | null>(null);
    const [isActive, setIsActive] = useState(false);

    // Use refs to avoid re-running effect when callbacks change
    const onFallDetectedRef = useRef(onFallDetected);
    const onFalsePositiveRef = useRef(onFalsePositive);

    // Update refs when callbacks change
    useEffect(() => {
        onFallDetectedRef.current = onFallDetected;
        onFalsePositiveRef.current = onFalsePositive;
    }, [onFallDetected, onFalsePositive]);

    // Surveiller les percepts de pose du store via facade
    const percepts = useVisionStore(visionSelectors.percepts);

    useEffect(() => {
        if (!enabled) {
            if (fallDetector.isRunning()) {
                fallDetector.stop();
            }
            setIsActive(false);
            return;
        }

        // Only start if not already running
        if (!fallDetector.isRunning()) {
            fallDetector.start();
        }
        setIsActive(true);

        // Enregistrer le callback
        fallDetector.onFallDetected((event) => {
            setLastEvent(event);

            if (event.type === 'confirmed' && onFallDetectedRef.current) {
                onFallDetectedRef.current(event);
            } else if (event.type === 'false-positive' && onFalsePositiveRef.current) {
                onFalsePositiveRef.current(event);
            }
        });

        return () => {
            fallDetector.stop();
        };
    }, [enabled]);

    // Analyser les nouveaux percepts de pose
    useEffect(() => {
        if (!enabled || !isActive) return;

        const latestPosePercept = percepts
            .filter((p) => p.modality === 'vision')
            .find((p) => (p.payload as { type?: string })?.type === 'pose');

        if (latestPosePercept) {
            const posePayload = latestPosePercept.payload as MediaPipePosePayload;
            fallDetector.analyzePose(posePayload);
        }
    }, [percepts, enabled, isActive]);

    const dismissAlert = () => {
        uiActions.clearFallAlert();
        setLastEvent(null);
    };

    const confirmAlert = () => {
        // Logique d'appel d'urgence (à implémenter selon le backend)
        console.warn('[useFallDetector] Appel d\'urgence confirmé');

        // Envoyer notification au backend
        fetch('/api/emergency/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'fall-detected',
                timestamp: lastEvent?.timestamp,
                confidence: lastEvent?.confidence,
            }),
        }).catch((err) => {
            console.error('[useFallDetector] Erreur lors de l\'appel d\'urgence:', err);
        });

        dismissAlert();
    };

    return {
        isActive,
        lastEvent,
        dismissAlert,
        confirmAlert,
    };
}

export default useFallDetector;
