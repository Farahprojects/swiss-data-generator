import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.farahprojects.therai',
  appName: 'Therai',
  webDir: 'dist',
  ios: {
    path: 'ios'
  },
  android: {
    path: 'android'
  }
};

export default config;
