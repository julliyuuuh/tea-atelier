"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Product, products } from "./products";
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
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      .then((rows: { product_id: string; quantity: number }[]) => {
        const hydrated = rows
          .map((row) => {
            const product = products.find((p) => p.id === row.product_id);
            return product ? { product, quantity: row.quantity } : null;
          })
          .filter((i): i is CartItem => i !== null);
        setItems(hydrated);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const clearCart = () => {
    setItems([]);
    fetch("/api/cart", { method: "DELETE", headers: authHeaders() }).catch(() => {});
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { product, quantity }];
    });

    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ productId: product.id, quantity }),
    }).catch(() => {});
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
    fetch(`/api/cart/${productId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).catch(() => {});
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
    );

    fetch(`/api/cart/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ quantity }),
    }).catch(() => {});
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