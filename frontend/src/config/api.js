// API base URL configuration
function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (!envUrl) return '/api';
  
  const cleanUrl = envUrl.trim().replace(/\/+$/, "");
  return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
}

export const API_BASE_URL = getApiBaseUrl();

export const api = {
  auth: `${API_BASE_URL}/auth`,
  products: `${API_BASE_URL}/products`,
  cart: `${API_BASE_URL}/cart`,
  payment: `${API_BASE_URL}/payment`,
};