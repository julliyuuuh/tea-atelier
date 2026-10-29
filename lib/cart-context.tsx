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
import { isProductAvailable, type Product } from "./products";
import { useBusiness } from "@/lib/business-context";
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

// Signed-out shoppers keep their cart in this browser. The product snapshot is
// only for display: on sign-in each line is re-added through /api/cart, which
// checks live price, stock and limits.
const GUEST_CART_STORAGE = "tea-atelier.guest-cart.v1";

function readGuestCart(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_CART_STORAGE) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (item): item is CartItem =>
        typeof item?.product?.id === "string" &&
        typeof item.product.name === "string" &&
        Number.isFinite(Number(item.product.price)) &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

function writeGuestCart(items: CartItem[]) {
  try {
    if (items.length === 0) localStorage.removeItem(GUEST_CART_STORAGE);
    else localStorage.setItem(GUEST_CART_STORAGE, JSON.stringify(items));
  } catch {
    // Without storage the guest cart still works for this visit.
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { approved, limits, ready: limitsReady } = useBusiness();
  const perProductLimit = approved
    ? limits.business.perProduct
    : limits.standard.perProduct;
  const { user, isLoading: authLoading } = useAuth();
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

  // After sign-in, move anything added while signed out into the account cart.
  // The guest cart is taken out of storage before posting, so a re-run of the
  // effect (or a second tab) can't add it twice. The server re-checks every
  // line; refused lines are reported, and only lines lost to a network error
  // go back into the guest cart for the next attempt.
  const merging = useRef(false);
  const mergeGuestCart = async () => {
    if (merging.current) return;
    const guest = readGuestCart();
    if (guest.length === 0) return;
    merging.current = true;
    writeGuestCart([]);
    const refused: string[] = [];
    const retry: CartItem[] = [];
    try {
      for (const item of guest) {
        try {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({
              productId: item.product.id,
              quantity: item.quantity,
            }),
          });
          if (!res.ok) refused.push(item.product.name);
        } catch {
          retry.push(item);
        }
      }
    } finally {
      merging.current = false;
    }
    if (retry.length > 0) writeGuestCart(retry);
    if (refused.length > 0 || retry.length > 0)
      setStockError(
        refused.length > 0
          ? `We couldn't move ${refused.join(", ")} into your cart. It may be out of stock or over your limit.`
          : "Some items from before you signed in couldn't be added yet. We'll try again shortly.",
      );
  };

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve first

    if (!user) {
      loadId.current++; // invalidate any request still in flight
      setItems(readGuestCart());
      setSelection({ accountEmail: null, excludedIds: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    mergeGuestCart()
      .then(refreshCart)
      .finally(() => setLoading(false));
  }, [user, authLoading, refreshCart]);

  const clearCart = useCallback(async () => {
    if (!user) {
      writeGuestCart([]);
      setItems([]);
      return;
    }
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
  }, [user]);

  const addToCart = async (product: Product, quantity: number = 1) => {
    if (
      !isProductAvailable(product) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      setStockError("This product is unavailable or its quantity is invalid.");
      return;
    }

    if (!limitsReady) {
      setStockError("Loading purchase limits. Please try again.");
      return;
    }
    const existing = items.find((i) => i.product.id === product.id);
    const currentQuantity = existing?.quantity || 0;

    if (currentQuantity + quantity > perProductLimit) {
      setStockError(
        `Your account allows up to ${perProductLimit} units per product.`,
      );
      return;
    }
    if (currentQuantity + quantity > product.stockQuantity) {
      setStockError(`Exceeds stock.`);
      return;
    }

    if (!user) {
      const next = existing
        ? items.map((i) =>
            i.product.id === product.id
              ? { product, quantity: currentQuantity + quantity }
              : i,
          )
        : [...items, { product, quantity }];
      writeGuestCart(next);
      setItems(next);
      setLastAdded(product);
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
    if (!user) {
      const next = items.filter((item) => item.product.id !== productId);
      writeGuestCart(next);
      setItems(next);
      setItemSelected(productId, true);
      return;
    }
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
    if (
      item &&
      quantity > item.quantity &&
      (!limitsReady || quantity > perProductLimit)
    ) {
      setStockError(
        !limitsReady
          ? "Loading purchase limits. Please try again."
          : `Your account allows up to ${perProductLimit} units per product.`,
      );
      return;
    }
    if (
      item &&
      quantity > item.product.stockQuantity &&
      quantity >= item.quantity
    ) {
      setStockError("Exceeds stock.");
      return;
    }

    if (!user) {
      const next = items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i,
      );
      writeGuestCart(next);
      setItems(next);
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
