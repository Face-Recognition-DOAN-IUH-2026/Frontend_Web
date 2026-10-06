import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConditionAttentionSection from "@/app/(dashboard)/_components/books/ConditionAttentionSection";
import { api } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => {
  const mockObj = {
    getConditionAttention: jest.fn(),
    deleteBookCopy: jest.fn(),
    bulkDisposeCopies: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockObj,
    api: mockObj,
    getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
  };
});

jest.mock("@/lib/permission-context", () => ({
  usePermission: () => ({ can: () => true }),
  getPermissionDeniedReason: () => "",
}));

const mockedApi = api as unknown as {
  getConditionAttention: jest.Mock;
  deleteBookCopy: jest.Mock;
  bulkDisposeCopies: jest.Mock;
};

describe("ConditionAttentionSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders summary counts and per-copy recommendations", async () => {
    mockedApi.getConditionAttention.mockResolvedValue({
      summary: { minor_damage: 1, major_damage: 1, lost: 1, maintenance: 0, disposed: 0, total: 3 },
      items: [
        {
          copy_id: "c1",
          barcode: "LIB-1",
          condition: "lost",
          status: "available",
          shelf_location: "A1",
          book: { id: "b1", title: "Old Tales", isbn: "9780000000001" },
          recommendation: { action: "dispose", label: "Đề xuất thanh lý", reason: "Sách đã mất" },
        },
        {
          copy_id: "c2",
          barcode: "LIB-2",
          condition: "minor_damage",
          status: "available",
          shelf_location: "A1",
          book: { id: "b1", title: "Old Tales", isbn: "9780000000001" },
          recommendation: { action: "repair", label: "Đề xuất sửa chữa", reason: "Hư hỏng nhẹ" },
        },
      ],
    });

    render(<ConditionAttentionSection />);

    await waitFor(() => expect(screen.getByText("Sách cần xử lý")).toBeInTheDocument());
    expect(screen.getByText("3 bản")).toBeInTheDocument();
    expect(screen.getByText("Đề xuất thanh lý")).toBeInTheDocument();
    expect(screen.getByText("Đề xuất sửa chữa")).toBeInTheDocument();
    expect(screen.getAllByText("Old Tales")).toHaveLength(2);
  });

  it("shows an all-clear message when nothing needs attention", async () => {
    mockedApi.getConditionAttention.mockResolvedValue({
      summary: { minor_damage: 0, major_damage: 0, lost: 0, maintenance: 0, disposed: 0, total: 0 },
      items: [],
    });

    render(<ConditionAttentionSection />);

    await waitFor(() =>
      expect(screen.getByText(/Không có sách nào cần sửa chữa hay thanh lý/i)).toBeInTheDocument()
    );
  });

  it("shows an error message when the report fails to load", async () => {
    mockedApi.getConditionAttention.mockRejectedValue(new Error("Network error"));

    render(<ConditionAttentionSection />);

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
  });

  it("shows no action button for repair-only rows", async () => {
    mockedApi.getConditionAttention.mockResolvedValue({
      summary: { minor_damage: 1, major_damage: 0, lost: 0, maintenance: 0, disposed: 0, total: 1 },
      items: [
        {
          copy_id: "c9",
          barcode: "LIB-9",
          condition: "minor_damage",
          status: "available",
          shelf_location: "A1",
          book: { id: "b9", title: "Worn Book", isbn: "9780000000009" },
          recommendation: { action: "repair", label: "Đề xuất sửa chữa", reason: "Hư hỏng nhẹ" },
        },
      ],
    });

    render(<ConditionAttentionSection />);
    await waitFor(() => expect(screen.getByText("Worn Book")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: "Gửi bảo trì" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thanh lý" })).not.toBeInTheDocument();
  });

  it("asks for confirmation before disposing a lost copy", async () => {
    const user = userEvent.setup();
    mockedApi.getConditionAttention.mockResolvedValue({
      summary: { minor_damage: 0, major_damage: 0, lost: 1, maintenance: 0, disposed: 0, total: 1 },
      items: [
        {
          copy_id: "c8",
          barcode: "LIB-8",
          condition: "lost",
          status: "available",
          shelf_location: "A1",
          book: { id: "b8", title: "Gone Book", isbn: "9780000000008" },
          recommendation: { action: "dispose", label: "Đề xuất thanh lý", reason: "Sách đã mất" },
        },
      ],
    });
    mockedApi.deleteBookCopy.mockResolvedValue({ success: true });

    render(<ConditionAttentionSection />);
    await waitFor(() => expect(screen.getByText("Gone Book")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Thanh lý" }));
    expect(screen.getByText("Xác nhận thanh lý bản sao")).toBeInTheDocument();
    expect(screen.getByText(/không thể hoàn tác/i)).toBeInTheDocument();
    expect(mockedApi.deleteBookCopy).not.toHaveBeenCalled();

    const confirmButtons = screen.getAllByRole("button", { name: "Xóa khỏi kho" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(mockedApi.deleteBookCopy).toHaveBeenCalledWith("c8"));
  });

  it("bulk-disposes selected copies only after confirmation", async () => {
    const user = userEvent.setup();
    mockedApi.getConditionAttention.mockResolvedValue({
      summary: { minor_damage: 0, major_damage: 1, lost: 1, maintenance: 0, disposed: 0, total: 2 },
      items: [
        {
          copy_id: "c8",
          barcode: "LIB-8",
          condition: "lost",
          status: "available",
          shelf_location: "A1",
          book: { id: "b8", title: "Gone Book", isbn: "9780000000008" },
          recommendation: { action: "dispose", label: "Đề xuất thanh lý", reason: "Sách đã mất" },
        },
        {
          copy_id: "c7",
          barcode: "LIB-7",
          condition: "major_damage",
          status: "available",
          shelf_location: "A1",
          book: { id: "b7", title: "Torn Book", isbn: "9780000000007" },
          recommendation: { action: "review", label: "Đề xuất sửa chữa hoặc thanh lý", reason: "Hư hỏng nặng" },
        },
      ],
    });
    mockedApi.bulkDisposeCopies.mockResolvedValue({ success: true, deleted: 2, deleted_ids: ["c8", "c7"], skipped: [] });

    render(<ConditionAttentionSection />);
    await waitFor(() => expect(screen.getByText("Gone Book")).toBeInTheDocument());

    await user.click(screen.getByRole("checkbox", { name: "Chọn tất cả" }));
    await user.click(screen.getByRole("button", { name: /Xóa đã chọn/ }));

    expect(screen.getByText(/Xác nhận xóa 2 bản sao/)).toBeInTheDocument();
    expect(mockedApi.bulkDisposeCopies).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Xóa vĩnh viễn" }));

    await waitFor(() =>
      expect(mockedApi.bulkDisposeCopies).toHaveBeenCalledWith(["c8", "c7"])
    );
  });
});
