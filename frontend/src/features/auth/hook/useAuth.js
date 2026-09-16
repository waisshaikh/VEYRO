import { setUser, setLoading, setError, setSuccessMessage, clearError } from "../state/auth.slice.js";
import { register, login, getMe, logout } from "../services/auth.api.js";
import { useDispatch, useSelector } from "react-redux";

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error, successMessage } = useSelector((state) => state.auth);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  async function handleRegister({ email, contact, password, fullname, isSeller = false }) {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const data = await register({ email, contact, password, fullname, isSeller });
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      dispatch(setUser(data.user));
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Registration failed. Please try again.";
      dispatch(setError(message));
      return { success: false, error: message };
    } finally {
      dispatch(setLoading(false));
    }
  }

  const resetMessages = () => {
    dispatch(clearError());
  };

  async function handleLogin({ email, password }) {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const data = await login({ email, password });
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      dispatch(setUser(data.user));
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Login failed. Please try again.";
      dispatch(setError(message));
      return { success: false, error: message };
    } finally {
      dispatch(setLoading(false));
    }
  }

  async function handleGetMe() {
    try {
      dispatch(setLoading(true));
      const data = await getMe();
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      dispatch(setUser(data.user));
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
      }
      dispatch(setUser(null));
    } finally {
      dispatch(setLoading(false));
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("token");
      dispatch(setUser(null));
    }
  }

  return {
    user,
    token,
    isAuthenticated: Boolean(user || token),
    loading,
    error,
    successMessage,
    handleRegister,
    handleLogin,
    handleLogout,
    resetMessages,
    handleGetMe
  };
};


