import { useCallback, useEffect, useRef, useState } from 'react';

interface UseHoldOptions {
  onHoldComplete: () => void;
  duration?: number;
}

export default function useHold({ onHoldComplete, duration = 1000 }: UseHoldOptions) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onStart = useCallback(() => {
    completedRef.current = false;
    setHolding(true);
    setProgress(0);

    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    timerRef.current = setInterval(() => {
      currentStep++;
      const newProgress = Math.min(currentStep / steps, 1);
      setProgress(newProgress);

      if (newProgress >= 1 && !completedRef.current) {
        completedRef.current = true;
        clearTimer();
        setHolding(false);
        setProgress(0);
        onHoldComplete();
      }
    }, interval);
  }, [clearTimer, duration, onHoldComplete]);

  const onEnd = useCallback(() => {
    if (!completedRef.current) {
      clearTimer();
      setHolding(false);
      setProgress(0);
    }
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { holding, progress, onStart, onEnd };
}
