import { useState } from 'react';
import { useMetaHumanStore } from '../store/metaHumanStore';
import { useUnrealEngine } from '../hooks/useUnrealEngine';
import { Wifi, WifiOff, Play, Camera, Lightbulb } from 'lucide-react';

export function MetaHumanControlsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [testText, setTestText] = useState('Bonjour, je suis Lisa !');
  const { setExpression, setPose, setSpeech } = useMetaHumanStore();
  
  const {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendSpeech,
    setCamera,
    setLighting,
    expressionPresets,
    posePresets
  } = useUnrealEngine();

  const expressions = [
    { name: 'Neutre', value: 'neutral', action: expressionPresets.neutral },
    { name: 'Joie', value: 'happy', action: expressionPresets.happy },
    { name: 'Tristesse', value: 'sad', action: expressionPresets.sad },
    { name: 'Surprise', value: 'surprised', action: expressionPresets.surprised },
    { name: 'Colère', value: 'angry', action: expressionPresets.angry },
    { name: 'Confus', value: 'confused', action: expressionPresets.confused },
    { name: 'Réflexion', value: 'thinking', action: expressionPresets.thinking },
    { name: 'Excité', value: 'excited', action: expressionPresets.excited },
  ];

  const poses = [
    { name: 'Repos', value: 'idle', action: posePresets.idle },
    { name: 'Salut', value: 'greeting', action: posePresets.greeting },
    { name: 'Réflexion', value: 'thinking', action: posePresets.thinking },
    { name: 'Explication', value: 'explaining', action: posePresets.explaining },
    { name: 'Écoute', value: 'listening', action: posePresets.listening },
    { name: 'Acquiescement', value: 'nodding', action: posePresets.nodding },
  ];  

  const handleTestSpeech = () => {
    if (testText.trim()) {
      if (isConnected) {
        sendSpeech(testText);
      } else {
        // Fallback to local store
        setSpeech(testText, true);
        setTimeout(() => setSpeech('', false), testText.length * 50);
      }
    }
  };

  const handleCameraPreset = (preset: string) => {
    const presets = {
      front: { position: { x: 0, y: 0, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
      side: { position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: -90, z: 0 } },
      closeup: { position: { x: 0, y: 0, z: 1 }, rotation: { x: 0, y: 0, z: 0 } }
    };
    const config = presets[preset as keyof typeof presets];
    if (config) {
      setCamera(config.position, config.rotation);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2 ${
          isConnected 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
        MetaHuman UE5.6
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-96 max-h-[500px] overflow-y-auto border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            {isConnected ? <Wifi className="text-green-500" size={20} /> : <WifiOff className="text-red-500" size={20} />}
            MetaHuman UE5.6
          </h3>

          {/* Connection Status */}
          <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connexion Unreal Engine</span>
              <span className={`text-xs px-2 py-1 rounded ${
                isConnected ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                isConnecting ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {isConnected ? 'Connecté' : isConnecting ? 'Connexion...' : 'Déconnecté'}
              </span>
            </div>
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => connect()}
                disabled={isConnecting || isConnected}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-xs rounded transition-colors"
              >
                {isConnecting ? 'Connexion...' : 'Connecter'}
              </button>
              <button
                onClick={disconnect}
                disabled={!isConnected}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-xs rounded transition-colors"
              >
                Déconnecter
              </button>
            </div>
          </div>

          {/* Expressions */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1">
              😊 Expressions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {expressions.map((expr) => (
                <button
                  key={expr.value}
                  onClick={() => {
                    if (isConnected) {
                      expr.action();
                    } else {
                      setExpression(expr.value, 0.8);
                    }
                  }}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-sm transition-colors"
                >
                  {expr.name}
                </button>
              ))}
            </div>
          </div>

          {/* Poses */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1">
              🤸 Poses & Animations
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {poses.map((pose) => (
                <button
                  key={pose.value}
                  onClick={() => {
                    if (isConnected) {
                      pose.action();
                    } else {
                      setPose(pose.value);
                    }
                  }}
                  className="px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-800 dark:text-green-200 rounded text-sm transition-colors"
                >
                  {pose.name}
                </button>
              ))}
            </div>
          </div>

          {/* Speech Test */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1">
              🎤 Test de Parole
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Texte à dire..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleTestSpeech();
                  }
                }}
              />
              <button
                onClick={handleTestSpeech}
                className="w-full px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Play size={14} />
                Faire Parler Lisa
              </button>
            </div>
          </div>

          {/* Camera Controls */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Camera size={16} />
              Caméra
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleCameraPreset('front')}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs transition-colors"
              >
                Face
              </button>
              <button
                onClick={() => handleCameraPreset('side')}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs transition-colors"
              >
                Profil
              </button>
              <button
                onClick={() => handleCameraPreset('closeup')}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-xs transition-colors"
              >
                Gros Plan
              </button>
            </div>
          </div>

          {/* Lighting Controls */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Lightbulb size={16} />
              Éclairage
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setLighting(1.0, '#ffffff')}
                className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded text-xs transition-colors"
              >
                Jour
              </button>
              <button
                onClick={() => setLighting(0.3, '#ffaa44')}
                className="px-2 py-1 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900 dark:hover:bg-orange-800 text-orange-800 dark:text-orange-200 rounded text-xs transition-colors"
              >
                Soir
              </button>
              <button
                onClick={() => setLighting(0.1, '#4444ff')}
                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs transition-colors"
              >
                Nuit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
