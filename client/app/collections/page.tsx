import Image from "next/image";
import Link from "next/link";
import { getProducts, getCategories } from "@/lib/api";
import { Product } from "@/types";

interface SearchParams {
  category?: string;
  sort?: string;
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ items: products }, categories] = await Promise.all([
    getProducts({
      limit: 20,
      category: searchParams.category ?? "",
    }),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="bg-[#2C1A0E] py-16 px-6 text-center">
        <span className="font-sans text-[11px] tracking-[0.35em] uppercase text-[#C9A882] block mb-3">
          Buraq Store
        </span>
        <h1 className="font-serif text-4xl lg:text-5xl text-[#F5EFE4]">
          All Collections
        </h1>
        <p className="font-sans text-sm text-[#F5EFE4]/50 mt-3 max-w-md mx-auto">
          {products.length} styles available
        </p>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-12">
        {/* Category filter strip */}
        <div className="flex gap-2 flex-wrap mb-10">
          <Link
            href="/collections"
            className={`font-sans text-xs tracking-widest uppercase px-4 py-2 border transition-colors ${
              !searchParams.category
                ? "bg-[#2C1A0E] text-[#F5EFE4] border-[#2C1A0E]"
                : "border-[#2C1A0E]/20 text-[#2C1A0E]/60 hover:border-[#2C1A0E] hover:text-[#2C1A0E]"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat._id}
              href={`/collections?category=${cat._id}`}
              className={`font-sans text-xs tracking-widest uppercase px-4 py-2 border transition-colors ${
                searchParams.category === cat._id
                  ? "bg-[#2C1A0E] text-[#F5EFE4] border-[#2C1A0E]"
                  : "border-[#2C1A0E]/20 text-[#2C1A0E]/60 hover:border-[#2C1A0E] hover:text-[#2C1A0E]"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Product grid */}
        {products.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-[#2C1A0E]/40 mb-4">
              No products found
            </p>
            <Link
              href="/collections"
              className="font-sans text-xs tracking-widest uppercase text-[#8B5E3C] underline"
            >
              Clear filter
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((product: Product) => {
              const isOnSale =
                product.salePrice && product.salePrice < product.price;
              const isSoldOut = product.countInStock === 0;

              return (
                <Link
                  key={product._id}
                  href={`/product/${product.slug ?? product._id}`}
                  className="group"
                >
                  {/* Image */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#E8DDD0] mb-3">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#E8DDD0]" />
                    )}

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      {isSoldOut && (
                        <span className="bg-[#2C1A0E] text-[#F5EFE4] font-sans text-[10px] tracking-widest uppercase px-2 py-1">
                          Sold out
                        </span>
                      )}
                      {isOnSale && !isSoldOut && (
                        <span className="bg-[#8B5E3C] text-[#F5EFE4] font-sans text-[10px] tracking-widest uppercase px-2 py-1">
                          Sale
                        </span>
                      )}
                    </div>

                    {/* Quick add on hover */}
                    {!isSoldOut && (
                      <div className="absolute bottom-0 left-0 right-0 bg-[#2C1A0E] text-[#F5EFE4] font-sans text-xs tracking-widest uppercase text-center py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        Quick Add
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <p className="font-sans text-sm text-[#2C1A0E]/80 leading-tight mb-1 group-hover:text-[#8B5E3C] transition-colors">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {isOnSale ? (
                      <>
                        <span className="font-sans text-sm font-medium text-[#8B5E3C]">
                          Rs. {product.salePrice?.toLocaleString()}
                        </span>
                        <span className="font-sans text-xs text-[#2C1A0E]/40 line-through">
                          Rs. {product.price.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="font-sans text-sm font-medium text-[#2C1A0E]">
                        Rs. {product.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}