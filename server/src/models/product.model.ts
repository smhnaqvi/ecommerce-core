import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: Types.ObjectId;
  images: string[];
  countInStock: number;
  isActive: boolean;
  isListed: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    images: { type: [String], default: [] },
    countInStock: { type: Number, default: 0, min: 0 },
    // `isActive` controls whether a product can be sold at all.
    // `isListed` only controls whether the storefront shows it: an unlisted
    // product is hidden from browse and search, but still sells fine when a
    // landing page orders it by id.
    isActive: { type: Boolean, default: true },
    isListed: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

productSchema.pre("validate", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

export const Product = mongoose.model<IProduct>("Product", productSchema);



