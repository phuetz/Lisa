/**
 * FallAlert - Composant UI pour afficher les alertes de chute
 * 
 * Affiche une notification modale avec countdown en cas de chute détectée,
 * permettant à l'utilisateur d'annuler une fausse alerte.
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import type { FallEvent } from '../services/FallDetector';

interface FallAlertProps {
    event: FallEvent | null;
    onDismiss: () => void;
    onConfirm: () => void;
}

export const FallAlert: React.FC<FallAlertProps> = ({ event, onDismiss, onConfirm }) => {
    const [countdown, setCountdown] = useState(10);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (event && event.type === 'confirmed') {
            setIsVisible(true);
            setCountdown(10);

            // Countdown automatique
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleAutoConfirm();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        } else {
            setIsVisible(false);
        }
    }, [event]);

    const handleAutoConfirm = () => {
        // Appel automatique après 10 secondes
        onConfirm();
        console.warn('[FallAlert] Alerte confirmée automatiquement - Appel d\'urgence déclenché');
    };

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss();
    };

    if (!isVisible || !event) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border-4 border-red-500 animate-pulse-border">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center animate-bounce">
                                <AlertTriangle size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">ALERTE CHUTE DÉTECTÉE</h2>
                                <p className="text-sm opacity-90">Appel d'urgence dans {countdown}s</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Lisa a détecté une chute avec une confiance de{' '}
                        <strong>{Math.round(event.confidence * 100)}%</strong>.
                    </p>

                    <div className="bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Si vous allez bien</strong>, cliquez sur "Fausse alerte" ci-dessous.
                            Sinon, restez immobile et les secours seront contactés automatiquement.
                        </p>
                    </div>

                    {/* Countdown Progress */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-red-500 h-full transition-all duration-1000 ease-linear"
                            style={{ width: `${(countdown / 10) * 100}%` }}
                        />
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleDismiss}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
                        >
                            <Check size={20} />
                            Fausse alerte
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                        >
                            <Phone size={20} />
                            Appeler maintenant
                        </button>
                    </div>

                    {/* Détails techniques (debug) */}
                    <details className="text-xs text-gray-500 dark:text-gray-400">
                        <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                            Détails techniques
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded font-mono">
                            <p>Timestamp: {new Date(event.timestamp).toLocaleString()}</p>
                            <p>Confiance: {(event.confidence * 100).toFixed(2)}%</p>
                            <p>Type: {event.type}</p>
                        </div>
                    </details>
                </div>
            </div>

            <style>{`
        @keyframes pulse-border {
          0%, 100% {
            border-color: #ef4444;
          }
          50% {
            border-color: #fca5a5;
          }
        }
        .animate-pulse-border {
          animation: pulse-border 1s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};

/**
 * FallDetectorBadge - Badge indicateur d'état du détecteur
 */
export const FallDetectorBadge: React.FC = () => {
    const isActive = useAppStore((state) => state.featureFlags?.fallDetector || false);

    if (!isActive) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Détection chute active
            </span>
        </div>
    );
};

export default FallAlert;
