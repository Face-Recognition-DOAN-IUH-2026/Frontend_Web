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

export interface TokenResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  require_password_change?: boolean;
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status?: string;
  has_face?: boolean;
  avatar_url?: string | null;
  phone?: string | null;
  permanent_address?: string | null;
  permanentAddress?: string | null;
  student_code?: string | null;
  class_name?: string | null;
  course?: string | null;
  identity_number?: string | null;
  card_number?: string | null;
  issue_date?: string | null;
  membership_expiry?: string | null;
  suspended_reason?: string | null;
  current_status?: string | null;
  created_at?: string | null;
  last_entry_at?: string | null;
  last_entry_camera?: string | null;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name?: string | null;
  avatar_url?: string | null;
  require_password_change?: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<TokenResponse>;
  setAuthFromToken: (accessToken: string, refreshToken: string | null, email: string, role?: string) => void;
  updateUser: (fields: Partial<AuthUser>) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UserListResponse {
  users: UserPublic[];
  total: number;
}

export interface UserServiceAuthResponse {
  user: UserPublic;
  access_token: string;
  refresh_token?: string;
  require_password_change?: boolean;
}
