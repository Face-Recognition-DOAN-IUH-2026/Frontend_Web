import axios, { AxiosInstance, AxiosError } from "axios";
import { bus } from "./event-bus";
import { translateError } from "./error-messages";
import type {
  AccessLogList,
  AccessLogPublic,
  ActivePatron,
  BookImportPreviewResponse,
  BookImportResponse,
  BookWithStats,
  BooksListResponse,
  BookCopyData,
  CameraEvent,
  CameraStatus,
  FaceResultEvent,
  LoginRequest,
  KioskResult,
  PatronCreate,
  PatronLookupResult,
  PatronPublic,
  PatronRegisterRequest,
  PatronUpdate,
  AccessFrequencyResponse,
  RegisterRequest,
  StatsResponse,
  TaskStatusResponse,
  TokenResponse,
  UserListResponse,
  UserPublic,
  BorrowRecord,
  BorrowResponse,
  ReturnResponse,
  StaffActiveBorrowersResponse,
  StaffPatronActiveBorrowsResponse,
  StaffReturnRequest,
  CreateBorrowSlipRequest,
  CreateBorrowSlipResponse,
  LookupBorrowSlipRequest,
  LookupBorrowSlipResponse,
  ConfirmBorrowSlipRequest,
  LibraryZone,
  ScheduleAssignmentList,
  ScheduleStaff,
  StaffScheduleAssignment,
  StaffShift,
  ManualCheckInRequest,
  GeofenceConfig,
  SystemConfigEntry,
  SettingsByCategory,
  AICommandCenterSummary,
  AIInsight,
  AIInsightExplanation,
  AIInsightList,
  AIChatResponse,
  AIConfirmResponse,
  AIBookRecommendationResponse,
  Notification,
  NotificationListResponse,
} from "./types";

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

function normalizeAccessLog(log: any): AccessLogPublic {
  return {
    id: log.id,
    patron_id: log.patron_id || log.patronId || null,
    patron_name: log.patron_name || log.patronName || log.full_name || null,
    student_code: log.student_code || log.studentCode || null,
    camera_id: log.camera_id || log.cameraId || null,
    camera_name: log.camera_name || log.cameraName || null,
    access_type: log.access_type || log.accessType || "unknown",
    confidence: log.confidence ?? null,
    image_url: log.image_url || log.imageUrl || null,
    timestamp: log.timestamp || log.created_at || log.createdAt,
    device_id: log.device_id || log.deviceId || null,
    is_inside: log.is_inside ?? log.isInside ?? null,
    verify_method: log.verify_method || log.verifyMethod || null,
    access_time: log.access_time || log.accessTime || log.timestamp || log.created_at || null,
    status: log.status || null,
  } as AccessLogPublic;
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setAccessTokenCookie(token: string): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `access_token=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function clearAccessTokenCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

function setRefreshTokenCookie(token: string): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `refresh_token=${encodeURIComponent(token)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function clearRefreshTokenCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

function setStoredAccessToken(token: string | null, refreshToken?: string | null) {
  _accessToken = token;
  if (token) {
    setAccessTokenCookie(token);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("token", token);
        localStorage.setItem("access_token", token);
      } catch {}
    }
  } else {
    clearAccessTokenCookie();
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("access_token");
      } catch {}
    }
  }

  if (refreshToken !== undefined) {
    _refreshToken = refreshToken;
    if (refreshToken) {
      setRefreshTokenCookie(refreshToken);
      if (typeof window !== "undefined") {
        try { localStorage.setItem("refresh_token", refreshToken); } catch {}
      }
    } else {
      clearRefreshTokenCookie();
      if (typeof window !== "undefined") {
        try { localStorage.removeItem("refresh_token"); } catch {}
      }
    }
  }
}

function getStoredRefreshToken(): string | null {
  if (_refreshToken) return _refreshToken;
  const cookieVal = getCookieValue("refresh_token");
  if (cookieVal) return cookieVal;
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("refresh_token");
    } catch {}
  }
  return null;
}

function clearStoredAuth() {
  _accessToken = null;
  _refreshToken = null;
  clearAccessTokenCookie();
  clearRefreshTokenCookie();
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } catch {}
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token: string, skewMs = 30_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return Date.now() >= payload.exp * 1000 - skewMs;
}

function getErrorMessage(err: unknown): string {
  if (!err) return "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
  if (typeof err === "string") return translateError(err);
  if (typeof err === "object" && err !== null) {
    const ax = err as any;
    if (ax.response?.data) {
      const data = ax.response.data;
      if (typeof data === "string") return translateError(data);
      if (data.detail) return translateError(typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail));
      if (data.error) return translateError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      if (data.message) return translateError(data.message);
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const raw = data.errors.map((e: any) => e.msg || e.message || JSON.stringify(e)).join("; ");
        return translateError(raw);
      }
      // Last resort: hide raw JSON from the user
      return "Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.";
    }
    if (ax.message) return translateError(ax.message);
  }
  if (err instanceof Error) return translateError(err.message);
  return translateError(String(err));
}

function setApiAccessToken(token: string | null, refreshToken?: string | null) {
  _accessToken = token;
  if (refreshToken !== undefined) {
    _refreshToken = refreshToken;
  }
}

function getApiAccessToken(): string | null {
  return _accessToken;
}

