import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, getProducts } from "@/lib/api";
import AddToCartButton from "@/components/AddToCartButton";
import ProductImageGallery from "@/components/ProductImageGallery";

export async function generateStaticParams() {
  const { items } = await getProducts({ limit: 50 });
  return items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description?.slice(0, 160),
    openGraph: { images: product.images[0] ? [product.images[0]] : [] },
  };
}

import { Truck, RotateCcw, ShieldCheck } from "lucide-react";

// Replace the array with:
const trustSignals = [
  {
    icon: <Truck size={16} className="text-[#8B5E3C] mt-0.5 shrink-0" />,
    title: "Free delivery",
    desc: "On orders over Rs. 5,000",
  },
  {
    icon: <RotateCcw size={16} className="text-[#8B5E3C] mt-0.5 shrink-0" />,
    title: "Easy returns",
    desc: "7-day return policy",
  },
  {
    icon: <ShieldCheck size={16} className="text-[#8B5E3C] mt-0.5 shrink-0" />,
    title: "Secure checkout",
    desc: "SSL encrypted payments",
  },
];

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const isOnSale = product.salePrice && product.salePrice < product.price;
  const isSoldOut = product.countInStock === 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.description,
    offers: {
      "@type": "Offer",
      price: isOnSale ? product.salePrice : product.price,
      priceCurrency: "PKR",
      availability: isSoldOut
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="min-h-screen bg-[#F5EFE4]">
        {/* Breadcrumb */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-4">
          <nav className="flex items-center gap-2 font-sans text-xs tracking-wide text-[#2C1A0E]/40">
            <Link href="/" className="hover:text-[#8B5E3C] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              href="/collections"
              className="hover:text-[#8B5E3C] transition-colors"
            >
              Collections
            </Link>
            <span>/</span>
            <span className="text-[#2C1A0E]/70 truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>
        </div>

        {/* Main product layout */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-16">

            {/* Left: Image gallery */}
            <ProductImageGallery images={product.images} name={product.name} />

            {/* Right: Product info */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-6 py-4">

              {/* Category tag */}
              {product.category?.name && (
                <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#8B5E3C]">
                  {product.category.name}
                </span>
              )}

              {/* Product name */}
              <h1 className="font-serif text-3xl lg:text-4xl text-[#2C1A0E] leading-tight">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                {isOnSale ? (
                  <>
                    <span className="font-serif text-2xl text-[#8B5E3C]">
                      Rs. {product.salePrice?.toLocaleString()}
                    </span>
                    <span className="font-sans text-base text-[#2C1A0E]/40 line-through">
                      Rs. {product.price.toLocaleString()}
                    </span>
                    <span className="font-sans text-xs tracking-widest uppercase bg-[#8B5E3C] text-[#F5EFE4] px-2 py-1">
                      Sale
                    </span>
                  </>
                ) : (
                  <span className="font-serif text-2xl text-[#2C1A0E]">
                    Rs. {product.price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-[#2C1A0E]/10" />

              {/* Stock status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isSoldOut ? "bg-red-400" : "bg-emerald-400"
                  }`}
                />
                <span className="font-sans text-sm text-[#2C1A0E]/60">
                  {isSoldOut
                    ? "Out of stock"
                    : `In stock — ${product.countInStock} left`}
                </span>
              </div>

              {/* Add to cart */}
              <div className="space-y-3">
                <AddToCartButton product={product} />
                <button className="w-full border border-[#2C1A0E]/20 text-[#2C1A0E] font-sans text-xs tracking-widest uppercase py-4 hover:border-[#8B5E3C] hover:text-[#8B5E3C] transition-colors duration-300">
                  Add to Wishlist
                </button>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-[#2C1A0E]/10" />

              {/* Description */}
              {product.description && (
                <div>
                  <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#2C1A0E]/40 mb-3">
                    Description
                  </p>
                  <p className="font-sans text-sm text-[#2C1A0E]/70 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="w-full h-px bg-[#2C1A0E]/10" />

              {/* Delivery info */}
              <div className="space-y-3">
                {trustSignals.map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    {item.icon}
                    <div>
                      <p className="font-sans text-xs font-medium text-[#2C1A0E]">
                        {item.title}
                      </p>
                      <p className="font-sans text-xs text-[#2C1A0E]/50">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}