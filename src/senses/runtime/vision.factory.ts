import VisionWorker from '../../workers/visionWorker?worker';

export function createVisionWorker(): Worker {
  return new VisionWorker();
}
