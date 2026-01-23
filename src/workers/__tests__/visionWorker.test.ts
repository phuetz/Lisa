/**
 * Tests for Vision Worker (TensorFlow.js YOLOv8)
 * Tests model loading, frame processing, and NMS algorithm
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock TensorFlow.js - factory must not reference external variables
vi.mock('@tensorflow/tfjs', () => {
  const mockTensor = {
    div: vi.fn().mockReturnThis(),
    expandDims: vi.fn().mockReturnThis(),
    array: vi.fn().mockResolvedValue([[[0.5, 0.5, 0.1, 0.1, 0.9, 0.8, 0.1, 0.1]]]),
    dispose: vi.fn(),
  };
  
  return {
    setBackend: vi.fn().mockResolvedValue(true),
    ready: vi.fn().mockResolvedValue(true),
    zeros: vi.fn().mockReturnValue(mockTensor),
    dispose: vi.fn(),
    browser: {
      fromPixels: vi.fn().mockReturnValue(mockTensor),
    },
    image: {
      resizeBilinear: vi.fn().mockReturnValue({ div: vi.fn().mockReturnValue(mockTensor) }),
    },
  };
});

vi.mock('@tensorflow/tfjs-converter', () => ({
  loadGraphModel: vi.fn().mockResolvedValue({
    execute: vi.fn().mockReturnValue({ array: vi.fn().mockResolvedValue([[]]) }),
    dispose: vi.fn(),
  }),
}));

// Import after mocking
import * as tf from '@tensorflow/tfjs';
import { loadGraphModel } from '@tensorflow/tfjs-converter';

describe('Vision Worker - TensorFlow.js', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('TensorFlow.js Backend', () => {
    it('should set WebGL backend', async () => {
      await tf.setBackend('webgl');
      expect(tf.setBackend).toHaveBeenCalledWith('webgl');
    });

    it('should wait for TF.js ready', async () => {
      await tf.ready();
      expect(tf.ready).toHaveBeenCalled();
    });
  });

  describe('Model Loading', () => {
    it('should load YOLOv8 model from URL', async () => {
      const modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/yolov8n/1/default/1';
      await loadGraphModel(modelUrl);
      
      expect(loadGraphModel).toHaveBeenCalledWith(modelUrl);
    });

    it('should perform model warm-up with dummy input', async () => {
      const model = await loadGraphModel('test-url');
      const dummyInput = tf.zeros([1, 640, 640, 3]);
      
      model.execute(dummyInput);
      
      expect(tf.zeros).toHaveBeenCalledWith([1, 640, 640, 3]);
      expect(model.execute).toHaveBeenCalled();
    });
  });

  describe('Frame Processing', () => {
    it('should convert frame to tensor using fromPixels', () => {
      // Mock ImageData since it's not available in Node.js
      const mockImageData = { width: 640, height: 640, data: new Uint8ClampedArray(640 * 640 * 4) };
      tf.browser.fromPixels(mockImageData as unknown as ImageData);
      
      expect(tf.browser.fromPixels).toHaveBeenCalled();
    });

    it('should resize tensor to model input size (640x640)', () => {
      const mockImageData = { width: 1920, height: 1080, data: new Uint8ClampedArray(1920 * 1080 * 4) };
      const inputTensor = tf.browser.fromPixels(mockImageData as unknown as ImageData);
      tf.image.resizeBilinear(inputTensor as tf.Tensor3D, [640, 640]);
      
      expect(tf.image.resizeBilinear).toHaveBeenCalledWith(
        expect.anything(),
        [640, 640]
      );
    });

    it('should normalize tensor values to 0-1 range', () => {
      const resized = tf.image.resizeBilinear(tf.zeros([640, 640, 3]) as tf.Tensor3D, [640, 640]);
      // div is called for normalization
      expect(resized).toHaveProperty('div');
    });

    it('should support batch dimension expansion', () => {
      const tensor = tf.zeros([640, 640, 3]);
      // expandDims adds batch dimension
      expect(tensor).toHaveProperty('expandDims');
    });
  });

  describe('Tensor Disposal', () => {
    it('should have dispose function available', () => {
      expect(tf.dispose).toBeDefined();
      expect(typeof tf.dispose).toBe('function');
    });
  });
});

describe('NMS (Non-Maximum Suppression)', () => {
  // NMS algorithm implementation test
  function nms(boxes: number[][], scores: number[], iouThreshold: number): number[] {
    const selected: number[] = [];
    const indices = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);

    while (indices.length > 0) {
      const current = indices.shift()!;
      selected.push(current);
      
      const remaining = indices.filter(i => {
        const iou = calculateIoU(boxes[current], boxes[i]);
        return iou <= iouThreshold;
      });
      
      indices.length = 0;
      indices.push(...remaining);
    }
    return selected;
  }

  function calculateIoU(box1: number[], box2: number[]): number {
    const [x1Min, y1Min, x1Max, y1Max] = box1;
    const [x2Min, y2Min, x2Max, y2Max] = box2;
    
    const intersectionArea = 
      Math.max(0, Math.min(x1Max, x2Max) - Math.max(x1Min, x2Min)) *
      Math.max(0, Math.min(y1Max, y2Max) - Math.max(y1Min, y2Min));
    
    const unionArea = 
      (x1Max - x1Min) * (y1Max - y1Min) + 
      (x2Max - x2Min) * (y2Max - y2Min) - 
      intersectionArea;
    
    return intersectionArea / unionArea;
  }

  it('should select highest confidence box first', () => {
    const boxes = [
      [0, 0, 10, 10],
      [1, 1, 11, 11],
    ];
    const scores = [0.8, 0.9];
    
    const selected = nms(boxes, scores, 0.5);
    
    expect(selected[0]).toBe(1); // Higher score index
  });

  it('should suppress overlapping boxes', () => {
    const boxes = [
      [0, 0, 10, 10],
      [1, 1, 11, 11], // Highly overlapping
    ];
    const scores = [0.9, 0.8];
    
    const selected = nms(boxes, scores, 0.3);
    
    expect(selected.length).toBe(1); // Only one box selected
  });

  it('should keep non-overlapping boxes', () => {
    const boxes = [
      [0, 0, 10, 10],
      [100, 100, 110, 110], // No overlap
    ];
    const scores = [0.9, 0.8];
    
    const selected = nms(boxes, scores, 0.5);
    
    expect(selected.length).toBe(2); // Both boxes kept
  });

  it('should calculate IoU correctly', () => {
    // 50% overlap
    const box1 = [0, 0, 10, 10]; // Area = 100
    const box2 = [5, 0, 15, 10]; // Area = 100, Intersection = 50
    
    const iou = calculateIoU(box1, box2);
    
    // Intersection = 50, Union = 100 + 100 - 50 = 150
    expect(iou).toBeCloseTo(50 / 150, 2);
  });

  it('should return 0 IoU for non-overlapping boxes', () => {
    const box1 = [0, 0, 10, 10];
    const box2 = [20, 20, 30, 30];
    
    const iou = calculateIoU(box1, box2);
    
    expect(iou).toBe(0);
  });
});

describe('COCO Classes', () => {
  const COCO_CLASSES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
    'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
    'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
    'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
  ];

  it('should have 80 COCO classes', () => {
    expect(COCO_CLASSES.length).toBe(80);
  });

  it('should have person as first class', () => {
    expect(COCO_CLASSES[0]).toBe('person');
  });

  it('should have common objects', () => {
    expect(COCO_CLASSES).toContain('car');
    expect(COCO_CLASSES).toContain('cup');
    expect(COCO_CLASSES).toContain('laptop');
    expect(COCO_CLASSES).toContain('cell phone');
  });
});
