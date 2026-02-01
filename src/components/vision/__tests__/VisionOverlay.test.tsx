/**
 * VisionOverlay Component Tests
 * Tests for vision overlay rendering with various detection types
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Store states
let mockPercepts: Array<{
  modality: string;
  ts: number;
  payload: Record<string, unknown>;
}> = [];
let mockAdvancedVision = false;

// Mock visionStore
vi.mock('../../../store/visionStore', () => ({
  useVisionStore: vi.fn((selector) => {
    const state = { percepts: mockPercepts };
    return selector(state);
  }),
  visionSelectors: {
    percepts: (state: { percepts: typeof mockPercepts }) => state.percepts,
  },
}));

// Mock uiStore
vi.mock('../../../store/uiStore', () => ({
  useUiStore: vi.fn((selector) => {
    const state = { advancedVision: mockAdvancedVision };
    return selector(state);
  }),
  uiSelectors: {
    isAdvancedVisionEnabled: (state: { advancedVision: boolean }) => state.advancedVision,
  },
}));

import { VisionOverlay } from '../VisionOverlay';
import { useVisionStore } from '../../../store/visionStore';
import { useUiStore } from '../../../store/uiStore';

describe('VisionOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPercepts = [];
    mockAdvancedVision = false;
  });

  describe('Rendering', () => {
    it('should return null when advanced vision is disabled', () => {
      mockAdvancedVision = false;
      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ advancedVision: false })
      );

      const { container } = render(<VisionOverlay />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when no recent percepts', () => {
      mockAdvancedVision = true;
      mockPercepts = [];
      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ advancedVision: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ percepts: [] })
      );

      const { container } = render(<VisionOverlay />);
      expect(container.firstChild).toBeNull();
    });

    it('should render SVG overlay when vision enabled and percepts present', () => {
      mockAdvancedVision = true;
      const recentPercepts = [
        {
          modality: 'vision',
          ts: Date.now(),
          payload: { type: 'object', boxes: [[0.1, 0.1, 0.5, 0.5]], classes: ['person'], scores: [0.9] },
        },
      ];
      mockPercepts = recentPercepts;

      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ advancedVision: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ percepts: recentPercepts })
      );

      const { container } = render(<VisionOverlay />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Object Detection Rendering', () => {
    it('should render object detection boxes', () => {
      mockAdvancedVision = true;
      const objectPercepts = [
        {
          modality: 'vision',
          ts: Date.now(),
          payload: {
            type: 'object',
            boxes: [[0.1, 0.1, 0.5, 0.5]],
            classes: ['cat'],
            scores: [0.85],
          },
        },
      ];

      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ advancedVision: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ percepts: objectPercepts })
      );

      const { container } = render(<VisionOverlay />);

      // Should render a rect for the detection box
      expect(container.querySelector('rect')).toBeInTheDocument();

      // Should render a text label
      expect(container.querySelector('text')).toBeInTheDocument();
    });
  });

  describe('Pose Detection Rendering', () => {
    it('should render pose landmarks', () => {
      mockAdvancedVision = true;
      const posePercepts = [
        {
          modality: 'vision',
          ts: Date.now(),
          payload: {
            type: 'pose',
            landmarks: [
              { x: 0.5, y: 0.3 },
              { x: 0.4, y: 0.5 },
              { x: 0.6, y: 0.5 },
            ],
          },
        },
      ];

      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ advancedVision: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ percepts: posePercepts })
      );

      const { container } = render(<VisionOverlay />);

      // Should render circles for landmarks
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBe(3);
    });
  });

  describe('Face Detection Rendering', () => {
    it('should render face detection boxes', () => {
      mockAdvancedVision = true;
      const facePercepts = [
        {
          modality: 'vision',
          ts: Date.now(),
          payload: {
            type: 'face',
            boxes: [[0.2, 0.2, 0.4, 0.4]],
            landmarks: [{ x: 0.3, y: 0.3 }],
          },
        },
      ];

      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ advancedVision: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ percepts: facePercepts })
      );

      const { container } = render(<VisionOverlay />);

      // Should render rect for face box
      expect(container.querySelector('rect')).toBeInTheDocument();

      // Should render circle for face landmark
      expect(container.querySelector('circle')).toBeInTheDocument();
    });
  });

  describe('Hand Detection Rendering', () => {
    it('should render hand detection boxes and landmarks', () => {
      mockAdvancedVision = true;
      const handPercepts = [
        {
          modality: 'vision',
          ts: Date.now(),
          payload: {
            type: 'hand',
            boxes: [[0.3, 0.3, 0.5, 0.5]],
            landmarks: [{ x: 0.4, y: 0.4 }],
            handedness: 'Left',
          },
        },
      ];

      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ advancedVision: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ percepts: handPercepts })
      );

      const { container } = render(<VisionOverlay />);

      // Should render rect for hand box
      expect(container.querySelector('rect')).toBeInTheDocument();

      // Should render text label with handedness
      expect(container.querySelector('text')?.textContent).toContain('Left Hand');
    });
  });

  describe('Stale Percept Filtering', () => {
    it('should not render stale percepts (older than 200ms)', () => {
      mockAdvancedVision = true;
      const stalePercepts = [
        {
          modality: 'vision',
          ts: Date.now() - 500, // 500ms ago - should be filtered
          payload: { type: 'object', boxes: [[0.1, 0.1, 0.5, 0.5]], classes: ['dog'], scores: [0.9] },
        },
      ];

      vi.mocked(useUiStore).mockImplementation((selector) =>
        selector({ advancedVision: true })
      );
      vi.mocked(useVisionStore).mockImplementation((selector) =>
        selector({ percepts: stalePercepts })
      );

      const { container } = render(<VisionOverlay />);

      // Should return null because percept is stale
      expect(container.firstChild).toBeNull();
    });
  });
});
