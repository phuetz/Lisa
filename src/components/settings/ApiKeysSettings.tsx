/**
 * API Keys Settings Component
 * Permet de configurer les clés API pour les différents providers IA
 */

import { useState } from 'react';
import { Key, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { useChatSettingsStore } from '../../store/chatSettingsStore';

interface ApiKeyInputProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder: string;
  provider: string;
}

const ApiKeyInput = ({ label, value, onChange, placeholder, provider }: ApiKeyInputProps) => {
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  const maskedValue = value ? '•'.repeat(Math.min(value.length, 40)) : '';

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#2d2d2d',
      borderRadius: '12px',
      marginBottom: '12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Key size={18} color={value ? '#10b981' : '#8e8ea0'} />
          <span style={{ color: '#fff', fontWeight: 500, fontSize: '14px' }}>
            {label}
          </span>
          {value && (
            <span style={{
              backgroundColor: '#10b98120',
              color: '#10b981',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
            }}>
              Configurée
            </span>
          )}
        </div>
        <span style={{ color: '#666', fontSize: '12px' }}>{provider}</span>
      </div>

      {isEditing ? (
        <div>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                padding: '10px 40px 10px 12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #404040',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#8e8ea0',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: '#10b981',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Check size={14} /> Sauvegarder
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                backgroundColor: '#404040',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            flex: 1,
            padding: '10px 12px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            color: value ? '#8e8ea0' : '#666',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}>
            {value ? maskedValue : 'Non configurée'}
          </div>
          <button
            onClick={() => {
              setTempValue(value || '');
              setIsEditing(true);
            }}
            style={{
              padding: '10px 16px',
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {value ? 'Modifier' : 'Ajouter'}
          </button>
        </div>
      )}
    </div>
  );
};

export const ApiKeysSettings = () => {
  const {
    geminiApiKey,
    openaiApiKey,
    anthropicApiKey,
    setGeminiApiKey,
    setOpenaiApiKey,
    setAnthropicApiKey,
  } = useChatSettingsStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: '#3b82f620',
        borderRadius: '8px',
        border: '1px solid #3b82f640',
      }}>
        <AlertCircle size={18} color="#3b82f6" />
        <p style={{ color: '#93c5fd', fontSize: '13px', margin: 0 }}>
          Les clés API sont stockées localement sur votre appareil et ne sont jamais envoyées à nos serveurs.
        </p>
      </div>

      <ApiKeyInput
        label="Gemini API Key"
        value={geminiApiKey}
        onChange={setGeminiApiKey}
        placeholder="AIzaSy..."
        provider="Google AI"
      />

      <ApiKeyInput
        label="OpenAI API Key"
        value={openaiApiKey}
        onChange={setOpenaiApiKey}
        placeholder="sk-..."
        provider="OpenAI"
      />

      <ApiKeyInput
        label="Anthropic API Key"
        value={anthropicApiKey}
        onChange={setAnthropicApiKey}
        placeholder="sk-ant-..."
        provider="Anthropic"
      />

      <div style={{
        padding: '16px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        marginTop: '8px',
      }}>
        <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 12px 0' }}>
          Comment obtenir une clé API Gemini ?
        </h4>
        <ol style={{ color: '#8e8ea0', fontSize: '13px', margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
          <li>Allez sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981' }}>Google AI Studio</a></li>
          <li>Connectez-vous avec votre compte Google</li>
          <li>Cliquez sur "Create API Key"</li>
          <li>Copiez la clé et collez-la ci-dessus</li>
        </ol>
      </div>
    </div>
  );
};

export default ApiKeysSettings;
