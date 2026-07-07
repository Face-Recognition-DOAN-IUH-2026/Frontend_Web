import { AxiosInstance } from "axios";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserPublic,
} from "../types";

export function createAuthMethods(client: AxiosInstance) {
  return {
    login: async (data: LoginRequest): Promise<TokenResponse> => {
      const response = await client.post<TokenResponse>("/api/auth/login", data);
      return response.data;
    },

    register: async (data: RegisterRequest): Promise<UserPublic> => {
      const response = await client.post<UserPublic>("/api/auth/register", data);
      return response.data;
    },

    verifyEmail: async (data: { email: string; code: string }): Promise<void> => {
      await client.post("/api/auth/verify-email", data);
    },

    resendVerification: async (email: string): Promise<void> => {
      await client.post("/api/auth/resend-verification", { email });
    },

    requestEmailCorrection: async (data: {
      current_email: string;
      new_email: string;
    }): Promise<void> => {
      await client.post("/api/auth/correct-email/request-otp", data);
    },

    verifyEmailCorrection: async (data: {
      current_email: string;
      new_email: string;
      code: string;
    }): Promise<void> => {
      await client.post("/api/auth/correct-email/verify", data);
    },

    refreshAuthToken: async (refreshToken: string): Promise<TokenResponse> => {
      const response = await client.post<TokenResponse>("/api/auth/refresh", {
        refresh_token: refreshToken,
      });
      return response.data;
    },

    logout: async (): Promise<void> => {
      await client.post("/api/auth/logout");
    },

    faceLogin: async (imageFile: File): Promise<TokenResponse> => {
      const formData = new FormData();
      formData.append("file", imageFile);
      const response = await client.post<TokenResponse>(
        "/api/auth/face-login",
        formData
      );
      return response.data;
    },

    getCurrentUser: async (): Promise<UserPublic> => {
      const response = await client.get<UserPublic>("/users/me");
      return response.data;
    },

    uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await client.post<{ avatarUrl: string }>(
        "/users/me/avatar",
        formData
      );
      return response.data;
    },

    deleteAvatar: async (): Promise<void> => {
      await client.delete("/users/me/avatar");
    },

    updateProfile: async (data: {
      full_name?: string;
      phone?: string;
      permanent_address?: string;
    }): Promise<UserPublic> => {
      const response = await client.put<UserPublic>("/users/me/profile", data);
      return response.data;
    },

    changePassword: async (data: {
      old_password?: string;
      new_password?: string;
    }): Promise<{ message: string }> => {
      const response = await client.put<{ message: string }>(
        "/users/me/password",
        data
      );
      return response.data;
    },

    requestEmailChangeOtp: async (data: {
      new_email: string;
    }): Promise<{ message: string }> => {
      const response = await client.post<{ message: string }>(
        "/users/me/email/request-otp",
        data
      );
      return response.data;
    },

    verifyAndChangeEmail: async (data: {
      new_email: string;
      code: string;
    }): Promise<{ message: string }> => {
      const response = await client.put<{ message: string }>(
        "/users/me/email",
        data
      );
      return response.data;
    },

    getFaceEnrollmentStatus: async (): Promise<{
      has_face: boolean;
      full_name: string | null;
      role: string;
    }> => {
      const response = await client.get<{
        has_face: boolean;
        full_name: string | null;
        role: string;
      }>("/api/users/me");
      return response.data;
    },
  };
}
