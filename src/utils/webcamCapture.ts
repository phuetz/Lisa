/**
 * Webcam Capture Utility
 * Captures a single frame from the webcam for AI vision analysis
 */

export async function captureWebcamFrame(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    await video.play();

    // Wait for video to be ready
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      stream.getTracks().forEach(t => t.stop());
      return null;
    }

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Stop the stream immediately
    stream.getTracks().forEach(t => t.stop());

    return dataUrl;
  } catch (error) {
    console.warn('[webcamCapture] Failed to capture:', error);
    return null;
  }
}

const VISION_PATTERNS = [
  /que\s+vois[\s-]tu/i,
  /qu['']est[\s-]ce\s+que\s+tu\s+vois/i,
  /regarde/i,
  /cam[eé]ra/i,
  /webcam/i,
  /what\s+do\s+you\s+see/i,
  /what\s+can\s+you\s+see/i,
  /d[eé]cris\s+(?:ce\s+que\s+tu\s+vois|la\s+sc[eè]ne|mon\s+visage|l['']image)/i,
  /montre[\s-]moi\s+ce\s+que\s+tu\s+vois/i,
  /tu\s+(?:me\s+)?vois/i,
  /analyse\s+(?:la\s+)?(?:cam[eé]ra|vid[eé]o|image)/i,
];

export function isVisionRequest(message: string): boolean {
  return VISION_PATTERNS.some(p => p.test(message));
}
