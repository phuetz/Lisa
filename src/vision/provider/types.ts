export interface VisionProvider {
  name: string;
  init(modelUrl: string): Promise<void>;
  detect(frame: VideoFrame): Promise<any[]>;
  terminate(): void;
}
