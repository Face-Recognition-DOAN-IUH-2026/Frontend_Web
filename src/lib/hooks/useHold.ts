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
  // Ref giữ callback mới nhất → onStart không đổi identity khi parent truyền arrow inline.
  const onHoldCompleteRef = useRef(onHoldComplete);
  onHoldCompleteRef.current = onHoldComplete;

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
        onHoldCompleteRef.current();
      }
    }, interval);
  }, [clearTimer, duration]);

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
