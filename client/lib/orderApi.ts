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
  paidAt?: string;
  status: "awaiting_payment" | "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
}

// Send only { product, qty } per item plus the address — the server computes prices.
export async function createOrder(
  items: CartItem[],
  shippingAddress: ShippingAddress,
  paymentMethod: "COD" | "STRIPE" = "COD"
) {
  const res = await http.post(`/orders`, {
    items, shippingAddress, paymentMethod
  });
  return res.data
}

export async function getMyOrders() {
  const { data } = await http.get<Order[]>("/orders/mine");
  return data;
}

export async function getOrderById(id: string) {
  const { data } = await http.get<Order>(`/orders/${id}`);
  return data;
}
