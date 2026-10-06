import type { BookInfo } from "@/lib/types";

export interface BorrowCartItem {
  barcode: string;
  isbn: string;
  loading: boolean;
  can_borrow: boolean;
  reason?: string | null;
  book?: BookInfo | null;
  copy_id?: string | null;
  book_id?: string | null;
  copy_barcode?: string | null;
  shelf_location?: string | null;
  condition?: string | null;
  status?: string | null;
}
