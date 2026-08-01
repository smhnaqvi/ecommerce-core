"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Slide } from "@/types";

export default function HeroBanner({ slides }: { slides?: Slide[] }) {
  const activeSlides = slides?.length
    ? [...slides].sort((a, b) => a.order - b.order)
    : [];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % activeSlides.length),
      6000
    );
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  if (activeSlides.length === 0) return null;

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

          {/* Headline */}
          {slide.title && (
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-semibold text-[#F5EFE4] leading-[1.05] mb-6">
              {slide.title}
            </h1>
          )}

          {/* Subtext */}
          {slide.subtitle && (
            <p className="font-sans text-base sm:text-lg text-[#F5EFE4]/60 leading-relaxed max-w-sm mb-10">
              {slide.subtitle}
            </p>
          )}

          {/* CTA */}
          {slide.link && (
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={slide.link}
                className="inline-flex items-center justify-center bg-[#C9A882] text-[#2C1A0E] font-sans text-xs tracking-widest uppercase px-8 py-4 hover:bg-[#F5EFE4] transition-colors duration-300"
              >
                Shop Collection
              </Link>
            </div>
          )}
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
    </section>
  );
}
