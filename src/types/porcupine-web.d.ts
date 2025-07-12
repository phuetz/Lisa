declare module '@picovoice/porcupine-web' {
  export interface BuiltInKeyword {
    PORCUPINE: string;
  }
  export const BuiltInKeyword: BuiltInKeyword;
  export const PorcupineWorkerFactory: any;
  export const WebVoiceProcessor: {
    init: (options: any) => Promise<any>;
  };
}

declare module '@picovoice/web-voice-processor' {
  export const WebVoiceProcessor: {
    init: (options: any) => Promise<any>;
  };
}
