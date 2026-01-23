import { useEffect, useRef } from 'react';
import { processVideoFrame, isVisionModelReady } from '../features/vision/api';
import { useAppStore } from '../store/appStore';

/**
 * Hook to feed video frames to the advanced vision worker (YOLOv8)
 */
export function useAdvancedVision(video?: HTMLVideoElement | null) {
    const rafIdRef = useRef<number>();
    const frameCountRef = useRef<number>(0);
    const advancedVision = useAppStore((s) => s.featureFlags.advancedVision);

    useEffect(() => {
        if (!video || !advancedVision) {
            return;
        }

        let isActive = true;

        const processFrame = () => {
            if (!isActive || !video) return;

            // Process every 3rd frame to reduce load (approximately 10 FPS at 30 FPS source)
            frameCountRef.current++;
            if (frameCountRef.current % 3 === 0 && isVisionModelReady()) {
                try {
                    // Pass video element directly for efficient processing (using ImageBitmap in worker)
                    processVideoFrame(video);
                } catch (error) {
                    console.error('[useAdvancedVision] Error processing frame:', error);
                }
            }

            rafIdRef.current = requestAnimationFrame(processFrame);
        };

        // Start processing frames
        rafIdRef.current = requestAnimationFrame(processFrame);

        return () => {
            isActive = false;
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [video, advancedVision]);
}
