"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiPost } from "./api";
import { getStoredUser, removeToken, setStoredUser, setToken } from "./auth";
import { getProfile } from "./profile";
import type { AuthResponse, LoginCredentials, RegisterPayload, User } from "@/types/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null);
    try {
      const res = await apiPost<AuthResponse>("/auth/login", credentials);
      const { access_token, user: u } = res.data;
      setToken(access_token);
      setStoredUser(u);
      setUser(u);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
      toast.error(msg);
      throw err;
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setError(null);
    try {
      const res = await apiPost<AuthResponse>("/auth/register", payload);
      const { access_token, user: u } = res.data;
      setToken(access_token);
      setStoredUser(u);
      setUser(u);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setError(msg);
      toast.error(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await getProfile();
      setUser(data);
      setStoredUser(data);
    } catch {
      // keep current user on failure
    }
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
