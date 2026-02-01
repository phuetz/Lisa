/**
 * SOSButton - Bouton d'urgence pour appels rapides
 * 
 * Grand bouton rouge accessible permettant d'appeler les urgences
 * ou des contacts prédéfinis en un seul clic.
 */

import React, { useState, useEffect } from 'react';
import { Phone, X, User } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relation: string;
    priority: number;
    photoUrl?: string;
}

export const SOSButton: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [calling, setCalling] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);

    const emergencyContacts = useAppStore((state) => state.emergencyContacts || []);

    // Countdown pour appel d'urgence
    useEffect(() => {
        if (calling && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (calling && countdown === 0) {
            handleConfirmCall();
        }
    }, [calling, countdown]);

    const handleSOSClick = () => {
        setIsExpanded(true);
    };

    const handleEmergencyCall = () => {
        setSelectedContact({
            id: '112',
            name: 'Urgences (112)',
            phone: '112',
            relation: 'Services d\'urgence',
            priority: 0,
        });
        setCalling(true);
        setCountdown(5);
    };

    const handleContactCall = (contact: EmergencyContact) => {
        setSelectedContact(contact);
        setCalling(true);
        setCountdown(5);
    };

    const handleConfirmCall = () => {
        if (selectedContact) {
            console.log(`[SOS] Appel vers ${selectedContact.name} (${selectedContact.phone})`);

            // Enregistrer dans l'historique
            useAppStore.setState((state) => ({
                sosCallHistory: [
                    ...(state.sosCallHistory || []),
                    {
                        timestamp: Date.now(),
                        contactId: selectedContact.id,
                        contactName: selectedContact.name,
                        phone: selectedContact.phone,
                    },
                ],
            }));

            // Appel backend pour téléphonie
            fetch('/api/emergency/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'sos-button',
                    contact: selectedContact,
                    location: window.navigator.geolocation,
                }),
            }).catch((err) => console.error('[SOS] Erreur appel:', err));

            // Simuler l'appel (afficher notification)
            alert(`📞 Appel en cours vers ${selectedContact.name}...\n\nDans une version complète, ceci déclencherait un appel téléphonique réel.`);
        }

        setIsExpanded(false);
        setCalling(false);
        setSelectedContact(null);
    };

    const handleCancel = () => {
        setCalling(false);
        setSelectedContact(null);
        setCountdown(5);
    };

    const handleClose = () => {
        setIsExpanded(false);
        setCalling(false);
        setSelectedContact(null);
        setCountdown(5);
    };

    // Modal de confirmation d'appel
    if (calling && selectedContact) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                            <Phone size={40} className="text-red-600 dark:text-red-400 animate-pulse" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Appel en cours...
                            </h2>
                            <p className="text-gray-600 dark:text-gray-300 text-lg">
                                {selectedContact.name}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {selectedContact.phone}
                            </p>
                        </div>

                        <div className="text-6xl font-bold text-red-600 dark:text-red-400">
                            {countdown}
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Appel automatique dans {countdown} seconde{countdown > 1 ? 's' : ''}
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-semibold transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleConfirmCall}
                                className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
                            >
                                Appeler maintenant
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Modal de sélection de contact
    if (isExpanded) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">🆘 Appel d'Urgence</h2>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Bouton Urgences */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleEmergencyCall}
                            className="w-full p-6 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xl transition-colors flex items-center justify-center gap-3"
                        >
                            <Phone size={32} />
                            Appeler les Urgences (112)
                        </button>
                    </div>

                    {/* Liste de contacts */}
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                            Contacts d'urgence
                        </h3>
                        {emergencyContacts.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <User size={48} className="mx-auto mb-2 opacity-50" />
                                <p>Aucun contact configuré</p>
                                <p className="text-xs mt-1">Ajoutez des contacts dans les paramètres</p>
                            </div>
                        ) : (
                            emergencyContacts
                                .sort((a, b) => a.priority - b.priority)
                                .map((contact) => (
                                    <button
                                        key={contact.id}
                                        onClick={() => handleContactCall(contact)}
                                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                                            {contact.photoUrl ? (
                                                <img src={contact.photoUrl} alt={contact.name} className="w-12 h-12 rounded-full" />
                                            ) : (
                                                <User size={24} className="text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold text-gray-900 dark:text-white">{contact.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{contact.relation}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{contact.phone}</p>
                                        </div>
                                        <Phone size={20} className="text-gray-400" />
                                    </button>
                                ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Bouton SOS flottant
    return (
        <button
            onClick={handleSOSClick}
            className="fixed bottom-20 right-4 z-50 w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 animate-pulse-slow"
            title="Appel d'urgence"
        >
            <span className="text-2xl font-bold">SOS</span>
            <style>{`
        @keyframes pulse-slow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
        </button>
    );
};

export default SOSButton;
