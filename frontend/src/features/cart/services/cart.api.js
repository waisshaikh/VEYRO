import axios from "axios";

const cartApiInstance = axios.create({
  baseURL: "/api/cart",
  withCredentials: true
});

export async function addToCart(productId, variantId, quantity = 1) {
  const endpoint = variantId && variantId !== "main"
    ? `/${productId}/${variantId}`
    : `/${productId}`;
  const response = await cartApiInstance.post(endpoint, {
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


export async function createCartOrder(){
  const  response = await cartApiInstance.post("/payment/create/order")
  return response.data

}