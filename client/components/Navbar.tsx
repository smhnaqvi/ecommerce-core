"use client";
import Link from "next/link";
import { useState } from "react";
import { ShoppingBag, Menu, X, Search } from "lucide-react";


const NavLinks = [
  {
    label: "Men",
    href: "#",
  },
  {
    label: "Women",
    href: "#",
  },
  {
    label: "Collections",
    href: "/collections",
  },
  {
    label: "Sale",
    href: "#",
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F5EFE4]/95 backdrop-blur-sm border-b border-[#E8DDD0]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-serif text-2xl font-semibold tracking-wide text-espresso">
          BURAQ
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {NavLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="font-sans text-sm tracking-widest uppercase text-espresso/70 hover:text-brown transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="text-espresso/70 hover:text-brown transition-colors">
            <Search size={20} />
          </button>
          <Link href="/cart" className="relative text-espresso/70 hover:text-brown transition-colors">
            <ShoppingBag size={20} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brown text-cream text-[10px] font-sans flex items-center justify-center rounded-full">
              0
            </span>
          </Link>
          <button
            className="md:hidden text-espresso"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#F5EFE4] border-t border-sand px-6 py-4 flex flex-col gap-4">
          {NavLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="font-sans text-sm tracking-widest uppercase text-espresso/70"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}