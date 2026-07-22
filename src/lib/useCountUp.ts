import { useEffect, useRef, useState } from 'react';

/** Anima un numero verso il valore target (spec §2.6: "count-up" sui totali). */
export function useCountUp(target: number, durationMs = 500): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    startRef.current = null;

    let frame: number;
    function tick(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      setValue(from + (target - from) * progress);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
