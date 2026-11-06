/**
 * Regression tests for useBarcodeOCR hook stability.
 *
 * BUG: the hook rebuilt `langArray` on every render and used it as a dependency
 * of `runOcrOnVideo` / `runOcrOnCanvas` / `runOcrOnImage`. Every consumer that
 * listed those callbacks in a `useEffect` dependency array re-ran the effect on
 * every render, which triggered React's "Maximum update depth exceeded" loop.
 */
import { renderHook } from "@testing-library/react";
import { useBarcodeOCR } from "@/lib/hooks/useBarcodeOCR";

describe("useBarcodeOCR — stable callback identities", () => {
  it("keeps every returned callback stable across re-renders when options are stable", () => {
    const options = {
      lang: ["vie", "eng"],
      charWhitelist: "LIB0123456789-",
      intervalMs: 2000,
      onRecognized: jest.fn(),
    };

    const { result, rerender } = renderHook(() => useBarcodeOCR(options));

    const first = {
      runOcrOnVideo: result.current.runOcrOnVideo,
      runOcrOnCanvas: result.current.runOcrOnCanvas,
      runOcrOnImage: result.current.runOcrOnImage,
      init: result.current.init,
      terminate: result.current.terminate,
    };

    rerender();
    rerender();

    expect(result.current.runOcrOnVideo).toBe(first.runOcrOnVideo);
    expect(result.current.runOcrOnCanvas).toBe(first.runOcrOnCanvas);
    expect(result.current.runOcrOnImage).toBe(first.runOcrOnImage);
    expect(result.current.init).toBe(first.init);
    expect(result.current.terminate).toBe(first.terminate);
  });

  it("keeps callbacks stable when the hook is called without options", () => {
    const { result, rerender } = renderHook(() => useBarcodeOCR());

    const firstInit = result.current.init;
    const firstRunOcrOnVideo = result.current.runOcrOnVideo;

    rerender();
    rerender();

    expect(result.current.init).toBe(firstInit);
    expect(result.current.runOcrOnVideo).toBe(firstRunOcrOnVideo);
  });

  it("keeps callbacks stable when the caller passes an inline language array", () => {
    const { result, rerender } = renderHook(() =>
      useBarcodeOCR({ lang: ["vie", "eng"], intervalMs: 2000 }),
    );

    const firstRunOcrOnVideo = result.current.runOcrOnVideo;
    const firstInit = result.current.init;

    rerender();
    rerender();

    expect(result.current.runOcrOnVideo).toBe(firstRunOcrOnVideo);
    expect(result.current.init).toBe(firstInit);
  });
});
