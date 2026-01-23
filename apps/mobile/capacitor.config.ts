import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lisa.ai',
  appName: 'Lisa AI',
  webDir: '../../dist',
  server: {
    androidScheme: 'https',
    hostname: 'lisa.ai',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      showSpinner: true,
      spinnerColor: '#10b981',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#1a1a2e',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: false,
      style: 'dark'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      presentationStyle: 'fullScreen'
    },
    Haptics: {
      selectionStart: true
    }
  },
  android: {
    // Allow HTTP requests to local network (LM Studio)
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#1a1a2e',
    // Allow cleartext traffic for local API connections
    useLegacyBridge: false,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#1a1a2e',
    preferredContentMode: 'mobile'
  }
};

export default config;
