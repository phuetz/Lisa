import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useMediaPermissions } from '@/hooks/useMediaPermissions';

// Helper component to expose hook values
function TestComponent() {
  const { permissions } = useMediaPermissions();
  return (
    <div data-camera={permissions.camera} data-micro={permissions.microphone} />
  );
}

describe('useMediaPermissions', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  it('falls back to "prompt" when Permissions API is not available', async () => {
    // Ensure permissions API is undefined
    // @ts-expect-error -- deleting navigator.permissions to simulate environments where the Permissions API is unavailable
    delete navigator.permissions;

    const { container } = render(<TestComponent />);

    await waitFor(() => {
      const div = container.querySelector('div') as HTMLDivElement;
      expect(div.dataset.camera).toBe('prompt');
      expect(div.dataset.micro).toBe('prompt');
    });
  });

  it('returns queried states when Permissions API is available', async () => {
    // Mock permissions.query
    const camStatus: PermissionStatus = {
      state: 'granted',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as PermissionStatus;
    const micStatus: PermissionStatus = {
      state: 'denied',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as PermissionStatus;
    (navigator as any).permissions = {
      query: vi.fn(({ name }: { name: PermissionName }) => {
        if (name === 'camera') return Promise.resolve(camStatus);
        if (name === 'microphone') return Promise.resolve(micStatus);
        return Promise.resolve({ state: 'prompt' });
      }),
    };

    const { container } = render(<TestComponent />);

    await waitFor(() => {
      const div = container.querySelector('div') as HTMLDivElement;
      expect(div.dataset.camera).toBe('granted');
      expect(div.dataset.micro).toBe('denied');
    });
  });
});
