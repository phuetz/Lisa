import { FaceLandmarkerWebGPUProv } from '../provider/FaceLandmarkerWebGPUProv';

const provider = new FaceLandmarkerWebGPUProv();

self.onmessage = async (e: MessageEvent) => {
  const { type, modelUrl, frame } = e.data;
  if (type === 'init') {
    await provider.init(modelUrl);
    postMessage({ type: 'ready' });
  } else if (type === 'detect' && frame) {
    const res = await provider.detect(frame);
    postMessage({ type: 'result', data: res });
  } else if (type === 'terminate') {
    provider.terminate();
    close();
  }
};
