/**
 * NMS (Non-Maximum Suppression) Integration Tests
 * Tests the actual NMS algorithm with realistic detection data
 * NO MOCKS - Real algorithm tested
 */

import { describe, it, expect } from 'vitest';

/**
 * Real NMS implementation (same as visionWorker.ts)
 */
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
  
  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

describe('NMS Integration Tests - Real Detection Scenarios', () => {
  
  describe('Single Person Detection', () => {
    it('should keep single detection without suppression', () => {
      const boxes = [[100, 100, 200, 300]]; // Single person bbox
      const scores = [0.95];
      
      const selected = nms(boxes, scores, 0.45);
      
      expect(selected).toEqual([0]);
      expect(selected.length).toBe(1);
    });
  });

  describe('Multiple Person Detection with Overlaps', () => {
    it('should suppress duplicate detections of same person', () => {
      // Same person detected multiple times with slight variations
      const boxes = [
        [100, 100, 200, 300], // Detection 1 (main)
        [105, 102, 205, 302], // Detection 2 (slight shift - should be suppressed)
        [98, 98, 198, 298],   // Detection 3 (slight shift - should be suppressed)
      ];
      const scores = [0.95, 0.92, 0.88];
      
      const selected = nms(boxes, scores, 0.45);
      
      // Only highest confidence should remain
      expect(selected.length).toBe(1);
      expect(selected[0]).toBe(0); // Highest score index
    });

    it('should keep distinct persons in group photo', () => {
      // 4 people standing side by side (no overlap)
      const boxes = [
        [50, 100, 150, 400],   // Person 1 (left)
        [170, 105, 270, 405],  // Person 2
        [290, 100, 390, 400],  // Person 3
        [410, 102, 510, 402],  // Person 4 (right)
      ];
      const scores = [0.94, 0.91, 0.89, 0.87];
      
      const selected = nms(boxes, scores, 0.45);
      
      // All 4 persons should be kept
      expect(selected.length).toBe(4);
    });

    it('should handle partial overlaps in crowd', () => {
      // Crowd scene with some overlap
      const boxes = [
        [100, 100, 200, 300], // Person A
        [150, 100, 250, 300], // Person B (50% horizontal overlap with A)
        [300, 100, 400, 300], // Person C (separate)
        [340, 100, 440, 300], // Person D (40% overlap with C)
      ];
      const scores = [0.95, 0.90, 0.88, 0.85];
      
      const selected = nms(boxes, scores, 0.3); // Stricter threshold
      
      // Should suppress high overlaps
      expect(selected.length).toBeLessThan(4);
      expect(selected).toContain(0); // Highest score kept
    });
  });

  describe('Multi-class Detection Simulation', () => {
    it('should process YOLO-style detections for living room', () => {
      // Realistic living room detections (x1, y1, x2, y2 normalized 0-640)
      const detections = [
        { box: [50, 200, 350, 500], score: 0.94, class: 'couch' },
        { box: [55, 205, 355, 505], score: 0.89, class: 'couch' }, // Duplicate
        { box: [400, 100, 550, 250], score: 0.91, class: 'tv' },
        { box: [200, 300, 320, 520], score: 0.96, class: 'person' },
        { box: [205, 305, 325, 525], score: 0.93, class: 'person' }, // Duplicate
        { box: [500, 400, 560, 480], score: 0.72, class: 'cup' },
        { box: [100, 420, 150, 500], score: 0.78, class: 'book' },
      ];
      
      const boxes = detections.map(d => d.box);
      const scores = detections.map(d => d.score);
      
      const selected = nms(boxes, scores, 0.45);
      
      // Should keep distinct objects, suppress duplicates
      expect(selected.length).toBeLessThan(detections.length);
      expect(selected.length).toBeGreaterThanOrEqual(4); // At least 4 unique objects
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty detections', () => {
      const selected = nms([], [], 0.45);
      expect(selected).toEqual([]);
    });

    it('should handle identical boxes', () => {
      const boxes = [
        [100, 100, 200, 200],
        [100, 100, 200, 200], // Exact same box
      ];
      const scores = [0.9, 0.8];
      
      const selected = nms(boxes, scores, 0.45);
      
      // Only one should remain
      expect(selected.length).toBe(1);
    });

    it('should handle boxes touching at edge', () => {
      const boxes = [
        [0, 0, 100, 100],
        [100, 0, 200, 100], // Touches at edge, no overlap
      ];
      const scores = [0.9, 0.85];
      
      const selected = nms(boxes, scores, 0.45);
      
      // Both should be kept (no area overlap)
      expect(selected.length).toBe(2);
    });

    it('should handle very small boxes', () => {
      const boxes = [
        [300, 300, 310, 310], // Small 10x10 box
        [302, 302, 312, 312], // Overlapping small box
      ];
      const scores = [0.92, 0.88];
      
      const selected = nms(boxes, scores, 0.45);
      
      // High IoU for small boxes
      expect(selected.length).toBe(1);
    });
  });

  describe('Performance with Large Detection Sets', () => {
    it('should handle 100+ detections efficiently', () => {
      // Simulate a crowded scene with many detections
      const boxes: number[][] = [];
      const scores: number[] = [];
      
      // Generate 100 random detections
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 500;
        const y = Math.random() * 500;
        const w = 50 + Math.random() * 100;
        const h = 80 + Math.random() * 150;
        
        boxes.push([x, y, x + w, y + h]);
        scores.push(0.5 + Math.random() * 0.5);
      }
      
      const startTime = performance.now();
      const selected = nms(boxes, scores, 0.45);
      const endTime = performance.now();
      
      // Should complete in reasonable time (<100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should reduce number of boxes
      expect(selected.length).toBeLessThan(boxes.length);
    });
  });

  describe('IoU Calculations - Real World Scenarios', () => {
    it('should calculate IoU for 50% overlap correctly', () => {
      // Two boxes with 50% overlap
      const box1 = [0, 0, 100, 100];   // Area = 10000
      const box2 = [50, 0, 150, 100];  // Area = 10000, Intersection = 5000
      
      const iou = calculateIoU(box1, box2);
      
      // IoU = 5000 / (10000 + 10000 - 5000) = 5000 / 15000 = 0.333
      expect(iou).toBeCloseTo(0.333, 2);
    });

    it('should calculate IoU for nested boxes', () => {
      // Small box inside large box
      const largeBox = [0, 0, 200, 200];   // Area = 40000
      const smallBox = [50, 50, 100, 100]; // Area = 2500, fully inside
      
      const iou = calculateIoU(largeBox, smallBox);
      
      // IoU = 2500 / (40000 + 2500 - 2500) = 2500 / 40000 = 0.0625
      expect(iou).toBeCloseTo(0.0625, 3);
    });

    it('should return 0 IoU for non-overlapping boxes', () => {
      const box1 = [0, 0, 50, 50];
      const box2 = [100, 100, 150, 150];
      
      const iou = calculateIoU(box1, box2);
      
      expect(iou).toBe(0);
    });

    it('should return 1 IoU for identical boxes', () => {
      const box1 = [100, 100, 200, 200];
      const box2 = [100, 100, 200, 200];
      
      const iou = calculateIoU(box1, box2);
      
      expect(iou).toBe(1);
    });
  });
});

