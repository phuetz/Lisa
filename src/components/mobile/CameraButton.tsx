/**
 * CameraButton Component
 * Bouton pour capturer/sélectionner une image
 */

import { useState } from 'react';
import { Camera, Image, X, Send } from 'lucide-react';
import { useCamera } from '../../hooks/useCamera';
import { useMobile } from '../../hooks/useMobile';

interface CameraButtonProps {
  onImageCapture?: (base64: string, format: 'jpeg' | 'png') => void;
  disabled?: boolean;
}

export const CameraButton = ({ onImageCapture, disabled }: CameraButtonProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const { image, isCapturing, takePhoto, pickFromGallery, clearImage, getDataUrl } = useCamera();
  const { hapticTap, hapticSuccess } = useMobile();

  const handleCapture = async (method: 'camera' | 'gallery') => {
    hapticTap();
    setShowOptions(false);
    
    const result = method === 'camera' ? await takePhoto() : await pickFromGallery();
    
    if (result) {
      hapticSuccess();
      setShowPreview(true);
    }
  };

  const handleSend = () => {
    if (image && onImageCapture) {
      onImageCapture(image.base64, image.format);
      clearImage();
      setShowPreview(false);
    }
  };

  const handleCancel = () => {
    clearImage();
    setShowPreview(false);
  };

  const handleButtonClick = () => {
    hapticTap();
    setShowOptions(!showOptions);
  };

  return (
    <>
      {/* Main Button */}
      <button
        onClick={handleButtonClick}
        disabled={disabled || isCapturing}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: 'rgba(86, 88, 105, 0.3)',
          border: '1px solid rgba(86, 88, 105, 0.3)',
          color: '#8e8ea0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Camera size={20} />
      </button>

      {/* Options Popup */}
      {showOptions && (
        <>
          <div
            onClick={() => setShowOptions(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 100,
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: '80px',
              right: '16px',
              backgroundColor: '#2d2d2d',
              borderRadius: '12px',
              padding: '8px',
              zIndex: 101,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <button
              onClick={() => handleCapture('camera')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            >
              <Camera size={18} />
              Prendre une photo
            </button>
            <button
              onClick={() => handleCapture('gallery')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            >
              <Image size={18} />
              Choisir depuis la galerie
            </button>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {showPreview && image && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <img
            src={getDataUrl() || ''}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '60vh',
              borderRadius: '12px',
              objectFit: 'contain',
            }}
          />
          
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '24px',
            }}
          >
            <button
              onClick={handleCancel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <X size={18} />
              Annuler
            </button>
            <button
              onClick={handleSend}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: 'rgba(16, 185, 129, 0.9)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <Send size={18} />
              Envoyer à Lisa
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CameraButton;
