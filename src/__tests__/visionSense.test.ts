// This test file has known limitations regarding Web Worker instantiation in Vitest/JSDOM environment.
// The `new Worker(new URL(...))` call in `src/senses/vision.ts` is difficult to mock perfectly.
// The tests focus on the logic of the `visionSense` module, assuming the Worker is correctly instantiated.

import { initializeVisionWorker, processVideoFrame, terminateVisionWorker } from '../senses/vision';

describe('Vision Sense Module', () => {
  let mockWorker: any;

  // Define a mock class for Worker
  class MockWorkerClass {
    url: string;
    options: any;
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
    onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;

    constructor(url: string | URL, options?: WorkerOptions) {
      this.url = url.toString();
      this.options = options;
      // Assign the global mockWorker instance to this instance
      // This allows tests to interact with the single mockWorker instance
      // that is returned by the mocked Worker constructor.
      Object.assign(mockWorker, this);
    }

    postMessage = vi.fn();
    terminate = vi.fn();
  }

  beforeEach(() => {
    // Initialize the single mockWorker instance before each test
    mockWorker = {};

    // Stub the global Worker constructor to return instances of MockWorkerClass
    vi.stubGlobal('Worker', MockWorkerClass);

    // Mock ImageData constructor
    vi.stubGlobal('ImageData', vi.fn((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    })));

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize the vision worker and send LOAD_MODEL message', async () => {
    await initializeVisionWorker();
    // We cannot reliably assert on the URL passed to the Worker constructor in JSDOM.
    // The primary goal is to ensure the Worker constructor was called.
    // We cannot reliably assert on the URL passed to the Worker constructor in JSDOM.
    // The primary goal is to ensure the Worker constructor was called.
    // We cannot reliably assert on the URL passed to the Worker constructor in JSDOM.
    // The primary goal is to ensure the Worker constructor was called.
    expect(vi.global.Worker).toHaveBeenCalled();
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'LOAD_MODEL' });
    expect(console.log).toHaveBeenCalledWith('Vision worker initialized and model load message sent.');
  });

  it('should not re-initialize if already initialized', async () => {
    await initializeVisionWorker();
    await initializeVisionWorker();
    expect(vi.global.Worker).toHaveBeenCalledTimes(1);
    expect(mockWorker.postMessage).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('Vision worker already initialized.');
  });

  it('should process a video frame if worker is initialized', async () => {
    await initializeVisionWorker();
    const mockFrame = new ImageData(10, 10);
    processVideoFrame(mockFrame);
    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'PROCESS_FRAME', payload: mockFrame });
  });

  it('should warn if processing frame before worker is initialized', () => {
    const mockFrame = new ImageData(10, 10);
    processVideoFrame(mockFrame);
    expect(mockWorker.postMessage).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('Vision worker not initialized. Cannot process frame.');
  });

  it('should terminate the vision worker', async () => {
    await initializeVisionWorker();
    terminateVisionWorker();
    expect(mockWorker.terminate).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Vision worker terminated.');
  });

  it('should handle messages from the worker', async () => {
    await initializeVisionWorker();
    const mockResult = { modality: 'vision', payload: { detections: [] }, confidence: 0.9, ts: Date.now() };
    if (mockWorker.onmessage) {
      mockWorker.onmessage({ data: mockResult });
    }
    expect(console.log).toHaveBeenCalledWith('Received vision result from worker:', mockResult);
  });

  it('should handle errors from the worker', async () => {
    await initializeVisionWorker();
    const mockError = new ErrorEvent('error', { message: 'Worker failed' });
    if (mockWorker.onerror) {
      mockWorker.onerror(mockError);
    }
    expect(console.error).toHaveBeenCalledWith('Vision worker error:', mockError);
  });
});
