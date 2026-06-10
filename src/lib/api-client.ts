import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  AccessLogList,
  ActivePatron,
  CameraEvent,
  CameraStatus,
  LoginRequest,
  KioskResult,
  PatronCreate,
  PatronLookupResult,
  PatronPublic,
  PatronUpdate,
  AccessFrequencyResponse,
  RegisterRequest,
  StatsResponse,
  TaskStatusResponse,
  TokenResponse,
  UserListResponse,
  UserPublic,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

class ApiClient {
  client: AxiosInstance;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== "undefined") {
          const token = localStorage.getItem("access_token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && originalRequest) {
          return this.handleUnauthorized(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleUnauthorized(originalRequest: any): Promise<any> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken();
    }

    const refreshed = await this.refreshPromise;
    this.refreshPromise = null;

    if (refreshed) {
      return this.client(originalRequest);
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(new Error("Session expired"));
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return false;

    try {
      const response = await axios.post<TokenResponse>(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken }
      );
      const { access_token } = response.data;
      localStorage.setItem("access_token", access_token);
      return true;
    } catch {
      return false;
    }
  }

  // === Auth (via face-recognition-api) ===
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>("/auth/login", data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<UserPublic> {
    const response = await this.client.post<UserPublic>("/auth/register", data);
    return response.data;
  }

  async getCurrentUser(): Promise<UserPublic> {
    const response = await this.client.get<UserPublic>("/users/me");
    return response.data;
  }

  // Face enrollment status from face-recognition-api
  async getFaceEnrollmentStatus(): Promise<{ has_face: boolean; full_name: string | null; role: string }> {
    // /api/users/me routes to face-recognition-api via gateway
    const response = await this.client.get<{ has_face: boolean; full_name: string | null; role: string }>("/api/users/me");
    return response.data;
  }

  // === Tasks ===
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await this.client.get<TaskStatusResponse>(`/api/tasks/${taskId}`);
    return response.data;
  }

  async listUsers(): Promise<UserListResponse> {
    const response = await this.client.get<UserListResponse>("/api/users");
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.delete(`/api/users/${userId}`);
  }

  // === Face Operations ===
  async enrollFace(
    imageFile: File,
    consentGiven: boolean = true
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consentGiven));

    const response = await this.client.post("/api/face/enroll", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
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

    const response = await this.client.post("/api/face/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async identifyFace(
    imageFile: File,
    consentGiven: boolean = true
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consentGiven));

    const response = await this.client.post("/api/face/identify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async faceLogin(email: string, imageFile: File): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("file", imageFile);

    const response = await this.client.post("/api/auth/face-login", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async livenessCheck(
    imageFile: File,
    consentGiven: boolean = true
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consentGiven));

    const response = await this.client.post("/api/face/liveness", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async deleteFaceData(userId: string): Promise<{ job_id: string }> {
    const response = await this.client.delete(`/api/face/${userId}`);
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
    const response = await this.client.get<PatronPublic[]>("/api/patrons/search", { params });
    return response.data;
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

  async updatePatron(id: string, data: PatronUpdate): Promise<PatronPublic> {
    const response = await this.client.put<PatronPublic>(`/api/patrons/${id}`, data);
    return response.data;
  }

  async deletePatron(id: string): Promise<void> {
    await this.client.delete(`/api/patrons/${id}`);
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
      if (params.dateFrom) query.date_from = params.dateFrom;
      if (params.dateTo) query.date_to = params.dateTo;
      if (params.search) query.search = params.search;
      query.skip = params.skip ?? 0;
      query.limit = params.limit ?? 50;
    }
    const response = await this.client.get<AccessLogList>("/api/access/logs", { params: query });
    return response.data;
  }

  connectAccessSSE(onEvent: (event: CameraEvent) => void): () => void {
    const es = new EventSource(`${API_BASE_URL}/access/events`);
    es.addEventListener("camera_event", (msg: MessageEvent) => {
      try {
        const data = JSON.parse(msg.data) as CameraEvent;
        onEvent(data);
      } catch { /* ignore parse errors */ }
    });
    es.addEventListener("error", () => { /* will auto-reconnect */ });
    return () => es.close();
  }

  async getRecentLogs(): Promise<AccessLogList> {
    const response = await this.client.get<AccessLogList>("/access/recent");
    return response.data;
  }

  async getActivePatrons(): Promise<{ items: ActivePatron[]; total: number }> {
    const response = await this.client.get<{ items: ActivePatron[]; total: number }>("/access/active");
    return response.data;
  }

  async getAccessFrequency(params?: { dateFrom?: string; dateTo?: string }): Promise<AccessFrequencyResponse> {
    const query: any = {};
    if (params?.dateFrom) query.date_from = params.dateFrom;
    if (params?.dateTo) query.date_to = params.dateTo;
    const response = await this.client.get<AccessFrequencyResponse>("/api/access/frequency", { params: query });
    return response.data;
  }

  async getStats(): Promise<StatsResponse> {
    const response = await this.client.get<StatsResponse>("/access/stats");
    return response.data;
  }

  async enrollPatronFace(
    patronId: string,
    imageFile: File
  ): Promise<{ success: boolean; job_id: string; message: string }> {
    const formData = new FormData();
    formData.append("image", imageFile);
    const response = await this.client.post(`/api/patrons/${patronId}/enroll-face`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
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
    const response = await this.client.post<PatronLookupResult>("/kiosk/lookup", null, { params });
    return response.data;
  }

  async kioskEnroll(
    imageFile: File,
    fullName: string,
    studentCode: string,
    cardNumber: string,
    membershipExpiry: string,
    identityNumber?: string,
    email?: string,
    phone?: string,
    issueDate?: string
  ): Promise<KioskResult> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("full_name", fullName);
    formData.append("student_code", studentCode);
    formData.append("card_number", cardNumber);
    formData.append("membership_expiry", membershipExpiry);
    if (identityNumber) formData.append("identity_number", identityNumber);
    if (email) formData.append("email", email);
    if (phone) formData.append("phone", phone);
    if (issueDate) formData.append("issue_date", issueDate);
    const response = await this.client.post<KioskResult>("/kiosk/enroll", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async kioskEnter(imageFile: File, studentCode: string): Promise<KioskResult> {
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("student_code", studentCode);
    const response = await this.client.post<KioskResult>("/kiosk/enter", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  // === Camera ===
  async getCameraStatus(): Promise<CameraStatus[]> {
    const response = await this.client.get<CameraStatus[]>("/camera/status");
    return response.data;
  }

  async reconnectCamera(cameraId: string): Promise<{ message: string }> {
    const response = await this.client.post(`/camera/reconnect/${cameraId}`);
    return response.data;
  }

  async reconnectAllCameras(): Promise<{ message: string; cameras: string[] }> {
    const response = await this.client.post("/camera/reconnect-all");
    return response.data;
  }
}

export const api = new ApiClient();
export default api;