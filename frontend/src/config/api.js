// API base URL configuration
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '/api';

export const api = {
  auth: `${API_BASE_URL}/auth`,
  products: `${API_BASE_URL}/products`,
  cart: `${API_BASE_URL}/cart`,
  payment: `${API_BASE_URL}/payment`,
};