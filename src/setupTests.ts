import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks for SDK Workers and Worklets
vi.mock('@lisa-sdk/vision/worker?worker', () => ({ 
  default: class MockVisionWorker {
    postMessage() {}
    onmessage = null;
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  } 
}));

vi.mock('@lisa-sdk/hearing/worker?worker', () => ({ 
  default: class MockHearingWorker {
    postMessage() {}
    onmessage = null;
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  } 
}));

vi.mock('@lisa-sdk/hearing/processor?url', () => ({ default: 'mock-processor-url' }));
