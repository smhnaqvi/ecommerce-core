export interface Order {
  _id: string;
  user?: { _id: string; name: string; email: string };
  items: { product: string; name: string; price: number; qty: number }[];
  totalPrice: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  isPaid: boolean;
  createdAt: string;
}