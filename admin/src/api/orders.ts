import { api } from "./client";

const listAllOrders = () => api.get("/orders").then(r => r.data);
const updateOrderStatus = (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }).then(r => r.data);


export default {
    listAllOrders, updateOrderStatus
}