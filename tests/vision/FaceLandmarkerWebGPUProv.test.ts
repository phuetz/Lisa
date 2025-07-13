import { describe, it, expect, vi } from 'vitest';

const mockCreate = vi.fn();
const mockFileset = {};

vi.mock('../../src/vision/provider/FaceLandmarkerWebGPUProv', async () => {
  const actual = await vi.importActual<any>('../../src/vision/provider/FaceLandmarkerWebGPUProv');
  return actual;
});

vi.mock('@mediapipe/tasks-vision', () => ({
  FaceLandmarker: { createFromOptions: mockCreate },
  FilesetResolver: { forVisionTasks: vi.fn().mockResolvedValue(mockFileset) },
}));

import { FaceLandmarkerWebGPUProv } from '../../src/vision/provider/FaceLandmarkerWebGPUProv';

describe('FaceLandmarkerWebGPUProv', () => {
  it('falls back to CPU if navigator.gpu undefined', async () => {
    const originalGpu = (globalThis.navigator as any).gpu;
    Object.defineProperty(globalThis.navigator, 'gpu', { value: undefined, configurable: true });
    const mockModel = { baseOptions: { delegate: 'CPU' }, detectForVideo: vi.fn(), close: vi.fn() } as any;
    mockCreate.mockResolvedValue(mockModel);

    const prov = new FaceLandmarkerWebGPUProv();
    await prov.init('/models/face_landmarker.task');

    expect(prov['landmarker'].baseOptions.delegate).toBe('CPU');
    Object.defineProperty(globalThis.navigator, 'gpu', { value: originalGpu, configurable: true });
  });
});
