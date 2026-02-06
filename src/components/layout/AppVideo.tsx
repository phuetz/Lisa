/**
 * AppVideo - Camera video feed for MediaPipe processing
 *
 * Renders a minimized video element for camera input at the bottom right.
 * Only shown on desktop (not on mobile).
 */

import React from 'react';

export interface AppVideoProps {
  isMobile: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function AppVideo({ isMobile, videoRef }: AppVideoProps) {
  if (isMobile) {
    return null;
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        width: 120,
        height: 90,
        borderRadius: 8,
        zIndex: 40,
        opacity: 0.8,
      }}
      aria-label="Camera feed for vision processing"
    />
  );
}
