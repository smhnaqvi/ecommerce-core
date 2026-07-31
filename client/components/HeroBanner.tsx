"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Slide } from "@/types";

const DEFAULT_SLIDE: Slide = {
  _id: "default",
  imageUrl: "https://buraqofficial.com/cdn/shop/files/buraq_1.jpg?v=1778660391&width=3000",
  title: "Wear the Art of the East",
  subtitle:
    "Handcrafted menswear where tradition meets contemporary silhouette. Every thread tells a story.",
  link: "/collections",
  order: 0,
  isActive: true,
};

export default function HeroBanner({ slides }: { slides?: Slide[] }) {
  const activeSlides = slides?.length
    ? [...slides].sort((a, b) => a.order - b.order)
    : [DEFAULT_SLIDE];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % activeSlides.length),
      6000
    );
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const slide = activeSlides[index];

  return (
    <section className="relative w-full h-screen min-h-[600px] overflow-hidden">
      {/* Full bleed background image */}
      <Image
        src={slide.imageUrl}
        alt={slide.title || "Buraq Collection"}
        fill
        className="object-cover object-top"
        priority
      />

      {/* Dark overlay — gradient from bottom so text is legible */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#2C1A0E]/80 via-[#2C1A0E]/40 to-transparent" />

      {/* Content — left aligned, vertically centered */}
      <div className="absolute inset-0 flex items-center">
        <div className="px-8 sm:px-12 lg:px-20 xl:px-28 max-w-3xl">

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-px bg-[#C9A882]" />
            <span className="font-sans text-[11px] tracking-[0.35em] uppercase text-[#C9A882]">
              New Collection — 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-semibold text-[#F5EFE4] leading-[1.05] mb-6">
            {slide.title || "Wear the Art of the East"}
          </h1>

          {/* Subtext */}
          {slide.subtitle && (
            <p className="font-sans text-base sm:text-lg text-[#F5EFE4]/60 leading-relaxed max-w-sm mb-10">
              {slide.subtitle}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={slide.link || "/collections"}
              className="inline-flex items-center justify-center bg-[#C9A882] text-[#2C1A0E] font-sans text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#F5EFE4] transition-colors duration-300"
            >
              Shop Collection
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center border border-[#F5EFE4]/40 text-[#F5EFE4] font-sans text-xs tracking-widest uppercase px-8 py-4 hover:border-[#C9A882] hover:text-[#C9A882] transition-colors duration-300"
            >
              Our Story
            </Link>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {activeSlides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? "bg-[#C9A882]" : "bg-[#F5EFE4]/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* Bottom-right: floating stat */}
      <div className="absolute bottom-8 right-8 sm:right-12 lg:right-20 text-right hidden sm:block">
        <p className="font-serif text-3xl text-[#F5EFE4]">200+</p>
        <p className="font-sans text-[10px] tracking-widest uppercase text-[#F5EFE4]/40 mt-1">
          Styles available
        </p>
      </div>
    </section>
  );
}
