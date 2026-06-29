import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (product: string) => void;
  setQty: (product: string, qty: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.product === item.product);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product === item.product ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty }] };
        }),
      removeItem: (product) =>
        set((state) => ({ items: state.items.filter((i) => i.product !== product) })),
      setQty: (product, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.product === product ? { ...i, qty: Math.max(1, qty) } : i
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "cart" } // localStorage key
  )
);

// derived total — use in components, don't store it
export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.price * i.qty, 0);