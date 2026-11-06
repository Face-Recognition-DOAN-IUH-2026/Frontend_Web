/**
 * Regression tests for the callback-identity instability that caused
 * "Maximum update depth exceeded" loops in the scanner dialogs.
 *
 * `useFaceScanner` used to list `onPhaseChange` / `onCapture` / `onError` in
 * the dependency array of `attemptAutoDetect`. Callers pass inline arrow
 * functions, so every parent render produced a new `attemptAutoDetect`, which
 * re-created `startDetection`, which re-ran the effects that start/stop the
 * detection timer — an endless render → restart → render cycle.
 *
 * The fix keeps the latest callbacks in refs, so the hook's public callbacks
 * stay stable and always invoke the newest prop.
 */
import { renderHook, act } from "@testing-library/react";
import { useFaceScanner } from "@/lib/ocr/useFaceScanner";

/** Minimal Image stub: jsdom never loads images, so trigger onload manually. */
class FakeImage {
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    setTimeout(() => this.onload?.(), 0);
  }
}

const SCREENSHOT = "data:image/jpeg;base64,AAAA";

type ScannerResult = ReturnType<typeof useFaceScanner>;
interface ScannerProps {
  onPhaseChange: jest.Mock;
  onCapture: jest.Mock;
  onError: jest.Mock;
}

function buildRefs() {
  return {
    webcamRef: {
      current: { getScreenshot: () => SCREENSHOT },
    } as unknown as React.RefObject<never>,
    ipCamRef: { current: null } as unknown as React.RefObject<never>,
  };
}

describe("useFaceScanner — callback stability", () => {
  const originalImage = global.Image;

  beforeEach(() => {
    jest.useFakeTimers();
    (global as unknown as { Image: unknown }).Image = FakeImage;
    // jsdom has no canvas backend: returning null makes the hook treat the
    // frame as "has content" without noisy "not implemented" logs.
    jest
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => null as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    (global as unknown as { Image: unknown }).Image = originalImage;
  });

  it("keeps startDetection/stopDetection identity stable when callbacks change", () => {
    const refs = buildRefs();
    const { result, rerender } = renderHook<ScannerResult, ScannerProps>(
      ({ onPhaseChange, onCapture, onError }) =>
        useFaceScanner({
          phase: "detecting",
          onPhaseChange,
          onCapture,
          onError,
          webcamRef: refs.webcamRef,
          ipCamRef: refs.ipCamRef,
        }),
      {
        initialProps: {
          onPhaseChange: jest.fn(),
          onCapture: jest.fn().mockResolvedValue(false),
          onError: jest.fn(),
        },
      },
    );

    const firstStart = result.current.startDetection;
    const firstStop = result.current.stopDetection;

    rerender({
      onPhaseChange: jest.fn(),
      onCapture: jest.fn().mockResolvedValue(false),
      onError: jest.fn(),
    });

    expect(result.current.startDetection).toBe(firstStart);
    expect(result.current.stopDetection).toBe(firstStop);
  });

  it("invokes the latest callbacks, not the ones captured when the timer started", async () => {
    const refs = buildRefs();
    const firstPhaseChange = jest.fn();
    const firstCapture = jest.fn().mockResolvedValue(false);

    const { result, rerender } = renderHook<ScannerResult, ScannerProps>(
      ({ onPhaseChange, onCapture, onError }) =>
        useFaceScanner({
          phase: "detecting",
          onPhaseChange,
          onCapture,
          onError,
          webcamRef: refs.webcamRef,
          ipCamRef: refs.ipCamRef,
        }),
      {
        initialProps: {
          onPhaseChange: firstPhaseChange,
          onCapture: firstCapture,
          onError: jest.fn(),
        },
      },
    );

    act(() => {
      result.current.startDetection();
    });

    const secondPhaseChange = jest.fn();
    const secondCapture = jest.fn().mockResolvedValue(false);
    rerender({
      onPhaseChange: secondPhaseChange,
      onCapture: secondCapture,
      onError: jest.fn(),
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
      // Image.onload is scheduled as a 0ms timer during the attempt.
      jest.runOnlyPendingTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(secondPhaseChange).toHaveBeenCalledWith("processing");
    expect(secondCapture).toHaveBeenCalledWith(SCREENSHOT);
    expect(firstPhaseChange).not.toHaveBeenCalled();
    expect(firstCapture).not.toHaveBeenCalled();
  });
});
