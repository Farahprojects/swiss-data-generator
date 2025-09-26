import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.farahprojects.therai',
  appName: 'Therai',
  webDir: 'dist',
  ios: {
    path: 'ios',
    scheme: 'therai'
  },
  android: {
    path: 'android',
    allowMixedContent: true
  },
  plugins: {
    App: {
      appUrlOpen: {
        iosCustomScheme: 'therai'
      }
    }
  }
};

export default config;
