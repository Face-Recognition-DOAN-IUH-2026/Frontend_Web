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
import api, { setApiAccessToken, getApiAccessToken } from "./api-client";
import ReauthOverlay from "@/app/_components/ReauthOverlay";
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

function assertWebRole(role: string) {
  if (role !== "admin" && role !== "staff") {
    throw new Error("Web quản trị chỉ dành cho admin hoặc staff. Độc giả vui lòng đăng nhập trên ứng dụng mobile.");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function getCookieValue(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  const updateUser = useCallback((fields: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };
      try {
        localStorage.setItem("user", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await api.getCurrentUser();
      if (currentUser) {
        updateUser({
          full_name: currentUser.full_name,
          avatar_url: currentUser.avatar_url ?? null,
          role: currentUser.role,
        });
      }
    } catch {
      // Ignore network errors on background profile refresh
    }
  }, [updateUser]);

  const loadUserFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;

    const storedToken = getCookieValue("access_token") || localStorage.getItem("access_token") || getApiAccessToken();
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      try {
        const payload = decodeJwtPayload(storedToken);
        const exp = payload?.exp as number | undefined;
        const isExpired = exp ? exp * 1000 < Date.now() : false;
        if (isExpired) {
          document.cookie = "access_token=; path=/; max-age=0";
          document.cookie = "refresh_token=; path=/; max-age=0";
          localStorage.removeItem("user");
        } else {
          setAccessToken(storedToken);
          setApiAccessToken(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            const payload = decodeJwtPayload(storedToken);
            if (payload) {
              const recovered: AuthUser = {
                id: (payload?.sub as string) || "",
                email: (payload?.email as string) || "",
                role: ((payload?.roles as string[])?.[0]) || "user",
                full_name: (payload?.full_name as string) || null,
              };
              localStorage.setItem("user", JSON.stringify(recovered));
              setUser(recovered);
            }
          }
          // Background sync to ensure avatar_url and latest profile details are up to date!
          refreshUser();
        }
      } catch {
        document.cookie = "access_token=; path=/; max-age=0";
        localStorage.removeItem("user");
      }
    } else {
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }
    }
    setIsLoading(false);
  }, [refreshUser]);

  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  useEffect(() => {
    if (accessToken) {
      refreshUser();
    }
  }, [accessToken, refreshUser]);

  const login = async (email: string, password: string) => {
    const data: LoginRequest = { email, password };
    const response = await api.login(data);
    if (!response.access_token) {
      throw new Error("Backend did not return access_token");
    }

    setApiAccessToken(response.access_token);
    document.cookie = `access_token=${response.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
    localStorage.setItem("access_token", response.access_token);
    if (response.refresh_token) {
      document.cookie = `refresh_token=${response.refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
      localStorage.setItem("refresh_token", response.refresh_token);
    }
    setAccessToken(response.access_token);

    const payload = decodeJwtPayload(response.access_token);
    const userData: AuthUser = {
      id: (payload?.sub as string) || "",
      email,
      role: ((payload?.roles as string[])?.[0]) || "user",
      full_name: (payload?.full_name as string) || null,
    };
    assertWebRole(userData.role);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    // Sync avatar_url and details immediately from backend
    try {
      const currentUser = await api.getCurrentUser();
      if (currentUser) {
        const enriched: AuthUser = {
          ...userData,
          full_name: currentUser.full_name || userData.full_name,
          avatar_url: currentUser.avatar_url ?? null,
          role: currentUser.role || userData.role,
        };
        localStorage.setItem("user", JSON.stringify(enriched));
        setUser(enriched);
      }
    } catch {
      // ignore
    }
  };

  const setAuthFromToken = (accessToken: string, refreshToken: string | null, email: string, role?: string) => {
    setApiAccessToken(accessToken);
    document.cookie = `access_token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
    localStorage.setItem("access_token", accessToken);
    if (refreshToken) {
      document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
      localStorage.setItem("refresh_token", refreshToken);
    }

    const payload = decodeJwtPayload(accessToken);
    const userId = (payload?.sub as string) || "";
    const userRole = role || ((payload?.roles as string[])?.[0]) || "user";
    assertWebRole(userRole);

    const userData: AuthUser = { id: userId, email, role: userRole, full_name: (payload?.full_name as string) || null };
    localStorage.setItem("user", JSON.stringify(userData));
    setAccessToken(accessToken);
    setUser(userData);

    refreshUser();
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch { /* ignore */ }
    setApiAccessToken(null);
    document.cookie = "access_token=; path=/; max-age=0";
    document.cookie = "refresh_token=; path=/; max-age=0";
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    setAccessToken(null);
    router.push("/login");
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const refreshToken = getCookieValue("refresh_token");
      if (!refreshToken) return false;

      const { access_token, refresh_token: newRefreshToken } = await api.refreshAuthToken(refreshToken);
      if (access_token) {
        setApiAccessToken(access_token);
        document.cookie = `access_token=${access_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
        setAccessToken(access_token);
      }
      if (newRefreshToken) {
        document.cookie = `refresh_token=${newRefreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
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
        updateUser,
        refreshUser,
        logout,
        refreshAccessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
      }}
    >
      {children}
      <ReauthOverlay />
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
