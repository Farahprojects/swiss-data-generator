import * as React from 'react';

export function useIsNativeApp() {
  const [isNative, setIsNative] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Always return false for web app (no native app detection needed)
    setIsNative(false);
  }, []);

  return isNative;
}


