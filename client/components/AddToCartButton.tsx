"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

export default function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const outOfStock = product.countInStock <= 0;

  function handleAdd() {
    addItem({
      product: product,
      name: product.name,
      price: product.price,
      image: product.images[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleAdd}
      disabled={outOfStock}
      className="w-full bg-[#2C1A0E] text-[#F5EFE4] font-sans text-xs tracking-widest uppercase py-4 hover:bg-[#8B5E3C] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
