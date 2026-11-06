/**
 * End-to-end detection of the React "Maximum update depth exceeded" loop.
 *
 * The harness reproduces the exact shape of the scanner dialogs' lifecycle
 * effect: it depends on a callback returned by the real `useBarcodeOCR` hook
 * and calls setState synchronously from that effect. When the hook returns an
 * unstable callback the effect re-runs on every render and React aborts the
 * chain after 50 nested passive updates.
 *
 * A render cap keeps a runaway loop from blocking the test runner forever.
 */
import { render, act } from "@testing-library/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBarcodeOCR } from "@/lib/hooks/useBarcodeOCR";

const MAX_RENDERS = 150;

describe("OCR lifecycle effect — React update depth", () => {
  it("does not trigger 'Maximum update depth exceeded' when the effect depends on the OCR callback", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const renders = { count: 0 };

    function LifecycleHarness() {
      const [items, setItems] = useState<unknown[]>([]);
      const rendersRef = useRef(0);
      const options = useMemo(
        () => ({ lang: ["vie", "eng"], charWhitelist: "LIB0123456789-", intervalMs: 2000 }),
        [],
      );
      const { runOcrOnVideo, terminate } = useBarcodeOCR(options);

      useEffect(() => {
        rendersRef.current += 1;
        renders.count = rendersRef.current;
        if (rendersRef.current > MAX_RENDERS) return;
        setItems([]);
        terminate();
      }, [runOcrOnVideo, terminate]);

      return <span>{items.length}</span>;
    }

    await act(async () => {
      const rendered = render(<LifecycleHarness />);
      await new Promise((resolve) => setTimeout(resolve, 500));
      rendered.unmount();
    });

    const maxDepthWarnings = consoleError.mock.calls
      .map((args) => String(args[0] ?? ""))
      .filter((message) => message.includes("Maximum update depth exceeded"));

    consoleError.mockRestore();

    expect(maxDepthWarnings).toEqual([]);
    expect(renders.count).toBeLessThanOrEqual(5);
  });
});
