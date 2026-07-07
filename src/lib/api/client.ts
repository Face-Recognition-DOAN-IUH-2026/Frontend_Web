import axios, { AxiosInstance, AxiosError } from "axios";
import { bus } from "../event-bus";
import type { TokenResponse } from "../types";
import {
  getApiAccessToken,
  setApiAccessToken,
  getCookieValue,
  isTokenExpiringSoon,
  setAccessTokenCookie,
} from "./utils";

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

export class ApiClient {
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
        let token = getApiAccessToken();
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
            token = getApiAccessToken() || getCookieValue("access_token");
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
    setApiAccessToken(token);
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
      refreshToken = getApiAccessToken() ? null : null;
    }
    if (!refreshToken) return false;

    try {
      const response = await axios.post<TokenResponse>(
        `${API_BASE_URL}/api/auth/refresh`,
        { refresh_token: refreshToken }
      );
      const { access_token, refresh_token: newRefreshToken } = response.data;
      if (!access_token) return false;
      setApiAccessToken(access_token);
      setAccessTokenCookie(access_token);
      if (newRefreshToken) {
        document.cookie = `refresh_token=${newRefreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
export default api;
