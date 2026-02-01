/**
 * ErrorService Tests
 * Tests for error management and user-friendly error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console.error to avoid noise in test output
vi.spyOn(console, 'error').mockImplementation(() => {});

// Import after mocks
import { errorService, ErrorCodes } from '../ErrorService';
import type { UserFriendlyError as _UserFriendlyError, ErrorContext } from '../ErrorService';

describe('ErrorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorService.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createError', () => {
    it('should create error from known error code', () => {
      const error = errorService.createError(ErrorCodes.NETWORK_ERROR);

      expect(error).toBeDefined();
      expect(error.id).toMatch(/^err_/);
      expect(error.title).toBe('Problème de connexion');
      expect(error.severity).toBe('error');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with context', () => {
      const context: ErrorContext = {
        component: 'ChatInput',
        action: 'sendMessage',
        agentName: 'ChatAgent',
      };

      const error = errorService.createError(ErrorCodes.TIMEOUT, context);

      expect(error.details).toContain('ChatInput');
      expect(error.details).toContain('sendMessage');
      expect(error.details).toContain('ChatAgent');
    });

    it('should use custom message when provided', () => {
      const customMessage = 'Custom error message';
      const error = errorService.createError(ErrorCodes.UNKNOWN_ERROR, undefined, customMessage);

      expect(error.message).toBe(customMessage);
    });

    it('should use default template for unknown codes', () => {
      const error = errorService.createError('NONEXISTENT_CODE');

      expect(error.title).toBe('Erreur inattendue');
      expect(error.severity).toBe('error');
    });
  });

  describe('fromException', () => {
    it('should detect network errors', () => {
      const networkError = new Error('Network request failed');
      const error = errorService.fromException(networkError);

      expect(error.title).toBe('Problème de connexion');
    });

    it('should detect timeout errors', () => {
      const timeoutError = new Error('Request timed out');
      const error = errorService.fromException(timeoutError);

      expect(error.title).toBe('Délai dépassé');
    });

    it('should detect LM Studio errors', () => {
      const lmError = new Error('Failed to connect to LM Studio');
      const error = errorService.fromException(lmError);

      expect(error.title).toBe('LM Studio non disponible');
    });

    it('should detect camera permission errors', () => {
      const cameraError = new Error('Permission denied for camera video access');
      const error = errorService.fromException(cameraError);

      expect(error.title).toBe('Accès caméra refusé');
    });

    it('should detect microphone permission errors', () => {
      const micError = new Error('Permission denied for microphone audio access');
      const error = errorService.fromException(micError);

      expect(error.title).toBe('Accès microphone refusé');
    });

    it('should detect storage errors', () => {
      const storageError = new Error('QuotaExceededError: storage quota exceeded');
      const error = errorService.fromException(storageError);

      expect(error.title).toBe('Stockage plein');
    });

    it('should handle non-Error objects', () => {
      const error = errorService.fromException('String error');

      expect(error.title).toBe('Erreur inattendue');
    });

    it('should include context in error', () => {
      const context: ErrorContext = { component: 'VisionPanel' };
      const error = errorService.fromException(new Error('Test'), context);

      expect(error.details).toContain('VisionPanel');
    });
  });

  describe('Error Management', () => {
    it('should get active errors (non-dismissed)', () => {
      errorService.createError(ErrorCodes.NETWORK_ERROR);
      errorService.createError(ErrorCodes.TIMEOUT);

      const active = errorService.getActiveErrors();

      expect(active.length).toBe(2);
    });

    it('should get all errors including dismissed', () => {
      const error1 = errorService.createError(ErrorCodes.NETWORK_ERROR);
      errorService.createError(ErrorCodes.TIMEOUT);

      errorService.dismissError(error1.id);

      expect(errorService.getActiveErrors().length).toBe(1);
      expect(errorService.getAllErrors().length).toBe(2);
    });

    it('should dismiss a specific error', () => {
      const error = errorService.createError(ErrorCodes.NETWORK_ERROR);

      expect(errorService.getActiveErrors().length).toBe(1);

      errorService.dismissError(error.id);

      expect(errorService.getActiveErrors().length).toBe(0);
    });

    it('should dismiss all errors', () => {
      errorService.createError(ErrorCodes.NETWORK_ERROR);
      errorService.createError(ErrorCodes.TIMEOUT);
      errorService.createError(ErrorCodes.STORAGE_ERROR);

      expect(errorService.getActiveErrors().length).toBe(3);

      errorService.dismissAll();

      expect(errorService.getActiveErrors().length).toBe(0);
    });

    it('should clear all errors', () => {
      errorService.createError(ErrorCodes.NETWORK_ERROR);
      errorService.createError(ErrorCodes.TIMEOUT);

      errorService.clearAll();

      expect(errorService.getAllErrors().length).toBe(0);
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers when errors change', () => {
      const callback = vi.fn();

      const unsubscribe = errorService.subscribe(callback);

      errorService.createError(ErrorCodes.NETWORK_ERROR);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.any(Array));

      unsubscribe();
    });

    it('should stop notifying after unsubscribe', () => {
      const callback = vi.fn();

      const unsubscribe = errorService.subscribe(callback);
      errorService.createError(ErrorCodes.NETWORK_ERROR);

      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      errorService.createError(ErrorCodes.TIMEOUT);

      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('Toast Methods', () => {
    it('should show toast with custom title and message', () => {
      const error = errorService.showToast('Custom Title', 'Custom message');

      expect(error.id).toMatch(/^toast_/);
      expect(error.title).toBe('Custom Title');
      expect(error.message).toBe('Custom message');
    });

    it('should show success toast with info severity', () => {
      const error = errorService.showSuccess('Success', 'Operation completed');

      expect(error.severity).toBe('info');
      expect(error.title).toBe('Success');
    });
  });

  describe('Error Code Constants', () => {
    it('should export all error codes', () => {
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(ErrorCodes.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorCodes.LM_STUDIO_UNAVAILABLE).toBe('LM_STUDIO_UNAVAILABLE');
      expect(ErrorCodes.AGENT_NOT_FOUND).toBe('AGENT_NOT_FOUND');
      expect(ErrorCodes.CAMERA_ACCESS_DENIED).toBe('CAMERA_ACCESS_DENIED');
      expect(ErrorCodes.MICROPHONE_ACCESS_DENIED).toBe('MICROPHONE_ACCESS_DENIED');
      expect(ErrorCodes.STORAGE_FULL).toBe('STORAGE_FULL');
      expect(ErrorCodes.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Error Limit', () => {
    it('should limit stored errors to maxErrors', () => {
      // Create more than maxErrors (50)
      for (let i = 0; i < 60; i++) {
        errorService.createError(ErrorCodes.NETWORK_ERROR);
      }

      const allErrors = errorService.getAllErrors();

      expect(allErrors.length).toBeLessThanOrEqual(50);
    });
  });
});
