import axios from "axios";
import { API_BASE_URL } from "../../../config/api.js";

const authApiInstance = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
})


export async function register({ email, contact, password, fullname, isSeller }) {
  const response = await authApiInstance.post("/register", {
    contact,
    email,
    password,
    fullname,
    isSeller,
  });
  return response.data;
}

export async function login({ email, password }) {
  const response = await authApiInstance.post("/login", {
    email,
    password,
  });
  return response.data;
}


export async function getMe() {
  const response = await authApiInstance.get("/me", {
    
  });
  return response.data;
}

export async function logout() {
  const response = await authApiInstance.post("/logout");
  return response.data;
}

