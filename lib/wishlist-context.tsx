"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "./products";

type WishlistContextType = {
  items: Product[];
  toggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
  removeFromWishlist: (productId: string) => void;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);

  const toggleWishlist = (product: Product) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const isWishlisted = (productId: string) => {
    return items.some((p) => p.id === productId);
  };

  const removeFromWishlist = (productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId));
  };

  return (
    <WishlistContext.Provider
      value={{ items, toggleWishlist, isWishlisted, removeFromWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context)
    throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
