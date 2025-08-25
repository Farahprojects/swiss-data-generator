import { useState, useEffect } from 'react';

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsDesktop(window.innerWidth > 768);
    };

    if (typeof window !== 'undefined') {
      update();
      window.addEventListener('resize', update);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', update);
      }
    };
  }, []);

  return isDesktop;
};

export default useIsDesktop;
