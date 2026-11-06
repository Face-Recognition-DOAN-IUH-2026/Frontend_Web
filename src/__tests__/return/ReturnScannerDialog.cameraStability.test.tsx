/**
 * Regression test: the return scanner must not restart its camera decoder when
 * the parent component re-renders.
 *
 * `showNotice` is a callback prop. When the parent passes it inline, its
 * identity changes on every parent render, which used to change the identity of
 * the dialog's internal `handleScanned` callback and re-run the camera decode
 * effect (deps: `[open, camMode, cameraReady, handleScanned]`) — tearing down
 * and recreating the ZXing reader on every render.
 */
import { render, waitFor, act } from "@testing-library/react";
import ReturnScannerDialog from "@/app/(dashboard)/_components/return/ReturnScannerDialog";

jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: {
    staffReturnBorrowRecord: jest.fn(),
  },
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

const mockDecodeFromVideoElement = jest.fn();

jest.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoElement: mockDecodeFromVideoElement,
    reset: jest.fn(),
  })),
}));

jest.mock("@zxing/library", () => ({
  BarcodeFormat: {
    CODE_128: "CODE_128",
    EAN_13: "EAN_13",
    CODE_39: "CODE_39",
    EAN_8: "EAN_8",
    UPC_A: "UPC_A",
    UPC_E: "UPC_E",
    QR_CODE: "QR_CODE",
  },
  DecodeHintType: {
    POSSIBLE_FORMATS: "POSSIBLE_FORMATS",
    TRY_HARDER: "TRY_HARDER",
  },
}));

function renderDialog(showNotice: () => void) {
  return (
    <ReturnScannerDialog
      open
      onClose={jest.fn()}
      detail={undefined as any}
      fineConfig={undefined as any}
      onBatchComplete={jest.fn()}
      showNotice={showNotice}
    />
  );
}

describe("ReturnScannerDialog — camera stability across parent renders", () => {
  beforeAll(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }],
        }),
      },
    });
  });

  beforeEach(() => {
    mockDecodeFromVideoElement.mockClear();
  });

  it("does not recreate the barcode decoder when the parent re-renders", async () => {
    const { rerender, unmount } = render(renderDialog(() => {}));

    const video = await waitFor(() => {
      // MUI renders the dialog in a portal, so look it up on the document.
      const element = document.body.querySelector("video");
      expect(element).toBeTruthy();
      return element as HTMLVideoElement;
    });

    await act(async () => {
      video.onloadedmetadata?.(new Event("loadedmetadata"));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockDecodeFromVideoElement).toHaveBeenCalledTimes(1);
    });

    // Parent re-render with a brand new inline callback prop.
    rerender(renderDialog(() => {}));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockDecodeFromVideoElement).toHaveBeenCalledTimes(1);

    unmount();
  });
});
