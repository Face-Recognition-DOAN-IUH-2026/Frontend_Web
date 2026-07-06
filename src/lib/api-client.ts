import axios, { AxiosInstance, AxiosError } from "axios";
import { bus } from "./event-bus";
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
  const user = log?.user || {};
  return {
    ...log,
    patron_id: log?.patron_id || log?.patronId || user.id || null,
    patron_name: log?.patron_name || log?.full_name || log?.fullName || user.full_name || user.fullName || null,
    student_code: log?.student_code || log?.studentCode || user.student_code || user.studentCode || null,
    access_type: log?.access_type || log?.accessType || "",
    verify_method: log?.verify_method || log?.verifyMethod || "face",
    confidence: log?.confidence ?? null,
    camera_id: log?.camera_id || log?.cameraId || "",
    access_time: log?.access_time || log?.accessTime || log?.created_at || log?.createdAt || "",
    status: log?.status === "granted" ? "success" : (log?.status || ""),
  };
}

function setStoredAccessToken(token: string) {
  _accessToken = token;
  setAccessTokenCookie(token);
}

function clearStoredAuth() {
  _accessToken = null;
  clearAccessTokenCookie();
  if (typeof window !== "undefined") {
    document.cookie = "refresh_token=; path=/; max-age=0";
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
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
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (!exp) return false;
  return Date.now() >= (exp - skewSeconds) * 1000;
}


let _accessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  _accessToken = token;
}

