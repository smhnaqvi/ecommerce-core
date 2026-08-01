import Link from "next/link";
import { SiteSettings } from "@/types";

type FooterProps = {
  settings?: SiteSettings["footer"];
};

export default function Footer({ settings }: FooterProps) {
  const brandName = settings?.brandName ?? "";
  const brandDescription = settings?.brandDescription ?? "";
  const contactInfo = settings?.contactInfo;
  const columns = settings?.columns ?? [];
  const socialLinks = settings?.socialLinks ?? [];
  const newsletterTitle = settings?.newsletterTitle ?? "";
  const newsletterDescription = settings?.newsletterDescription ?? "";
  const paymentMethods = settings?.paymentMethods;
  const copyrightText = settings?.copyrightText ?? "";

  const contactItems = contactInfo
    ? [
        { label: "Timings", value: contactInfo.timings },
        { label: "Contact", value: contactInfo.contact },
        { label: "Email", value: contactInfo.email },
        { label: "Address", value: contactInfo.address },
      ].filter((item) => item.value)
    : [];

  return (
    <footer className="bg-[#2C1A0E] text-[#F5EFE4]">

      {/* ── Main footer grid ─────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

          {/* Brand — 2 cols wide */}
          <div className="lg:col-span-2">
            {brandName && (
              <p className="font-serif text-2xl font-semibold mb-4 tracking-wide">
                {brandName}
              </p>
            )}
            {brandDescription && (
              <p className="font-sans text-xs text-[#F5EFE4]/40 leading-relaxed max-w-xs mb-8">
                {brandDescription}
              </p>
            )}

            {/* Contact info — dynamic from Site Settings */}
            {contactItems.length > 0 && (
              <div className="space-y-2 mb-8">
                {contactItems.map((item) => (
                  <div key={item.label} className="flex gap-2">
                    <span className="font-sans text-[10px] tracking-widest uppercase text-[#C9A882] shrink-0 mt-0.5 w-16">
                      {item.label}
                    </span>
                    <span className="font-sans text-xs text-[#F5EFE4]/40 leading-relaxed">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Social icons — dynamic from Site Settings */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                    className="text-[#F5EFE4]/30 hover:text-[#C9A882] transition-colors"
                  >
                    <SocialIcon platform={social.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer link columns — dynamic from Site Settings */}
          {columns.map((column) => (
            <div key={column.title}>
              <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#C9A882] mb-5">
                {column.title}
              </p>
              <ul className="space-y-3">
                {column.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="font-sans text-sm text-[#F5EFE4]/40 hover:text-[#F5EFE4] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter — dynamic from Site Settings */}
          {(newsletterTitle || newsletterDescription) && (
            <div>
              {newsletterTitle && (
                <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#C9A882] mb-5">
                  {newsletterTitle}
                </p>
              )}
              {newsletterDescription && (
                <p className="font-sans text-xs text-[#F5EFE4]/40 mb-5 leading-relaxed">
                  {newsletterDescription}
                </p>
              )}
              <div className="flex border border-[#F5EFE4]/15">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 bg-transparent px-3 py-3 font-sans text-xs text-[#F5EFE4] placeholder:text-[#F5EFE4]/25 focus:outline-none min-w-0"
                />
                <button className="bg-[#C9A882] text-[#2C1A0E] font-sans text-[10px] tracking-widest uppercase px-4 py-3 hover:bg-[#8B5E3C] hover:text-[#F5EFE4] transition-colors shrink-0">
                  Join
                </button>
              </div>

              {/* Payment methods — toggled from Site Settings */}
              {paymentMethods && (paymentMethods.visa || paymentMethods.mastercard || paymentMethods.cod) && (
                <div className="mt-8">
                  <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-[#C9A882] mb-3">
                    We accept
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {paymentMethods.visa && (
                      <div className="bg-[#F5EFE4]/10 px-2 py-1.5 flex items-center">
                        <svg width="38" height="12" viewBox="0 0 38 12" fill="none">
                          <path d="M14.5 0.5L12 11.5H9L11.5 0.5H14.5Z" fill="#F5EFE4" fillOpacity="0.8"/>
                          <path d="M24.5 0.7C23.8 0.4 22.7 0.1 21.3 0.1C18.3 0.1 16.2 1.7 16.2 3.9C16.2 5.6 17.7 6.5 18.9 7.1C20.1 7.7 20.5 8.1 20.5 8.6C20.5 9.4 19.5 9.8 18.6 9.8C17.3 9.8 16.6 9.6 15.5 9.1L15 8.9L14.5 11.7C15.4 12.1 17 12.5 18.7 12.5C21.9 12.5 23.9 10.9 23.9 8.5C23.9 7.2 23.1 6.2 21.3 5.4C20.2 4.8 19.5 4.4 19.5 3.9C19.5 3.4 20.1 2.9 21.3 2.9C22.3 2.9 23 3.1 23.6 3.4L23.9 3.5L24.5 0.7Z" fill="#F5EFE4" fillOpacity="0.8"/>
                          <path d="M28.5 0.5C27.8 0.5 27.3 0.7 27 1.4L22.5 11.5H25.7L26.3 9.8H30.2L30.6 11.5H33.5L31 0.5H28.5ZM27.2 7.5C27.4 6.9 28.5 3.9 28.5 3.9C28.5 3.9 28.8 3.1 28.9 2.7L29.1 3.8C29.1 3.8 29.8 7 30 7.5H27.2Z" fill="#F5EFE4" fillOpacity="0.8"/>
                          <path d="M11.5 0.5L8.5 8.1L8.2 6.6C7.6 4.7 5.8 2.6 3.8 1.5L6.5 11.5H9.7L14.7 0.5H11.5Z" fill="#F5EFE4" fillOpacity="0.8"/>
                          <path d="M5.5 0.5H0.5L0.4 0.8C4.3 1.8 6.9 4.1 8.2 6.6L6.8 1.5C6.5 0.8 6.1 0.5 5.5 0.5Z" fill="#C9A882"/>
                        </svg>
                      </div>
                    )}
                    {paymentMethods.mastercard && (
                      <div className="bg-[#F5EFE4]/10 px-2 py-1.5 flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-red-500/70" />
                        <div className="w-5 h-5 rounded-full bg-yellow-400/70 -ml-2.5" />
                      </div>
                    )}
                    {paymentMethods.cod && (
                      <div className="bg-[#F5EFE4]/10 px-2 py-1.5">
                        <span className="font-sans text-[9px] tracking-widest uppercase text-[#F5EFE4]/60">
                          COD
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div className="w-full h-px bg-[#F5EFE4]/10 mb-6" />

        {/* ── Bottom bar ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {copyrightText && (
            <p className="font-sans text-[11px] text-[#F5EFE4]/25">
              {copyrightText}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ platform }: { platform: string }) {
  switch (platform.trim().toLowerCase()) {
    case "facebook":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case "instagram":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
        </svg>
      );
    case "twitter":
    case "x":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.6L4.4 22H1.3l8.1-9.3L1 2h7.1l4.9 6.1L18.9 2Zm-1.2 18h1.7L7.4 4H5.6l12.1 16Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 12s0-3.2-.4-4.7a2.9 2.9 0 0 0-2-2C17.9 5 12 5 12 5s-5.9 0-7.6.3a2.9 2.9 0 0 0-2 2C2 8.8 2 12 2 12s0 3.2.4 4.7a2.9 2.9 0 0 0 2 2C6.1 19 12 19 12 19s5.9 0 7.6-.3a2.9 2.9 0 0 0 2-2c.4-1.5.4-4.7.4-4.7ZM10 15.5v-7l6 3.5-6 3.5Z" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" />
          <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
        </svg>
      );
  }
}