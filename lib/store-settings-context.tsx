"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_SETTINGS,
  validateSettings,
  type StoreSettings,
} from "@/lib/store-settings";
type SettingsContext = {
  settings: StoreSettings;
  ready: boolean;
  error: string;
  currency: "PHP" | "USD";
  setCurrency: (value: "PHP" | "USD") => void;
  refresh: () => Promise<void>;
};
const Context = createContext<SettingsContext | null>(null);
export function StoreSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [preference, setPreference] = useState<"PHP" | "USD">("PHP");
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const response = await fetch("/api/settings", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error("Unable to load store options. Please retry.");
      const config = validateSettings(data.config);
      if (request !== sequence.current) return;
      setSettings(config);
      setReady(true);
      setError("");
      try {
        setPreference(
          localStorage.getItem("tea-atelier.display-currency") === "USD"
            ? "USD"
            : "PHP",
        );
      } catch {
        /* Browsing remains available without local storage. */
      }
    } catch {
      if (request === sequence.current)
        setError("Unable to load store options. Please retry.");
    }
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    const timer = window.setInterval(focus, 60000);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("focus", focus);
      window.clearInterval(timer);
    };
  }, [refresh]);
  function setCurrency(value: "PHP" | "USD") {
    setPreference(value);
    try {
      localStorage.setItem("tea-atelier.display-currency", value);
    } catch {
      /* In-memory preference still works. */
    }
  }
  return (
    <Context.Provider
      value={{
        settings,
        ready,
        error,
        currency: settings.usd.enabled ? preference : "PHP",
        setCurrency,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStoreSettings() {
  const value = useContext(Context);
  if (!value) throw new Error("StoreSettingsProvider is required.");
  return value;
}
