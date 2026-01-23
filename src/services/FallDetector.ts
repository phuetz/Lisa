/**
 * FallDetector - Service de détection de chute basé sur l'analyse de pose
 * 
 * Utilise les landmarks MediaPipe Pose pour détecter les chutes en temps réel
 * et déclencher des alertes appropriées.
 */

import { useAppStore } from '../store/appStore';
import type { MediaPipePosePayload } from '../features/vision/api';

interface PoseLandmark {
    x: number;
    y: number;
    z?: number;
    visibility: number;
}

interface FallEvent {
    timestamp: number;
    confidence: number;
    landmarks: PoseLandmark[];
    type: 'potential' | 'confirmed' | 'false-positive';
}

class FallDetectorService {
    private isActive = false;
    private lastPoseAngle: number | null = null;
    private fallStartTime: number | null = null;
    private lastFallEvent: FallEvent | null = null;
    private onFallDetectedCallback: ((event: FallEvent) => void) | null = null;

    // Seuils de détection
    private readonly FALL_ANGLE_THRESHOLD = 30; // degrés
    private readonly VELOCITY_THRESHOLD = 60; // degrés/seconde
    private readonly GROUND_TIME_THRESHOLD = 3000; // millisecondes
    private readonly MIN_CONFIDENCE = 0.5;
    private readonly ALERT_COOLDOWN = 30000; // 30s entre alertes

    /**
     * Active le détecteur de chute
     */
    start(): void {
        this.isActive = true;
        console.log('[FallDetector] Service démarré');
    }

    /**
     * Désactive le détecteur de chute
     */
    stop(): void {
        this.isActive = false;
        this.reset();
        console.log('[FallDetector] Service arrêté');
    }

    /**
     * Reset l'état interne
     */
    private reset(): void {
        this.lastPoseAngle = null;
        this.fallStartTime = null;
    }

    /**
     * Enregistre un callback pour les événements de chute
     */
    onFallDetected(callback: (event: FallEvent) => void): void {
        this.onFallDetectedCallback = callback;
    }

    /**
     * Analyse une pose et détecte une éventuelle chute
     */
    analyzePose(posePayload: MediaPipePosePayload): void {
        if (!this.isActive) return;

        const landmarks = posePayload.landmarks as PoseLandmark[];
        if (!landmarks || landmarks.length < 33) {
            console.warn('[FallDetector] Landmarks incomplets');
            return;
        }

        // Indices des landmarks clés (MediaPipe Pose)
        const LEFT_SHOULDER = 11;
        const RIGHT_SHOULDER = 12;
        const LEFT_HIP = 23;
        const RIGHT_HIP = 24;

        const leftShoulder = landmarks[LEFT_SHOULDER];
        const rightShoulder = landmarks[RIGHT_SHOULDER];
        const leftHip = landmarks[LEFT_HIP];
        const rightHip = landmarks[RIGHT_HIP];

        // Vérifier la visibilité des landmarks
        const minVisibility = Math.min(
            leftShoulder.visibility,
            rightShoulder.visibility,
            leftHip.visibility,
            rightHip.visibility
        );

        if (minVisibility < this.MIN_CONFIDENCE) {
            return; // Pas assez de confiance dans la détection
        }

        // Calculer le centre des épaules et des hanches
        const shoulderCenter = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
        };

        const hipCenter = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
        };

        // Calculer l'angle du torse par rapport à la verticale
        const torsoAngle = this.calculateTorsoAngle(shoulderCenter, hipCenter);

        // Détecter une chute potentielle
        if (this.lastPoseAngle !== null) {
            const angleChange = Math.abs(torsoAngle - this.lastPoseAngle);
            const velocity = angleChange / 0.1; // Estimation (assume 10 FPS)

            // Mouvement brusque détecté
            if (velocity > this.VELOCITY_THRESHOLD && torsoAngle < this.FALL_ANGLE_THRESHOLD) {
                if (this.fallStartTime === null) {
                    this.fallStartTime = Date.now();
                    this.triggerEvent({
                        timestamp: this.fallStartTime,
                        confidence: minVisibility,
                        landmarks,
                        type: 'potential',
                    });
                }
            }
        }

        // Vérifier si la personne est au sol depuis longtemps
        if (this.fallStartTime !== null) {
            const timeOnGround = Date.now() - this.fallStartTime;

            if (torsoAngle < this.FALL_ANGLE_THRESHOLD && timeOnGround > this.GROUND_TIME_THRESHOLD) {
                // Chute confirmée
                this.triggerEvent({
                    timestamp: Date.now(),
                    confidence: minVisibility,
                    landmarks,
                    type: 'confirmed',
                });
                this.reset(); // Reset pour éviter alertes multiples
            } else if (torsoAngle > this.FALL_ANGLE_THRESHOLD + 10) {
                // Personne s'est relevée - fausse alerte
                this.triggerEvent({
                    timestamp: Date.now(),
                    confidence: minVisibility,
                    landmarks,
                    type: 'false-positive',
                });
                this.reset();
            }
        }

        this.lastPoseAngle = torsoAngle;
    }

    /**
     * Calcule l'angle du torse par rapport à la verticale (en degrés)
     */
    private calculateTorsoAngle(shoulder: { x: number; y: number }, hip: { x: number; y: number }): number {
        const dx = hip.x - shoulder.x;
        const dy = hip.y - shoulder.y;

        // Angle en radians puis en degrés
        const angleRad = Math.atan2(dx, dy);
        const angleDeg = (angleRad * 180) / Math.PI;

        // Normaliser à [0, 90] (0 = debout, 90 = allongé)
        return Math.abs(90 - Math.abs(angleDeg));
    }

    /**
     * Déclenche un événement de chute
     */
    private triggerEvent(event: FallEvent): void {
        // Éviter les alertes trop fréquentes
        if (
            this.lastFallEvent &&
            event.timestamp - this.lastFallEvent.timestamp < this.ALERT_COOLDOWN &&
            event.type === 'confirmed'
        ) {
            return;
        }

        this.lastFallEvent = event;

        if (this.onFallDetectedCallback) {
            this.onFallDetectedCallback(event);
        }

        // Mettre à jour le store pour notification UI
        if (event.type === 'confirmed') {
            useAppStore.setState({
                fallDetected: true,
                fallEventTimestamp: event.timestamp,
            });

            console.warn('[FallDetector] ⚠️ CHUTE CONFIRMÉE ⚠️', event);
        } else if (event.type === 'potential') {
            console.log('[FallDetector] Chute potentielle détectée', event);
        }
    }

    /**
     * Récupère le dernier événement de chute
     */
    getLastEvent(): FallEvent | null {
        return this.lastFallEvent;
    }

    /**
     * Vérifie si le service est actif
     */
    isRunning(): boolean {
        return this.isActive;
    }
}

// Export singleton
export const fallDetector = new FallDetectorService();
export type { FallEvent, PoseLandmark };
