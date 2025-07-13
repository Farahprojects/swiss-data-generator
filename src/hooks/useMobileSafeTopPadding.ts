import { useEffect, useState } from 'react';

export function useMobileSafeTopPadding(defaultFallback = 40) {
  const [topPadding, setTopPadding] = useState<number>(defaultFallback);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const testEl = document.createElement('div');
    testEl.style.cssText = `
      position: absolute;
      top: env(safe-area-inset-top, 0px);
      visibility: hidden;
      pointer-events: none;
      height: 0;
    `;
    document.body.appendChild(testEl);

    const computed = parseFloat(getComputedStyle(testEl).top || '0');
    document.body.removeChild(testEl);

    const padding = Math.max(computed || 0, defaultFallback);
    setTopPadding(padding);
  }, [defaultFallback]);

  return topPadding;
}