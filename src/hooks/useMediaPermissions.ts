import { useState, useEffect, useCallback } from 'react';

/**
 * React hook to query and request camera / microphone permissions in a unified way.
 * Works gracefully when the Permissions API is not available (falls back to prompt state).
 */
export interface MediaPermissionsState {
  camera: PermissionState;
  microphone: PermissionState;
}

export interface UseMediaPermissionsResult {
  /** Current permission states */
  permissions: MediaPermissionsState;
  /** Manually refresh permission states */
  refreshPermissions: () => Promise<void>;
  /**
   * Request camera stream. Will trigger the browser permission dialog if needed.
   * Returns the MediaStream or null if the user denied / an error occurred.
   */
  requestCamera: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>;
  /** Request microphone stream. */
  requestMicrophone: (constraints?: MediaStreamConstraints) => Promise<MediaStream | null>;
}

// Helper to query a single permission; returns 'prompt' if API unsupported
async function queryPermission(name: PermissionName): Promise<PermissionState> {
  try {
    if ('permissions' in navigator && (navigator as any).permissions.query) {
      // Some browsers (e.g. Safari) do not yet support 'camera' / 'microphone' names.
      // Wrap in try/catch to avoid unhandled rejections.
       
      const status = await (navigator as any).permissions.query({ name });
      return status.state as PermissionState;
    }
  } catch {
    // Ignore errors and fall through to prompt
  }
  return 'prompt';
}

export function useMediaPermissions(): UseMediaPermissionsResult {
  const [permissions, setPermissions] = useState<MediaPermissionsState>({ camera: 'prompt', microphone: 'prompt' });

  const refreshPermissions = useCallback(async () => {
    const [cam, mic] = await Promise.all([queryPermission('camera'), queryPermission('microphone')]);
    setPermissions({ camera: cam, microphone: mic });
  }, []);

  useEffect(() => {
    refreshPermissions();

    // Register onchange listeners if supported
    const listeners: Array<PermissionStatus> = [];
    if ('permissions' in navigator && (navigator as any).permissions.query) {
      (async () => {
        try {
          const camStatus = await (navigator as any).permissions.query({ name: 'camera' });
          const micStatus = await (navigator as any).permissions.query({ name: 'microphone' });
          camStatus.onchange = micStatus.onchange = () => refreshPermissions();
          listeners.push(camStatus, micStatus);
        } catch {
          /* ignore */
        }
      })();
    }

    return () => {
      listeners.forEach((l) => (l.onchange = null));
    };
  }, [refreshPermissions]);

  const requestCamera = useCallback(async (constraints: MediaStreamConstraints = { video: true }): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await refreshPermissions();
      return stream;
    } catch (err) {
      console.error('Camera permission denied or error:', err);
      await refreshPermissions();
      return null;
    }
  }, [refreshPermissions]);

  const requestMicrophone = useCallback(async (constraints: MediaStreamConstraints = { audio: true }): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await refreshPermissions();
      return stream;
    } catch (err) {
      console.error('Microphone permission denied or error:', err);
      await refreshPermissions();
      return null;
    }
  }, [refreshPermissions]);

  return {
    permissions,
    refreshPermissions,
    requestCamera,
    requestMicrophone,
  };
}
