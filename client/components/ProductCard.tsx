import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium">{product.name}</h3>
      <p className="text-sm text-gray-600">${product.price}</p>
    </Link>
  );
}