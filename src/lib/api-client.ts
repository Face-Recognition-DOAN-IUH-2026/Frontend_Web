import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  TaskStatusResponse,
  UserListResponse,
  UserPublic,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

class ApiClient {
  private client: AxiosInstance;
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

  // === Auth ===
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>("/auth/login", data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<UserPublic> {
    const response = await this.client.post<UserPublic>("/auth/register", data);
    return response.data;
  }

  // === Tasks ===
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await this.client.get<TaskStatusResponse>(`/tasks/${taskId}`);
    return response.data;
  }

  // === Users ===
  async getCurrentUser(): Promise<UserPublic> {
    const response = await this.client.get<UserPublic>("/users/me");
    return response.data;
  }

  async listUsers(): Promise<UserListResponse> {
    const response = await this.client.get<UserListResponse>("/users");
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.delete(`/users/${userId}`);
  }

  // === Face Operations ===
  async enrollFace(
    imageFile: File,
    consentGiven: boolean = true
  ): Promise<{ job_id: string }> {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent_given", String(consentGiven));

    const response = await this.client.post("/face/enroll", formData, {
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

    const response = await this.client.post("/face/verify", formData, {
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

    const response = await this.client.post("/face/identify", formData, {
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

    const response = await this.client.post("/face/liveness", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  async deleteFaceData(userId: string): Promise<{ job_id: string }> {
    const response = await this.client.delete(`/face/${userId}`);
    return response.data;
  }
}

export const api = new ApiClient();
export default api;