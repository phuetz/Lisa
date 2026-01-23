/**
 * useCamera Hook
 * Hook React pour la capture de photos
 */

import { useState, useCallback } from 'react';
import { cameraService, type CapturedImage } from '../services/cameraService';

interface UseCameraReturn {
  // State
  image: CapturedImage | null;
  isCapturing: boolean;
  error: string | null;
  
  // Actions
  takePhoto: () => Promise<CapturedImage | null>;
  pickFromGallery: () => Promise<CapturedImage | null>;
  captureWithPrompt: () => Promise<CapturedImage | null>;
  clearImage: () => void;
  
  // Utilities
  getDataUrl: () => string | null;
  isNative: boolean;
}

export function useCamera(): UseCameraReturn {
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takePhoto = useCallback(async (): Promise<CapturedImage | null> => {
    setIsCapturing(true);
    setError(null);
    
    try {
      const result = await cameraService.takePhoto();
      if (result) {
        setImage(result);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de capture';
      setError(message);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<CapturedImage | null> => {
    setIsCapturing(true);
    setError(null);
    
    try {
      const result = await cameraService.pickFromGallery();
      if (result) {
        setImage(result);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de sélection';
      setError(message);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const captureWithPrompt = useCallback(async (): Promise<CapturedImage | null> => {
    setIsCapturing(true);
    setError(null);
    
    try {
      const result = await cameraService.captureWithPrompt();
      if (result) {
        setImage(result);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur';
      setError(message);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const clearImage = useCallback(() => {
    setImage(null);
    setError(null);
  }, []);

  const getDataUrl = useCallback((): string | null => {
    if (!image) return null;
    return cameraService.getDataUrl(image);
  }, [image]);

  return {
    image,
    isCapturing,
    error,
    takePhoto,
    pickFromGallery,
    captureWithPrompt,
    clearImage,
    getDataUrl,
    isNative: cameraService.isNative,
  };
}

export default useCamera;
