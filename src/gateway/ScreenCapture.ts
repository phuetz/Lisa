/**
 * Lisa Screen Capture
 * Screen recording and screenshot capabilities
 * Inspired by OpenClaw's screen.record node
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface ScreenCaptureConfig {
  quality: 'low' | 'medium' | 'high';
  format: 'png' | 'jpeg' | 'webp';
  maxDuration: number; // seconds for video
  fps: number;
  audio: boolean;
  cursor: boolean;
}

export interface Screenshot {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  format: string;
  size: number;
  timestamp: Date;
  source: 'screen' | 'window' | 'tab';
}

export interface Recording {
  id: string;
  status: RecordingStatus;
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  chunks: Blob[];
  format: string;
  size: number;
}

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped' | 'error';

const DEFAULT_CONFIG: ScreenCaptureConfig = {
  quality: 'high',
  format: 'png',
  maxDuration: 300, // 5 minutes
  fps: 30,
  audio: false,
  cursor: true
};

export class ScreenCapture extends BrowserEventEmitter {
  private config: ScreenCaptureConfig;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private currentRecording: Recording | null = null;
  private screenshots: Screenshot[] = [];
  private recordings: Recording[] = [];

  constructor(config: Partial<ScreenCaptureConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  // Configuration
  configure(config: Partial<ScreenCaptureConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:changed', this.config);
  }

  getConfig(): ScreenCaptureConfig {
    return { ...this.config };
  }

  // Screenshot
  async captureScreen(options?: { 
    source?: 'screen' | 'window' | 'tab';
    quality?: number;
  }): Promise<Screenshot | null> {
    try {
      // Request screen capture permission
      const stream = await this.getDisplayMedia();
      if (!stream) return null;

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait for video to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.stopStream(stream);
        return null;
      }

      ctx.drawImage(video, 0, 0);

      // Get data URL
      const quality = options?.quality || (this.config.quality === 'high' ? 0.95 : this.config.quality === 'medium' ? 0.8 : 0.6);
      const dataUrl = canvas.toDataURL(`image/${this.config.format}`, quality);

      // Stop stream
      this.stopStream(stream);

      const screenshot: Screenshot = {
        id: this.generateId('screenshot'),
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        format: this.config.format,
        size: dataUrl.length,
        timestamp: new Date(),
        source: options?.source || 'screen'
      };

      this.screenshots.push(screenshot);
      this.emit('screenshot:captured', screenshot);

      return screenshot;
    } catch (error) {
      this.emit('screenshot:error', { error });
      return null;
    }
  }

  // Get display media
  private async getDisplayMedia(): Promise<MediaStream | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      this.emit('error', { message: 'Screen capture not supported' });
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: this.config.cursor ? 'always' : 'never',
          frameRate: this.config.fps
        } as MediaTrackConstraints,
        audio: this.config.audio
      });
      return stream;
    } catch (error) {
      if ((error as Error).name === 'NotAllowedError') {
        this.emit('permission:denied');
      }
      throw error;
    }
  }

  private stopStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => track.stop());
  }

  // Recording
  async startRecording(): Promise<boolean> {
    if (this.currentRecording?.status === 'recording') {
      return false;
    }

    try {
      this.mediaStream = await this.getDisplayMedia();
      if (!this.mediaStream) return false;

      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        videoBitsPerSecond: this.getVideoBitrate()
      });

      this.currentRecording = {
        id: this.generateId('recording'),
        status: 'recording',
        startedAt: new Date(),
        duration: 0,
        chunks: [],
        format: mimeType,
        size: 0
      };

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.currentRecording) {
          this.currentRecording.chunks.push(event.data);
          this.currentRecording.size += event.data.size;
          this.emit('recording:data', { size: event.data.size });
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.currentRecording) {
          this.currentRecording.status = 'stopped';
          this.currentRecording.endedAt = new Date();
          this.currentRecording.duration = 
            (this.currentRecording.endedAt.getTime() - this.currentRecording.startedAt.getTime()) / 1000;
          
          this.recordings.push(this.currentRecording);
          this.emit('recording:stopped', this.currentRecording);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        this.emit('recording:error', { error: event });
        if (this.currentRecording) {
          this.currentRecording.status = 'error';
        }
      };

      // Start recording with chunks every second
      this.mediaRecorder.start(1000);

      // Handle stream ending (user clicked stop share)
      this.mediaStream.getVideoTracks()[0].onended = () => {
        this.stopRecording();
      };

      // Auto-stop after max duration
      setTimeout(() => {
        if (this.currentRecording?.status === 'recording') {
          this.stopRecording();
        }
      }, this.config.maxDuration * 1000);

      this.emit('recording:started', this.currentRecording);
      return true;
    } catch (error) {
      this.emit('recording:error', { error });
      return false;
    }
  }

  pauseRecording(): boolean {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return false;
    }

    this.mediaRecorder.pause();
    if (this.currentRecording) {
      this.currentRecording.status = 'paused';
    }
    this.emit('recording:paused');
    return true;
  }

  resumeRecording(): boolean {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'paused') {
      return false;
    }

    this.mediaRecorder.resume();
    if (this.currentRecording) {
      this.currentRecording.status = 'recording';
    }
    this.emit('recording:resumed');
    return true;
  }

  stopRecording(): Recording | null {
    if (!this.mediaRecorder) {
      return null;
    }

    this.mediaRecorder.stop();
    
    if (this.mediaStream) {
      this.stopStream(this.mediaStream);
      this.mediaStream = null;
    }

    const recording = this.currentRecording;
    this.currentRecording = null;
    this.mediaRecorder = null;

    return recording;
  }

  // Get recording as blob
  async getRecordingBlob(recordingId: string): Promise<Blob | null> {
    const recording = this.recordings.find(r => r.id === recordingId);
    if (!recording || recording.chunks.length === 0) {
      return null;
    }

    return new Blob(recording.chunks, { type: recording.format });
  }

  // Download recording
  async downloadRecording(recordingId: string, filename?: string): Promise<boolean> {
    const blob = await this.getRecordingBlob(recordingId);
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `recording-${recordingId}.webm`;
    a.click();
    URL.revokeObjectURL(url);

    return true;
  }

  // Download screenshot
  downloadScreenshot(screenshotId: string, filename?: string): boolean {
    const screenshot = this.screenshots.find(s => s.id === screenshotId);
    if (!screenshot) return false;

    const a = document.createElement('a');
    a.href = screenshot.dataUrl;
    a.download = filename || `screenshot-${screenshotId}.${screenshot.format}`;
    a.click();

    return true;
  }

  // Helpers
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  private getVideoBitrate(): number {
    switch (this.config.quality) {
      case 'high': return 5000000; // 5 Mbps
      case 'medium': return 2500000; // 2.5 Mbps
      case 'low': return 1000000; // 1 Mbps
      default: return 2500000;
    }
  }

  // Getters
  getScreenshots(): Screenshot[] {
    return [...this.screenshots];
  }

  getRecordings(): Recording[] {
    return [...this.recordings];
  }

  getCurrentRecording(): Recording | null {
    return this.currentRecording;
  }

  isRecording(): boolean {
    return this.currentRecording?.status === 'recording';
  }

  // Cleanup
  clearScreenshots(): void {
    this.screenshots = [];
    this.emit('screenshots:cleared');
  }

  clearRecordings(): void {
    this.recordings = [];
    this.emit('recordings:cleared');
  }

  // Stats
  getStats(): {
    screenshotCount: number;
    recordingCount: number;
    isRecording: boolean;
    totalRecordingSize: number;
  } {
    return {
      screenshotCount: this.screenshots.length,
      recordingCount: this.recordings.length,
      isRecording: this.isRecording(),
      totalRecordingSize: this.recordings.reduce((sum, r) => sum + r.size, 0)
    };
  }
}

// Singleton
let screenCaptureInstance: ScreenCapture | null = null;

export function getScreenCapture(): ScreenCapture {
  if (!screenCaptureInstance) {
    screenCaptureInstance = new ScreenCapture();
  }
  return screenCaptureInstance;
}

export function resetScreenCapture(): void {
  if (screenCaptureInstance) {
    screenCaptureInstance.stopRecording();
    screenCaptureInstance.removeAllListeners();
    screenCaptureInstance = null;
  }
}

