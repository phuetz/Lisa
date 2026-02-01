/**
 * MedicationAlert - Composant d'alerte de rappel de médicament
 * 
 * Affiche une notification pour rappeler la prise d'un médicament
 * avec option de confirmation ou report.
 */

import React from 'react';
import { Pill, Check, Clock, X } from 'lucide-react';
import type { Medication } from '../../services/MedicationReminder';

interface MedicationAlertProps {
    medication: Medication;
    scheduledTime: string;
    onConfirm: () => void;
    onSkip: () => void;
    onSnooze: () => void;
}

export const MedicationAlert: React.FC<MedicationAlertProps> = ({
    medication,
    scheduledTime,
    onConfirm,
    onSkip,
    onSnooze,
}) => {
    return (
        <div className="fixed top-4 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-blue-500 overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <Pill size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">💊 Rappel Médicament</h3>
                        <p className="text-sm opacity-90">{scheduledTime}</p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
                {/* Médicament */}
                <div className="flex items-center gap-4">
                    {medication.imageUrl && (
                        <img
                            src={medication.imageUrl}
                            alt={medication.name}
                            className="w-16 h-16 rounded-lg object-cover"
                        />
                    )}
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                            {medication.name}
                        </h4>
                        <p className="text-blue-600 dark:text-blue-400 font-semibold">
                            {medication.dosage}
                        </p>
                        {medication.instructions && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {medication.instructions}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={onSkip}
                        className="flex flex-col items-center gap-1 p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-600 dark:text-gray-300" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Ignorer
                        </span>
                    </button>

                    <button
                        onClick={onSnooze}
                        className="flex flex-col items-center gap-1 p-3 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 rounded-lg transition-colors"
                    >
                        <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
                        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                            +10 min
                        </span>
                    </button>

                    <button
                        onClick={onConfirm}
                        className="flex flex-col items-center gap-1 p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                        <Check size={20} />
                        <span className="text-xs font-medium">Pris</span>
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};

export default MedicationAlert;
