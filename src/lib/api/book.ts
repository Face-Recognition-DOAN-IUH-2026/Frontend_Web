import { AxiosInstance } from "axios";
import type {
  BookCopyData,
  BookImportPreviewResponse,
  BookImportResponse,
  BooksListResponse,
  BookWithStats,
  BorrowRecord,
} from "../types";

export function createBookMethods(client: AxiosInstance) {
  return {
    listBooks: async (params?: {
      skip?: number;
      limit?: number;
      search?: string;
    }): Promise<BooksListResponse> => {
      const query: any = {};
      if (params?.skip !== undefined) query.skip = params.skip;
      if (params?.limit !== undefined) query.limit = params.limit;
      if (params?.search) query.search = params.search;
      const response = await client.get<BooksListResponse>(
        "/api/borrow/books",
        { params: query }
      );
      return response.data;
    },

    getBookById: async (bookId: string): Promise<BookWithStats> => {
      const response = await client.get<BookWithStats>(
        `/api/borrow/books/${bookId}`
      );
      return response.data;
    },

    searchBooks: async (q: string): Promise<BookWithStats[]> => {
      const response = await client.get<BookWithStats[]>(
        "/api/borrow/books/search",
        { params: { q } }
      );
      return response.data;
    },

    getBarcodePreview: async (
      file: File,
      mode?: "isbn" | "internal" | "auto"
    ): Promise<BookImportPreviewResponse> => {
      const formData = new FormData();
      formData.append("file", file);
      if (mode) formData.append("mode", mode);
      const response = await client.post<BookImportPreviewResponse>(
        "/api/borrow/books/import/preview",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        }
      );
      return response.data;
    },

    importBooks: async (
      file: File,
      mode?: "isbn" | "internal" | "auto"
    ): Promise<BookImportResponse> => {
      const formData = new FormData();
      formData.append("file", file);
      if (mode) formData.append("mode", mode);
      const response = await client.post<BookImportResponse>(
        "/api/borrow/books/import",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        }
      );
      return response.data;
    },

    importBooksFiltered: async (
      rows: Array<{
        isbn: string;
        quantity: number;
        price?: number | null;
        title: string | null;
        subtitle: string | null;
        author: string | null;
        publisher: string | null;
        published_date: string | null;
        page_count: number | null;
        categories: string | null;
        cover_url: string | null;
        shelf_location?: string | null;
      }>
    ): Promise<BookImportResponse> => {
      const response = await client.post<BookImportResponse>(
        "/api/borrow/books/import/filtered",
        { rows },
        { timeout: 120000 }
      );
      return response.data;
    },

    downloadBookTemplate: async (type?: "basic" | "full"): Promise<void> => {
      const filename = type === "full" ? "book_import_template_full.xlsx" : "book_import_template_basic.xlsx";
      const response = await client.get("/api/borrow/books/template", {
        params: { type: type || "basic" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },

    exportBooks: async (): Promise<void> => {
      const response = await client.get("/api/borrow/books/export", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "books_export.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },

    lookupBookByIsbn: async (isbn: string): Promise<BookWithStats> => {
      const response = await client.get<BookWithStats>(
        `/api/borrow/book/${encodeURIComponent(isbn)}`
      );
      return response.data;
    },

    batchImportByIsbn: async (
      items: { isbn: string; quantity: number }[]
    ): Promise<BookImportResponse> => {
      const response = await client.post<BookImportResponse>(
        "/api/borrow/isbn-import/batch",
        { items }
      );
      return response.data;
    },

    updateBookQuantity: async (
      bookId: string,
      quantity: number
    ): Promise<BookWithStats> => {
      const response = await client.put<BookWithStats>(
        `/api/borrow/books/${bookId}/quantity`,
        { quantity }
      );
      return response.data;
    },

    updateBook: async (
      bookId: string,
      data: Record<string, any>
    ): Promise<BookWithStats> => {
      const response = await client.put<BookWithStats>(
        `/api/borrow/books/${bookId}`,
        data
      );
      return response.data;
    },

    bulkUpdateBookPrices: async (
      bookIds: string[],
      price: number
    ): Promise<{ updated: number; success: boolean }> => {
      const response = await client.post<{
        updated: number;
        success: boolean;
      }>("/api/borrow/books/bulk-price", { book_ids: bookIds, price });
      return response.data;
    },

    bulkDeleteBooks: async (
      bookIds: string[]
    ): Promise<{ deleted: number; errors: string[]; success: boolean }> => {
      const response = await client.post<{
        deleted: number;
        errors: string[];
        success: boolean;
      }>("/api/borrow/books/delete", { book_ids: bookIds });
      return response.data;
    },

    getBarcodes: async (
      bookId?: string,
      availableOnly?: boolean
    ): Promise<BookCopyData[]> => {
      const params: any = {};
      if (bookId) params.book_id = bookId;
      if (availableOnly) params.available_only = true;
      const response = await client.get<BookCopyData[]>(
        "/api/borrow/barcodes",
        { params }
      );
      return response.data;
    },

    lookupBorrowByBarcode: async (
      barcode: string
    ): Promise<BorrowRecord | null> => {
      try {
        const response = await client.get<BorrowRecord>(
          `/api/borrow/barcode/${barcode}`
        );
        return response.data;
      } catch {
        return null;
      }
    },

    getBookCopies: async (bookId: string): Promise<BookCopyData[]> => {
      const response = await client.get<any>(
        `/api/borrow/books/${bookId}/copies`
      );
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    },

    createBookCopy: async (data: {
      book_id: string;
      barcode?: string;
      shelf_location?: string;
      condition?: string;
      status?: string;
    }): Promise<BookCopyData> => {
      const response = await client.post<BookCopyData>(
        "/api/borrow/copies",
        data
      );
      return response.data;
    },

    updateBookCopy: async (
      copyId: string,
      data: {
        shelf_location?: string;
        condition?: string;
        status?: string;
        note?: string;
      }
    ): Promise<BookCopyData> => {
      const response = await client.patch<BookCopyData>(
        `/api/borrow/copies/${copyId}`,
        data
      );
      return response.data;
    },

    deleteBookCopy: async (copyId: string): Promise<{ success: boolean }> => {
      const response = await client.delete<{ success: boolean }>(
        `/api/borrow/copies/${copyId}`
      );
      return response.data;
    },
  };
}
