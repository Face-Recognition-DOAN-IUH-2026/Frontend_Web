/**
 * Regression test for `useOcrProcessor` callback identity.
 *
 * The hook used to list `onError` in `runOcr`'s dependency array. Callers pass
 * inline arrows, so `runOcr` changed identity on every parent render and any
 * effect/decoder depending on it restarted in a loop.
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOcrProcessor } from "@/lib/ocr/useOcrProcessor";

type ProcessorResult = ReturnType<typeof useOcrProcessor>;
interface ProcessorProps {
  onError: jest.Mock;
}

describe("useOcrProcessor — callback stability", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("keeps runOcr identity stable when the onError prop changes", () => {
    const { result, rerender } = renderHook<ProcessorResult, ProcessorProps>(
      ({ onError }) => useOcrProcessor(onError),
      { initialProps: { onError: jest.fn() } },
    );

    const firstRunOcr = result.current.runOcr;
    rerender({ onError: jest.fn() });

    expect(result.current.runOcr).toBe(firstRunOcr);
  });

  it("reports failures through the latest onError callback", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const firstError = jest.fn();
    const secondError = jest.fn();

    const { result, rerender } = renderHook<ProcessorResult, ProcessorProps>(
      ({ onError }) => useOcrProcessor(onError),
      { initialProps: { onError: firstError } },
    );

    rerender({ onError: secondError });

    await act(async () => {
      await result.current.runOcr("data:image/jpeg;base64,AAAA");
    });

    await waitFor(() => {
      expect(secondError).toHaveBeenCalledWith("Lỗi OCR: network down");
    });
    expect(firstError).not.toHaveBeenCalled();
  });
});
