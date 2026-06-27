import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BooksPage from "@/app/(dashboard)/books/page";
import * as apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  api: {
    listBooks: jest.fn(),
    searchBooks: jest.fn(),
    importBooks: jest.fn(),
    getBarcodePreview: jest.fn(),
    downloadBookTemplate: jest.fn(),
    exportBooks: jest.fn(),
    updateBookQuantity: jest.fn(),
    getBarcodes: jest.fn(),
  },
  getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
}));

const mockApi = apiClient.api as jest.Mocked<typeof apiClient.api>;

const mockBooksResponse = {
  items: [
    {
      id: "book-1",
      isbn: "9780544003415",
      title: "The Lord of the Rings",
      author: "J.R.R. Tolkien",
      cover_url: null,
      shelf_location: "A-01",
      total_copies: 5,
      available_copies: 3,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "book-2",
      isbn: "9780439708180",
      title: "Harry Potter",
      author: "J.K. Rowling",
      cover_url: null,
      shelf_location: "B-02",
      total_copies: 2,
      available_copies: 0,
      created_at: "2026-01-02T00:00:00Z",
    },
  ],
  total: 2,
  skip: 0,
  limit: 10,
};

describe("BooksPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.listBooks.mockResolvedValue(mockBooksResponse as any);
    mockApi.searchBooks.mockResolvedValue(mockBooksResponse.items as any);
    mockApi.getBarcodes.mockResolvedValue([]);
  });

  it("renders book list with data from API", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText("The Lord of the Rings")).toBeInTheDocument();
    });
    expect(screen.getByText("Harry Potter")).toBeInTheDocument();
  });

  it("shows search input", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/tìm kiếm/i)).toBeInTheDocument();
    });
  });

  it("opens quantity modal on row click", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText("The Lord of the Rings")).toBeInTheDocument();
    });

    const bookRow = screen.getByText("The Lord of the Rings").closest("tr") || screen.getByText("The Lord of the Rings");
    await userEvent.click(bookRow);

    await waitFor(() => {
      expect(screen.getByText(/số lượng/i)).toBeInTheDocument();
    });
  });

  it("shows total and available copies in table", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("shows zero available copies for fully borrowed book", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  it("calls searchBooks when typing in search", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/tìm kiếm/i);
      return searchInput;
    });

    const searchInput = screen.getByPlaceholderText(/tìm kiếm/i);
    await userEvent.type(searchInput, "Harry");

    await waitFor(() => {
      expect(mockApi.searchBooks).toHaveBeenCalledWith("Harry");
    });
  });

  it("renders download template button", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const templateBtn = buttons.find((b) => b.textContent?.includes("Tải mẫu"));
      expect(templateBtn).toBeTruthy();
    });
  });

  it("renders export excel button", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const exportBtn = buttons.find((b) => b.textContent?.includes("Xuất Excel"));
      expect(exportBtn).toBeTruthy();
    });
  });

  it("handles empty book list gracefully", async () => {
    mockApi.listBooks.mockResolvedValueOnce({
      items: [],
      total: 0,
      skip: 0,
      limit: 10,
    });

    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText(/không tìm thấy/i)).toBeInTheDocument();
    });
  });

  it("validates quantity >= 1 in modal", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText("The Lord of the Rings")).toBeInTheDocument();
    });

    const bookRow = screen.getByText("The Lord of the Rings").closest("tr") || screen.getByText("The Lord of the Rings");
    await userEvent.click(bookRow);

    await waitFor(() => {
      expect(screen.getByText(/số lượng/i)).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole("spinbutton");
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, "-1");

    const saveButton = screen.getByText("Lưu");
    await userEvent.click(saveButton);

    expect(mockApi.updateBookQuantity).not.toHaveBeenCalled();
  });
});
