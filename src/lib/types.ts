// === Auth ===
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  role?: string;
}

// User-service returns user info along with tokens
export interface UserServiceAuthResponse {
  user: UserPublic;
  access_token: string;
  refresh_token?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  has_face?: boolean;
}

export interface RefreshRequest {
  refresh_token: string;
}

// === Tasks ===
export interface TaskStatusResponse {
  task_id: string;
  status: "PENDING" | "SUCCESS" | "FAILURE" | "RETRY" | "STARTED" | "ERROR";
  result: TaskResult | null;
}

export interface LivenessBreakdown {
  lbp?: number;
  color?: number;
  noise?: number;
  fft?: number;
  multi_scale?: number;
  bbox?: number;
  insightface?: number;
}

export interface TaskResult {
  status: string;
  user_id?: string;
  verified?: boolean;
  score?: number;
  matches?: Array<{ user_id: string; score: number }>;
  liveness_score?: number;
  is_live?: boolean;
  breakdown?: LivenessBreakdown;
  error?: string;
  type?: string;
  access_token?: string;
  refresh_token?: string;
  detail?: string;
}

// === Users ===
export interface UserListResponse {
  users: UserPublic[];
  total: number;
}

// === Face Operations ===
export interface EnrollmentResult {
  job_id: string;
}

export interface VerificationResult {
  job_id: string;
}

export interface IdentificationResult {
  job_id: string;
}

export interface LivenessResult {
  job_id: string;
}

// === API Error ===
export interface ApiError {
  detail: string;
}

// === Auth Context ===
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  setAuthFromToken: (accessToken: string, refreshToken: string | null, email: string, role?: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// === Patron ===
export interface PatronPublic {
  id: string;
  full_name: string;
  student_code: string;
  class_name: string | null;
  identity_number: string | null;
  email: string | null;
  phone: string | null;
  card_number: string;
  issue_date: string | null;
  membership_expiry: string;
  status: string;
  created_at: string;
  updated_at: string;
  has_face: boolean;
}

export interface PatronCreate {
  full_name: string;
  student_code: string;
  class_name?: string;
  membership_expiry: string;
  issue_date?: string;
}

export interface PatronUpdate {
  full_name?: string;
  class_name?: string;
  identity_number?: string;
  email?: string;
  phone?: string;
  membership_expiry?: string;
  status?: string;
}

export interface PatronLookupResult {
  exists: boolean;
  patron: PatronPublic | null;
  has_face: boolean;
  is_expired: boolean;
}

// === Borrow ===
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
  book?: BookInfo | null;
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
  record: BorrowRecord | null;
  book: BookInfo | null;
}

export interface ReturnResponse {
  status: string;
  message: string;
  record: BorrowRecord | null;
}

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
  author: string | null;
  cover_url: string | null;
  shelf_location: string | null;
  copies: BookCopy[];
}

export interface StaffReturnRequest {
  barcode: string;
}

// === Access Log ===
export interface AccessLogPublic {
  id: string;
  patron_id: string | null;
  patron_name: string | null;
  student_code: string | null;
  access_type: string;
  verify_method: string;
  confidence: number | null;
  camera_id: string;
  access_time: string;
  status: string;
}

export interface AccessLogList {
  items: AccessLogPublic[];
  total: number;
}

export interface ActivePatron {
  id: string;
  full_name: string;
  student_code: string;
  entered_at: string;
  camera_id: string;
  image_url: string | null;
  confidence: number | null;
}

export interface AccessFrequencyDay {
  date: string;
  entry: number;
  exit: number;
}

export interface AccessFrequencyResponse {
  daily: AccessFrequencyDay[];
}

export interface StatsResponse {
  total_patrons: number;
  active_patrons: number;
  today_entries: number;
  today_exits: number;
}

export interface KioskResult {
  success: boolean;
  message: string;
  patron: PatronPublic | null;
  job_id: string | null;
  confidence?: number;
}

export interface CameraStatus {
  camera_id: string;
  url: string;
  running: boolean;
  connected: boolean;
  frames_processed: number;
  last_frame_time: string | null;
  last_error: string | null;
  retry_count: number;
  next_retry_in: number | null;
}

// === Books ===
export interface BookWithStats {
  id: string;
  isbn: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  shelf_location: string | null;
  total_copies: number;
  available_copies: number;
  created_at: string;
}

export interface BooksListResponse {
  items: BookWithStats[];
  total: number;
  skip: number;
  limit: number;
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
  author: string | null;
  cover_url: string | null;
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

export interface CameraEvent {
  camera_id: string;
  status: "granted" | "no_match" | "expired" | "spoof" | "error";
  patron_id?: string;
  full_name?: string;
  student_code?: string;
  score?: number;
  access_type?: string;
  is_live?: boolean;
  liveness_score?: number;
  error?: string;
  bbox?: [number, number, number, number];
  landmarks?: [number, number][];
}
