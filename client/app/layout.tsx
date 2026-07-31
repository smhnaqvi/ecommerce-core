import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, DM_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthInitializer from "@/components/AuthInitializer";
import { getSiteSettings } from "@/lib/api";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Buraq Store", template: "%s | Buraq Store" },
  description: "Handcrafted menswear rooted in Eastern tradition, shaped for the modern man.",
  openGraph: {
    type: "website",
    siteName: "Buraq Store",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteSettings = await getSiteSettings();
  const theme = siteSettings?.theme;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfair.variable} ${dmSans.variable}`}
    >
      <body className="bg-[#F5EFE4] font-sans text-[#2C1A0E] antialiased">
        {/* Theme init script — runs before paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />

        {/* Dynamic theme colors — overrides globals.css :root vars when set in Site Settings */}
        {theme && (theme.primaryColor || theme.secondaryColor || theme.accentColor) && (
          <style
            dangerouslySetInnerHTML={{
              __html: `:root{${theme.primaryColor ? `--primary:${theme.primaryColor};` : ""}${theme.secondaryColor ? `--muted-foreground:${theme.secondaryColor};` : ""}${theme.accentColor ? `--color-brand-gold:${theme.accentColor};` : ""}}`,
            }}
          />
        )}

        {/* Auth state initializer (client component) */}
        <AuthInitializer />

        {/* Nav — fixed, sits above everything */}
        <Navbar logoUrl={siteSettings?.logoUrl} />

        {/* Page content — no max-width or padding here,
            each section/page controls its own layout */}
        <div className="min-h-screen pt-16">
          {children}
        </div>

        {/* Footer — on every page */}
        <Footer settings={siteSettings?.footer} />
      </body>
    </html>
  );
}