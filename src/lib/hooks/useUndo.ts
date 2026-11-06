import { useCallback, useEffect, useRef, useState } from 'react';

interface UseUndoOptions<T> {
  onConfirm: (item: T) => void | Promise<void>;
  undoDuration?: number;
}

export default function useUndo<T>({ onConfirm, undoDuration = 5 }: UseUndoOptions<T>) {
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref giữ callback mới nhất → markForDelete ổn định dù parent truyền arrow inline.
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const markForDelete = useCallback((item: T) => {
    clearTimer();
    setPendingDelete(item);
    setCountdown(undoDuration);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          setPendingDelete(null);
          setCountdown(0);
          onConfirmRef.current(item);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer, undoDuration]);

  const undo = useCallback(() => {
    clearTimer();
    setPendingDelete(null);
    setCountdown(0);
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { pendingDelete, countdown, isPending: pendingDelete !== null, markForDelete, undo };
}
