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
  course?: string;
  permanent_address?: string;
}

export interface PatronRegisterRequest {
  full_name: string;
  student_code: string;
  email: string;
  password: string;
  class_name?: string;
  course?: string;
  permanent_address?: string;
  date_of_birth?: string;
  faculty?: string;
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
  course: string | null;
  permanent_address: string | null;
}

export interface PatronCreate {
  full_name: string;
  student_code: string;
  class_name?: string;
  membership_expiry: string;
  issue_date?: string;
  course?: string;
  permanent_address?: string;
}

export interface PatronUpdate {
  full_name?: string;
  class_name?: string;
  identity_number?: string;
  email?: string;
  phone?: string;
  membership_expiry?: string;
  status?: string;
  course?: string;
  permanent_address?: string;
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
  note?: string | null;
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
  note?: string | null;
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

export interface StaffReturnRequest {
  barcode: string;
  note?: string | null;
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

export interface BorrowSlipItem {
  barcode: string;
  isbn?: string;
}

export interface CreateBorrowSlipRequest {
  patron_id: string;
  items: BorrowSlipItem[];
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
  created_at: string;
  updated_at: string;
  records?: BorrowRecord[];
}

export interface CreateBorrowSlipResponse {
  status: string;
  message: string;
  slip?: BorrowSlip;
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

// === Staff Schedule ===
export interface ScheduleStaff {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
  status: string;
}

export interface LibraryZone {
  id: string;
  floor: number;
  zoneName: string;
  description: string | null;
  isActive: boolean;
}

export interface StaffShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  minStaff: number;
  isActive: boolean;
}

export interface StaffScheduleAssignment {
  id: string;
  staffId: string;
  shiftId: string;
  zoneId: string;
  workDate: string;
  status: string;
  assignedBy: string | null;
  note: string | null;
  shift?: StaffShift | null;
  zone?: LibraryZone | null;
  staff?: ScheduleStaff | null;
  attendance?: StaffAttendance | null;
}

export interface StaffAttendance {
  id: string;
  scheduleId: string;
  staffId: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  method: string;
}

export interface StaffAvailabilityRequest {
  id: string;
  staffId: string;
  dateFrom: string;
  dateTo: string;
  type: string;
  reason: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface ScheduleAssignmentList {
  items: StaffScheduleAssignment[];
  total: number;
}

// === AI Command Center ===
export type AiInsightCategory = "access" | "borrow" | "schedule" | "inventory" | "risk";
export type AiInsightSeverity = "info" | "warning" | "critical";
export type AiInsightStatus = "open" | "dismissed" | "resolved";

export interface AiInsight {
  id: string;
  category: AiInsightCategory;
  severity: AiInsightSeverity;
  title: string;
  summary: string;
  evidence: Array<{ label: string; value: string | number }>;
  recommended_actions: string[];
  status: AiInsightStatus;
  generated_at: string;
}

export interface AiCommandCenterSummary {
  generated_at: string;
  model: string;
  headline: string;
  operational_score: number;
  insights: AiInsight[];
  snapshot: {
    active_patrons: number;
    today_entries: number;
    today_exits: number;
    active_borrows: number;
    overdue_borrows: number;
    scheduled_staff_today: number;
  };
}

export interface AiInsightList {
  items: AiInsight[];
  total: number;
}

export interface AiChatResponse {
  answer: string;
  model: string;
  generated_at: string;
}
