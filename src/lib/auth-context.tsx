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
import type { AuthContextType, AuthUser, LoginRequest, RegisterRequest } from "./types";

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

  const login = async (email: string, password: string) => {
    const data: LoginRequest = { email, password };
    const response = await api.login(data);

    localStorage.setItem("access_token", response.access_token);
    if (response.refresh_token) {
      localStorage.setItem("refresh_token", response.refresh_token);
    }

    const userData: AuthUser = {
      id: "",
      email,
      role: "user",
    };
    localStorage.setItem("user", JSON.stringify(userData));

    setAccessToken(response.access_token);
    setUser(userData);

    router.push("/dashboard");
  };

  const register = async (email: string, password: string, role: string = "user") => {
    const data: RegisterRequest = { email, password, role };
    await api.register(data);
    router.push("/login");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    setAccessToken(null);
    router.push("/login");
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) return false;

      await api.client.post("/auth/refresh", { refresh_token: refreshToken });
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
        register,
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