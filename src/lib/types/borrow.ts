import type { BookWithStats } from "./book";

export interface BorrowRecord {
  id: string;
  patron_id: string;
  book_id: string;
  copy_id: string | null;
  borrow_at: string;
  due_at: string;
  return_at: string | null;
  shelf_location: string | null;
  status: string;
  note?: string | null;
  returned_by_user_id?: string | null;
  returned_by_email?: string | null;
  return_method?: string | null;
  slip_id?: string | null;
  fine_amount?: number;
  fine_paid?: boolean;
  damage_fee?: number;
  total_due?: number;
  payment_method?: string | null;
  payment_ref?: string | null;
  paid_at?: string | null;
  renewal_count?: number;
  return_condition?: string | null;
  book?: import("./book").BookInfo | null;
  copy?: import("./book").BookCopy | null;
}

export interface StaffPatronSummary {
  id: string;
  full_name: string | null;
  student_code: string;
  email: string | null;
  card_number: string | null;
  current_status: string | null;
}

export interface StaffPatronActiveBorrowsResponse {
  patron: StaffPatronSummary;
  records: BorrowRecord[];
  total: number;
  overdue_count: number;
}

export interface StaffActiveBorrowerSummary {
  patron: StaffPatronSummary;
  total_borrowed: number;
  overdue_count: number;
  latest_borrow_at: string;
  nearest_due_at: string;
}

export interface StaffActiveBorrowersResponse {
  items: StaffActiveBorrowerSummary[];
  total: number;
}

export interface BorrowResponse {
  status: string;
  message: string;
  condition_warning?: string | null;
  record: BorrowRecord | null;
  book: import("./book").BookInfo | null;
}

export interface ReturnResponse {
  status: string;
  message: string;
  record: BorrowRecord | null;
  note?: string | null;
}

export interface StaffReturnRequest {
  barcode: string;
  note?: string | null;
  condition?: import("./book").CopyCondition | string | null;
  is_paid_immediately?: boolean;
  payment_method?: "cash" | "qr_code";
}

export interface FineLedgerItem {
  record_id: string;
  patron: { id: string; full_name: string | null; student_code: string | null };
  book: { title: string; isbn: string } | null;
  barcode: string | null;
  overdue_fine: number;
  damage_fee: number;
  total: number;
  return_at: string | null;
}

export interface PatronFineItem {
  record_id: string;
  book: { title: string; isbn: string } | null;
  barcode: string | null;
  overdue_fine: number;
  damage_fee: number;
  total: number;
  return_at: string | null;
}

export interface PayFinesResponse {
  ok: boolean;
  paid: Array<{ record_id: string; payment_ref: string | null; already_paid: boolean }>;
  activated: string[];
}

export interface CreatePaymentOrderRequest {
  patron_id?: string;
  record_ids: string[];
  payment_method?: "vietqr" | "payos" | "vnpay";
}

export interface PaymentOrderResponse {
  id: string;
  orderCode: string;
  patronId: string;
  amount: number;
  status: "pending" | "completed" | "expired" | "cancelled";
  paymentMethod: "vietqr" | "payos" | "vnpay" | "cash";
  qrUrl: string | null;
  qrData: string | null;
  expiresAt: string;
  recordIds: string[];
}

export interface PaymentOrderStatusResponse {
  orderCode: string;
  status: "pending" | "completed" | "expired" | "cancelled";
  amount: number;
  paymentMethod: "vietqr" | "payos" | "vnpay" | "cash";
  paidAt: string | null;
  expiresAt: string;
  recordIds: string[];
}

export interface BorrowSlipItem {
  barcode: string;
  isbn?: string;
}

export interface CreateBorrowSlipRequest {
  patron_id: string;
  items: BorrowSlipItem[];
  note?: string | null;
}

export interface BorrowSlip {
  id: string;
  patron_id: string;
  borrow_at: string;
  due_at: string;
  status: string;
  created_by_user_id?: string;
  created_by_email?: string;
  total_items: number;
  note?: string | null;
  created_at: string;
  updated_at: string;
  records?: BorrowRecord[];
}

export interface CreateBorrowSlipResponse {
  status: string;
  message: string;
  slip?: BorrowSlip;
  records?: BorrowRecord[];
}

export interface LookupBorrowSlipRequest {
  patron_id: string;
  items: BorrowSlipItem[];
}

export interface LookupBorrowSlipItem {
  barcode: string;
  isbn?: string;
  can_borrow: boolean;
  reason: string | null;
  book: BookWithStats | null;
  copy: { id: string; book_id: string; barcode: string; is_available: boolean; shelf_location: string | null } | null;
}

export interface LookupBorrowSlipResponse {
  can_create: boolean;
  patron: { id: string; full_name: string | null; student_code: string; email: string | null };
  items: LookupBorrowSlipItem[];
  errors: string[];
  total_items: number;
  available_items: number;
}

export interface ConfirmBorrowSlipRequest {
  patron_id: string;
  items: {
    barcode: string;
    isbn?: string;
    book_id: string;
    copy_id: string;
  }[];
  note?: string | null;
}
