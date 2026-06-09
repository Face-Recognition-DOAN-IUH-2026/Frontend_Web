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
  role: string;
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

export interface TaskResult {
  status: string;
  user_id?: string;
  verified?: boolean;
  score?: number;
  matches?: Array<{ user_id: string; score: number }>;
  liveness_score?: number;
  is_live?: boolean;
  error?: string;
  type?: string;
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
  register: (email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
}