export function getApiAccessToken(): string | null {
  return _accessToken;
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setAccessTokenCookie(token: string) {
  if (typeof document === "undefined") return;
  const isProduction = typeof process !== "undefined" && process.env.NODE_ENV === "production";
  const secureFlag = isProduction ? "; Secure" : "";
  document.cookie = `access_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
}

function clearAccessTokenCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "access_token=; path=/; max-age=0";
}

export function getErrorMessage(err: any): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err.response?.data?.detail) {
    const detail = err.response.data.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) =>
        typeof d === "string" ? d : `${d.loc?.join(".")}: ${d.msg}`
      ).join("; ");
    }
    if (typeof detail === "object") {
      return detail.msg || detail.message || JSON.stringify(detail);
    }
  }
  if (err.response?.data?.error) {
    const errorVal = err.response.data.error;
    if (typeof errorVal === "string") return errorVal;
    if (typeof errorVal === "object") return errorVal.msg || errorVal.message || JSON.stringify(errorVal);
  }
  return err.message || err.msg || String(err);
}

class ApiClient {
  client: AxiosInstance;
  private refreshPromise: Promise<boolean> | null = null;
  private _pendingRequests: Array<{ request: any; resolve: (val: any) => void; reject: (err: any) => void }> = [];
  private _showingReauth = false;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
    });

    this.client.interceptors.request.use(
      async (config) => {
        let token = _accessToken;
        if (!token && typeof document !== "undefined") {
          token = getCookieValue("access_token");
        }
        if (token && isTokenExpiringSoon(token) && !config.url?.includes('/auth/')) {
          if (!this.refreshPromise) {
            this.refreshPromise = this.refreshToken();
          }
          const refreshed = await this.refreshPromise;
          this.refreshPromise = null;
          if (refreshed) {
            token = _accessToken || getCookieValue("access_token");
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
        const url = error.config?.url || '';
        const status = error.response?.status;
        const data = error.response?.data;
        if (status && status >= 400) {
          const msg = typeof data === 'object' ? (data as any).detail || (data as any).error || '' : '';
          console.warn(`[API] ${error.config?.method?.toUpperCase()} ${url} ${status}${msg ? `: ${msg}` : ''}`);
        }
        const originalRequest = error.config;
        if (status === 401 && originalRequest) {
          if (originalRequest.url?.includes('/auth/') || originalRequest.url?.includes('/camera/')) {
            return Promise.reject(error);
          }
          return this.handleUnauthorized(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorized(originalRequest: any): Promise<any> {
    if (originalRequest._retry) {
      return Promise.reject(new Error("Session expired"));
    }
    originalRequest._retry = true;

    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken();
    }

    const refreshed = await this.refreshPromise;
    this.refreshPromise = null;

    if (refreshed) {
      return this.client(originalRequest);
    }

    bus.emit("auth:required");
    return Promise.reject(new Error("Session expired"));
  }

  public retryPendingRequests(newToken: string): void {
    const token = newToken;
    _accessToken = token;
    setAccessTokenCookie(token);
    const queue = [...this._pendingRequests];
    this._pendingRequests = [];
    this._showingReauth = false;
    queue.forEach(({ request, resolve, reject }) => {
      request.headers.Authorization = `Bearer ${token}`;
      this.client(request).then(resolve).catch(reject);
    });
  }

  public cancelPendingRequests(): void {
    const queue = [...this._pendingRequests];
    this._pendingRequests = [];
    this._showingReauth = false;
    queue.forEach(({ reject }) => reject(new Error("Session expired")));
  }

  private async refreshToken(): Promise<boolean> {
    let refreshToken = getCookieValue("refresh_token");
    if (!refreshToken) {
      refreshToken = _accessToken ? null : null;
    }
    if (!refreshToken) return false;

    try {
      const response = await axios.post<TokenResponse>(
        `${API_BASE_URL}/api/auth/refresh`,
        { refresh_token: refreshToken }
      );
      const { access_token, refresh_token: newRefreshToken } = response.data;
      if (!access_token) return false;
      _accessToken = access_token;
      setAccessTokenCookie(access_token);
      if (newRefreshToken) {
        document.cookie = `refresh_token=${newRefreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }
      return true;
    } catch {
      return false;
    }
  }

  // === Auth (via face-recognition-api) ===
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>("/api/auth/login", data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<UserPublic> {
    const response = await this.client.post<UserPublic>("/api/auth/register", data);
    return response.data;
  }

  async verifyEmail(data: { email: string; code: string }): Promise<void> {
    await this.client.post("/api/auth/verify-email", data);
  }

  async resendVerification(email: string): Promise<void> {
    await this.client.post("/api/auth/resend-verification", { email });
  }

  async requestEmailCorrection(data: { current_email: string; new_email: string }): Promise<void> {
    await this.client.post("/api/auth/correct-email/request-otp", data);
  }

  async verifyEmailCorrection(data: { current_email: string; new_email: string; code: string }): Promise<void> {
    await this.client.post("/api/auth/correct-email/verify", data);
  }

  async refreshAuthToken(refreshToken: string): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>("/api/auth/refresh", { refresh_token: refreshToken });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post("/api/auth/logout");
  }

  async faceLogin(imageFile: File): Promise<TokenResponse> {
    const formData = new FormData();
    formData.append("file", imageFile);

    const response = await this.client.post<TokenResponse>("/api/auth/face-login", formData);
    return response.data;
  }

  async getCurrentUser(): Promise<UserPublic> {
    const response = await this.client.get<UserPublic>("/users/me");
    return response.data;
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await this.client.post<{ avatarUrl: string }>("/users/me/avatar", formData);
    return response.data;
  }

  async deleteAvatar(): Promise<void> {
    await this.client.delete("/users/me/avatar");
  }

  async updateProfile(data: { full_name?: string; phone?: string; permanent_address?: string }): Promise<UserPublic> {
    const response = await this.client.put<UserPublic>("/users/me/profile", data);
    return response.data;
  }

  async changePassword(data: { old_password?: string; new_password?: string }): Promise<{ message: string }> {
    const response = await this.client.put<{ message: string }>("/users/me/password", data);
    return response.data;
  }

  async requestEmailChangeOtp(data: { new_email: string }): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>("/users/me/email/request-otp", data);
    return response.data;
  }

  async verifyAndChangeEmail(data: { new_email: string; code: string }): Promise<{ message: string }> {
    const response = await this.client.put<{ message: string }>("/users/me/email", data);
    return response.data;
  }

  // Face enrollment status from face-recognition-api
  async getFaceEnrollmentStatus(): Promise<{ has_face: boolean; full_name: string | null; role: string }> {
    // /api/users/me routes to face-recognition-api via gateway
    const response = await this.client.get<{ has_face: boolean; full_name: string | null; role: string }>("/api/users/me");
    return response.data;
  }

  // === Tasks ===
  async getTaskStatus(taskId: string, token?: string): Promise<TaskStatusResponse> {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await this.client.get<TaskStatusResponse>(`/api/tasks/${taskId}`, config);
    return response.data;
  }

  async listUsers(): Promise<UserListResponse> {
    const response = await this.client.get<UserListResponse>("/api/users");
    return response.data;
  }

  async getUser(userId: string): Promise<UserPublic> {
    const response = await this.client.get<UserPublic>(`/api/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: string, data: any): Promise<UserPublic> {
    const response = await this.client.put<UserPublic>(`/api/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.delete(`/api/users/${userId}`);
  }

  async restoreUser(userId: string): Promise<UserPublic> {
    const response = await this.client.put<UserPublic>(`/api/users/${userId}/restore`, {});
    return response.data;
  }

  // === Face Operations ===
  async enrollFace(
    imageFile: File,
    consentGiven: boolean = true,
    angle: string = "frontal"
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consentGiven));
    formData.append("angle", angle);

    const response = await this.client.post("/api/face/enroll", formData);
    return response.data;
  }

  async enrollBatch(
    files: { frontal: File; right: File; left: File; down: File },
    consentGiven: boolean = true,
    token?: string
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("frontal", files.frontal);
    formData.append("right", files.right);
    formData.append("left", files.left);
    formData.append("down", files.down);
    formData.append("consent_given", String(consentGiven));

    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await this.client.post("/api/face/enroll-batch", formData, config);
    return response.data;
  }

  async verifyFace(
    imageFile: File,
    targetUserId: string,
    consentGiven: boolean = true
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("target_user_id", targetUserId);
    formData.append("consent_given", String(consentGiven));

    const response = await this.client.post("/api/face/verify", formData);
    return response.data;
  }

  async identifyFace(
    imageFile: File,
    consentGiven: boolean = true
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consentGiven));

    const response = await this.client.post("/api/face/identify", formData);
    return response.data;
  }

  async livenessCheck(
    imageFile: File,
    consentGiven: boolean = true
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consentGiven));

    const response = await this.client.post("/api/face/liveness", formData);
    return response.data;
  }

  async deleteFaceData(userId: string): Promise<{ job_id: string }> {
    const response = await this.client.delete(`/api/face/${userId}`);
    return response.data;
  }

  async processFaceImage(formData: FormData): Promise<{ task_id: string; status: string }> {
    const response = await this.client.post("/api/face/process", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async processFaceImageSync(data: {
    image: string;
    camera_id?: string;
    process_type?: string;
    consent_given?: boolean;
    target_user_id?: string;
    connection_id?: string;
  }): Promise<{
    status: string;
    process_type: string;
    result: Record<string, unknown>;
    processing_time_ms: number;
  }> {
    const response = await this.client.post("/api/face/process-sync", data);
    return response.data;
  }

  // === Patrons ===
async searchPatrons(
  query?: string,
  status?: string,
  skip: number = 0,
  limit: number = 20
): Promise<PatronPublic[]> {
  const params: any = { skip, limit };
  if (query) params.q = query;
  if (status) params.status = status;
  const response = await this.client.get<{ items: PatronPublic[]; total: number }>("/api/patrons/search", { params });
  return Array.isArray((response.data as any).items) ? (response.data as any).items : [];
}

  async lookupPatron(
    studentCode?: string,
    cardNumber?: string
  ): Promise<PatronLookupResult> {
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
    const response = await this.client.post("/api/patrons/register", data);
    return response.data;
  }

  async updatePatron(id: string, data: PatronUpdate): Promise<PatronPublic> {
    const response = await this.client.put<PatronPublic>(`/api/patrons/${id}`, data);
    return response.data;
  }

  async deletePatron(id: string): Promise<void> {
    await this.client.delete(`/api/patrons/${id}`);
  }

  async restorePatron(id: string): Promise<PatronPublic> {
    const response = await this.client.put<PatronPublic>(`/api/patrons/${id}/restore`, {});
    return response.data;
  }

  // === Access ===
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
      if (params.dateFrom) {
        query.date_from = params.dateFrom;
      }
      if (params.dateTo) {
        query.date_to = params.dateTo;
      }
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
    if (params?.dateFrom) {
      query.date_from = params.dateFrom;
    }
    if (params?.dateTo) {
      query.date_to = params.dateTo;
    }
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

  // === Kiosk ===
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

  // === Camera ===
  async getCameraStatus(): Promise<CameraStatus[]> {
    const response = await this.client.get<CameraStatus[]>("/api/camera/status");
    return response.data;
  }

  async reconnectCamera(cameraId: string): Promise<{ message: string }> {
    const response = await this.client.post(`/api/camera/reconnect/${cameraId}`);
    return response.data;
  }

  async reconnectAllCameras(): Promise<{ message: string; cameras: string[] }> {
    const response = await this.client.post("/api/camera/reconnect-all");
    return response.data;
  }

  // === Borrow (via gateway: /api/borrow/* -> borrow-service) ===
  async borrowBook(barcode: string): Promise<BorrowResponse> {
    const response = await this.client.post<BorrowResponse>("/api/borrow/", { barcode });
    return response.data;
  }

  async staffReturnBook(barcode: string, note?: string | null): Promise<ReturnResponse> {
    const response = await this.client.post<ReturnResponse>("/api/borrow/staff-return", { barcode, note } as StaffReturnRequest);
    return response.data;
  }

  async getActiveBorrowers(): Promise<StaffActiveBorrowersResponse> {
    const response = await this.client.get<StaffActiveBorrowersResponse>("/api/borrow/staff/active-borrowers");
    return response.data;
  }

  async getActiveBorrowsByStudentCode(studentCode: string): Promise<StaffPatronActiveBorrowsResponse> {
    const response = await this.client.get<StaffPatronActiveBorrowsResponse>(
      `/api/borrow/staff/patrons/${encodeURIComponent(studentCode)}/active`
    );
    return response.data;
  }

  async staffReturnBorrowRecord(recordId: string, note?: string | null): Promise<ReturnResponse> {
    const response = await this.client.post<ReturnResponse>(`/api/borrow/staff-return/record/${recordId}`, { note });
    return response.data;
  }

  async getBorrowStats(): Promise<{ total: number; active: number; overdue: number }> {
    const response = await this.client.get("/api/borrow/staff/stats");
    return response.data;
  }

  async getBorrowConfig(): Promise<{ max_borrow_books: number; max_borrow_books_per_slip: number; max_borrow_days: number }> {
    const response = await this.client.get("/api/borrow/config");
    return response.data;
  }

  async getAllActiveBorrows(): Promise<BorrowRecord[]> {
    const response = await this.client.get<BorrowRecord[]>("/api/borrow/staff/active");
    return response.data;
  }

  async getBorrowHistory(params?: { patronId?: string; statusFilter?: string }): Promise<BorrowRecord[]> {
    const query: any = {};
    if (params?.statusFilter) query.status_filter = params.statusFilter;
    const endpoint = params?.patronId
      ? `/api/borrow/staff/patrons/id/${params.patronId}/history`
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
    const response = await this.client.post<CreateBorrowSlipResponse>("/api/borrow/staff/slip/create", data);
    return response.data;
  }

  async lookupBorrowSlip(data: LookupBorrowSlipRequest): Promise<LookupBorrowSlipResponse> {
    const response = await this.client.post<LookupBorrowSlipResponse>("/api/borrow/staff/slip/lookup", data);
    return response.data;
  }

  async confirmBorrowSlip(data: ConfirmBorrowSlipRequest): Promise<CreateBorrowSlipResponse> {
    const response = await this.client.post<CreateBorrowSlipResponse>("/api/borrow/staff/slip/confirm", data);
    return response.data;
  }

  async getBarcodes(bookId?: string, availableOnly?: boolean): Promise<BookCopyData[]> {
    const params: any = {};
    if (bookId) params.book_id = bookId;
    if (availableOnly) params.available_only = true;
    const response = await this.client.get<BookCopyData[]>("/api/borrow/barcodes", { params: params });
    return response.data;
  }

  // === Staff schedules ===
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

  // === Geofence ===
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

  // === Admin Schedule Operations ===
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

  async refreshAiCommandCenter(): Promise<AICommandCenterSummary> {
    const response = await this.client.post<AICommandCenterSummary>("/api/ai/command-center/refresh");
    return response.data;
  }

  async getAIInsights(params?: { status?: string; category?: string; severity?: string }): Promise<AIInsightList> {
    const response = await this.client.get<AIInsightList>("/api/ai/insights", { params });
    return response.data;
  }

  async dismissAIInsight(id: string): Promise<AIInsight> {
    const response = await this.client.post<AIInsight>(`/api/ai/insights/${id}/dismiss`);
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

  async askAiChat(message: string, sessionId?: string): Promise<AIChatResponse> {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const userData = storedUser ? JSON.parse(storedUser) : null;
    const role = userData?.role || 'staff';

    const endpoint = role === 'patron' ? '/api/ai/patrons/chat'
                   : role === 'staff' ? '/api/ai/staff/chat'
                   : '/api/ai/admin/chat';

    const body: Record<string, any> = { message };
    if (sessionId) body.sessionId = sessionId;

    const response = await this.client.post(endpoint, body);
    return response.data;
  }

  async confirmAction(sessionId: string, action: 'approve' | 'reject', role?: string): Promise<AIConfirmResponse> {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    const userData = storedUser ? JSON.parse(storedUser) : null;
    const effectiveRole = role || userData?.role || 'staff';

    const endpoint = effectiveRole === 'patron' ? '/api/ai/patrons/confirm'
                   : effectiveRole === 'staff' ? '/api/ai/staff/confirm'
                   : '/api/ai/admin/confirm';

    const response = await this.client.post(endpoint, { sessionId, action });
    return response.data;
  }

  async getBookRecommendations(studentCode: string): Promise<AIBookRecommendationResponse> {
    const response = await this.client.get<AIBookRecommendationResponse>(`/api/ai/recommendations/patron/${studentCode}`);
    return response.data;
  }

  // === Notifications ===
  async getNotifications(params?: { unread?: boolean; skip?: number; limit?: number }): Promise<NotificationListResponse> {
    const query: Record<string, string> = {};
    if (params?.unread !== undefined) query.unread = String(params.unread);
    if (params?.skip !== undefined) query.skip = String(params.skip);
    if (params?.limit !== undefined) query.limit = String(params.limit);
    const response = await this.client.get<NotificationListResponse>("/api/notifications", { params: query });
    return response.data;
  }

  async getUnreadCount(): Promise<number> {
    const response = await this.client.get<{ count: number }>("/api/notifications/unread-count");
    return response.data.count;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.client.put(`/api/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.client.put("/api/notifications/read-all");
  }
}

export const api = new ApiClient();
export default api;

export function retryPendingRequests(token: string) {
  api.retryPendingRequests(token);
}
export function cancelPendingRequests() {
  api.cancelPendingRequests();
}
