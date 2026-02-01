/**
 * Tests for VisionAgent
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisionAgent, type VisionIntent, type VisionTask } from '../implementations/VisionAgent';

// Mock MediaPipe
vi.mock('@mediapipe/tasks-vision', () => ({
  ObjectDetector: {
    createFromOptions: vi.fn().mockResolvedValue({
      detect: vi.fn().mockReturnValue({ detections: [] }),
      detectForVideo: vi.fn().mockReturnValue({ detections: [] }),
      setOptions: vi.fn().mockResolvedValue(undefined),
    }),
  },
  FaceLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detect: vi.fn().mockReturnValue({ faceLandmarks: [], faceBlendshapes: [] }),
      detectForVideo: vi.fn().mockReturnValue({ faceLandmarks: [], faceBlendshapes: [] }),
      setOptions: vi.fn().mockResolvedValue(undefined),
    }),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detect: vi.fn().mockReturnValue({ landmarks: [] }),
      detectForVideo: vi.fn().mockReturnValue({ landmarks: [] }),
      setOptions: vi.fn().mockResolvedValue(undefined),
    }),
  },
  HandLandmarker: {
    createFromOptions: vi.fn().mockResolvedValue({
      detect: vi.fn().mockReturnValue({ landmarks: [], handedness: [] }),
      detectForVideo: vi.fn().mockReturnValue({ landmarks: [], handedness: [] }),
      setOptions: vi.fn().mockResolvedValue(undefined),
    }),
  },
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
}));

// Mock TensorFlow
vi.mock('@tensorflow/tfjs', () => ({
  tidy: vi.fn((fn) => fn()),
  browser: {
    fromPixels: vi.fn().mockReturnValue({
      div: vi.fn().mockReturnValue({
        expandDims: vi.fn().mockReturnValue({}),
      }),
    }),
  },
  image: {
    resizeBilinear: vi.fn().mockReturnValue({
      div: vi.fn().mockReturnValue({
        expandDims: vi.fn().mockReturnValue({}),
      }),
    }),
  },
  argMax: vi.fn().mockReturnValue({
    arraySync: vi.fn().mockReturnValue([[]]),
  }),
}));

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn(),
  getDisplayMedia: vi.fn(),
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
});

// Mock document.createElement
const mockCanvas = {
  width: 640,
  height: 480,
  getContext: vi.fn().mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray(640 * 480 * 4),
    }),
  }),
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,test'),
};

const mockVideo = {
  srcObject: null,
  videoWidth: 640,
  videoHeight: 480,
  onloadedmetadata: null as any,
  onerror: null as any,
  play: vi.fn(),
};

vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'canvas') return mockCanvas as any;
  if (tag === 'video') return mockVideo as any;
  return {} as any;
});

// Mock Image
class MockImage {
  src = '';
  width = 640;
  height = 480;
  onload: (() => void) | null = null;

  constructor() {
    setTimeout(() => this.onload?.(), 0);
  }
}
(global as any).Image = MockImage;

describe('VisionAgent', () => {
  let agent: VisionAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMediaDevices.getUserMedia.mockReset();
    mockMediaDevices.getDisplayMedia.mockReset();
    agent = new VisionAgent();
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('VisionAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('visual content');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.0.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe('analysis');
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('scene_description');
      expect(agent.capabilities).toContain('object_detection');
      expect(agent.capabilities).toContain('image_analysis');
    });

    it('should have valid property set to true', () => {
      expect(agent.valid).toBe(true);
    });
  });

  describe('execute', () => {
    it('should return error for unknown intent', async () => {
      const result = await agent.execute({
        intent: 'unknown_intent' as VisionIntent,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown intent');
    });

    describe('get_capabilities intent', () => {
      it('should return available capabilities', async () => {
        const result = await agent.execute({
          intent: 'get_capabilities' as VisionIntent,
        });

        expect(result.success).toBe(true);
        expect(result.output).toHaveProperty('availableSources');
        expect(result.output).toHaveProperty('availableTasks');
        expect(result.output.availableSources).toContain('webcam');
        expect(result.output.availableSources).toContain('screenshot');
      });
    });

    describe('describe_scene intent', () => {
      it('should return error when webcam capture fails', async () => {
        mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

        const result = await agent.execute({
          intent: 'describe_scene' as VisionIntent,
          parameters: { source: 'webcam' },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to capture');
      });

      it('should return error for unsupported source', async () => {
        const result = await agent.execute({
          intent: 'describe_scene' as VisionIntent,
          parameters: { source: 'file' },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not implemented');
      });
    });

    describe('detect_objects intent', () => {
      it('should return error when capture fails', async () => {
        mockMediaDevices.getUserMedia.mockRejectedValue(new Error('No camera'));

        const result = await agent.execute({
          intent: 'detect_objects' as VisionIntent,
          parameters: { source: 'webcam' },
        });

        expect(result.success).toBe(false);
      });

      it('should return error for unsupported source', async () => {
        const result = await agent.execute({
          intent: 'detect_objects' as VisionIntent,
          parameters: { source: 'url' },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not implemented');
      });
    });

    describe('analyze_image intent', () => {
      it('should use provided imageData parameter', async () => {
        // Set up initialized state
        (agent as any).isInitialized = true;
        (agent as any).objectDetector = {
          detect: vi.fn().mockReturnValue({ detections: [] }),
          setOptions: vi.fn().mockResolvedValue(undefined),
        };
        (agent as any).faceLandmarker = {
          detect: vi.fn().mockReturnValue({ faceLandmarks: [], faceBlendshapes: [] }),
          setOptions: vi.fn().mockResolvedValue(undefined),
        };

        const result = await agent.execute({
          intent: 'analyze_image' as VisionIntent,
          parameters: {
            imageData: 'data:image/png;base64,testimage',
            task: 'general_description',
          },
        });

        // Should not fail due to missing capture since imageData is provided
        expect(result.success).toBe(true);
      });
    });
  });

  describe('canHandle', () => {
    it('should return high score for vision-related queries', async () => {
      const queries = [
        'What do you see?',
        'Look at the camera',
        'Describe what is in front of you',
        'Identify objects on screen',
      ];

      for (const query of queries) {
        const score = await agent.canHandle(query);
        expect(score).toBeGreaterThanOrEqual(0.7);
      }
    });

    it('should return high score for specific patterns', async () => {
      const score1 = await agent.canHandle('What do you see?');
      expect(score1).toBeGreaterThanOrEqual(0.7);

      const score2 = await agent.canHandle("What's on the screen?");
      expect(score2).toBeGreaterThanOrEqual(0.7);
    });

    it('should return different scores based on query relevance', async () => {
      const visionScore = await agent.canHandle('What do you see in the camera?');
      const otherScore = await agent.canHandle('Hello how are you?');
      // Vision related query should have higher or equal score
      expect(visionScore).toBeGreaterThanOrEqual(otherScore);
    });
  });

  describe('getCapabilities', () => {
    it('should return all capabilities', async () => {
      const capabilities = await agent.getCapabilities();

      expect(capabilities.length).toBeGreaterThanOrEqual(4);
      expect(capabilities.map(c => c.name)).toContain('describe_scene');
      expect(capabilities.map(c => c.name)).toContain('detect_objects');
      expect(capabilities.map(c => c.name)).toContain('analyze_image');
      expect(capabilities.map(c => c.name)).toContain('get_capabilities');
    });

    it('should include descriptions for all capabilities', async () => {
      const capabilities = await agent.getCapabilities();

      capabilities.forEach(cap => {
        expect(cap.description).toBeDefined();
        expect(cap.description.length).toBeGreaterThan(0);
      });
    });

    it('should include required parameters', async () => {
      const capabilities = await agent.getCapabilities();

      const analyzeImage = capabilities.find(c => c.name === 'analyze_image');
      expect(analyzeImage?.requiredParameters).toBeDefined();
      expect(analyzeImage?.requiredParameters.length).toBeGreaterThan(0);
    });
  });

  describe('initialization', () => {
    it('should have isReady getter', () => {
      expect(typeof agent.isReady).toBe('boolean');
    });

    it('should provide waitForInitialization method', async () => {
      const result = await agent.waitForInitialization();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('detectRealtime', () => {
    it('should return empty results when not initialized', () => {
      (agent as any).isInitialized = false;

      const mockVideoElement = {
        videoWidth: 640,
        videoHeight: 480,
      } as HTMLVideoElement;

      const result = agent.detectRealtime(mockVideoElement);

      expect(result.objects).toEqual([]);
      expect(result.faces).toEqual([]);
      expect(result.poses).toEqual([]);
      expect(result.hands).toEqual([]);
    });

    it('should return detection results when initialized', () => {
      (agent as any).isInitialized = true;
      (agent as any).objectDetector = {
        detectForVideo: vi.fn().mockReturnValue({
          detections: [
            {
              categories: [{ categoryName: 'person', score: 0.9 }],
              boundingBox: { originX: 10, originY: 20, width: 100, height: 200 },
            },
          ],
        }),
      };

      const mockVideoElement = {
        videoWidth: 640,
        videoHeight: 480,
      } as HTMLVideoElement;

      const result = agent.detectRealtime(mockVideoElement);

      expect(result.objects).toHaveLength(1);
      expect(result.objects[0].name).toBe('person');
      expect(result.objects[0].confidence).toBe(0.9);
    });
  });

  describe('setRunningMode', () => {
    it('should set mode on all detectors', async () => {
      const mockSetOptions = vi.fn().mockResolvedValue(undefined);

      (agent as any).isInitialized = true;
      (agent as any).objectDetector = { setOptions: mockSetOptions };
      (agent as any).faceLandmarker = { setOptions: mockSetOptions };
      (agent as any).poseLandmarker = { setOptions: mockSetOptions };
      (agent as any).handLandmarker = { setOptions: mockSetOptions };

      await agent.setRunningMode('VIDEO');

      expect(mockSetOptions).toHaveBeenCalledWith({ runningMode: 'VIDEO' });
    });

    it('should not throw when not initialized', async () => {
      (agent as any).isInitialized = false;

      await expect(agent.setRunningMode('IMAGE')).resolves.not.toThrow();
    });
  });

  describe('vision tasks', () => {
    beforeEach(() => {
      (agent as any).isInitialized = true;
    });

    it('should handle object_detection task', async () => {
      (agent as any).objectDetector = {
        detect: vi.fn().mockReturnValue({
          detections: [
            {
              categories: [{ categoryName: 'cat', score: 0.95 }],
              boundingBox: { originX: 50, originY: 50, width: 200, height: 200 },
            },
          ],
        }),
        setOptions: vi.fn().mockResolvedValue(undefined),
      };

      const result = await (agent as any).analyzeImage(
        'data:image/png;base64,test',
        'object_detection' as VisionTask
      );

      expect(result.objects).toHaveLength(1);
      expect(result.objects[0].name).toBe('cat');
    });

    it('should return result structure for face_detection task', async () => {
      // Set initialized to true and provide minimal detectors
      (agent as any).isInitialized = true;
      (agent as any).faceLandmarker = {
        detect: vi.fn().mockReturnValue({ faceLandmarks: [], faceBlendshapes: [] }),
        setOptions: vi.fn().mockResolvedValue(undefined),
      };
      (agent as any).objectDetector = null;

      const result = await (agent as any).analyzeImage(
        'data:image/png;base64,test',
        'face_detection' as VisionTask
      );

      // Should return a result with faceCount and processingTimeMs
      expect(result).toHaveProperty('faceCount');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result.faceCount).toBe(0);
    });

    it('should return result with objects array for detection tasks', async () => {
      (agent as any).isInitialized = true;
      (agent as any).faceLandmarker = {
        detect: vi.fn().mockReturnValue({ faceLandmarks: [], faceBlendshapes: [] }),
        setOptions: vi.fn().mockResolvedValue(undefined),
      };

      const result = await (agent as any).analyzeImage(
        'data:image/png;base64,test',
        'face_detection' as VisionTask
      );

      expect(result).toHaveProperty('objects');
      expect(Array.isArray(result.objects)).toBe(true);
    });

    it('should handle pose_detection task', async () => {
      (agent as any).poseLandmarker = {
        detect: vi.fn().mockReturnValue({
          landmarks: [[{ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }]],
        }),
        setOptions: vi.fn().mockResolvedValue(undefined),
      };

      const result = await (agent as any).analyzeImage(
        'data:image/png;base64,test',
        'pose_detection' as VisionTask
      );

      expect(result.description).toContain('person');
    });

    it('should handle hand_detection task', async () => {
      (agent as any).handLandmarker = {
        detect: vi.fn().mockReturnValue({
          landmarks: [[{ x: 0.5, y: 0.5, z: 0 }]],
          handedness: [[{ categoryName: 'Right', score: 0.9 }]],
        }),
        setOptions: vi.fn().mockResolvedValue(undefined),
      };

      const result = await (agent as any).analyzeImage(
        'data:image/png;base64,test',
        'hand_detection' as VisionTask
      );

      expect(result.description).toContain('hand');
    });

    it('should handle color_analysis task', async () => {
      const result = await (agent as any).analyzeImage(
        'data:image/png;base64,test',
        'color_analysis' as VisionTask
      );

      expect(result.dominantColors).toBeDefined();
      expect(Array.isArray(result.dominantColors)).toBe(true);
    });

    it('should include processing time in results', async () => {
      (agent as any).objectDetector = {
        detect: vi.fn().mockReturnValue({ detections: [] }),
        setOptions: vi.fn().mockResolvedValue(undefined),
      };
      (agent as any).faceLandmarker = {
        detect: vi.fn().mockReturnValue({ faceLandmarks: [], faceBlendshapes: [] }),
        setOptions: vi.fn().mockResolvedValue(undefined),
      };

      const result = await (agent as any).analyzeImage(
        'data:image/png;base64,test',
        'general_description' as VisionTask
      );

      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
