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

export interface ISiteSettings extends Document {
  logoUrl: string;
  footer: {
    columns: IFooterColumn[];
    socialLinks: ISocialLink[];
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

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    logoUrl: { type: String, default: "" },
    footer: {
      columns: { type: [footerColumnSchema], default: [] },
      socialLinks: { type: [socialLinkSchema], default: [] },
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
