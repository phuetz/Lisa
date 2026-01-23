/**
 * Tests for VisionEventBus service
 * Tests event filtering, throttling, deduplication and subscription
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VisionEventBus, { 
  createFaceDetectedEvent,
  createHandGestureEvent,
  createObjectDetectedEvent,
  createBodyPoseEvent,
} from '../VisionEventBus';

describe('VisionEventBus', () => {
  let eventBus: InstanceType<typeof VisionEventBus>;

  beforeEach(() => {
    vi.useFakeTimers();
    eventBus = new VisionEventBus();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Event Subscription', () => {
    it('should allow subscribing to events with on()', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('*', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should call subscriber when event is emitted', () => {
      const callback = vi.fn();
      eventBus.on('OBJECT_DETECTED', callback);

      const event = createObjectDetectedEvent(
        'person',
        { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
        0.95
      );

      eventBus.emit(event);

      expect(callback).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', () => {
      const callback = vi.fn();
      const unsubscribe = eventBus.on('OBJECT_DETECTED', callback);

      unsubscribe();

      const event = createObjectDetectedEvent(
        'car',
        { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
        0.9
      );

      eventBus.emit(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support global listener with *', () => {
      const callback = vi.fn();
      eventBus.on('*', callback);

      const event = createFaceDetectedEvent(
        'face-1',
        { x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
        0.92
      );

      eventBus.emit(event);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Event Throttling', () => {
    it('should throttle rapid events of same type', () => {
      let emittedCount = 0;

      // Emit 10 events rapidly
      for (let i = 0; i < 10; i++) {
        const result = eventBus.emit(createObjectDetectedEvent(
          'person',
          { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
          0.9
        ));
        if (result) emittedCount++;
      }

      // Should be throttled - not all 10 calls
      expect(emittedCount).toBeLessThan(10);
    });

    it('should allow events after throttle window', () => {
      let emittedCount = 0;

      const result1 = eventBus.emit(createHandGestureEvent(
        'THUMBS_UP',
        'right',
        0.95
      ));
      if (result1) emittedCount++;

      vi.advanceTimersByTime(300); // Past default throttle

      const result2 = eventBus.emit(createHandGestureEvent(
        'WAVE',
        'left',
        0.9
      ));
      if (result2) emittedCount++;

      expect(emittedCount).toBe(2);
    });
  });

  describe('Event Filtering', () => {
    it('should filter events below confidence threshold', () => {
      // Low confidence event (below 0.7 default)
      const result = eventBus.emit(createObjectDetectedEvent(
        'chair',
        { x: 0.5, y: 0.5, width: 0.1, height: 0.1 },
        0.3 // Below threshold
      ));

      // Should be filtered out (emit returns false)
      expect(result).toBe(false);
    });

    it('should pass events above confidence threshold', () => {
      const result = eventBus.emit(createFaceDetectedEvent(
        'face-2',
        { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
        0.95
      ));

      expect(result).toBe(true);
    });
  });

  describe('Event Creation Helpers', () => {
    it('should create face detected event', () => {
      const event = createFaceDetectedEvent(
        'face-1',
        { x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
        0.88
      );

      expect(event.type).toBe('FACE_DETECTED');
      expect(event.confidence).toBe(0.88);
      expect(event.value.faceId).toBe('face-1');
    });

    it('should create hand gesture event', () => {
      const event = createHandGestureEvent('PEACE', 'right', 0.92);

      expect(event.type).toBe('HAND_GESTURE');
      expect(event.value.gesture).toBe('PEACE');
      expect(event.value.hand).toBe('right');
    });

    it('should create object detected event', () => {
      const event = createObjectDetectedEvent(
        'cup',
        { x: 0.5, y: 0.5, width: 0.1, height: 0.1 },
        0.85,
        2
      );

      expect(event.type).toBe('OBJECT_DETECTED');
      expect(event.value.label).toBe('cup');
      expect(event.value.count).toBe(2);
    });

    it('should create body pose event', () => {
      const event = createBodyPoseEvent('STANDING', 0.9);

      expect(event.type).toBe('BODY_POSE');
      expect(event.value.pose).toBe('STANDING');
    });
  });

  describe('Event Types', () => {
    it('should support FACE_DETECTED type', () => {
      const callback = vi.fn();
      eventBus.on('FACE_DETECTED', callback);

      eventBus.emit(createFaceDetectedEvent(
        'face-3',
        { x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
        0.95
      ));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'FACE_DETECTED',
        })
      );
    });

    it('should support HAND_GESTURE type', () => {
      const callback = vi.fn();
      eventBus.on('HAND_GESTURE', callback);

      eventBus.emit(createHandGestureEvent('OK', 'left', 0.9));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HAND_GESTURE',
        })
      );
    });

    it('should support BODY_POSE type', () => {
      const callback = vi.fn();
      eventBus.on('BODY_POSE', callback);

      eventBus.emit(createBodyPoseEvent('SITTING', 0.88));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BODY_POSE',
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should respect maxEventsPerSecond limit', () => {
      let emittedCount = 0;

      // Try to emit more than maxEventsPerSecond (default 10)
      for (let i = 0; i < 20; i++) {
        const result = eventBus.emit(createObjectDetectedEvent(
          `object-${i}`,
          { x: 0.1 * i, y: 0.1, width: 0.1, height: 0.1 },
          0.9
        ));
        if (result) emittedCount++;
        vi.advanceTimersByTime(10); // Small advance to avoid same-ms
      }

      // Should be limited
      expect(emittedCount).toBeLessThanOrEqual(10);
    });

    it('should reset rate limit after 1 second', () => {
      // First batch
      for (let i = 0; i < 10; i++) {
        eventBus.emit(createObjectDetectedEvent(
          `obj-${i}`,
          { x: 0.1, y: 0.1, width: 0.1, height: 0.1 },
          0.9
        ));
      }

      // Advance past 1 second
      vi.advanceTimersByTime(1100);

      // Should be able to emit again
      const result = eventBus.emit(createObjectDetectedEvent(
        'new-obj',
        { x: 0.5, y: 0.5, width: 0.2, height: 0.2 },
        0.95
      ));

      expect(result).toBe(true);
    });
  });
});
