import * as React from 'react';
import { Capacitor } from '@capacitor/core';

export function useIsNativeApp() {
  const [isNative, setIsNative] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Detect if running in a native Capacitor app (iOS or Android)
    const platform = Capacitor.getPlatform();
    const isNativeApp = platform === 'ios' || platform === 'android';
    setIsNative(isNativeApp);
    
    console.log('[useIsNativeApp] Platform detected:', platform, 'isNative:', isNativeApp);
  }, []);

  return isNative;
}


