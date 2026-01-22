import { useEffect, useRef } from 'react';

interface UseScrollSyncOptions {
  enabled?: boolean;
  smooth?: boolean;
}

export function useScrollSync(
  sourceRef: React.RefObject<HTMLElement>,
  targetRef: React.RefObject<HTMLElement>,
  options: UseScrollSyncOptions = {}
) {
  const { enabled = true, smooth = true } = options;
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !sourceRef.current || !targetRef.current) return;

    const source = sourceRef.current;
    const target = targetRef.current;

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      isScrollingRef.current = true;

      const sourceScrollTop = source.scrollTop;
      const sourceScrollHeight = source.scrollHeight - source.clientHeight;
      const sourceScrollPercent = sourceScrollHeight > 0 
        ? sourceScrollTop / sourceScrollHeight 
        : 0;

      const targetScrollHeight = target.scrollHeight - target.clientHeight;
      const targetScrollTop = sourceScrollPercent * targetScrollHeight;

      if (smooth) {
        target.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
      } else {
        target.scrollTop = targetScrollTop;
      }

      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    };

    source.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      source.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, smooth, sourceRef, targetRef]);
}
