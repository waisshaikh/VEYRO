import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setCartItems,
  setLoading,
  setError,
  setSuccessMessage,
  clearError,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  setSearchQuery
} from "../state/cart.slice.js";

import {
  addToCart,
  getCart,
  updateCartItemQuantity,
  removeFromCart,
  createCartOrder,
  clearCart as clearCartApi
} from "../services/cart.api.js";


export const useCart = () => {
  const dispatch = useDispatch();
  const { items, loading, error, successMessage, searchQuery, totalPrice } =
    useSelector((state) => state.cart);

  // Add item to cart
  async function handleAddToCart(productId, variantId, quantity = 1) {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const data = await addToCart(productId, variantId, quantity);
      // Update cart with all items from response
      if (data.cart?.items) {
        dispatch(setCartItems(data.cart.items));
      }
      dispatch(setSuccessMessage("Item added to cart successfully!"));
      return { success: true, data };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to add item to cart";
      dispatch(setError(message));
      return { success: false, error: message };
    } finally {
      dispatch(setLoading(false));
    }
  }

  // Fetch cart
  async function handleGetCart() {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const data = await getCart();
      dispatch(setCartItems(data.items || []));
      return { success: true, data };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to fetch cart";
      dispatch(setError(message));
      return { success: false, error: message };
    } finally {
      dispatch(setLoading(false));
    }
  }

  // Update item quantity
  async function handleUpdateQuantity(cartItemId, quantity) {
    try {
      dispatch(clearError());
      // Optimistic update for instant price and total calculation
      dispatch(updateItemQuantity({ itemId: cartItemId, quantity }));

      if (quantity <= 0) {
        await removeFromCart(cartItemId);
        dispatch(removeItem(cartItemId));
      } else {
        const data = await updateCartItemQuantity(cartItemId, quantity);
        if (data?.items) {
          dispatch(setCartItems(data.items));
        }
      }

      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to update quantity";
      dispatch(setError(message));
      try {
        const data = await getCart();
        if (data?.items) {
          dispatch(setCartItems(data.items));
        }
      } catch (e) {
        // ignore
      }
      return { success: false, error: message };
    }
  }

  // Remove item from cart
  async function handleRemoveFromCart(cartItemId) {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      const data = await removeFromCart(cartItemId);
      if (data.items !== undefined) {
        dispatch(setCartItems(data.items));
      } else {
        dispatch(removeItem(cartItemId));
      }
      dispatch(setSuccessMessage("Item removed from cart!"));
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to remove item";
      dispatch(setError(message));
      return { success: false, error: message };
    } finally {
      dispatch(setLoading(false));
    }
  }

  // Clear entire cart
  async function handleClearCart() {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());
      await clearCartApi();
      dispatch(clearCart());
      dispatch(setSuccessMessage("Cart cleared successfully!"));
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to clear cart";
      dispatch(setError(message));
      return { success: false, error: message };
    } finally {
      dispatch(setLoading(false));
    }
  }

  async function handleCreateCardOrder( ) {
    const data = await createCartOrder()
    return data.order
    
  }

  // Search items in cart
  function handleSearchCart(query) {
    dispatch(setSearchQuery(query));
  }

  // Get filtered items based on search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const productName = item.product?.tittle?.toLowerCase() || "";
      return productName.includes(searchQuery.toLowerCase());
    });
  }, [items, searchQuery]);

  // Clear messages
  const resetMessages = () => {
    dispatch(clearError());
  };




  return {
    items,
    filteredItems,
    loading,
    error,
    successMessage,
    searchQuery,
    totalPrice,
    handleAddToCart,
    handleGetCart,
    handleUpdateQuantity,
    handleRemoveFromCart,
    handleClearCart,
    handleSearchCart,
    handleCreateCardOrder,
    resetMessages
  };
};
