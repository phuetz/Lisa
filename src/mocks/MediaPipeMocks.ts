/**
 * Shared MediaPipe and Vision-related Mocks
 * Used across agent tests that depend on vision models (VisionAgent, ImageAnalysisAgent, OCRAgent, etc.)
 */

import { vi } from 'vitest';

/**
 * Mock ObjectDetector from @mediapipe/tasks-vision
 * Used for detecting objects in images/video
 */
export const createMockObjectDetector = () => ({
  detect: vi.fn(() => ({
    detections: [
      {
        categories: [{ categoryName: 'person', score: 0.95 }],
        boundingBox: {
          originX: 100,
          originY: 50,
          width: 200,
          height: 300
        }
      },
      {
        categories: [{ categoryName: 'chair', score: 0.87 }],
        boundingBox: {
          originX: 50,
          originY: 200,
          width: 150,
          height: 250
        }
      }
    ]
  })),
  detectForVideo: vi.fn(() => ({
    detections: [
      {
        categories: [{ categoryName: 'person', score: 0.92 }],
        boundingBox: {
          originX: 120,
          originY: 60,
          width: 180,
          height: 280
        }
      }
    ]
  })),
  setOptions: vi.fn().mockResolvedValue(undefined)
});

/**
 * Mock FaceLandmarker from @mediapipe/tasks-vision
 * Used for detecting faces and facial landmarks (468 landmarks per face)
 */
export const createMockFaceLandmarker = () => ({
  detect: vi.fn(() => ({
    faceLandmarks: [
      Array(478).fill({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.99
      })
    ],
    faceBlendshapes: [
      {
        categories: [
          { categoryName: 'smile', score: 0.7 },
          { categoryName: 'sad', score: 0.1 },
          { categoryName: 'angry', score: 0.05 },
          { categoryName: 'happy', score: 0.72 },
          { categoryName: 'frown', score: 0.08 }
        ]
      }
    ],
    facialTransformationMatrixes: [
      Array(16).fill(0) // 4x4 transformation matrix
    ]
  })),
  detectForVideo: vi.fn(() => ({
    faceLandmarks: [
      Array(478).fill({
        x: 0.48,
        y: 0.52,
        z: -0.01,
        visibility: 0.98
      })
    ],
    faceBlendshapes: [
      {
        categories: [
          { categoryName: 'smile', score: 0.65 }
        ]
      }
    ],
    facialTransformationMatrixes: [
      Array(16).fill(0)
    ]
  })),
  setOptions: vi.fn().mockResolvedValue(undefined)
});

/**
 * Mock PoseLandmarker from @mediapipe/tasks-vision
 * Used for detecting human body pose (33 landmarks)
 */
export const createMockPoseLandmarker = () => ({
  detect: vi.fn(() => ({
    landmarks: [
      Array(33).fill({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.9
      })
    ],
    worldLandmarks: [
      Array(33).fill({
        x: 0,
        y: 0,
        z: 0,
        visibility: 0.9
      })
    ]
  })),
  detectForVideo: vi.fn(() => ({
    landmarks: [
      Array(33).fill({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.88
      })
    ],
    worldLandmarks: [
      Array(33).fill({
        x: 0,
        y: 0,
        z: 0,
        visibility: 0.88
      })
    ]
  })),
  setOptions: vi.fn().mockResolvedValue(undefined)
});

/**
 * Mock HandLandmarker from @mediapipe/tasks-vision
 * Used for detecting hands and hand landmarks (21 landmarks per hand)
 */
export const createMockHandLandmarker = () => ({
  detect: vi.fn(() => ({
    landmarks: [
      Array(21).fill({
        x: 0.6,
        y: 0.4,
        z: 0
      })
    ],
    worldLandmarks: [
      Array(21).fill({
        x: 0,
        y: 0,
        z: 0
      })
    ],
    handedness: [
      [{ categoryName: 'Right', score: 0.95 }]
    ]
  })),
  detectForVideo: vi.fn(() => ({
    landmarks: [
      Array(21).fill({
        x: 0.58,
        y: 0.42,
        z: 0
      })
    ],
    worldLandmarks: [
      Array(21).fill({
        x: 0,
        y: 0,
        z: 0
      })
    ],
    handedness: [
      [{ categoryName: 'Right', score: 0.92 }]
    ]
  })),
  setOptions: vi.fn().mockResolvedValue(undefined)
});

/**
 * Mock FilesetResolver from @mediapipe/tasks-vision
 * Provides access to vision model files
 */
export const createMockFilesetResolver = () => ({
  forVisionTasks: vi.fn(async () => ({
    // Returns a resolved fileset for use with MediaPipe detectors
  }))
});

/**
 * Setup all MediaPipe mocks for vision tests
 * Call this in your test setup or within vi.mock() calls
 */
export const setupMediaPipeMocks = () => {
  vi.mock('@mediapipe/tasks-vision', () => ({
    ObjectDetector: {
      createFromOptions: vi.fn(async () => createMockObjectDetector())
    },
    FaceLandmarker: {
      createFromOptions: vi.fn(async () => createMockFaceLandmarker())
    },
    PoseLandmarker: {
      createFromOptions: vi.fn(async () => createMockPoseLandmarker())
    },
    HandLandmarker: {
      createFromOptions: vi.fn(async () => createMockHandLandmarker())
    },
    FilesetResolver: {
      forVisionTasks: vi.fn(async () => ({}))
    }
  }));
};

