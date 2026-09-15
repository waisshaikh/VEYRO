import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    items: [],
    loading: false,
    error: null,
    successMessage: null,
    searchQuery: "",
    totalPrice: 0
  },
  reducers: {
    setCartItems: (state, action) => {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
      // Calculate total price
      state.totalPrice = state.items.reduce((total, item) => {
        return total + (item.price?.amount * item.quantity || 0);
      }, 0);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSuccessMessage: (state, action) => {
      state.successMessage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
      state.successMessage = null;
    },
    addItem: (state, action) => {
      const newItem = action.payload;
      const existingItem = state.items.find(
        item =>
          item.product?._id === newItem.product?._id &&
          item.variant?._id === newItem.variant?._id
      );

      if (existingItem) {
        existingItem.quantity += newItem.quantity;
      } else {
        state.items.push(newItem);
      }

      // Recalculate total
      state.totalPrice = state.items.reduce((total, item) => {
        return total + (item.price?.amount * item.quantity || 0);
      }, 0);
    },
    updateItemQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.items.find(i => i._id === itemId);
      if (item) {
        item.quantity = quantity;
      }
      // Recalculate total
      state.totalPrice = state.items.reduce((total, item) => {
        return total + (item.price?.amount * item.quantity || 0);
      }, 0);
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(item => item._id !== action.payload);
      // Recalculate total
      state.totalPrice = state.items.reduce((total, item) => {
        return total + (item.price?.amount * item.quantity || 0);
      }, 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalPrice = 0;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    }
  }
});

export const {
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
} = cartSlice.actions;

export default cartSlice.reducer;
