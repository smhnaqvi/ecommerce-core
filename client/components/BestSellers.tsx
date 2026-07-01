import Link from "next/link";
import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  images: string[];
  slug?: string;
  countInStock: number;
}

async function getBestSellers(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/products?limit=4&sort=best`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? data ?? [];
  } catch {
    return [];
  }
}

export default async function BestSellers() {
  const products = await getBestSellers();

  return (
    <section className="py-20 bg-sand">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="font-sans text-xs tracking-[0.3em] uppercase text-brown block mb-2">
            Curated for you
          </span>
          <h2 className="font-serif text-3xl lg:text-4xl text-espresso">
            Best Sellers
          </h2>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((product) => {
            const isOnSale = product.salePrice && product.salePrice < product.price;
            const isSoldOut = product.countInStock === 0;

            return (
              <Link
                key={product._id}
                href={`/product/${product.slug ?? product._id}`}
                className="group"
              >
                {/* Image container */}
                <div className="relative aspect-[3/4] overflow-hidden bg-[#E0D4C4] mb-3">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E0D4C4]" />
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {isSoldOut && (
                      <span className="bg-espresso text-cream font-sans text-[10px] tracking-widest uppercase px-2 py-1">
                        Sold out
                      </span>
                    )}
                    {isOnSale && !isSoldOut && (
                      <span className="bg-brown text-cream font-sans text-[10px] tracking-widest uppercase px-2 py-1">
                        Sale
                      </span>
                    )}
                  </div>

                  {/* Quick add — appears on hover */}
                  {!isSoldOut && (
                    <div className="absolute bottom-0 left-0 right-0 bg-espresso text-cream font-sans text-xs tracking-widest uppercase text-center py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      Quick Add
                    </div>
                  )}
                </div>

                {/* Product info */}
                <div>
                  <p className="font-sans text-sm text-espresso/80 leading-tight mb-1 group-hover:text-brown transition-colors">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2">
                    {isOnSale ? (
                      <>
                        <span className="font-sans text-sm font-medium text-brown">
                          Rs. {product.salePrice?.toLocaleString()}
                        </span>
                        <span className="font-sans text-xs text-espresso/40 line-through">
                          Rs. {product.price.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="font-sans text-sm font-medium text-espresso">
                        Rs. {product.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View all CTA */}
        <div className="text-center mt-12">
          <Link
            href="/collections"
            className="inline-flex items-center justify-center border border-espresso text-espresso font-sans text-xs tracking-widest uppercase px-10 py-4 hover:bg-espresso hover:text-cream transition-colors duration-300"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}