// === Auth ===
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: string;
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
}

export interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  setAuthFromToken: (accessToken: string, refreshToken: string | null, email: string, role?: string) => void;
  register: (email: string, password: string, role?: string) => Promise<void>;
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
  card_number: string;
  membership_expiry: string;
  identity_number?: string;
  email?: string;
  phone?: string;
  issue_date?: string;
}

export interface PatronUpdate {
  full_name?: string;
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
}