/**
 * Mock Tesseract.js Worker for OCR tasks
 * Used by OCRAgent for text recognition
 */
export const createMockTesseractWorker = () => ({
  recognize: vi.fn(async (image: string) => ({
    data: {
      text: 'Recognized text from image',
      confidence: 0.92,
      words: [
        { text: 'Recognized', confidence: 0.95 },
        { text: 'text', confidence: 0.93 },
        { text: 'from', confidence: 0.90 },
        { text: 'image', confidence: 0.89 }
      ]
    }
  })),
  terminate: vi.fn(async () => {}),
  load: vi.fn(async () => {}),
  loadLanguage: vi.fn(async () => {}),
  initialize: vi.fn(async () => {})
});

/**
 * Mock Canvas API methods for image analysis
 */
export const createMockCanvasContext = () => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(1024),
    width: 256,
    height: 256
  })),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1
});

export const createMockCanvas = () => ({
  width: 640,
  height: 480,
  getContext: vi.fn(() => createMockCanvasContext()),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  toBlob: vi.fn((callback: BlobCallback) => {
    callback(new Blob(['mock'], { type: 'image/png' }));
  })
});

/**
 * Mock Image constructor for image loading
 */
export class MockImage {
  src = '';
  width = 640;
  height = 480;
  onload: (() => void) | null = null;
  onerror: ((error: Event) => void) | null = null;

  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

/**
 * Mock Video element for video stream capture
 */
export const createMockVideoElement = () => ({
  srcObject: null as MediaStream | null,
  videoWidth: 640,
  videoHeight: 480,
  onloadedmetadata: null as (() => void) | null,
  onerror: null as ((error: Event) => void) | null,
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
});

/**
 * Mock MediaDevices API for camera/screen capture
 */
export const createMockMediaDevices = () => ({
  getUserMedia: vi.fn(async () => ({
    getTracks: vi.fn(() => [
      { stop: vi.fn(), kind: 'video', enabled: true }
    ]),
    getVideoTracks: vi.fn(() => [
      { stop: vi.fn(), enabled: true }
    ]),
    getAudioTracks: vi.fn(() => [])
  })),
  getDisplayMedia: vi.fn(async () => ({
    getTracks: vi.fn(() => [
      { stop: vi.fn(), kind: 'video', enabled: true }
    ]),
    getVideoTracks: vi.fn(() => [
      { stop: vi.fn(), enabled: true }
    ])
  })),
  enumerateDevices: vi.fn(async () => [
    { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
    { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' }
  ])
});

/**
 * Mock TensorFlow.js for ML operations
 */
export const createMockTensorFlow = () => ({
  tidy: vi.fn((fn: () => any) => fn()),
  browser: {
    fromPixels: vi.fn(() => ({
      div: vi.fn().mockReturnValue({
        expandDims: vi.fn().mockReturnValue({})
      })
    }))
  },
  image: {
    resizeBilinear: vi.fn(() => ({
      div: vi.fn().mockReturnValue({
        expandDims: vi.fn().mockReturnValue({})
      })
    }))
  },
  argMax: vi.fn(() => ({
    arraySync: vi.fn().mockReturnValue([[]])
  }))
});

/**
 * Helper to setup all vision-related mocks at once
 */
export const setupAllVisionMocks = () => {
  // Mock navigator.mediaDevices
  const mockMediaDevices = createMockMediaDevices();
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: mockMediaDevices,
    writable: true
  });

  // Mock document.createElement for canvas and video elements
  const originalCreateElement = document.createElement;
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      return createMockCanvas() as any;
    }
    if (tag === 'video') {
      return createMockVideoElement() as any;
    }
    return originalCreateElement.call(document, tag);
  });

  // Mock global Image
  (global as any).Image = MockImage;
};

/**
 * Mock result builders for vision operations
 */
export const createMockDetectionResult = (overrides = {}) => ({
  success: true,
  output: {
    objects: [
      {
        name: 'person',
        confidence: 0.95,
        boundingBox: { x: 100, y: 50, width: 200, height: 300 }
      }
    ],
    processingTimeMs: 45,
    ...overrides
  }
});

export const createMockFaceDetectionResult = (overrides = {}) => ({
  success: true,
  output: {
    faceCount: 1,
    objects: [
      {
        name: 'face',
        confidence: 1.0,
        boundingBox: { x: 150, y: 100, width: 200, height: 250 },
        attributes: { isSmiling: 1, landmarks: 478 }
      }
    ],
    processingTimeMs: 52,
    ...overrides
  }
});

export const createMockSceneAnalysisResult = (overrides = {}) => ({
  success: true,
  output: {
    description: 'A room with furniture',
    sceneCategories: [
      { category: 'indoor', confidence: 0.92 },
      { category: 'room', confidence: 0.88 }
    ],
    objects: [],
    processingTimeMs: 48,
    ...overrides
  }
});

export const createMockOCRResult = (overrides = {}) => ({
  success: true,
  output: {
    text: 'Extracted text from image',
    confidence: 0.92,
    words: [
      { text: 'Extracted', confidence: 0.95 },
      { text: 'text', confidence: 0.93 }
    ],
    processingTimeMs: 156,
    ...overrides
  }
});
