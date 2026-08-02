"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Product } from "./products";
import { useAuth } from "./auth-context";

type CartItem = { product: Product; quantity: number };

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  loading: boolean;
  stockError: string | null;
  clearStockError: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);
  const clearStockError = () => setStockError(null);

  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve first

    if (!user) {
      setItems([]); // logged out (or never logged in) — no persisted cart
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/cart", { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: CartItem[]) => setItems(rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const clearCart = () => {
    setItems([]);
    fetch("/api/cart", { method: "DELETE", headers: authHeaders() }).catch(() => {});
  };

  const addToCart = async (product: Product, quantity: number = 1) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const existing = items.find((i) => i.product.id === product.id);
    const currentQuantity = existing?.quantity || 0;

    if (currentQuantity + quantity > product.stockQuantity) {
      setStockError(`Exceeds stock.`);
      return;
    }

    setItems((prev) => {
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { product, quantity }];
    });

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      if (!res.ok) {
        // Server rejected it (e.g. stock changed between check and now) — roll back
        setItems((prev) =>
          existing
            ? prev.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity - quantity }
                  : i,
              )
            : prev.filter((i) => i.product.id !== product.id),
        );
        const data = await res.json();
        alert(data.error || "Unable to add to cart.");
      }
    } catch {
      // network failure
    }
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
    fetch(`/api/cart/${productId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => {});
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity < 1) return;

    const item = items.find((i) => i.product.id === productId);
    if (item && quantity > item.product.stockQuantity) {
      alert(`Exceeds stock.`);
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
            i.product.id === productId ? { ...i, quantity: previousQuantity } : i,
          ),
        );
        const data = await res.json();
        alert(data.error || "Unable to update quantity.");
      }
    } catch {
      if (previousQuantity !== undefined) {
        setItems((prev) =>
          prev.map((i) =>
            i.product.id === productId ? { ...i, quantity: previousQuantity } : i,
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
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        loading,
        stockError,
        clearStockError,
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