function getApiRefreshToken(): string | null {
  return getStoredRefreshToken();
}

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;
  private pendingRequests: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000, // 10s — was 30s; long-running uploads override per-request
      withCredentials: true,
    });

    this.client.interceptors.request.use(
      async (config) => {
        const url = config.url || "";
        const isAuthEndpoint =
          url.includes("/api/auth/login") ||
          url.includes("/api/auth/register") ||
          url.includes("/api/auth/refresh");

        let token =
          _accessToken ||
          getCookieValue("access_token") ||
          (typeof window !== "undefined"
            ? localStorage.getItem("access_token") || localStorage.getItem("token")
            : null);

        // Proactive silent refresh: if token expires in less than 60s, refresh before sending
        if (token && !isAuthEndpoint && isTokenExpiringSoon(token, 60_000)) {
          const newToken = await this.refreshToken();
          if (newToken) {
            token = newToken;
          }
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        const url = originalRequest?.url || "";
        const isAuthEndpoint =
          url.includes("/api/auth/login") ||
          url.includes("/api/auth/register") ||
          url.includes("/api/auth/refresh");

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;
          try {
            // Wait for existing refresh if in progress
            let newToken: string | null = null;
            if (this.refreshPromise) {
              newToken = await this.refreshPromise;
            } else {
              newToken = await this.handleUnauthorized();
            }

            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch {}
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorized(): Promise<string | null> {
    const newToken = await this.refreshToken();
    if (newToken) {
      this.retryPendingRequests(newToken);
      return newToken;
    }
    this.cancelPendingRequests();
    clearStoredAuth();
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (pathname !== "/login" && pathname !== "/register") {
        window.location.href = `/login?redirect=${encodeURIComponent(pathname)}&reason=session-expired`;
      }
    }
    return null;
  }

  retryPendingRequests(newToken: string) {
    this.pendingRequests.forEach(({ resolve }) => resolve(newToken));
    this.pendingRequests = [];
  }

  cancelPendingRequests() {
    this.pendingRequests.forEach(({ reject }) => reject(new Error("Request cancelled")));
    this.pendingRequests = [];
  }

  private async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      try {
        const storedRefreshToken = getStoredRefreshToken();
        if (!storedRefreshToken) return null;
        const resp = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {
            refresh_token: storedRefreshToken,
          },
          {
            withCredentials: true,
            timeout: 10000,
          }
        );
        const data = resp.data;
        const token = data?.access_token || data?.accessToken;
        const newRefreshToken = data?.refresh_token || data?.refreshToken;
        if (token) {
          setStoredAccessToken(token, newRefreshToken || storedRefreshToken);
          return token;
        }
        return null;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>("/api/auth/login", data);
    if (response.data.access_token) {
      setStoredAccessToken(response.data.access_token, response.data.refresh_token);
    }
    return response.data;
  }

  async register(data: RegisterRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>("/api/auth/register", data);
    if (response.data.access_token) {
      setStoredAccessToken(response.data.access_token, response.data.refresh_token);
    }
    return response.data;
  }

  async verifyEmail(data: { email: string; code: string }): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/auth/verify-email", data);
    return response.data;
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/auth/resend-verification", { email });
    return response.data;
  }

  async requestEmailCorrection(data: { current_email: string; new_email: string }): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/auth/correct-email/request-otp", data);
    return response.data;
  }

  async verifyEmailCorrection(data: { otp: string; new_email: string }): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/auth/correct-email/verify", data);
    return response.data;
  }

  async refreshAuthToken(refreshToken?: string): Promise<TokenResponse> {
    const tokenToUse = refreshToken || getStoredRefreshToken();
    if (!tokenToUse) {
      throw new Error("No refresh token available");
    }
    const response = await axios.post<TokenResponse>(
      `${API_BASE_URL}/api/auth/refresh`,
      { refresh_token: tokenToUse },
      { withCredentials: true, timeout: 10000 }
    );
    if (response.data.access_token) {
      setStoredAccessToken(response.data.access_token, response.data.refresh_token || tokenToUse);
    }
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post("/api/auth/logout");
    } finally {
      clearStoredAuth();
    }
  }

  async faceLogin(imageFile: File): Promise<TokenResponse> {
    const formData = new FormData();
    formData.append("file", imageFile);
    const response = await this.client.post<TokenResponse>("/api/auth/face-login", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (response.data.access_token) {
      setStoredAccessToken(response.data.access_token, response.data.refresh_token);
    }
    return response.data;
  }

  async getCurrentUser(): Promise<UserPublic> {
    const response = await this.client.get<any>("/users/me");
    const u = response.data || {};
    return {
      ...u,
      id: u.id,
      email: u.email,
      full_name: u.full_name ?? u.fullName ?? null,
      role: u.role,
      avatar_url: u.avatar_url ?? u.avatarUrl ?? null,
      phone: u.phone ?? null,
      permanent_address: u.permanent_address ?? u.permanentAddress ?? null,
      student_code: u.student_code ?? u.studentCode ?? null,
      class_name: u.class_name ?? u.className ?? null,
      has_face: u.has_face ?? u.hasFace ?? false,
    };
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await this.client.post<{ avatarUrl?: string; avatar_url?: string }>(
      "/users/me/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    const avatarUrl = response.data.avatarUrl || response.data.avatar_url || "";
    return { avatarUrl };
  }

  async deleteAvatar(): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>("/users/me/avatar");
    return response.data;
  }

  async updateProfile(data: { full_name?: string; phone?: string; address?: string }): Promise<UserPublic> {
    const response = await this.client.put<UserPublic>("/users/me/profile", data);
    return response.data;
  }

  async changePassword(data: { old_password: string; new_password: string }): Promise<{ message: string }> {
    const response = await this.client.put<{ message: string }>("/users/me/password", data);
    return response.data;
  }

  async requestEmailChangeOtp(data: { new_email: string }): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/users/me/email/request-otp", data);
    return response.data;
  }

  async verifyAndChangeEmail(data: { otp: string; new_email: string }): Promise<{ message: string }> {
    const response = await this.client.put<{ message: string }>("/users/me/email", data);
    return response.data;
  }

  async getFaceEnrollmentStatus(): Promise<{ has_face: boolean; full_name: string | null; role: string }> {
    const response = await this.client.get<{ has_face: boolean; full_name: string | null; role: string }>("/api/users/me");
    return response.data;
  }

  async getTaskStatus(taskId: string, token?: string): Promise<TaskStatusResponse> {
    const headers: Record<string, string> = {};
    if (token) headers["X-Internal-Token"] = token;
    const response = await this.client.get<TaskStatusResponse>(`/api/tasks/${taskId}`, { headers });
    return response.data;
  }

  async listUsers(opts?: { skip?: number; limit?: number }): Promise<UserListResponse> {
    const params: Record<string, string> = {};
    if (opts?.skip !== undefined)  params.skip  = String(opts.skip);
    if (opts?.limit !== undefined) params.limit = String(opts.limit);
    const response = await this.client.get<UserListResponse>("/api/users", { params });
    const data = response.data as any;
    return {
      total: data.total ?? 0,
      users: (data.users ?? []).map((u: any) => ({
        ...u,
        has_face: u.hasFace ?? u.has_face ?? false,
        full_name: u.full_name ?? u.fullName ?? null,
        avatar_url: u.avatar_url ?? u.avatarUrl ?? null,
        student_code: u.student_code ?? u.studentCode ?? null,
        card_number: u.card_number ?? u.cardNumber ?? null,
        phone: u.phone ?? null,
        current_status: u.current_status ?? u.currentStatus ?? null,
        last_entry_at: u.last_entry_at ?? u.lastEntryAt ?? null,
        last_entry_camera: u.last_entry_camera ?? u.lastEntryCamera ?? null,
        membership_expiry: u.membership_expiry ?? u.membershipExpiry ?? null,
        permanent_address: u.permanent_address ?? u.permanentAddress ?? null,
        created_at: u.created_at ?? u.createdAt ?? null,
        identity_number: u.identity_number ?? u.identityNumber ?? null,
        class_name: u.class_name ?? u.className ?? null,
      })),
    };
  }

  async getUser(userId: string): Promise<UserPublic> {
    const response = await this.client.get<UserPublic>(`/api/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: string, data: Partial<UserPublic>): Promise<UserPublic> {
    const response = await this.client.put<UserPublic>(`/api/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/api/users/${userId}`);
    return response.data;
  }

  async restoreUser(userId: string): Promise<{ message: string }> {
    const response = await this.client.put<{ message: string }>(`/api/users/${userId}/restore`);
    return response.data;
  }

  async enrollBatch(
    files: { frontal: File; right: File; left: File; down: File },
    consent: boolean,
    token?: string
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("frontal", files.frontal);
    formData.append("right", files.right);
    formData.append("left", files.left);
    formData.append("down", files.down);
    formData.append("consent_given", String(consent));
    const headers: Record<string, string> = { "Content-Type": "multipart/form-data" };
    if (token) headers["X-Internal-Token"] = token;
    const response = await this.client.post<{ job_id: string }>("/api/face/enroll-batch", formData, { headers });
    return response.data;
  }

  async verifyFace(imageFile: File, targetUserId: string, consent: boolean): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("target_user_id", targetUserId);
    formData.append("consent_given", String(consent));
    const response = await this.client.post<{ job_id: string }>("/api/face/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async identifyFace(imageFile: File, consent: boolean): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consent));
    const response = await this.client.post<{ job_id: string }>("/api/face/identify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async livenessCheck(imageFile: File, consent: boolean): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consent));
    const response = await this.client.post<{ job_id: string }>("/api/face/liveness", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async deleteFaceData(userId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/api/face/${userId}`);
    return response.data;
  }

  async processFaceImage(formData: FormData): Promise<{ task_id: string; status: string }> {
    const response = await this.client.post<{ task_id: string; status: string }>("/api/face/process", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async processFaceImageSync(data: any): Promise<{ status: string; process_type: string; result: Record<string, unknown>; processing_time_ms: number }> {
    const response = await this.client.post("/api/face/process-sync", data);
    return response.data;
  }

  async searchPatrons(query?: string, status?: string, skip = 0, limit = 50): Promise<{ items: PatronPublic[]; total: number }> {
    const params: any = { skip, limit };
    if (query) params.q = query;
    if (status) params.status = status;
    const response = await this.client.get<{ items: PatronPublic[]; total: number }>("/api/patrons/search", { params });
    return response.data;
  }

  async lookupPatron(studentCode?: string, cardNumber?: string): Promise<PatronLookupResult> {
    const params: any = {};
    if (studentCode) params.student_code = studentCode;
    if (cardNumber) params.card_number = cardNumber;
    const response = await this.client.get<PatronLookupResult>("/api/patrons/lookup", { params });
    return response.data;
  }

  async getPatron(id: string): Promise<PatronPublic> {
    const response = await this.client.get<PatronPublic>(`/api/patrons/${id}`);
    return response.data;
  }

  async createPatron(data: PatronCreate): Promise<PatronPublic> {
    const response = await this.client.post<PatronPublic>("/api/patrons", data);
    return response.data;
  }

  async patronRegister(data: PatronRegisterRequest): Promise<{ user: UserPublic; access_token: string; refresh_token?: string }> {
    const response = await this.client.post<{ user: UserPublic; access_token: string; refresh_token?: string }>("/api/patrons/register", data);
    return response.data;
  }

  async updatePatron(id: string, data: PatronUpdate): Promise<PatronPublic> {
    const response = await this.client.put<PatronPublic>(`/api/patrons/${id}`, data);
    return response.data;
  }

  async deletePatron(id: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/api/patrons/${id}`);
    return response.data;
  }

  async restorePatron(id: string): Promise<{ message: string }> {
    const response = await this.client.put<{ message: string }>(`/api/patrons/${id}/restore`);
    return response.data;
  }

  async getAccessLogs(
    params?: {
      patronId?: string;
      cameraId?: string;
      status?: string;
      accessType?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      skip?: number;
      limit?: number;
    }
  ): Promise<AccessLogList> {
    const query: any = {};
    if (params) {
      if (params.patronId) query.patron_id = params.patronId;
      if (params.cameraId) query.camera_id = params.cameraId;
      if (params.status) query.status = params.status;
      if (params.accessType) query.access_type = params.accessType;
      if (params.dateFrom) query.date_from = params.dateFrom;
      if (params.dateTo) query.date_to = params.dateTo;
      if (params.search) query.search = params.search;
      query.skip = params.skip ?? 0;
      query.limit = Math.min(params.limit ?? 50, 200);
    }
    const response = await this.client.get<AccessLogList | AccessLogPublic[]>("/api/access/logs", { params: query });
    const data = response.data;
    if (Array.isArray(data)) {
      const items = data.map(normalizeAccessLog);
      return { items, total: items.length };
    }
    const items = Array.isArray(data?.items) ? data.items.map(normalizeAccessLog) : [];
    return {
      items,
      total: typeof data?.total === "number" ? data.total : items.length,
    };
  }

  connectAccessSSE(
    onEvent: (event: CameraEvent) => void,
    onConnectionChange?: (connected: boolean) => void,
  ): () => void {
    const es = new EventSource(`${API_BASE_URL}/api/access/events`, { withCredentials: true });
    es.addEventListener("open", () => onConnectionChange?.(true));
    es.addEventListener("camera_event", (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data) as CameraEvent;
        onEvent(data);
      } catch { /* ignore parse errors */ }
    });
    es.addEventListener("error", () => { onConnectionChange?.(false); });
    return () => es.close();
  }

  connectFaceResultSSE(
    onEvent: (event: FaceResultEvent) => void,
    onConnectionChange?: (connected: boolean) => void,
  ): () => void {
    const es = new EventSource(`${API_BASE_URL}/api/access/events`, { withCredentials: true });
    es.addEventListener("open", () => onConnectionChange?.(true));
    es.addEventListener("face_result", (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data) as FaceResultEvent;
        onEvent(data);
      } catch { /* ignore parse errors */ }
    });
    es.addEventListener("error", () => { onConnectionChange?.(false); });
    return () => es.close();
  }

  async getRecentLogs(): Promise<AccessLogList> {
    const response = await this.client.get<AccessLogList | AccessLogPublic[]>("/api/access/recent");
    const data = response.data;
    if (Array.isArray(data)) {
      const items = data.map(normalizeAccessLog);
      return { items, total: items.length };
    }
    const items = Array.isArray(data?.items) ? data.items.map(normalizeAccessLog) : [];
    return {
      items,
      total: typeof data?.total === "number" ? data.total : items.length,
    };
  }

  async getActivePatrons(): Promise<{ items: ActivePatron[]; total: number }> {
    const response = await this.client.get<{ items: ActivePatron[]; total: number } | any[]>("/api/access/active");
    const data = response.data;
    const rawItems = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    const items = rawItems.map((item: any) => ({
      ...item,
      id: item.id || item.patron_id,
      full_name: item.full_name || item.fullName || "",
      student_code: item.student_code || item.studentCode || "",
      entered_at: item.entered_at || item.last_entry_at || item.lastEntryAt || "",
      camera_id: item.camera_id || item.last_entry_camera || item.lastEntryCamera || "",
      image_url: item.image_url || null,
      confidence: item.confidence ?? null,
    }));
    return {
      items,
      total: typeof (data as any)?.total === "number" ? (data as any).total : items.length,
    };
  }

  async forceExitPatron(patronId: string): Promise<void> {
    await this.client.post("/api/access/force-exit", { patron_id: patronId });
  }

  async getAccessFrequency(params?: { dateFrom?: string; dateTo?: string }): Promise<AccessFrequencyResponse> {
    const query: any = {};
    if (params?.dateFrom) query.date_from = params.dateFrom;
    if (params?.dateTo) query.date_to = params.dateTo;
    const response = await this.client.get<AccessFrequencyResponse | any[]>("/api/access/frequency", { params: query });
    const data = response.data;
    if (!Array.isArray(data)) {
      return { daily: Array.isArray(data?.daily) ? data.daily : [] };
    }
    const byDate = new Map<string, { date: string; entry: number; exit: number }>();
    data.forEach((row: any) => {
      const date = new Date(row.date).toISOString().split("T")[0];
      const item = byDate.get(date) || { date, entry: 0, exit: 0 };
      const type = row.access_type || row.accessType;
      const count = Number(row.count || 0);
      if (type === "entry") item.entry += count;
      if (type === "exit") item.exit += count;
      byDate.set(date, item);
    });
    return { daily: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) };
  }

  async getStats(): Promise<StatsResponse> {
    const response = await this.client.get<any>("/api/patrons/stats");
    const data = response.data || {};
    return {
      total_patrons: data.totalPatrons ?? 0,
      active_patrons: data.activePatrons ?? 0,
      today_entries: data.todayEntries ?? 0,
      today_exits: data.todayExits ?? 0,
    };
  }

  async enrollPatronFace(
    patronId: string,
    imageFile: File,
    angle: string = "frontal"
  ): Promise<{ success: boolean; job_id: string; message: string }> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("angle", angle);
    const response = await this.client.post(`/api/patrons/${patronId}/enroll-face`, formData);
    return response.data;
  }

  async enrollPatronFaceBatch(
    patronId: string,
    files: { frontal: File; right: File; left: File; down: File },
    consent: boolean = true
  ): Promise<{ success: boolean; job_id: string; message: string }> {
    const formData = new FormData();
    formData.append("frontal", files.frontal);
    formData.append("right", files.right);
    formData.append("left", files.left);
    formData.append("down", files.down);
    formData.append("consent_given", String(consent));
    const response = await this.client.post(`/api/patrons/${patronId}/enroll-batch`, formData);
    return response.data;
  }

  async kioskLookup(
    studentCode?: string,
    cardNumber?: string
  ): Promise<PatronLookupResult> {
    const params: any = {};
    if (studentCode) params.student_code = studentCode;
    if (cardNumber) params.card_number = cardNumber;
    const response = await this.client.post<PatronLookupResult>("/api/kiosk/lookup", null, { params });
    return response.data;
  }

  async kioskEnroll(
    imageFile: File,
    fullName: string,
    studentCode: string,
    membershipExpiry: string,
    className?: string,
    angle: string = "frontal"
  ): Promise<KioskResult> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("full_name", fullName);
    formData.append("student_code", studentCode);
    formData.append("membership_expiry", membershipExpiry);
    formData.append("angle", angle);
    if (className) formData.append("class_name", className);
    const response = await this.client.post<KioskResult>("/api/kiosk/enroll", formData);
    return response.data;
  }

  async kioskEnter(imageFile: File, studentCode: string): Promise<KioskResult> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("student_code", studentCode);
    const response = await this.client.post<KioskResult>("/api/kiosk/enter", formData);
    return response.data;
  }

  async kioskBatchEnroll(
    imageFrontal: File,
    imageRight: File,
    imageLeft: File,
    imageDown: File,
    fullName: string,
    studentCode: string,
    membershipExpiry: string,
    className?: string,
  ): Promise<KioskResult> {
    const formData = new FormData();
    formData.append("image_frontal", imageFrontal);
    formData.append("image_right", imageRight);
    formData.append("image_left", imageLeft);
    formData.append("image_down", imageDown);
    formData.append("full_name", fullName);
    formData.append("student_code", studentCode);
    formData.append("membership_expiry", membershipExpiry);
    if (className) formData.append("class_name", className);
    const response = await this.client.post<KioskResult>("/api/kiosk/batch-enroll", formData);
    return response.data;
  }

  async kioskPresence(patronId: string, studentCode: string, deviceId: string): Promise<{ current_status: string; message: string }> {
    const response = await this.client.post("/api/access/kiosk/presence", {
      patron_id: patronId,
      student_code: studentCode,
      device_id: deviceId,
    });
    return response.data;
  }

  async confirmEntry(patronId: string): Promise<{ current_status: string; message: string }> {
    const response = await this.client.post(`/api/internal/access/patrons/${patronId}/confirm-entry`);
    return response.data;
  }

  async revertPending(patronId: string): Promise<{ current_status: string; message: string }> {
    const response = await this.client.post(`/api/internal/access/patrons/${patronId}/revert-pending`);
    return response.data;
  }

  async createKioskApprovalRequest(data: { device_id: string; patron_id: string; student_code: string; fail_image_url?: string; isbns?: string }): Promise<{ event_code: string; device_auth_token: string; status: string; expires_at: string }> {
    const response = await this.client.post("/api/access/kiosk/approval-request", data);
    return response.data;
  }

  async getPendingApprovalRequests(): Promise<Array<{ id: string; event_code: string; kiosk_device_id: string; patron_id: string | null; patron_student_code: string | null; fail_image_url: string | null; isbns: string | null; status: string; created_at: string; expires_at: string }>> {
    const response = await this.client.get("/api/access/kiosk/approval-requests/pending");
    return response.data;
  }

  async getApprovalRequestStatus(code: string): Promise<{ id: string; event_code: string; status: string; created_at: string; expires_at: string; approved_by: string | null; reject_reason: string | null }> {
    const response = await this.client.get(`/api/access/kiosk/approval-requests/${code}`);
    return response.data;
  }

  async approveKioskRequest(code: string, approvedBy: string): Promise<{ status: string; event_code: string }> {
    const response = await this.client.post(`/api/access/kiosk/approval-requests/${code}/approve`, { approved_by: approvedBy });
    return response.data;
  }

  async rejectKioskRequest(code: string, approvedBy: string, reason?: string): Promise<{ status: string; event_code: string }> {
    const response = await this.client.post(`/api/access/kiosk/approval-requests/${code}/reject`, { approved_by: approvedBy, reason });
    return response.data;
  }

  async kioskEnrollFace(
    patronId: string,
    imageFile: File,
    angle: string = "frontal"
  ): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("angle", angle);
    const response = await this.client.post(`/api/kiosk/enroll-face/${patronId}`, formData);
    return response.data;
  }

  async getCameraStatus(): Promise<CameraStatus[]> {
    const response = await this.client.get<CameraStatus[]>("/api/camera/status");
    return response.data;
  }

  async reconnectCamera(cameraId: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>(`/api/camera/reconnect/${cameraId}`);
    return response.data;
  }

  async reconnectAllCameras(): Promise<{ message: string; cameras: string[] }> {
    const response = await this.client.post<{ message: string; cameras: string[] }>("/api/camera/reconnect-all");
    return response.data;
  }

  async borrowBook(barcode: string): Promise<BorrowResponse> {
    const response = await this.client.post<BorrowResponse>("/api/borrow/", { barcode });
    return response.data;
  }

  async staffReturnBook(barcode: string, note?: string | null): Promise<ReturnResponse> {
    const response = await this.client.post<ReturnResponse>("/api/borrow/return", { barcode, note } as StaffReturnRequest);
    return response.data;
  }

  async getActiveBorrowers(): Promise<StaffActiveBorrowersResponse> {
    const response = await this.client.get<StaffActiveBorrowersResponse>("/api/borrow/active-borrowers");
    return response.data;
  }

  async getActiveBorrowsByStudentCode(studentCode: string): Promise<StaffPatronActiveBorrowsResponse> {
    const response = await this.client.get<StaffPatronActiveBorrowsResponse>(
      `/api/borrow/patrons/${encodeURIComponent(studentCode)}/active`
    );
    return response.data;
  }

  async staffReturnBorrowRecord(recordId: string, note?: string | null): Promise<ReturnResponse> {
    const response = await this.client.post<ReturnResponse>(`/api/borrow/return/record/${recordId}`, { note });
    return response.data;
  }

  async getBorrowStats(): Promise<{ total: number; active: number; overdue: number }> {
    const response = await this.client.get("/api/borrow/stats");
    return response.data;
  }

  async getBorrowConfig(): Promise<{ max_borrow_books: number; max_borrow_books_per_slip: number; max_borrow_days: number }> {
    const response = await this.client.get("/api/borrow/config");
    return response.data;
  }

  async getAllActiveBorrows(): Promise<BorrowRecord[]> {
    const response = await this.client.get<BorrowRecord[]>("/api/borrow/active");
    return response.data;
  }

  async getBorrowHistory(params?: { patronId?: string; statusFilter?: string }): Promise<BorrowRecord[]> {
    const query: any = {};
    if (params?.statusFilter) query.status_filter = params.statusFilter;
    const endpoint = params?.patronId
      ? `/api/borrow/patrons/id/${params.patronId}/history`
      : "/api/borrow/history";
    const response = await this.client.get<BorrowRecord[]>(endpoint, { params: query });
    return response.data;
  }

  async lookupBorrowByBarcode(barcode: string): Promise<BorrowRecord | null> {
    try {
      const response = await this.client.get<BorrowRecord>(`/api/borrow/barcode/${barcode}`);
      return response.data;
    } catch {
      return null;
    }
  }

  async listBooks(params?: { skip?: number; limit?: number; search?: string }): Promise<BooksListResponse> {
    const query: any = {};
    if (params?.skip !== undefined) query.skip = params.skip;
    if (params?.limit !== undefined) query.limit = params.limit;
    if (params?.search) query.search = params.search;
    const response = await this.client.get<BooksListResponse>("/api/borrow/books", { params: query });
    return response.data;
  }

  async getBookById(bookId: string): Promise<BookWithStats> {
    const response = await this.client.get<BookWithStats>(`/api/borrow/books/${bookId}`);
    return response.data;
  }

  async searchBooks(q: string): Promise<BookWithStats[]> {
    const response = await this.client.get<BookWithStats[]>("/api/borrow/books/search", { params: { q } });
    return response.data;
  }

  async getBarcodePreview(file: File): Promise<BookImportPreviewResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await this.client.post<BookImportPreviewResponse>("/api/borrow/books/import/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async importBooks(file: File): Promise<BookImportResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await this.client.post<BookImportResponse>("/api/borrow/books/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async importBooksFiltered(rows: Array<{
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
  }>): Promise<BookImportResponse> {
    const response = await this.client.post<BookImportResponse>("/api/borrow/books/import/filtered", { rows });
    return response.data;
  }

  async downloadBookTemplate(): Promise<void> {
    const response = await this.client.get("/api/borrow/books/template", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "book_import_template.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async exportBooks(): Promise<void> {
    const response = await this.client.get("/api/borrow/books/export", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = "books_export.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async lookupBookByIsbn(isbn: string): Promise<BookWithStats> {
    const response = await this.client.get<BookWithStats>(`/api/borrow/book/${encodeURIComponent(isbn)}`);
    return response.data;
  }

  async batchImportByIsbn(items: { isbn: string; quantity: number }[]): Promise<BookImportResponse> {
    const response = await this.client.post<BookImportResponse>("/api/borrow/isbn-import/batch", { items });
    return response.data;
  }

  async updateBookQuantity(bookId: string, quantity: number): Promise<BookWithStats> {
    const response = await this.client.put<BookWithStats>(`/api/borrow/books/${bookId}/quantity`, { quantity });
    return response.data;
  }

  async updateBook(bookId: string, data: Record<string, any>): Promise<BookWithStats> {
    const response = await this.client.put<BookWithStats>(`/api/borrow/books/${bookId}`, data);
    return response.data;
  }

  async bulkDeleteBooks(bookIds: string[]): Promise<{ deleted: number; errors: string[]; success: boolean }> {
    const response = await this.client.post<{ deleted: number; errors: string[]; success: boolean }>("/api/borrow/books/delete", { book_ids: bookIds });
    return response.data;
  }

  async createBorrowSlip(data: CreateBorrowSlipRequest): Promise<CreateBorrowSlipResponse> {
    const response = await this.client.post<CreateBorrowSlipResponse>("/api/borrow/slip/create", data);
    return response.data;
  }

  async lookupBorrowSlip(data: LookupBorrowSlipRequest): Promise<LookupBorrowSlipResponse> {
    const response = await this.client.post<LookupBorrowSlipResponse>("/api/borrow/slip/lookup", data);
    return response.data;
  }

  async confirmBorrowSlip(data: ConfirmBorrowSlipRequest): Promise<CreateBorrowSlipResponse> {
    const response = await this.client.post<CreateBorrowSlipResponse>("/api/borrow/slip/confirm", data);
    return response.data;
  }

  async getBarcodes(bookId?: string, availableOnly?: boolean): Promise<BookCopyData[]> {
    const params: any = {};
    if (bookId) params.book_id = bookId;
    if (availableOnly !== undefined) params.available_only = String(availableOnly);
    const response = await this.client.get<BookCopyData[]>("/api/borrow/barcodes", { params });
    return response.data;
  }

  async getScheduleStaffOptions(): Promise<ScheduleStaff[]> {
    const response = await this.client.get<ScheduleStaff[]>("/api/schedules/staff-options");
    return response.data;
  }

  async getScheduleZones(): Promise<LibraryZone[]> {
    const response = await this.client.get<LibraryZone[]>("/api/schedules/zones");
    return response.data;
  }

  async createScheduleZone(data: Partial<LibraryZone>): Promise<LibraryZone> {
    const response = await this.client.post<LibraryZone>("/api/schedules/zones", data);
    return response.data;
  }

  async deleteScheduleZone(id: string): Promise<{ deleted: boolean; id: string }> {
    const response = await this.client.delete<{ deleted: boolean; id: string }>(`/api/schedules/zones/${id}`);
    return response.data;
  }

  async getScheduleShifts(): Promise<StaffShift[]> {
    const response = await this.client.get<StaffShift[]>("/api/schedules/shifts");
    return response.data;
  }

  async createScheduleShift(data: Partial<StaffShift>): Promise<StaffShift> {
    const response = await this.client.post<StaffShift>("/api/schedules/shifts", data);
    return response.data;
  }

  async deleteScheduleShift(id: string): Promise<{ deleted: boolean; id: string }> {
    const response = await this.client.delete<{ deleted: boolean; id: string }>(`/api/schedules/shifts/${id}`);
    return response.data;
  }

  async getScheduleAssignments(params?: { from?: string; to?: string; staffId?: string; zoneId?: string; shiftId?: string; status?: string }): Promise<ScheduleAssignmentList> {
    const query: any = {};
    if (params?.from) query.from = params.from;
    if (params?.to) query.to = params.to;
    if (params?.staffId) query.staff_id = params.staffId;
    if (params?.zoneId) query.zone_id = params.zoneId;
    if (params?.shiftId) query.shift_id = params.shiftId;
    if (params?.status) query.status = params.status;
    const response = await this.client.get<ScheduleAssignmentList>("/api/schedules/assignments", { params: query });
    return response.data;
  }

  async createScheduleAssignment(data: { staffId: string; shiftId: string; zoneId: string; workDate: string; note?: string | null }): Promise<StaffScheduleAssignment> {
    const response = await this.client.post<StaffScheduleAssignment>("/api/schedules/assignments", data);
    return response.data;
  }

  async createScheduleAssignmentsBulk(data: Array<{ staffId: string; shiftId: string; zoneId: string; workDate: string; note?: string | null }>): Promise<StaffScheduleAssignment[]> {
    const response = await this.client.post<StaffScheduleAssignment[]>("/api/schedules/assignments/bulk", data);
    return response.data;
  }

  async moveScheduleAssignment(id: string, data: Partial<StaffScheduleAssignment>): Promise<StaffScheduleAssignment> {
    const response = await this.client.post<StaffScheduleAssignment>(`/api/schedules/assignments/${id}/move`, data);
    return response.data;
  }

  async deleteScheduleAssignment(id: string): Promise<{ deleted: boolean; id: string }> {
    const response = await this.client.delete<{ deleted: boolean; id: string }>(`/api/schedules/assignments/${id}`);
    return response.data;
  }

  async getMySchedules(params?: { from?: string; to?: string }): Promise<ScheduleAssignmentList> {
    const response = await this.client.get<ScheduleAssignmentList>("/api/schedules/me", { params });
    return response.data;
  }

  async confirmScheduleAssignment(id: string): Promise<StaffScheduleAssignment> {
    const response = await this.client.post<StaffScheduleAssignment>(`/api/schedules/assignments/${id}/confirm`);
    return response.data;
  }

  async checkInScheduleAssignment(id: string, options?: { method?: string; lat?: number; lng?: number }): Promise<any> {
    const response = await this.client.post(`/api/schedules/assignments/${id}/check-in`, { method: options?.method || "web", lat: options?.lat, lng: options?.lng });
    return response.data;
  }

  async checkOutScheduleAssignment(id: string): Promise<any> {
    const response = await this.client.post(`/api/schedules/assignments/${id}/check-out`);
    return response.data;
  }

  async autoSchedule(data: { from: string; to: string }): Promise<{ proposed: Array<{ staffId: string; shiftId: string; zoneId: string; workDate: string; note: string }>; skipped: number; total: number; actualFrom?: string; actualTo?: string }> {
    const response = await this.client.post<any>("/api/schedules/auto-schedule", data);
    return response.data;
  }

  async getGeofenceConfigs(): Promise<Array<{ id: string; zoneId: string; latitude: number; longitude: number; radiusMeters: number; addressHint: string | null; isActive: boolean; zone: { id: string; zoneName: string; floor: number } | null }>> {
    const response = await this.client.get<any>("/api/schedules/geofence");
    return response.data;
  }

  async setGeofenceConfig(data: { zoneId: string; latitude: number; longitude: number; radiusMeters?: number; addressHint?: string | null; allowedWifiSsids?: string[] | null }): Promise<any> {
    const response = await this.client.put("/api/schedules/geofence", data);
    return response.data;
  }

  async deleteGeofenceConfig(zoneId: string): Promise<any> {
    const response = await this.client.delete(`/api/schedules/geofence/${zoneId}`);
    return response.data;
  }

  async adminConfirmAssignment(id: string): Promise<StaffScheduleAssignment> {
    const response = await this.client.post<StaffScheduleAssignment>(`/api/schedules/assignments/${id}/admin-confirm`);
    return response.data;
  }

  async adminFixAttendance(scheduleId: string, data: { checkInAt?: string; checkOutAt?: string; status?: string }): Promise<any> {
    const response = await this.client.put(`/api/schedules/assignments/${scheduleId}/attendance`, data);
    return response.data;
  }

  async autoCheckout(): Promise<{ checkedOut: number }> {
    const response = await this.client.post<{ checkedOut: number }>("/api/schedules/auto-checkout");
    return response.data;
  }

  async getAuditLogs(params?: {
    page?: number; limit?: number; category?: string; action?: string; entityType?: string;
    actorId?: string; fromDate?: string; toDate?: string; search?: string;
  }): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const query: any = {};
    if (params?.page) query.page = params.page;
    if (params?.limit) query.limit = params.limit;
    if (params?.category) query.category = params.category;
    if (params?.action) query.action = params.action;
    if (params?.entityType) query.entityType = params.entityType;
    if (params?.actorId) query.actorId = params.actorId;
    if (params?.fromDate) query.fromDate = params.fromDate;
    if (params?.toDate) query.toDate = params.toDate;
    if (params?.search) query.search = params.search;
    const response = await this.client.get<any>("/api/schedules/audit-logs", { params: query });
    return response.data;
  }

  async getAuditStats(params?: { fromDate?: string; toDate?: string }): Promise<any> {
    const query: any = {};
    if (params?.fromDate) query.fromDate = params.fromDate;
    if (params?.toDate) query.toDate = params.toDate;
    const response = await this.client.get<any>("/api/schedules/audit-logs/stats", { params: query });
    return response.data;
  }

  async getScheduleTemplates(): Promise<any[]> {
    const response = await this.client.get<any[]>("/api/schedules/templates");
    return response.data;
  }

  async createScheduleTemplate(data: any): Promise<any> {
    const response = await this.client.post<any>("/api/schedules/templates", data);
    return response.data;
  }

  async deleteScheduleTemplate(id: string): Promise<any> {
    const response = await this.client.delete(`/api/schedules/templates/${id}`);
    return response.data;
  }

  async deleteWeekScheduleAssignments(from: string, to: string, notify: boolean): Promise<{ cancelled: number; skipped: number; message: string }> {
    const response = await this.client.delete("/api/schedules/assignments/week", { data: { from, to, notify } });
    return response.data;
  }

  async requestManualCheckIn(assignmentId: string, note: string): Promise<any> {
    const response = await this.client.post("/api/schedules/attendance/manual-checkin", { assignmentId, note });
    return response.data;
  }

  async listManualCheckInRequests(status?: string): Promise<ManualCheckInRequest[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const response = await this.client.get<ManualCheckInRequest[]>("/api/schedules/attendance/manual-checkin-requests", { params });
    return response.data;
  }

  async approveManualCheckIn(attendanceId: string, checkInAt?: string): Promise<any> {
    const body: Record<string, string> = {};
    if (checkInAt) body.checkInAt = checkInAt;
    const response = await this.client.put(`/api/schedules/attendance/${attendanceId}/approve-manual`, body);
    return response.data;
  }

  async rejectManualCheckIn(attendanceId: string, reason: string): Promise<any> {
    const response = await this.client.put(`/api/schedules/attendance/${attendanceId}/reject-manual`, { reason });
    return response.data;
  }

  async getAICommandCenterSummary(): Promise<AICommandCenterSummary> {
    const response = await this.client.get<AICommandCenterSummary>("/api/ai/command-center/summary");
    return response.data;
  }

  async refreshAiCommandCenter(): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/ai/command-center/refresh");
    return response.data;
  }

  async getAIInsights(params?: { type?: string; status?: string; skip?: number; limit?: number }): Promise<AIInsightList> {
    const query: any = {};
    if (params?.type) query.type = params.type;
    if (params?.status) query.status = params.status;
    if (params?.skip !== undefined) query.skip = params.skip;
    if (params?.limit !== undefined) query.limit = params.limit;
    const response = await this.client.get<AIInsightList>("/api/ai/insights", { params: query });
    return response.data;
  }

  async dismissAIInsight(id: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>(`/api/ai/insights/${id}/dismiss`);
    return response.data;
  }

  async explainAIInsight(id: string): Promise<AIInsightExplanation> {
    const response = await this.client.get<AIInsightExplanation>(`/api/ai/insights/${id}/explain`);
    return response.data;
  }

  async askAiCommandCenter(question: string): Promise<AIChatResponse> {
    const response = await this.client.post<AIChatResponse>("/api/ai/command-center/chat", { question });
    return response.data;
  }

  async askAiChat(message: string, sessionId?: string, role?: string): Promise<AIChatResponse> {
    const r = role || "patron";
    const endpoint =
      r === "patron"
        ? "/api/ai/patrons/chat"
        : r === "staff"
          ? "/api/ai/staff/chat"
          : r === "admin"
            ? "/api/ai/admin/chat"
            : "/api/ai/chat";
    const response = await this.client.post<AIChatResponse>(endpoint, { message, session_id: sessionId });
    return response.data;
  }

  async confirmAction(sessionId: string, action: string, role?: string): Promise<AIConfirmResponse> {
    const r = role || "patron";
    const endpoint =
      r === "patron"
        ? "/api/ai/patrons/confirm"
        : r === "staff"
          ? "/api/ai/staff/confirm"
          : r === "admin"
            ? "/api/ai/admin/confirm"
            : "/api/ai/confirm";
    const response = await this.client.post<AIConfirmResponse>(endpoint, { session_id: sessionId, action });
    return response.data;
  }

  async getBookRecommendations(studentCode: string): Promise<AIBookRecommendationResponse> {
    const response = await this.client.get<AIBookRecommendationResponse>(`/api/ai/recommendations/patron/${studentCode}`);
    return response.data;
  }

  async streamCompanionChat(
    message: string | undefined,
    audioBase64: string | undefined,
    sessionId: string | undefined,
    onChunk: (chunk: any) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    const token =
      _accessToken ||
      getCookieValue("access_token") ||
      (typeof window !== "undefined" ? localStorage.getItem("accessToken") || localStorage.getItem("token") : null);

    const body: Record<string, any> = {};
    if (message) body.message = message;
    if (audioBase64) body.audioBase64 = audioBase64;
    if (sessionId) body.sessionId = sessionId;

    try {
      const response = await fetch("/api/ai/companion/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
            } catch {}
          }
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getNotifications(params?: { unread_only?: boolean; skip?: number; limit?: number }): Promise<NotificationListResponse> {
    const query: any = {};
    if (params?.unread_only !== undefined) query.unread = String(params.unread_only);
    if (params?.skip !== undefined) query.skip = params.skip;
    if (params?.limit !== undefined) query.limit = params.limit;
    const response = await this.client.get<NotificationListResponse>("/api/notifications", { params: query });
    return response.data;
  }

  async getUnreadCount(): Promise<{ count: number }> {
    const response = await this.client.get<{ count: number }>("/api/notifications/unread-count");
    return response.data;
  }

  async markNotificationAsRead(id: string): Promise<{ message: string }> {
    const response = await this.client.put<{ message: string }>(`/api/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    const response = await this.client.put<{ message: string }>("/api/notifications/read-all");
    return response.data;
  }

  async getAdminSettings(): Promise<SettingsByCategory> {
    const response = await this.client.get<SettingsByCategory>("/api/borrow/admin/settings");
    return response.data;
  }

  async getAdminSettingsByCategory(category: string): Promise<SystemConfigEntry[]> {
    const response = await this.client.get<SystemConfigEntry[]>(`/api/borrow/admin/settings/${category}`);
    return response.data;
  }

  async updateAdminSettings(category: string, values: Record<string, any>): Promise<SystemConfigEntry[]> {
    const response = await this.client.put<SystemConfigEntry[]>(`/api/borrow/admin/settings/${category}`, { values });
    return response.data;
  }

  async testSmtpConfig(config: { to: string; host: string; port: number; secure: boolean; user: string; pass: string; from: string }): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post<{ success: boolean; message: string }>("/api/borrow/admin/settings/test-email", config);
    return response.data;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/auth/forgot-password", { email });
    return response.data;
  }

  async verifyResetCode(email: string, code: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/auth/verify-reset-code", { email, code });
    return response.data;
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/api/auth/reset-password", { email, code, new_password: newPassword });
    return response.data;
  }
}

const api = new ApiClient();

function retryPendingRequests(token: string) {
  api.retryPendingRequests(token);
}

function cancelPendingRequests() {
  api.cancelPendingRequests();
}

export {
  api,
  ApiClient,
  normalizeAccessLog,
  setStoredAccessToken,
  clearStoredAuth,
  decodeJwtPayload,
  isTokenExpiringSoon,
  getCookieValue,
  setAccessTokenCookie,
  clearAccessTokenCookie,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getStoredRefreshToken,
  getErrorMessage,
  setApiAccessToken,
  getApiAccessToken,
  getApiRefreshToken,
  retryPendingRequests,
  cancelPendingRequests,
};

export default api;
