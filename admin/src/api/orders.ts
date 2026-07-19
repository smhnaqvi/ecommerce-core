import { api } from "./client";

// `source` narrows the list to one storefront (e.g. a landing slug).
// Omit it to see every order.
const listAllOrders = (source?: string) =>
    api.get("/orders", { params: source ? { source } : {} }).then(r => r.data);
const listOrderSources = () => api.get("/orders/sources").then(r => r.data);
const updateOrderStatus = (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }).then(r => r.data);


export default {
    listAllOrders, listOrderSources, updateOrderStatus
}
