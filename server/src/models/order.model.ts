import mongoose, { Document, Schema, Types } from "mongoose";

interface OrderItem {
  product: Types.ObjectId;
  name: string;
  price: number;
  image?: string;
  qty: number;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: "COD" | "STRIPE";
  paymentResult?: {
    id: string;
    status: string;
    updateTime: string;
  };
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
}

const orderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        image: String,
        qty: { type: Number, required: true, min: 1 },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: { type: String, enum: ["COD", "STRIPE"], default: "COD" },
    paymentResult: {
      type: {
        id: String,
        status: String,
        updateTime: String,
      },
      required: false,
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", orderSchema);