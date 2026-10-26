"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import {
  validatePurchaseLimits,
  type PurchaseLimits,
} from "@/lib/purchase-limits";
export type BusinessApplication = {
  application_id: string;
  business_name: string;
  business_type: string;
  contact_details: string;
  registration_number: string;
  purchase_plan: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "REVOKED";
  admin_message: string;
  created_at: string;
  reviewed_at: string | null;
  version: number;
};
type Value = {
  approved: boolean;
  application: BusinessApplication | null;
  limits: PurchaseLimits;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <Session key={user?.email || "guest"}>{children}</Session>;
}
function Session({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { settings, ready: settingsReady } = useStoreSettings();
  const [data, setData] = useState<{
      approved: boolean;
      application: BusinessApplication | null;
      limits: PurchaseLimits;
    } | null>(null),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    if (!user || isLoading || user.role !== "customer") return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    try {
      const r = await fetch("/api/business", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        cache: "no-store",
        signal: AbortSignal.any([current.signal, AbortSignal.timeout(15000)]),
      });
      const d = await r.json();
      if (!r.ok) throw Error();
      if (!current.signal.aborted) {
        setData({
          approved: d.approved === true,
          application: d.application,
          limits: validatePurchaseLimits(d.limits),
        });
        setError("");
      }
    } catch {
      if (!current.signal.aborted)
        setError("Unable to load purchasing privileges. Please retry.");
    }
  }, [user, isLoading]);
  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const focus = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const interval = window.setInterval(focus, 60000);
    return () => {
      clearTimeout(first);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      window.clearInterval(interval);
      controller.current?.abort();
    };
  }, [refresh]);
  return (
    <Context.Provider
      value={{
        approved: data?.approved === true,
        application: data?.application ?? null,
        limits: data?.limits ?? settings.purchaseLimits,
        ready:
          !isLoading &&
          settingsReady &&
          (!user || user.role !== "customer" || data !== null) &&
          !error,
        error,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useBusiness() {
  const value = useContext(Context);
  if (!value) throw Error("useBusiness requires BusinessProvider");
  return value;
}
