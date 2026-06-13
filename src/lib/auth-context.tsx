"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import api from "./api-client";
import type { AuthContextType, AuthUser, LoginRequest } from "./types";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;

    const storedToken = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  const setTokenCookie = (token: string) => {
    document.cookie = `access_token=${token}; path=/; max-age=86400; samesite=lax`;
  };

  const clearTokenCookie = () => {
    document.cookie = "access_token=; path=/; max-age=0";
  };

  const login = async (email: string, password: string) => {
    const data: LoginRequest = { email, password };
    const response = await api.login(data);

    localStorage.setItem("access_token", response.access_token);
    setTokenCookie(response.access_token);
    if (response.refresh_token) {
      localStorage.setItem("refresh_token", response.refresh_token);
    }
    setAccessToken(response.access_token);

    const payload = decodeJwtPayload(response.access_token);
    const userData: AuthUser = {
      id: (payload?.sub as string) || "",
      email,
      role: ((payload?.roles as string[])?.[0]) || "user",
    };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    router.push("/dashboard");
  };

  const setAuthFromToken = (accessToken: string, refreshToken: string | null, email: string, role?: string) => {
    localStorage.setItem("access_token", accessToken);
    setTokenCookie(accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }

    // Decode JWT to get user id and role if not provided
    const payload = decodeJwtPayload(accessToken);
    const userId = (payload?.sub as string) || "";
    const userRole = role || ((payload?.roles as string[])?.[0]) || "user";

    const userData: AuthUser = { id: userId, email, role: userRole };
    localStorage.setItem("user", JSON.stringify(userData));
    setAccessToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    clearTokenCookie();
    setUser(null);
    setAccessToken(null);
    router.push("/login");
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) return false;

      const resp = await api.client.post("/auth/refresh", { refresh_token: refreshToken });
      const { access_token } = resp.data;
      if (access_token) {
        localStorage.setItem("access_token", access_token);
        setTokenCookie(access_token);
        setAccessToken(access_token);
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        setAuthFromToken,
        logout,
        refreshAccessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}