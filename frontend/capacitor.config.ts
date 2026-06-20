import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ndubillpayment.app',
  appName: 'NDU BILL PAYMENT',
  webDir: 'build',
  server: {
    // In production, this should be your deployed URL
    // For development, you can use local or staging
    url: 'https://ndubillpayment.vercel.app',
    cleartext: true
  },
  android: {
    buildOptions: {
      signingType: 'apksigner'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#2563EB',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'large'
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#2563EB'
    },
    Keyboard: {
      resize: 'body'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
