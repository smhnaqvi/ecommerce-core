export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  countInStock: number;
  category: Category;
  salePrice?: number;
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  pages: number;
  total: number;
}

export interface Slide {
  _id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  link?: string;
  order: number;
  isActive: boolean;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface SocialLink {
  platform: string;
  href: string;
}

export interface ContactInfo {
  timings: string;
  contact: string;
  email: string;
  address: string;
}

export interface SiteSettings {
  logoUrl: string;
  footer: {
    brandName: string;
    brandDescription: string;
    contactInfo: ContactInfo;
    columns: FooterColumn[];
    socialLinks: SocialLink[];
    newsletterTitle: string;
    newsletterDescription: string;
    paymentMethods: {
      visa: boolean;
      mastercard: boolean;
      cod: boolean;
    };
    copyrightText: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}