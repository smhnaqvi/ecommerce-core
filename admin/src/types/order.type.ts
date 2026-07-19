export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string;
  country?: string;
}

export interface Order {
  _id: string;
  /** absent on guest orders placed from a landing page */
  user?: { _id: string; name: string; email: string };
  isGuest?: boolean;
  /** which storefront the order came from: "web" or a landing slug */
  source?: string;
  guestEmail?: string;
  shippingAddress: ShippingAddress;
  items: { product: string; name: string; price: number; qty: number }[];
  paymentMethod?: "COD" | "STRIPE";
  totalPrice: number;
  status:
    | "awaiting_payment"
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  isPaid: boolean;
  createdAt: string;
}
