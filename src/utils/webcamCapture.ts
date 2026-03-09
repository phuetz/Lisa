/**
 * Webcam Capture Utility
 * Captures a single frame from the webcam for AI vision analysis
 */

export async function captureWebcamFrame(): Promise<string | null> {
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;

    await Promise.race([
      video.play(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Video play timeout')), 5000))
    ]);

    // Wait for video to be ready
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    return dataUrl;
  } catch (error) {
    console.warn('[webcamCapture] Failed to capture:', error);
    return null;
  } finally {
    // Always stop the stream, even on error
    if (stream) stream.getTracks().forEach(t => t.stop());
  }
}

const VISION_PATTERNS = [
  /que\s+vois[\s-]tu/i,
  /qu[''\u2019]est[\s-]ce\s+que\s+tu\s+vois/i,
  /regarde/i,
  /cam[eé]ra/i,
  /webcam/i,
  /what\s+do\s+you\s+see/i,
  /what\s+can\s+you\s+see/i,
  /d[eé]cris\s+(?:ce\s+que\s+tu\s+vois|la\s+sc[eè]ne|mon\s+visage|l[''\u2019]image)/i,
  /montre[\s-]moi\s+ce\s+que\s+tu\s+vois/i,
  /tu\s+(?:me\s+)?vois/i,
  /analyse\s+(?:la\s+)?(?:cam[eé]ra|vid[eé]o|image)/i,
];

export function isVisionRequest(message: string): boolean {
  return VISION_PATTERNS.some(p => p.test(message));
}
