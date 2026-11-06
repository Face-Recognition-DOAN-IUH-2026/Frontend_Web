/**
 * Contract test for the scanner dialogs: in the closed state their lifecycle
 * effect must run exactly once (it resets camera/OCR state and calls
 * `terminate()`).
 *
 * The hook is replaced by a stable stub here so the test can assert the
 * dialog-side contract. The matching regression test for hook stability lives
 * in `useBarcodeOCR.stability.test.tsx`, and the end-to-end loop detection in
 * `ocrLifecycleEffect.loop.test.tsx`.
 */
import { render } from "@testing-library/react";
import BorrowScannerDialog from "@/app/(dashboard)/_components/BorrowScannerDialog";
import ReturnScannerDialog from "@/app/(dashboard)/_components/return/ReturnScannerDialog";

jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: {
    lookupBorrowSlip: jest.fn(),
    getActiveBorrowsByStudentCode: jest.fn(),
  },
  getErrorMessage: (error: unknown) => String(error),
}));

const mockStableOcrHook = {
  state: {
    status: "idle",
    progress: 0,
    recognizedCode: null,
    codeType: null,
    rawText: null,
    error: null,
  },
  runOcrOnVideo: jest.fn(),
  runOcrOnCanvas: jest.fn(),
  runOcrOnImage: jest.fn(),
  init: jest.fn(),
  terminate: jest.fn(),
};

jest.mock("@/lib/hooks/useBarcodeOCR", () => ({
  __esModule: true,
  useBarcodeOCR: () => mockStableOcrHook,
}));

const noop = jest.fn();

describe("scanner dialogs — lifecycle effect contract", () => {
  beforeEach(() => {
    mockStableOcrHook.terminate.mockClear();
    mockStableOcrHook.init.mockClear();
  });

  it("BorrowScannerDialog runs its closed-state lifecycle effect once", () => {
    render(
      <BorrowScannerDialog
        open={false}
        patronId="patron-1"
        onClose={noop}
        onSuccess={noop}
      />,
    );

    expect(mockStableOcrHook.terminate).toHaveBeenCalledTimes(1);
  });

  it("ReturnScannerDialog runs its closed-state lifecycle effect once", () => {
    render(
      <ReturnScannerDialog
        open={false}
        onClose={noop}
        detail={undefined as any}
        fineConfig={undefined as any}
        onBatchComplete={noop}
        showNotice={noop}
      />,
    );

    expect(mockStableOcrHook.terminate).toHaveBeenCalledTimes(1);
  });
});
