"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  name: string;
}

export default function ProductImageGallery({ images, name }: Props) {
  const [active, setActive] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-[#E8DDD0] flex items-center justify-center">
        <p className="font-sans text-sm text-[#2C1A0E]/30">No image</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-3">
      {/* Thumbnails — vertical strip on desktop, horizontal on mobile */}
      {images.length > 1 && (
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[600px]">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative shrink-0 w-16 h-20 lg:w-20 lg:h-24 overflow-hidden border-2 transition-colors ${
                active === i
                  ? "border-[#8B5E3C]"
                  : "border-transparent hover:border-[#2C1A0E]/20"
              }`}
            >
              <Image
                src={img}
                alt={`${name} ${i + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="relative flex-1 aspect-[3/4] overflow-hidden bg-[#E8DDD0]">
        <Image
          src={images[active]}
          alt={name}
          fill
          className="object-cover transition-opacity duration-300"
          priority
        />

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-[#2C1A0E]/60 text-[#F5EFE4] font-sans text-[10px] tracking-widest px-2 py-1">
            {active + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
}