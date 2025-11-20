"use client";

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/lib/constants";
import type { AuthResponse, UserRead } from "@/lib/types";
import type { StoredAuth } from "@/lib/api";

interface AuthContextValue {
  user: UserRead | null;
  token: string | null;
  loading: boolean;
  setAuth: (payload: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    startTransition(() => {
      if (raw) {
        try {
          const stored = JSON.parse(raw) as StoredAuth;
          setUser(stored.user);
          setToken(stored.token);
        } catch {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      setLoading(false);
    });
  }, []);

  const setAuth = useCallback((payload: AuthResponse) => {
    setUser(payload.user);
    setToken(payload.access_token);
    if (typeof window !== "undefined") {
      const toPersist: StoredAuth = {
        token: payload.access_token,
        user: payload.user,
      };
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(toPersist));
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      setAuth,
      logout,
    }),
    [user, token, loading, setAuth, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
