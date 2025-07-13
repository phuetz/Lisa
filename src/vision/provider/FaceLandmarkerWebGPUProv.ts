import { VisionProvider } from './types';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class FaceLandmarkerWebGPUProv implements VisionProvider {
  name = 'FaceLandmarker-WebGPU';
  private landmarker!: FaceLandmarker;

  /** Initialise le modèle .task et WebGPU delegate */
  async init(modelUrl: string) {
    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: modelUrl,
        /** GPU = backend WebGPU si dispo, sinon repli CPU */
        delegate: (navigator as any).gpu ? 'GPU' : 'CPU',
      },
      runningMode: 'LIVE_STREAM',
      numFaces: 2,
      outputFaceBlendshapes: true,
    });
  }

  /** Détecte les landmarks sur un VideoFrame */
  async detect(frame: VideoFrame) {
    const { faceLandmarks, faceBlendshapes } =
      this.landmarker.detectForVideo(frame, performance.now());

    return faceLandmarks.map((lm, i) => ({
      type: 'face',
      source: this.name,
      keypoints: lm,
      blendshapes: faceBlendshapes?.[i],
      ts: Date.now(),
    }));
  }

  terminate() {
    this.landmarker?.close();
  }
}
