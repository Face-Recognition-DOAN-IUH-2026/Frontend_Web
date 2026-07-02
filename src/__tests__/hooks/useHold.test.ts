import { renderHook, act } from '@testing-library/react';
import useHold from '@/lib/hooks/useHold';

describe('useHold', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns idle state initially', () => {
    const { result } = renderHook(() => useHold({ onHoldComplete: jest.fn() }));
    expect(result.current.holding).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('starts holding on pointer down', () => {
    const { result } = renderHook(() => useHold({ onHoldComplete: jest.fn() }));
    act(() => result.current.onStart());
    expect(result.current.holding).toBe(true);
    expect(result.current.progress).toBe(0);
  });

  it('increases progress over time', () => {
    const { result } = renderHook(() => useHold({ duration: 1000, onHoldComplete: jest.fn() }));
    act(() => result.current.onStart());
    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current.progress).toBeGreaterThanOrEqual(0.49);
    expect(result.current.progress).toBeLessThanOrEqual(0.51);
  });

  it('fires onHoldComplete when duration reached', () => {
    const onHoldComplete = jest.fn();
    const { result } = renderHook(() => useHold({ duration: 1000, onHoldComplete }));
    act(() => result.current.onStart());
    act(() => { jest.advanceTimersByTime(1000); });
    expect(onHoldComplete).toHaveBeenCalledTimes(1);
    expect(result.current.holding).toBe(false);
  });

  it('cancels hold on pointer up before duration', () => {
    const onHoldComplete = jest.fn();
    const { result } = renderHook(() => useHold({ duration: 1000, onHoldComplete }));
    act(() => result.current.onStart());
    act(() => { jest.advanceTimersByTime(300); });
    act(() => result.current.onEnd());
    act(() => { jest.advanceTimersByTime(1000); });
    expect(onHoldComplete).not.toHaveBeenCalled();
    expect(result.current.holding).toBe(false);
    expect(result.current.progress).toBe(0);
  });
});
