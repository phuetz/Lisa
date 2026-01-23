/**
 * Vibration Service - Custom Haptic Patterns for Lisa Android
 * Provides rich tactile feedback patterns for different interactions
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// ============================================================================
// Vibration Pattern Types
// ============================================================================

export type VibrationPattern = 
  | 'tap'           // Simple tap
  | 'success'       // Success confirmation
  | 'error'         // Error feedback
  | 'warning'       // Warning alert
  | 'notification'  // New notification
  | 'message'       // New message received
  | 'sent'          // Message sent
  | 'typing'        // Lisa is typing (subtle)
  | 'longPress'     // Long press activated
  | 'swipe'         // Swipe action
  | 'selection'     // Selection changed
  | 'toggle'        // Toggle switch
  | 'delete'        // Delete action
  | 'refresh'       // Pull to refresh
  | 'camera'        // Camera capture
  | 'voice'         // Voice recording start/stop
  | 'celebrate';    // Achievement/celebration

// ============================================================================
// Vibration Service Class
// ============================================================================

class VibrationService {
  private isNative: boolean;
  private enabled: boolean = true;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Enable or disable all vibrations
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if vibrations are available
   */
  isAvailable(): boolean {
    return this.isNative || 'vibrate' in navigator;
  }

  /**
   * Play a vibration pattern
   */
  async vibrate(pattern: VibrationPattern): Promise<void> {
    if (!this.enabled || !this.isAvailable()) return;

    try {
      if (this.isNative) {
        await this.playNativePattern(pattern);
      } else {
        this.playWebPattern(pattern);
      }
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }

  /**
   * Play native Capacitor haptic pattern
   */
  private async playNativePattern(pattern: VibrationPattern): Promise<void> {
    switch (pattern) {
      case 'tap':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;

      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;

      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;

      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;

      case 'notification':
        await Haptics.notification({ type: NotificationType.Success });
        await this.delay(100);
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;

      case 'message':
        await Haptics.impact({ style: ImpactStyle.Medium });
        await this.delay(80);
        await Haptics.impact({ style: ImpactStyle.Light });
        break;

      case 'sent':
        await Haptics.impact({ style: ImpactStyle.Light });
        await this.delay(50);
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;

      case 'typing':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;

      case 'longPress':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;

      case 'swipe':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;

      case 'selection':
        await Haptics.selectionChanged();
        break;

      case 'toggle':
        await Haptics.impact({ style: ImpactStyle.Light });
        await this.delay(30);
        await Haptics.impact({ style: ImpactStyle.Light });
        break;

      case 'delete':
        await Haptics.notification({ type: NotificationType.Warning });
        await this.delay(100);
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;

      case 'refresh':
        await Haptics.impact({ style: ImpactStyle.Medium });
        await this.delay(150);
        await Haptics.notification({ type: NotificationType.Success });
        break;

      case 'camera':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;

      case 'voice':
        await Haptics.impact({ style: ImpactStyle.Medium });
        await this.delay(100);
        await Haptics.impact({ style: ImpactStyle.Light });
        break;

      case 'celebrate':
        // Fun celebration pattern
        await Haptics.notification({ type: NotificationType.Success });
        await this.delay(150);
        await Haptics.impact({ style: ImpactStyle.Light });
        await this.delay(80);
        await Haptics.impact({ style: ImpactStyle.Medium });
        await this.delay(80);
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;

      default:
        await Haptics.impact({ style: ImpactStyle.Light });
    }
  }

  /**
   * Play web vibration pattern (fallback)
   */
  private playWebPattern(pattern: VibrationPattern): void {
    const patterns: Record<VibrationPattern, number[]> = {
      tap: [10],
      success: [50, 50, 50],
      error: [100, 50, 100, 50, 100],
      warning: [80, 40, 80],
      notification: [50, 100, 50],
      message: [30, 50, 20],
      sent: [20, 30, 40],
      typing: [10],
      longPress: [100],
      swipe: [30],
      selection: [15],
      toggle: [15, 30, 15],
      delete: [80, 50, 150],
      refresh: [50, 100, 50],
      camera: [100],
      voice: [50, 80, 30],
      celebrate: [50, 80, 30, 50, 30, 80],
    };

    const vibrationPattern = patterns[pattern] || [10];
    navigator.vibrate(vibrationPattern);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  async tap(): Promise<void> {
    return this.vibrate('tap');
  }

  async success(): Promise<void> {
    return this.vibrate('success');
  }

  async error(): Promise<void> {
    return this.vibrate('error');
  }

  async warning(): Promise<void> {
    return this.vibrate('warning');
  }

  async notification(): Promise<void> {
    return this.vibrate('notification');
  }

  async messageSent(): Promise<void> {
    return this.vibrate('sent');
  }

  async messageReceived(): Promise<void> {
    return this.vibrate('message');
  }

  async celebrate(): Promise<void> {
    return this.vibrate('celebrate');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const vibrationService = new VibrationService();

// ============================================================================
// React Hook
// ============================================================================

export const useVibration = () => {
  return {
    vibrate: vibrationService.vibrate.bind(vibrationService),
    tap: vibrationService.tap.bind(vibrationService),
    success: vibrationService.success.bind(vibrationService),
    error: vibrationService.error.bind(vibrationService),
    warning: vibrationService.warning.bind(vibrationService),
    notification: vibrationService.notification.bind(vibrationService),
    messageSent: vibrationService.messageSent.bind(vibrationService),
    messageReceived: vibrationService.messageReceived.bind(vibrationService),
    celebrate: vibrationService.celebrate.bind(vibrationService),
    setEnabled: vibrationService.setEnabled.bind(vibrationService),
    isAvailable: vibrationService.isAvailable.bind(vibrationService),
  };
};

export default vibrationService;
