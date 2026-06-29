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
      product: product._id, // CartItem.product is the product id
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
      className="rounded bg-black px-6 py-2 text-white transition disabled:opacity-40"
    >
      {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
