"use client";

import { createContext, useContext, useEffect, useState } from "react";

type User = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "customer" | "super_admin";
  phone: string | null;
  isVerified: boolean;
  avatarUrl: string | null;  
} | null;

type AuthContextType = {
  user: User;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  // Merges partial updates into the cached user (e.g. after a profile
  // PATCH succeeds) so components that read `user` from context reflect
  // the change immediately, without waiting for verifySession() to run
  // again on the next full page load.
  updateUser: (updates: Partial<NonNullable<User>>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function verifySession() {
      try {
        const res = await fetch("/api/whoami", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          // A 403 means the account was suspended: keep the message so the
          // login page can show it (read once, then cleared there).
          if (res.status === 403) {
            const data = await res.json().catch(() => null);
            if (data?.error) {
              sessionStorage.setItem("authNotice", data.error);
            }
          }

          // Token's expired/invalid/user deleted/suspended, clear it out
          localStorage.removeItem("token");
          setUser(null);
          return;
        }

        const data = await res.json();
        setUser(data.user);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  function login(token: string, user: User) {
    localStorage.setItem("token", token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  function updateUser(updates: Partial<NonNullable<User>>) {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}