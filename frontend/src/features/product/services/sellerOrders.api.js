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
