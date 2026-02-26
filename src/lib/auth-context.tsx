"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiPost } from "./api";
import { getStoredUser, removeToken, setStoredUser, setToken } from "./auth";
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
      setError(err instanceof Error ? err.message : "Sign in failed");
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
      setError(err instanceof Error ? err.message : "Registration failed");
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
