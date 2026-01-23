/**
 * Camera Service
 * Gère la capture de photos via Capacitor Camera plugin
 */

import { Capacitor } from '@capacitor/core';

export interface CapturedImage {
  base64: string;
  format: 'jpeg' | 'png';
  width?: number;
  height?: number;
  path?: string;
}

export type CameraSource = 'camera' | 'photos' | 'prompt';

class CameraService {
  private camera: typeof import('@capacitor/camera').Camera | null = null;
  private initialized = false;

  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const cameraModule = await import('@capacitor/camera').catch(() => null);
      if (cameraModule) {
        this.camera = cameraModule.Camera;
        this.initialized = true;
        console.log('[CameraService] Initialized');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[CameraService] Init error:', error);
      return false;
    }
  }

  /**
   * Vérifier et demander les permissions caméra
   */
  async checkPermissions(): Promise<boolean> {
    if (!this.camera) return false;

    try {
      const { Camera: CameraPlugin } = await import('@capacitor/camera');
      const status = await CameraPlugin.checkPermissions();
      
      if (status.camera === 'granted' && status.photos === 'granted') {
        return true;
      }

      const request = await CameraPlugin.requestPermissions();
      return request.camera === 'granted';
    } catch (error) {
      console.error('[CameraService] Permission check error:', error);
      return false;
    }
  }

  /**
   * Prendre une photo avec la caméra
   */
  async takePhoto(): Promise<CapturedImage | null> {
    return this.captureImage('camera');
  }

  /**
   * Sélectionner une photo depuis la galerie
   */
  async pickFromGallery(): Promise<CapturedImage | null> {
    return this.captureImage('photos');
  }

  /**
   * Afficher le choix caméra/galerie
   */
  async captureWithPrompt(): Promise<CapturedImage | null> {
    return this.captureImage('prompt');
  }

  /**
   * Capture d'image générique
   */
  private async captureImage(source: CameraSource): Promise<CapturedImage | null> {
    if (!this.isNative) {
      // Fallback web: input file
      return this.webCapture();
    }

    await this.initialize();
    if (!this.camera) return null;

    try {
      const { Camera: CameraPlugin, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const sourceMap = {
        camera: CameraSource.Camera,
        photos: CameraSource.Photos,
        prompt: CameraSource.Prompt,
      };

      const image = await CameraPlugin.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: sourceMap[source],
        correctOrientation: true,
        width: 1024, // Limiter la taille pour l'envoi
        height: 1024,
      });

      if (image.base64String) {
        return {
          base64: image.base64String,
          format: image.format === 'png' ? 'png' : 'jpeg',
          path: image.path,
        };
      }

      return null;
    } catch (error) {
      // User cancelled or error
      if ((error as Error).message?.includes('cancelled')) {
        console.log('[CameraService] User cancelled');
        return null;
      }
      console.error('[CameraService] Capture error:', error);
      return null;
    }
  }

  /**
   * Fallback pour le web
   */
  private webCapture(): Promise<CapturedImage | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Préférer la caméra arrière

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({
            base64,
            format: file.type.includes('png') ? 'png' : 'jpeg',
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };

      input.oncancel = () => resolve(null);
      input.click();
    });
  }

  /**
   * Convertir base64 en Blob pour upload
   */
  base64ToBlob(base64: string, format: 'jpeg' | 'png' = 'jpeg'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: `image/${format}` });
  }

  /**
   * Obtenir l'URL data pour affichage
   */
  getDataUrl(image: CapturedImage): string {
    return `data:image/${image.format};base64,${image.base64}`;
  }

  /**
   * Redimensionner une image (pour optimiser l'envoi)
   */
  async resizeImage(
    base64: string,
    maxWidth: number = 800,
    maxHeight: number = 800,
    quality: number = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculer les nouvelles dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Créer le canvas et redimensionner
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const resized = canvas.toDataURL('image/jpeg', quality);
        resolve(resized.split(',')[1]);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = `data:image/jpeg;base64,${base64}`;
    });
  }
}

export const cameraService = new CameraService();
export default cameraService;
