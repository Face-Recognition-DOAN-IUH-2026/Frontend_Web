import { renderHook, act, waitFor } from '@testing-library/react';
import useUndo from '@/lib/hooks/useUndo';

describe('useUndo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns idle state initially', () => {
    const { result } = renderHook(() => useUndo<string>({ onConfirm: jest.fn() }));
    expect(result.current.pendingDelete).toBeNull();
    expect(result.current.countdown).toBe(0);
    expect(result.current.isPending).toBe(false);
  });

  it('marks item for delete and starts countdown', () => {
    const { result } = renderHook(() => useUndo<string>({ onConfirm: jest.fn() }));
    act(() => result.current.markForDelete('item-1'));
    expect(result.current.pendingDelete).toBe('item-1');
    expect(result.current.isPending).toBe(true);
    expect(result.current.countdown).toBe(5);
  });

  it('decrements countdown every second', () => {
    const { result } = renderHook(() => useUndo<string>({ onConfirm: jest.fn() }));
    act(() => result.current.markForDelete('item-1'));
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.countdown).toBe(4);
    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.countdown).toBe(2);
  });

  it('calls onConfirm when countdown reaches 0', () => {
    const onConfirm = jest.fn();
    const { result } = renderHook(() => useUndo<string>({ onConfirm }));
    act(() => result.current.markForDelete('item-1'));
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onConfirm).toHaveBeenCalledWith('item-1');
    expect(result.current.pendingDelete).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('cancels delete on undo and restores item', () => {
    const onConfirm = jest.fn();
    const { result } = renderHook(() => useUndo<string>({ onConfirm }));
    act(() => result.current.markForDelete('item-1'));
    act(() => { jest.advanceTimersByTime(2000); });
    act(() => result.current.undo());
    expect(result.current.pendingDelete).toBeNull();
    expect(result.current.isPending).toBe(false);
    expect(result.current.countdown).toBe(0);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('returns countdown as seconds remaining', () => {
    const { result } = renderHook(() => useUndo<string>({ onConfirm: jest.fn(), undoDuration: 3 }));
    act(() => result.current.markForDelete('item-1'));
    expect(result.current.countdown).toBe(3);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.countdown).toBe(2);
  });

  it('keeps markForDelete identity stable when the callback prop changes', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useUndo<string>>,
      { cb: jest.Mock }
    >(
      ({ cb }) => useUndo<string>({ onConfirm: cb }),
      { initialProps: { cb: jest.fn() } },
    );
    const firstMark = result.current.markForDelete;
    rerender({ cb: jest.fn() });
    expect(result.current.markForDelete).toBe(firstMark);
  });

  it('invokes the latest callback after the prop changes', () => {
    const firstCb = jest.fn();
    const secondCb = jest.fn();
    const { result, rerender } = renderHook<
      ReturnType<typeof useUndo<string>>,
      { cb: jest.Mock }
    >(
      ({ cb }) => useUndo<string>({ onConfirm: cb }),
      { initialProps: { cb: firstCb } },
    );
    rerender({ cb: secondCb });
    act(() => result.current.markForDelete('item-1'));
    act(() => { jest.advanceTimersByTime(5000); });
    expect(firstCb).not.toHaveBeenCalled();
    expect(secondCb).toHaveBeenCalledWith('item-1');
  });
});
