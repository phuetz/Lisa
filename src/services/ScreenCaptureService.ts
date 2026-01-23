/**
 * Screen Capture Service
 * Service pour capturer l'écran ou une fenêtre et l'envoyer à la vision
 */

export interface CaptureResult {
  imageData: string; // Base64 encoded image
  width: number;
  height: number;
  timestamp: Date;
}

export interface CaptureOptions {
  includeAudio?: boolean;
  preferCurrentTab?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

class ScreenCaptureService {
  private stream: MediaStream | null = null;

  /**
   * Vérifie si la capture d'écran est supportée
   */
  isSupported(): boolean {
    return 'getDisplayMedia' in navigator.mediaDevices;
  }

  /**
   * Capture l'écran ou une fenêtre
   */
  async captureScreen(options: CaptureOptions = {}): Promise<CaptureResult> {
    if (!this.isSupported()) {
      throw new Error('Screen capture is not supported in this browser');
    }

    try {
      // Demander la permission de partager l'écran
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: options.includeAudio ?? false,
      });

      // Créer une vidéo pour capturer le frame
      const video = document.createElement('video');
      video.srcObject = this.stream;
      await video.play();

      // Attendre que la vidéo soit prête
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capturer le frame sur un canvas
      const canvas = document.createElement('canvas');
      let width = video.videoWidth;
      let height = video.videoHeight;

      // Redimensionner si nécessaire
      if (options.maxWidth && width > options.maxWidth) {
        const ratio = options.maxWidth / width;
        width = options.maxWidth;
        height = Math.round(height * ratio);
      }
      if (options.maxHeight && height > options.maxHeight) {
        const ratio = options.maxHeight / height;
        height = options.maxHeight;
        width = Math.round(width * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Convertir en base64
      const imageData = canvas.toDataURL('image/png');

      // Arrêter le stream
      this.stopCapture();

      return {
        imageData,
        width,
        height,
        timestamp: new Date(),
      };
    } catch (error) {
      this.stopCapture();
      throw error;
    }
  }

  /**
   * Capture une région spécifique de l'écran
   */
  async captureRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    options: CaptureOptions = {}
  ): Promise<CaptureResult> {
    const fullCapture = await this.captureScreen(options);

    // Créer un canvas pour extraire la région
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = fullCapture.imageData;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Calculer les coordonnées proportionnelles
    const scaleX = img.width / window.screen.width;
    const scaleY = img.height / window.screen.height;

    ctx.drawImage(
      img,
      x * scaleX,
      y * scaleY,
      width * scaleX,
      height * scaleY,
      0,
      0,
      width,
      height
    );

    return {
      imageData: canvas.toDataURL('image/png'),
      width,
      height,
      timestamp: new Date(),
    };
  }

  /**
   * Capture depuis la webcam
   */
  async captureWebcam(): Promise<CaptureResult> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    // Attendre que la vidéo soit prête
    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(video, 0, 0);

    // Arrêter le stream
    stream.getTracks().forEach((track) => track.stop());

    return {
      imageData: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      timestamp: new Date(),
    };
  }

  /**
   * Capture depuis un fichier image
   */
  async captureFromFile(file: File): Promise<CaptureResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            imageData: e.target?.result as string,
            width: img.width,
            height: img.height,
            timestamp: new Date(),
          });
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Capture depuis le presse-papiers
   */
  async captureFromClipboard(): Promise<CaptureResult | null> {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'clipboard-image', { type });
            return this.captureFromFile(file);
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Arrête la capture en cours
   */
  stopCapture(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  /**
   * Redimensionne une image
   */
  async resizeImage(
    imageData: string,
    maxWidth: number,
    maxHeight: number
  ): Promise<string> {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });

    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }
    if (height > maxHeight) {
      const ratio = maxHeight / height;
      height = maxHeight;
      width = Math.round(width * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  }

  /**
   * Convertit une image en niveaux de gris
   */
  async toGrayscale(imageData: string): Promise<string> {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageData;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0);
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageDataObj.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageDataObj, 0, 0);
    return canvas.toDataURL('image/png');
  }
}

export const screenCaptureService = new ScreenCaptureService();
export default ScreenCaptureService;
