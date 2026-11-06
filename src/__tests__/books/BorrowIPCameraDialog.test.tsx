import React, { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BorrowIPCameraDialog from "@/app/(dashboard)/_components/BorrowIPCameraDialog";
import * as apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client", () => {
  const original = jest.requireActual("@/lib/api-client");
  const mockApi = {
    lookupBorrowSlip: jest.fn(),
    confirmBorrowSlip: jest.fn(),
    quickSearchCopies: jest.fn().mockResolvedValue([]),
  };
  return { ...original, __esModule: true, default: mockApi, api: mockApi };
});

jest.mock("@/app/(dashboard)/_components/IPCameraStream", () => ({
  __esModule: true,
  default: () => <div data-testid="ip-camera" />,
}));

const mockApi = apiClient.api as jest.Mocked<typeof apiClient.api>;

function renderDialog() {
  const onSuccess = jest.fn();
  const onClose = jest.fn();
  render(
    <BorrowIPCameraDialog
      open
      patronId="patron-1"
      patronName="Test Patron"
      cameraUrl="http://cam/stream.m3u8"
      onClose={onClose}
      onSuccess={onSuccess}
    />,
  );
  return { onSuccess, onClose };
}

describe("BorrowIPCameraDialog — success callback payload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports the actual borrowed book count to the parent, not a placeholder", async () => {
    const user = userEvent.setup();
    const { onSuccess } = renderDialog();

    mockApi.lookupBorrowSlip.mockResolvedValue({
      items: [
        {
          barcode: "LIB-9780123456789-001",
          isbn: "9780123456789",
          can_borrow: true,
          reason: null,
          book: { id: "book-1", title: "Test Book" },
          copy: { id: "copy-1", barcode: "LIB-9780123456789-001" },
        },
      ],
      errors: [],
      can_create: true,
    } as any);

    mockApi.confirmBorrowSlip.mockResolvedValue({
      status: "success",
      message: "Tạo phiếu mượn thành công",
    } as any);

    const input = screen.getByPlaceholderText("Nhập ISBN thủ công...");
    await user.type(input, "LIB-9780123456789-001{Enter}");

    await screen.findByText("Test Book");
    await user.click(screen.getByRole("button", { name: /Tạo phiếu mượn \(1 cuốn\)/ }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1, message: "Tạo phiếu mượn thành công" }),
    );
    expect(onSuccess).not.toHaveBeenCalledWith(expect.any(String));
  });

  it("includes items pre-added on the manual step in the created slip", async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    render(
      <BorrowIPCameraDialog
        open
        patronId="patron-1"
        patronName="Test Patron"
        cameraUrl="http://cam/stream.m3u8"
        onClose={jest.fn()}
        onSuccess={onSuccess}
        initialItems={[
          {
            barcode: "9780123456789",
            isbn: "9780123456789",
            loading: false,
            can_borrow: true,
            reason: null,
            book: { id: "book-1", title: "Test Book" } as any,
            copy_id: "copy-1",
            book_id: "book-1",
            copy_barcode: "LIB-9780123456789-001",
            shelf_location: null,
            condition: null,
            status: null,
          },
        ]}
      />,
    );

    mockApi.confirmBorrowSlip.mockResolvedValue({
      status: "success",
      message: "Tạo phiếu mượn thành công",
    } as any);

    await user.click(screen.getByRole("button", { name: /Tạo phiếu mượn \(1 cuốn\)/ }));

    await waitFor(() => expect(mockApi.confirmBorrowSlip).toHaveBeenCalled());
    expect(mockApi.confirmBorrowSlip).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            copy_id: "copy-1",
            book_id: "book-1",
            barcode: "LIB-9780123456789-001",
          }),
        ],
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
  });

  it("clears the input text after submitting barcode via Enter", async () => {
    const user = userEvent.setup();
    renderDialog();

    mockApi.lookupBorrowSlip.mockResolvedValue({
      items: [
        {
          barcode: "LIB-9780123456789-002",
          isbn: "9780123456789",
          can_borrow: true,
          reason: null,
          book: { id: "book-2", title: "Another Book" },
          copy: { id: "copy-2", barcode: "LIB-9780123456789-002" },
        },
      ],
      errors: [],
      can_create: true,
    } as any);

    const input = screen.getByPlaceholderText("Nhập ISBN thủ công...") as HTMLInputElement;
    await user.type(input, "LIB-9780123456789-002{Enter}");

    expect(input.value).toBe("");
  });

  it("resets the input when dialog is closed and reopened", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BorrowIPCameraDialog
        open={true}
        patronId="patron-1"
        patronName="Test Patron"
        cameraUrl="http://cam/stream.m3u8"
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Nhập ISBN thủ công...") as HTMLInputElement;
    await user.type(input, "some-partial-code");
    expect(input.value).toBe("some-partial-code");

    // Close dialog
    await act(async () => {
      rerender(
        <BorrowIPCameraDialog
          open={false}
          patronId="patron-1"
          patronName="Test Patron"
          cameraUrl="http://cam/stream.m3u8"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
      );
    });

    // Reopen dialog
    await act(async () => {
      rerender(
        <BorrowIPCameraDialog
          open={true}
          patronId="patron-1"
          patronName="Test Patron"
          cameraUrl="http://cam/stream.m3u8"
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />,
      );
    });

    const reopenedInput = screen.getByPlaceholderText("Nhập ISBN thủ công...") as HTMLInputElement;
    expect(reopenedInput.value).toBe("");
  });
});
