import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { useCart } from "../hook/useCart";
import Nav from "../../../shared/Components/Nav";
import "../styles/Cart.css";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function getImageUrl(raw) {
  if (!raw) return "";
  const value = String(raw);
  const match = value.match(/\((https?:\/\/[^)]+)\)/);
  return match ? match[1] : value;
}

function formatPrice(price) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: price?.currency || "INR",
    maximumFractionDigits: 0,
  }).format(Number(price?.amount || 0));
}

function getAttributesObject(attrs) {
  if (!attrs) return {};
  if (attrs instanceof Map) return Object.fromEntries(attrs);
  if (Array.isArray(attrs)) {
    return attrs.reduce((acc, item) => {
      if (item && typeof item === "object" && item.key && item.value !== undefined) {
        acc[item.key] = item.value;
      }
      return acc;
    }, {});
  }
  if (typeof attrs === "object") return attrs;
  return {};
}

export const Cart = () => {
  const {
    items,
    filteredItems,
    loading,
    error,
    successMessage,
    searchQuery,
    totalPrice,
    handleGetCart,
    handleUpdateQuantity,
    handleRemoveFromCart,
    handleClearCart,
    handleSearchCart,
    resetMessages,
  } = useCart();

  const [localQuantities, setLocalQuantities] = useState({});

  useEffect(() => {
    handleGetCart();
  }, []);

  useEffect(() => {
    // Synchronize local quantities with cart items
    const quantities = {};
    items.forEach((item) => {
      quantities[item._id] = item.quantity;
    });
    setLocalQuantities(quantities);
  }, [items]);

  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        resetMessages();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const handleQuantityStep = (itemId, currentQuantity, delta) => {
    const next = currentQuantity + delta;
    if (next < 1) return;
    setLocalQuantities((prev) => ({
      ...prev,
      [itemId]: next,
    }));
    handleUpdateQuantity(itemId, next);
  };

  const handleQuantityInputChange = (itemId, val) => {
    setLocalQuantities((prev) => ({
      ...prev,
      [itemId]: val,
    }));
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1) {
      handleUpdateQuantity(itemId, num);
    }
  };

  const handleQuantityInputBlur = (itemId, fallbackQuantity) => {
    const currentVal = parseInt(localQuantities[itemId], 10);
    if (isNaN(currentVal) || currentVal < 1) {
      setLocalQuantities((prev) => ({
        ...prev,
        [itemId]: fallbackQuantity,
      }));
      handleUpdateQuantity(itemId, fallbackQuantity);
    }
  };

  const handleRemove = async (itemId) => {
    await handleRemoveFromCart(itemId);
  };

  const totalItemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  if (loading && filteredItems.length === 0) {
    return (
      <div className="cart-container">
        <div className="cart-loading">Loading your cart...</div>
      </div>
    );
  }

  return (
    
    <div className="cart-container">
      <Nav/>
      

      {/* Header */}
      <div className="cart-header">
        <div className="cart-header-title">
          <h1>Shopping Bag</h1>
          {items.length > 0 && (
            <span className="cart-count-badge">
              ({totalItemCount} {totalItemCount === 1 ? "item" : "items"})
            </span>
          )}
        </div>

        {filteredItems.length > 0 && (
          <button
            type="button"
            className="btn-clear-cart"
            onClick={handleClearCart}
            disabled={loading}
          >
            Clear bag
          </button>
        )}
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Cart Content */}
      {filteredItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛍️</div>
          <p>Your shopping bag is empty</p>
          <Link to="/" className="btn-continue-shopping">
            Explore Collection
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Main List */}
          <div className="cart-main">
            {/* Search */}
            <div className="cart-search">
              <span className="cart-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search items in your bag..."
                value={searchQuery}
                onChange={(e) => handleSearchCart(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Item List */}
            <div className="cart-items">
              {filteredItems.map((item) => {
                // Find matching variant
                const variantId =
                  typeof item.variant === "object"
                    ? (item.variant?._id || item.variant?.id)?.toString()
                    : item.variant?.toString();

                const matchedVariant = item.product?.variants?.find(
                  (v) => v._id?.toString() === variantId
                );

                // Prioritize variant image, then product main image
                const rawVariantImage =
                  matchedVariant?.images?.[0]?.url ||
                  (typeof matchedVariant?.images?.[0] === "string"
                    ? matchedVariant.images[0]
                    : null);

                const itemImageUrl = getImageUrl(
                  rawVariantImage || item.product?.images?.[0]
                );

                // Variant attributes
                const variantAttrs = matchedVariant?.attributes
                  ? getAttributesObject(matchedVariant.attributes)
                  : null;

                const currentQuantity = localQuantities[item._id] ?? item.quantity;
                const itemSubtotal = (item.price?.amount || 0) * currentQuantity;

                return (
                  <div key={item._id} className="cart-item">
                    {/* Image */}
                    <div className="item-image">
                      {itemImageUrl ? (
                        <img
                          src={itemImageUrl}
                          alt={item.product?.tittle || "Product item"}
                        />
                      ) : (
                        <div className="empty-item-image">No image</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="item-details">
                      <h3 className="item-title">{item.product?.tittle}</h3>
                      {variantAttrs && Object.keys(variantAttrs).length > 0 ? (
                        <div className="item-variant-pill">
                          {Object.entries(variantAttrs)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" • ")}
                        </div>
                      ) : (
                        <div className="item-variant-pill font-medium text-amber-800 bg-amber-50">
                          Main Product
                        </div>
                      )}
                      <p className="item-price">
                        {formatPrice(item.price)} each
                      </p>
                    </div>

                    {/* Controls & Subtotal & Remove */}
                    <div className="item-actions">
                      <div className="quantity-wrapper">
                        <div className="quantity-control">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityStep(item._id, item.quantity, -1)
                            }
                            disabled={item.quantity <= 1}
                            className="btn-qty"
                            title="Decrease quantity"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={currentQuantity}
                            onChange={(e) =>
                              handleQuantityInputChange(item._id, e.target.value)
                            }
                            onBlur={() =>
                              handleQuantityInputBlur(item._id, item.quantity)
                            }
                            className="qty-input"
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityStep(item._id, item.quantity, 1)
                            }
                            className="btn-qty"
                            title="Increase quantity"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="item-subtotal">
                        <span className="subtotal-label">Subtotal: </span>
                        <p className="subtotal">
                          {formatPrice({
                            amount: itemSubtotal,
                            currency: item.price?.currency || "INR",
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(item._id)}
                        disabled={loading}
                        className="btn-remove"
                        title="Remove from bag"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="cart-sidebar">
            <div className="summary-box">
              <h2 className="summary-title">Order Summary</h2>

              <div className="summary-row">
                <span>Subtotal</span>
                <span>
                  {formatPrice({ amount: totalPrice, currency: "INR" })}
                </span>
              </div>

              <div className="summary-row">
                <span>Estimated Shipping</span>
                <span className="free-shipping-tag">Calculated at checkout</span>
              </div>

              <div className="summary-row total">
                <span>Total</span>
                <span>
                  {formatPrice({ amount: totalPrice, currency: "INR" })}
                </span>
              </div>

              <button type="button" className="btn-checkout">
                Proceed to Checkout
              </button>

              <div className="security-note">
                <span>🔒</span>
                <span>Secure Checkout • Snitch Guarantee</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Cart;