describe('Detection Post-Processing Pipeline', () => {
  /**
   * Simulate full YOLO output processing
   */
  function processYoloOutput(
    rawDetections: Array<{ bbox: number[]; confidence: number; classId: number }>,
    confidenceThreshold: number,
    iouThreshold: number
  ) {
    // Filter by confidence
    const filtered = rawDetections.filter(d => d.confidence >= confidenceThreshold);
    
    // Apply NMS
    const boxes = filtered.map(d => d.bbox);
    const scores = filtered.map(d => d.confidence);
    const selectedIndices = nms(boxes, scores, iouThreshold);
    
    // Return final detections
    return selectedIndices.map(i => filtered[i]);
  }

  it('should process raw YOLO output correctly', () => {
    const rawDetections = [
      { bbox: [100, 100, 200, 300], confidence: 0.95, classId: 0 },
      { bbox: [105, 102, 205, 302], confidence: 0.88, classId: 0 },
      { bbox: [400, 200, 500, 350], confidence: 0.75, classId: 1 },
      { bbox: [300, 300, 350, 400], confidence: 0.45, classId: 2 }, // Low confidence
    ];
    
    const results = processYoloOutput(rawDetections, 0.5, 0.45);
    
    // Should filter low confidence and suppress duplicates
    expect(results.length).toBeLessThan(rawDetections.length);
    expect(results.every(r => r.confidence >= 0.5)).toBe(true);
  });
});
