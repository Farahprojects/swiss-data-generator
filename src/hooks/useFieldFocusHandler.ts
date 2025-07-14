import { useCallback } from 'react';

export const useFieldFocusHandler = () => {
  const scrollTo = useCallback((element: HTMLElement | null, options: ScrollIntoViewOptions = {}) => {
    if (!element) return;

    requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: options.behavior || 'smooth',
        block: options.block || 'center',
        inline: options.inline || 'nearest',
      });
    });
  }, []);

  return { scrollTo };
};
