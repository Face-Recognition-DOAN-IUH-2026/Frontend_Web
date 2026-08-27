import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client", () => {
  const original = jest.requireActual("@/lib/api-client");
  const mockApi = {
    borrowBook: jest.fn(),
    staffReturnBook: jest.fn(),
    getBorrowHistory: jest.fn(),
    lookupBorrowByBarcode: jest.fn(),
  };
  return {
    ...original,
    __esModule: true,
    default: mockApi,
    api: mockApi,
  };
});

const mockApi = apiClient.api as jest.Mocked<typeof apiClient.api>;

describe("Borrow API client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("borrowBook calls correct endpoint", async () => {
    mockApi.borrowBook.mockResolvedValueOnce({
      status: "success",
      message: "Mượn sách thành công",
      record: { id: "rec-1", status: "borrowed" } as any,
      book: { id: "book-1", isbn: "123", title: "Test" } as any,
    });

    const result = await apiClient.api.borrowBook("LIB-123-001");
    expect(mockApi.borrowBook).toHaveBeenCalledWith("LIB-123-001");
    expect(result.status).toBe("success");
  });

  it("staffReturnBook calls correct endpoint", async () => {
    mockApi.staffReturnBook.mockResolvedValueOnce({
      status: "success",
      message: "Trả sách thành công",
      record: { id: "rec-1", status: "returned" } as any,
    });

    const result = await apiClient.api.staffReturnBook("LIB-123-001");
    expect(mockApi.staffReturnBook).toHaveBeenCalledWith("LIB-123-001");
    expect(result.status).toBe("success");
  });

  it("getBorrowHistory returns records", async () => {
    mockApi.getBorrowHistory.mockResolvedValueOnce([
      { id: "rec-1", status: "borrowed" } as any,
      { id: "rec-2", status: "returned" } as any,
    ]);

    const result = await apiClient.api.getBorrowHistory({ statusFilter: "borrowed" });
    expect(mockApi.getBorrowHistory).toHaveBeenCalledWith({ statusFilter: "borrowed" });
    expect(result).toHaveLength(2);
  });

  it("lookupBorrowByBarcode returns null on error", async () => {
    mockApi.lookupBorrowByBarcode.mockRejectedValueOnce(new Error("Not found"));

    const result = await apiClient.api.lookupBorrowByBarcode("NONEXISTENT").catch(() => null);
    expect(result).toBeNull();
  });
});

describe("getErrorMessage", () => {
  it("returns detail from response", () => {
    const err = { response: { data: { detail: "Sách không tồn tại" } } };
    expect(apiClient.getErrorMessage(err)).toBe("Sách không tồn tại");
  });

  it("returns message for generic errors", () => {
    const err = new Error("Network error");
    expect(apiClient.getErrorMessage(err)).toBe("Network error");
  });

  it("returns Unknown error for null", () => {
    expect(apiClient.getErrorMessage(null)).toBe("Lỗi không xác định");
  });
});
