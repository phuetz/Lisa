/**
 * HydrationWidget - Widget de suivi d'hydratation
 * 
 * Affiche la progression de l'objectif d'hydratation quotidien
 * et permet d'enregistrer rapidement une prise de liquide.
 */

import React, { useState, useMemo } from 'react';
import { Droplet, Plus, TrendingUp } from 'lucide-react';
import { hydrationTracker } from '../../services/HydrationTracker';
import { useAppStore } from '../../store/appStore';

export const HydrationWidget: React.FC = () => {
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    // Use store selectors instead of local state - optimized with useMemo
    const hydrationLog = useAppStore((state) => state.hydrationLog || []);
    const consumption = useMemo(() => hydrationTracker.getTodayConsumption(), [hydrationLog]);
    const progress = useMemo(() => hydrationTracker.getProgressPercentage(), [hydrationLog]);

    const handleQuickAdd = (amount: number) => {
        hydrationTracker.logDrink(amount, 'water');
        setShowQuickAdd(false);
        // State is automatically updated via Zustand store
    };

    return (
        <div className="fixed bottom-4 right-24 z-40 w-64">
            {/* Widget compact */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl shadow-2xl p-4 backdrop-blur-sm bg-opacity-90">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <Droplet size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Hydratation</h3>
                            <p className="text-xs opacity-90">{consumption} ml / 1500 ml</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowQuickAdd(!showQuickAdd)}
                        className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Barre de progression */}
                <div className="mb-3">
                    <div className="h-3 bg-white bg-opacity-20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-right mt-1 opacity-90">{progress}%</p>
                </div>

                {/* Quick add panel */}
                {showQuickAdd && (
                    <div className="space-y-2 border-t border-white border-opacity-20 pt-3">
                        <p className="text-xs opacity-90 mb-2">Ajouter rapidement:</p>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleQuickAdd(250)}
                                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-semibold transition-colors"
                            >
                                + 250ml
                            </button>
                            <button
                                onClick={() => handleQuickAdd(500)}
                                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-semibold transition-colors"
                            >
                                + 500ml
                            </button>
                            <button
                                onClick={() => handleQuickAdd(750)}
                                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm font-semibold transition-colors"
                            >
                                + 750ml
                            </button>
                        </div>
                    </div>
                )}

                {/* Encouragement */}
                {progress >= 100 && (
                    <div className="mt-3 p-2 bg-green-500 bg-opacity-30 rounded-lg border border-green-300 border-opacity-30">
                        <p className="text-xs font-semibold flex items-center gap-2">
                            <TrendingUp size={14} />
                            Objectif atteint ! Bravo ! 🎉
                        </p>
                    </div>
                )}
                {progress < 50 && (
                    <p className="mt-2 text-xs opacity-75">N'oubliez pas de boire !</p>
                )}
            </div>
        </div>
    );
};

/**
 * HydrationReminder - Notification de rappel d'hydratation
 */
export const HydrationReminder: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl shadow-2xl p-4 flex items-center gap-4 animate-bounce-gentle">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Droplet size={24} className="animate-pulse" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold">💧 Pensez à vous hydrater !</h3>
                    <p className="text-sm opacity-90">Il est temps de boire un verre d'eau</p>
                </div>
                <button
                    onClick={onDismiss}
                    className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition-colors"
                >
                    OK
                </button>
            </div>

            <style>{`
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};

export default HydrationWidget;
