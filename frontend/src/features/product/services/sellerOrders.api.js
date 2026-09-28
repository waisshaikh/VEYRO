import axios from "axios";
import { API_BASE_URL } from "../../../config/api.js";

const paymentApiInstance = axios.create({
  baseURL: `${API_BASE_URL}/payment`,
  withCredentials: true,
});

export async function getSellerOrdersApi() {
  const response = await paymentApiInstance.get("/seller/orders");
  return response.data;
}

export async function updateSellerOrderStatusApi(paymentId, productId, orderStatus) {
  const response = await paymentApiInstance.patch("/seller/orders/status", {
    paymentId,
    productId,
    orderStatus,
  });
  return response.data;
}

export function getUnreadOrdersCount(orders) {
  if (!Array.isArray(orders) || orders.length === 0) return 0;

  const lastSeenStr = localStorage.getItem("seller_orders_last_seen");
  if (!lastSeenStr) {
    return orders.length;
  }

  const lastSeenTime = parseInt(lastSeenStr, 10);
  if (isNaN(lastSeenTime)) return 0;

  const unreadOrders = orders.filter((o) => {
    const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : 0;
    return orderTime > lastSeenTime;
  });

  return unreadOrders.length;
}

export function markOrdersAsSeen() {
  localStorage.setItem("seller_orders_last_seen", Date.now().toString());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("seller_orders_seen"));
  }
}
