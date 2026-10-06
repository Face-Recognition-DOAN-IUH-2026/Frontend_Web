import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookBulkPriceDialog } from "@/app/(dashboard)/_components/books/BookBulkPriceDialog";
import { api } from "@/lib/api-client";
import type { BookWithStats } from "@/lib/types";

jest.mock("@/lib/api-client", () => {
  const mockObj = {
    bulkUpdateBookPrices: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockObj,
    api: mockObj,
    getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
  };
});

describe("BookBulkPriceDialog", () => {
  const mockBooks: BookWithStats[] = [
    {
      id: "b1",
      isbn: "9781111111111",
      title: "Clean Code",
      subtitle: null,
      author: "Robert C. Martin",
      cover_url: null,
      publisher: "Prentice Hall",
      published_date: "2008",
      description: null,
      page_count: 464,
      categories: "Computers",
      average_rating: 4.5,
      language: "en",
      isbn10: null,
      isbn13: null,
      shelf_location: "A1",
      price: 150000,
      is_available: true,
      total_copies: 5,
      available_copies: 3,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    {
      id: "b2",
      isbn: "9782222222222",
      title: "Refactoring",
      subtitle: null,
      author: "Martin Fowler",
      cover_url: null,
      publisher: "Addison-Wesley",
      published_date: "2018",
      description: null,
      page_count: 448,
      categories: "Computers",
      average_rating: 4.7,
      language: "en",
      isbn10: null,
      isbn13: null,
      shelf_location: "A2",
      price: null,
      is_available: true,
      total_copies: 2,
      available_copies: 2,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ];

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    selectedIds: new Set(["b1", "b2"]),
    displayBooks: mockBooks,
    onSuccess: jest.fn(),
    showNotice: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders bulk price dialog with selected book titles and count", () => {
    render(<BookBulkPriceDialog {...defaultProps} />);

    expect(screen.getByText("Sửa giá hàng loạt cho 2 cuốn sách")).toBeInTheDocument();
    expect(screen.getByText("Clean Code")).toBeInTheDocument();
    expect(screen.getByText("Refactoring")).toBeInTheDocument();
  });

  it("updates price via preset chip and calls bulkUpdateBookPrices API", async () => {
    (api.bulkUpdateBookPrices as jest.Mock).mockResolvedValueOnce({
      success: true,
      updated: 2,
    });

    render(<BookBulkPriceDialog {...defaultProps} />);

    // Click preset chip 120.000 đ
    const presetChip = screen.getByText("120.000 đ");
    await userEvent.click(presetChip);

    // Apply button becomes active
    const applyButton = screen.getByRole("button", { name: /Áp dụng 120.000 đ/i });
    expect(applyButton).toBeEnabled();

    await userEvent.click(applyButton);

    await waitFor(() => {
      expect(api.bulkUpdateBookPrices).toHaveBeenCalledWith(["b1", "b2"], 120000);
      expect(defaultProps.showNotice).toHaveBeenCalledWith(
        "success",
        expect.stringContaining("120.000 đ")
      );
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("handles single book price editing correctly", () => {
    render(
      <BookBulkPriceDialog
        {...defaultProps}
        selectedIds={new Set(["b1"])}
      />
    );

    expect(screen.getByText("Cập nhật đơn giá: Clean Code")).toBeInTheDocument();
    // Default value should be formatted from b1's price (150.000)
    const input = screen.getByLabelText("Đơn giá mới (VNĐ)");
    expect(input).toHaveValue("150.000");
  });
});
