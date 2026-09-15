import axios from "axios";

const cartApiInstance = axios.create({
  baseURL: "/api/cart",
  withCredentials: true
});

export async function addToCart(productId, variantId, quantity = 1) {
  const response = await cartApiInstance.post(`/${productId}/${variantId}`, {
    quantity
  });
  return response.data;
}

export async function getCart() {
  const response = await cartApiInstance.get("/");
  return response.data;
}

export async function updateCartItemQuantity(cartItemId, quantity) {
  const response = await cartApiInstance.patch(`/${cartItemId}`, {
    quantity
  });
  return response.data;
}

export async function removeFromCart(cartItemId) {
  const response = await cartApiInstance.delete(`/${cartItemId}`);
  return response.data;
}

export async function clearCart() {
  const response = await cartApiInstance.delete("/");
  return response.data;
}
