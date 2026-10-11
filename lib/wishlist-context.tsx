"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { Product } from "./products";
import { useAuth } from "./auth-context";

type WishlistContextType = {
  items: Product[];
  toggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
  loading: boolean;
  error: string;
  refreshWishlist: () => Promise<void>;
};
type WishlistState = {
  account: string | null;
  items: Product[];
  ready: boolean;
  error: string;
};
const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const account = user?.email ?? null;
  const [store, setStore] = useState<WishlistState>({
    account: null,
    items: [],
    ready: true,
    error: "",
  });
  const requestId = useRef(0);
  const sessionId = useRef(0);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const pending = useRef(new Set<string>());
  const matches = store.account === account;
  const items = matches && !authLoading ? store.items : [];
  const error = matches ? store.error : "";
  const loading = authLoading || !matches || (!store.ready && !error);
  const refreshWishlist = useCallback(async () => {
    if (authLoading) return;
    if (
      Array.from(pending.current).some((key) => key.startsWith(`${account}:`))
    )
      return;
    setErrorDismissed(false);
    const current = ++requestId.current;
    if (!account) {
      setStore((previous) =>
        previous.account === null
          ? previous
          : { account: null, items: [], ready: true, error: "" },
      );
      return;
    }
    setStore((previous) => ({
      account,
      items: previous.account === account ? previous.items : [],
      ready: false,
      error: "",
    }));
    try {
      const response = await fetch("/api/wishlist", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to load your wishlist.");
      if (current === requestId.current)
        setStore({ account, items: data.items, ready: true, error: "" });
    } catch (cause) {
      if (current === requestId.current)
        setStore((previous) => ({
          ...previous,
          error:
            cause instanceof Error
              ? cause.message
              : "Unable to load your wishlist.",
        }));
    }
  }, [account, authLoading]);
  const invalidateRequests = useCallback(() => {
    requestId.current++;
    sessionId.current++;
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void refreshWishlist(), 0);
    return () => {
      window.clearTimeout(timer);
      invalidateRequests();
    };
  }, [refreshWishlist, invalidateRequests]);

  async function change(productId: string, product?: Product, remove = false) {
    if (authLoading || !matches || !store.ready) return;
    const original = items.find((item) => item.id === productId);
    const deleting = remove || !!original;
    if (remove && !original) return;
    const key = `${account ?? "guest"}:${productId}`;
    if (pending.current.has(key)) return;
    requestId.current++;
    setErrorDismissed(false);
    if (!account) {
      setStore((previous) => ({
        ...previous,
        error: "",
        items:
          remove || previous.items.some((item) => item.id === productId)
            ? previous.items.filter((item) => item.id !== productId)
            : [product!, ...previous.items],
      }));
      return;
    }
    const session = sessionId.current;
    setStore((previous) => ({
      ...previous,
      error: "",
      items: deleting
        ? previous.items.filter((item) => item.id !== productId)
        : [product!, ...previous.items.filter((item) => item.id !== productId)],
    }));
    pending.current.add(key);
    try {
      const response = await fetch("/api/wishlist", {
        method: deleting ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ productId }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to update your wishlist.");
    } catch (cause) {
      setStore((previous) => {
        if (previous.account !== account || session !== sessionId.current)
          return previous;
        const otherItems = previous.items.filter(
          (item) => item.id !== productId,
        );
        return {
          ...previous,
          items: original ? [original, ...otherItems] : otherItems,
          error:
            cause instanceof Error
              ? cause.message
              : "Unable to update your wishlist.",
        };
      });
    } finally {
      pending.current.delete(key);
    }
  }
  return (
    <WishlistContext.Provider
      value={{
        items,
        toggleWishlist: (product) => {
          void change(product.id, product);
        },
        isWishlisted: (id) => items.some((item) => item.id === id),
        removeFromWishlist: (id) => {
          void change(id, undefined, true);
        },
        loading,
        error,
        refreshWishlist,
      }}
    >
      {children}
      {error && !errorDismissed && (
        <div
          role="alert"
          className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-xl border border-red-200 bg-cream p-4 font-body text-sm text-red-700 shadow-sm"
        >
          <p>{error}</p>
          <div className="mt-2 flex gap-4">
            <button
              type="button"
              onClick={() => void refreshWishlist()}
              className="cursor-pointer underline"
            >
              Retry loading
            </button>
            <button
              type="button"
              onClick={() => setErrorDismissed(true)}
              className="cursor-pointer underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </WishlistContext.Provider>
  );
}
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context)
    throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
