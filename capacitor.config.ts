import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.hundreddays100percent.app',
  appName: '100 Days',
  webDir: 'dist',
  backgroundColor: '#0a0a14',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0a0a14',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 400,
      backgroundColor: '#0a0a14',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',
    },
    LocalNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
}

export default config
