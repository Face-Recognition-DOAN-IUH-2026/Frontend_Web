export interface BookCopy {
  id: string;
  book_id: string;
  barcode: string;
  is_available: boolean;
  shelf_location: string | null;
}

export interface BookInfo {
  id: string;
  isbn: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  page_count: number | null;
  categories: string | null;
  average_rating: number | null;
  language: string | null;
  isbn10: string | null;
  isbn13: string | null;
  shelf_location: string | null;
  copies: BookCopy[];
}

export interface BookWithStats {
  id: string;
  isbn: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  page_count: number | null;
  categories: string | null;
  average_rating: number | null;
  language: string | null;
  isbn10: string | null;
  isbn13: string | null;
  shelf_location: string | null;
  is_available: boolean;
  total_copies: number;
  available_copies: number;
  created_at: string;
  updated_at: string;
}

export interface BooksListResponse {
  items: BookWithStats[];
  total: number;
  skip: number;
  limit: number;
  aggregateStats: {
    totalCopies: number;
    availableCopies: number;
    borrowedCopies: number;
  };
}

export interface BookCopyData {
  id: string;
  book_id: string;
  barcode: string;
  is_available: boolean;
  shelf_location: string | null;
}

export interface BookImportPreviewRow {
  isbn: string;
  quantity: number;
  title: string | null;
  subtitle: string | null;
  author: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  categories: string | null;
  cover_url: string | null;
  description: string | null;
  average_rating: number | null;
  language: string | null;
  isbn10: string | null;
  isbn13: string | null;
  barcodes: string[];
  status: string;
  message: string | null;
}

export interface BookImportPreviewResponse {
  rows: BookImportPreviewRow[];
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
}

export interface BookImportResultRow {
  isbn: string;
  title: string;
  quantity: number;
  barcodes: string[];
  status: string;
  message: string | null;
}

export interface BookImportResponse {
  success: boolean;
  total_rows: number;
  imported: number;
  skipped: number;
  errors: number;
  results: BookImportResultRow[];
}

export interface UpdateBookQuantityRequest {
  quantity: number;
}
