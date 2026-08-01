import mongoose, { Document, Schema } from "mongoose";

export interface IFooterLink {
  label: string;
  href: string;
}

export interface IFooterColumn {
  title: string;
  links: IFooterLink[];
}

export interface ISocialLink {
  platform: string;
  href: string;
}

export interface IContactInfo {
  timings: string;
  contact: string;
  email: string;
  address: string;
}

export interface ISiteSettings extends Document {
  logoUrl: string;
  footer: {
    brandName: string;
    brandDescription: string;
    contactInfo: IContactInfo;
    columns: IFooterColumn[];
    socialLinks: ISocialLink[];
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

const footerLinkSchema = new Schema<IFooterLink>(
  {
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const footerColumnSchema = new Schema<IFooterColumn>(
  {
    title: { type: String, required: true, trim: true },
    links: { type: [footerLinkSchema], default: [] },
  },
  { _id: false }
);

const socialLinkSchema = new Schema<ISocialLink>(
  {
    platform: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const contactInfoSchema = new Schema<IContactInfo>(
  {
    timings: { type: String, default: "" },
    contact: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { _id: false }
);

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    logoUrl: { type: String, default: "" },
    footer: {
      brandName: { type: String, default: "" },
      brandDescription: { type: String, default: "" },
      contactInfo: { type: contactInfoSchema, default: () => ({}) },
      columns: { type: [footerColumnSchema], default: [] },
      socialLinks: { type: [socialLinkSchema], default: [] },
      newsletterTitle: { type: String, default: "" },
      newsletterDescription: { type: String, default: "" },
      paymentMethods: {
        visa: { type: Boolean, default: false },
        mastercard: { type: Boolean, default: false },
        cod: { type: Boolean, default: false },
      },
      copyrightText: { type: String, default: "" },
    },
    theme: {
      primaryColor: { type: String, default: "" },
      secondaryColor: { type: String, default: "" },
      accentColor: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>(
  "SiteSettings",
  siteSettingsSchema
);
