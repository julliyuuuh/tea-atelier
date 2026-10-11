"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { isProductAvailable, type Product } from "./products";
import { useAuth } from "./auth-context";

type CartItem = { product: Product; quantity: number };

type CartContextType = {
  items: CartItem[];
  selectedItems: CartItem[];
  selectedSubtotal: number;
  setItemSelected: (productId: string, selected: boolean) => void;
  setAllSelected: (selected: boolean) => void;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  totalItems: number;
  subtotal: number;
  loading: boolean;
  stockError: string | null;
  clearStockError: () => void;
  lastAdded: Product | null;
  clearLastAdded: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_SELECTION_STORAGE = "tea-atelier.cart-selection.v1";
type CartSelection = { accountEmail: string | null; excludedIds: string[] };

function readSelection(accountEmail: string | null): CartSelection {
  let excludedIds: string[] = [];
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(CART_SELECTION_STORAGE) || "null",
    );
    if (
      saved?.accountEmail === accountEmail &&
      Array.isArray(saved.excludedIds)
    ) {
      excludedIds = saved.excludedIds.filter(
        (id: unknown): id is string => typeof id === "string",
      );
    }
  } catch {
    // Selection is optional; an unavailable browser store keeps the default selection.
  }
  return { accountEmail, excludedIds };
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selection, setSelection] = useState<CartSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);
  const clearStockError = () => setStockError(null);
  const [lastAdded, setLastAdded] = useState<Product | null>(null);
  const clearLastAdded = () => setLastAdded(null);

  // Every cart load gets a number. Only the NEWEST load may update the screen,
  // so a slow, older response can never overwrite a newer one.
  const loadId = useRef(0);

  const accountEmail = user?.email ?? null;
  const selectionReady = selection?.accountEmail === accountEmail;
  const excludedIds = new Set(selectionReady ? selection.excludedIds : []);
  const selectedItems = selectionReady
    ? items.filter((item) => !excludedIds.has(item.product.id))
    : [];
  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const saveSelection = (nextIds: string[]) => {
    const next = { accountEmail, excludedIds: nextIds };
    setSelection(next);
    try {
      sessionStorage.setItem(CART_SELECTION_STORAGE, JSON.stringify(next));
    } catch {
      // The current selection still works when browser storage is unavailable.
    }
  };
  const setItemSelected = (productId: string, selected: boolean) => {
    if (!selectionReady) return;
    const next = new Set(selection.excludedIds);
    if (selected) next.delete(productId);
    else next.add(productId);
    saveSelection([...next]);
  };
  const setAllSelected = (selected: boolean) => {
    if (!selectionReady) return;
    saveSelection(selected ? [] : items.map((item) => item.product.id));
  };

  const refreshCart = useCallback(async () => {
    const myId = ++loadId.current;
    try {
      const res = await fetch("/api/cart", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Unable to load your cart. Please try again.",
        );
      if (myId === loadId.current) setItems(data);
    } catch (error) {
      // network failure: keep whatever is on screen
      if (myId === loadId.current)
        setStockError(
          error instanceof Error
            ? error.message
            : "Unable to load your cart. Please try again.",
        );
    } finally {
      if (myId === loadId.current) {
        setSelection((previous) =>
          previous?.accountEmail === accountEmail
            ? previous
            : readSelection(accountEmail),
        );
      }
    }
  }, [accountEmail]);

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve first

    if (!user) {
      loadId.current++; // invalidate any request still in flight
      setItems([]); // logged out (or never logged in), no persisted cart
      setSelection({ accountEmail: null, excludedIds: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    refreshCart().finally(() => setLoading(false));
  }, [user, authLoading, refreshCart]);

  const clearCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to clear your cart.");
      loadId.current++; // invalidate any request still in flight
      setItems([]);
    } catch (error) {
      setStockError(
        error instanceof Error
          ? error.message
          : "Unable to clear your cart. Please try again.",
      );
    }
  }, []);

  const addToCart = async (product: Product, quantity: number = 1) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (
      !isProductAvailable(product) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      setStockError("This product is unavailable or its quantity is invalid.");
      return;
    }

    const existing = items.find((i) => i.product.id === product.id);
    const currentQuantity = existing?.quantity || 0;

    if (currentQuantity + quantity > product.stockQuantity) {
      setStockError(`Exceeds stock.`);
      return;
    }

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Unable to add to cart.");
      await refreshCart();
      setLastAdded(product);
    } catch (error) {
      // network failure
      setStockError(
        error instanceof Error
          ? error.message
          : "Unable to add to cart. Check your connection.",
      );
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(data?.error || "Unable to remove from cart.");
      loadId.current++;
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      setItemSelected(productId, true);
    } catch (error) {
      setStockError(
        error instanceof Error
          ? error.message
          : "Unable to remove from cart. Check your connection.",
      );
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1) return;

    const item = items.find((i) => i.product.id === productId);
    if (item && quantity > item.product.stockQuantity) {
      setStockError("Exceeds stock.");
      return;
    }

    const previousQuantity = item?.quantity;

    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
    );

    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok && previousQuantity !== undefined) {
        setItems((prev) =>
          prev.map((i) =>
            i.product.id === productId
              ? { ...i, quantity: previousQuantity }
              : i,
          ),
        );
        const data = await res.json();
        setStockError(data.error || "Unable to update quantity.");
      }
    } catch {
      setStockError(
        "Unable to update quantity. Check your connection and try again.",
      );
      if (previousQuantity !== undefined) {
        setItems((prev) =>
          prev.map((i) =>
            i.product.id === productId
              ? { ...i, quantity: previousQuantity }
              : i,
          ),
        );
      }
    }
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        selectedItems,
        selectedSubtotal,
        setItemSelected,
        setAllSelected,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        totalItems,
        subtotal,
        loading: loading || !selectionReady || authLoading,
        stockError,
        clearStockError,
        lastAdded,
        clearLastAdded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
