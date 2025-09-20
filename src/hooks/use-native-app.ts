import * as React from 'react';
import { Capacitor } from '@capacitor/core';

export function useIsNativeApp() {
  const [isNative, setIsNative] = React.useState<boolean>(false);

  React.useEffect(() => {
    try {
      // Prefer Capacitor helper if available; fallback to platform check
      const native = typeof Capacitor !== 'undefined'
        && (typeof (Capacitor as any).isNativePlatform === 'function'
          ? (Capacitor as any).isNativePlatform()
          : Capacitor.getPlatform() !== 'web');
      setIsNative(!!native);
    } catch {
      setIsNative(false);
    }
  }, []);

  return isNative;
}


