import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BooksPage from "@/app/(dashboard)/books/page";
import * as apiClient from "@/lib/api-client";

// Global mock state variables that start with 'mock' to comply with Jest hoisting rules
let mockBooksResponseVal: any;
let mockSearchResultsVal: any;
let mockBarcodesVal: any;

jest.mock("@/lib/api-client", () => {
  const mockObj = {
    listBooks: jest.fn(() => Promise.resolve(mockBooksResponseVal)),
    searchBooks: jest.fn(() => Promise.resolve(mockSearchResultsVal)),
    importBooks: jest.fn(),
    getBarcodePreview: jest.fn(),
    downloadBookTemplate: jest.fn(),
    exportBooks: jest.fn(),
    updateBookQuantity: jest.fn(),
    getBarcodes: jest.fn(() => Promise.resolve(mockBarcodesVal)),
  };
  return {
    __esModule: true,
    default: mockObj,
    api: mockObj,
    getErrorMessage: jest.fn((err) => err?.message || "Unknown error"),
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
}));

const mockApi = apiClient.api as any;

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
  aggregateStats: {
    totalCopies: 7,
    availableCopies: 5,
    borrowedCopies: 2,
    outOfStockBooks: 7,
  },
};

describe("BooksPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBooksResponseVal = mockBooksResponse;
    mockSearchResultsVal = mockBooksResponse.items;
    mockBarcodesVal = [];
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

  it("shows the warehouse-wide out-of-stock count from aggregate stats, not the current page", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText("HẾT BẢN SAO SẴN CÓ")).toBeInTheDocument();
    });
    // Page has 1 out-of-stock book but the warehouse total is 7
    expect(screen.getByText("7 đầu sách cần bổ sung")).toBeInTheDocument();
  });

  it("opens quantity modal on row click", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText("The Lord of the Rings")).toBeInTheDocument();
    });

    const bookRow = screen.getByText("The Lord of the Rings").closest("tr") || screen.getByText("The Lord of the Rings");
    await userEvent.click(bookRow);

    await waitFor(() => {
      expect(screen.getByText("Sửa số lượng sách")).toBeInTheDocument();
    });
  });

  it("shows total and available copies in table", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getAllByText("5").length).toBeGreaterThan(0);
      expect(screen.getAllByText("3").length).toBeGreaterThan(0);
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
      expect(screen.getByLabelText("Tải mẫu")).toBeInTheDocument();
    });
  });

  it("renders export excel button", async () => {
    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Xuất Excel")).toBeInTheDocument();
    });
  });

  it("handles empty book list gracefully", async () => {
    mockBooksResponseVal = {
      items: [],
      total: 0,
      skip: 0,
      limit: 10,
    };

    render(<BooksPage />);

    await waitFor(() => {
      expect(screen.getByText(/không tìm thấy|chưa có sách/i)).toBeInTheDocument();
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
      expect(screen.getByText("Sửa số lượng sách")).toBeInTheDocument();
    });

    const quantityInput = screen.getByRole("spinbutton");
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, "-1");

    const saveButton = screen.getByRole("button", { name: /lưu/i });
    await userEvent.click(saveButton);

    expect(mockApi.updateBookQuantity).not.toHaveBeenCalled();
  });
});
