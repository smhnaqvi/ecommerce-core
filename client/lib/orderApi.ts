import { http } from "./http";
import type { CartItem } from "../store/cartStore";

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderLine {
  product: string;
  name: string;
  price: number;
  image?: string;
  qty: number;
}

export interface Order {
  _id: string;
  items: OrderLine[];
  shippingAddress: ShippingAddress;
  paymentMethod: "COD" | "STRIPE";
  itemsPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
}

// Send only { product, qty } per item plus the address — the server computes prices.
export async function createOrder(items: CartItem[], shippingAddress: ShippingAddress) {
  const payload = {
    items: items.map((i) => ({ product: i.product, qty: i.qty })),
    shippingAddress,
    paymentMethod: "COD" as const,
  };
  const { data } = await http.post<Order>("/orders", payload);
  return data;
}

export async function getMyOrders() {
  const { data } = await http.get<Order[]>("/orders/mine");
  return data;
}
