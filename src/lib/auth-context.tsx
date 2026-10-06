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
import api, {
  setStoredAccessToken,
  clearStoredAuth,
  getStoredRefreshToken,
  getCookieValue,
  decodeJwtPayload,
  isTokenExpiringSoon,
  getApiAccessToken,
} from "./api-client";
import type { AuthContextType, AuthUser, LoginRequest } from "./types";

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

  const updateUser = useCallback((fields: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const hasChanged = Object.entries(fields).some(
        ([key, val]) => (prev as any)[key] !== val
      );
      if (!hasChanged) return prev;
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

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch { /* ignore */ }

    // Dọn dẹp an toàn bộ nhớ đệm AI Chat khi bàn giao ca trực
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith("ai-assistant-session") || k === "ai-widget-storage")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }

    clearStoredAuth();
    setUser(null);
    setAccessToken(null);
    router.push("/login");
  }, [router]);

  const loadUserFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;

    const storedToken =
      getCookieValue("access_token") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      getApiAccessToken();
    const storedRefreshToken =
      getStoredRefreshToken() ||
      getCookieValue("refresh_token") ||
      localStorage.getItem("refresh_token");
    const storedUser = localStorage.getItem("user");

    if (storedToken) {
      try {
        const payload = decodeJwtPayload(storedToken);
        const exp = payload?.exp as number | undefined;
        const isExpired = exp ? exp * 1000 < Date.now() : false;

        if (isExpired) {
          if (storedRefreshToken) {
            // Silently refresh token using refresh_token
            api
              .refreshAuthToken(storedRefreshToken)
              .then((res) => {
                if (res.access_token) {
                  setAccessToken(res.access_token);
                  setStoredAccessToken(res.access_token, res.refresh_token || storedRefreshToken);
                  if (storedUser) {
                    try {
                      setUser(JSON.parse(storedUser));
                    } catch {}
                  } else {
                    const newPayload = decodeJwtPayload(res.access_token);
                    if (newPayload) {
                      const recovered: AuthUser = {
                        id: (newPayload?.sub as string) || "",
                        email: (newPayload?.email as string) || "",
                        role: ((newPayload?.roles as string[])?.[0]) || "user",
                        full_name: (newPayload?.full_name as string) || null,
                      };
                      localStorage.setItem("user", JSON.stringify(recovered));
                      setUser(recovered);
                    }
                  }
                  refreshUser();
                }
              })
              .catch(() => {
                logout();
              })
              .finally(() => {
                setIsLoading(false);
              });
            return;
          } else {
            logout();
            setIsLoading(false);
            return;
          }
        } else {
          setAccessToken(storedToken);
          setStoredAccessToken(storedToken, storedRefreshToken);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {}
          } else {
            const recovered: AuthUser = {
              id: (payload?.sub as string) || "",
              email: (payload?.email as string) || "",
              role: ((payload?.roles as string[])?.[0]) || "user",
              full_name: (payload?.full_name as string) || null,
            };
            localStorage.setItem("user", JSON.stringify(recovered));
            setUser(recovered);
          }
          refreshUser();
        }
      } catch {
        logout();
      }
    } else if (storedRefreshToken) {
      api
        .refreshAuthToken(storedRefreshToken)
        .then((res) => {
          if (res.access_token) {
            setAccessToken(res.access_token);
            setStoredAccessToken(res.access_token, res.refresh_token || storedRefreshToken);
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
              } catch {}
            }
            refreshUser();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
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
  }, [logout, refreshUser]);

  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  useEffect(() => {
    if (accessToken) {
      refreshUser();
    }
  }, [accessToken, refreshUser]);

  // Silent auto-refresh heartbeat: check every 60 seconds, refresh if expiring in < 3 minutes
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(async () => {
      const currentToken = getApiAccessToken() || accessToken;
      if (currentToken && isTokenExpiringSoon(currentToken, 3 * 60_000)) {
        try {
          const res = await api.refreshAuthToken();
          if (res.access_token) {
            setAccessToken(res.access_token);
          }
        } catch {
          // ignore background heartbeat error, request interceptor handles retry
        }
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    const data: LoginRequest = { email, password };
    const response = await api.login(data);
    if (!response.access_token) {
      throw new Error("Backend did not return access_token");
    }

    setStoredAccessToken(response.access_token, response.refresh_token);
    setAccessToken(response.access_token);

    const payload = decodeJwtPayload(response.access_token);
    const userData: AuthUser = {
      id: (payload?.sub as string) || "",
      email,
      role: ((payload?.roles as string[])?.[0]) || "user",
      full_name: (payload?.full_name as string) || null,
      require_password_change: response.require_password_change,
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

    return response;
  };

  const setAuthFromToken = (newAccessToken: string, refreshToken: string | null, email: string, role?: string) => {
    setStoredAccessToken(newAccessToken, refreshToken);
    setAccessToken(newAccessToken);

    const payload = decodeJwtPayload(newAccessToken);
    const userId = (payload?.sub as string) || "";
    const userRole = role || ((payload?.roles as string[])?.[0]) || "user";
    assertWebRole(userRole);

    const userData: AuthUser = { id: userId, email, role: userRole, full_name: (payload?.full_name as string) || null };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    refreshUser();
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const res = await api.refreshAuthToken();
      if (res.access_token) {
        setAccessToken(res.access_token);
        return true;
      }
      return false;
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
