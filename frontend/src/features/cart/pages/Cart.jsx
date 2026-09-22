import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useCart } from "../hook/useCart";
import "../styles/Cart.css";
import { useRazorpay } from "react-razorpay";
import { useSelector } from "react-redux";
import { API_BASE_URL } from "../../../config/api";


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

/**
 * Resolves the current live price amount for a cart item.
 * Uses the variant price if a matching variant exists, otherwise
 * falls back to the base product price.
 */
function getCurrentLivePrice(item, matchedVariant) {
  if (matchedVariant?.price?.amount != null) {
    return matchedVariant.price.amount;
  }
  return item.product?.price?.amount ?? null;
}

/**
 * Returns the price change banner element for a cart item,
 * or null if the price hasn't changed.
 */
function PriceChangeBanner({ snapshotAmount, currentAmount, currency }) {
  if (currentAmount == null || snapshotAmount == null) return null;

  const diff = Math.round(currentAmount - snapshotAmount);
  if (diff === 0) return null;

  const fmt = (amt) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amt);

  if (diff > 0) {
    // Price increased
    return (
      <div className="price-alert price-increased" role="alert">
        <span className="price-alert-icon">📈</span>
        <span className="price-alert-text">
          Price increased by <strong>{fmt(diff)}</strong>. Current price is{" "}
          <strong>{fmt(currentAmount)}</strong> — you'll be charged at the
          updated price.
        </span>
      </div>
    );
  }

  // Price decreased
  const saved = Math.abs(diff);
  return (
    <div className="price-alert price-decreased" role="alert">
      <span className="price-alert-icon">🎉</span>
      <span className="price-alert-text">
        Great news! You'll save <strong>{fmt(saved)}</strong> on this purchase.
        Current price is <strong>{fmt(currentAmount)}</strong>.
      </span>
    </div>
  );
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
    handleCreateCardOrder,
    resetMessages,
  } = useCart();
   

  const user = useSelector(state=>state.user)
  const navigate = useNavigate();

 const {isLoading, Razorpay } = useRazorpay();

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
  

async function handleCheckOut(){
  const order = await handleCreateCardOrder()
  console.log("Razorpay order:", order);

  // STEP 1: Create pending payment in database
  let pendingPayment;
  try {
    const pendingResponse = await fetch(`${API_BASE_URL}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      })
    });

    pendingPayment = await pendingResponse.json();
    if (!pendingPayment.success) {
      alert("Error creating payment: " + pendingPayment.message);
      return;
    }
    console.log("Pending payment created:", pendingPayment.paymentId);
  } catch (err) {
    console.error("Error creating pending payment:", err);
    alert("Error creating payment. Please try again.");
    return;
  }

  //  Open Razorpay popup
  
  const options = {
      key: "rzp_test_TeZEEYeRAWLZGl",
      amount: order.amount,
      currency: order.currency,
      name: "Veyro",
      description: "Test Transaction",
      order_id: order.id,
      
      handler: async function(response) {
        console.log("Payment success:", response);
        await updatePaymentStatus(order.id, response, "paid");
      },

      modal: {
        ondismiss: async function() {
          console.log("Payment cancelled by user");
          await updatePaymentStatus(order.id, {}, "failed");
        }
      },

      prefill: {
        name: user?.fullname,
        email: user?.email,
        contact: user?.contact,
      },
      
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
      },

      theme: {
        color: "#00C6FF",
      },
    };

    const razorpayInstance = new Razorpay(options);
    razorpayInstance.open();
  }

  // Helper function to update payment status
  async function updatePaymentStatus(orderId, response, status) {
    try {
      const backendResponse = await fetch(`${API_BASE_URL}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: orderId,
          razorpay_signature: response.razorpay_signature,
          status: status
        })
      });

      const data = await backendResponse.json();
      console.log("Payment updated:", data);

      if (data.success) {
        if (status === "paid") {
          // Navigate to order success page with order_id
          navigate('/order-success', { state: { orderId: orderId } });
        } else {
          alert("Payment was not completed. You can try again.");
        }
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      console.error("Error updating payment:", err);
      alert("Error processing payment. Please contact support.");
    }
  }

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

  /**
   * liveTotalPrice — recalculates the order total using current live prices
   * from the populated product/variant data returned by the backend.
   * Falls back to the snapshot price if live price is unavailable.
   */
  const liveTotalPrice = useMemo(() => {
    return items.reduce((total, item) => {
      const vid =
        typeof item.variant === "object"
          ? (item.variant?._id || item.variant?.id)?.toString()
          : item.variant?.toString();
      const variantsArray = Array.isArray(item.product?.variants) ? item.product.variants : [];
      const mv = variantsArray.find(
        (v) => v._id?.toString() === vid
      );
      const live = getCurrentLivePrice(item, mv);
      const effectivePrice = live ?? item.price?.amount ?? 0;
      return total + effectivePrice * (item.quantity || 1);
    }, 0);
  }, [items]);

  // Snapshot total (what was stored when items were added)
  const snapshotTotalPrice = items.reduce(
    (total, item) => total + (item.price?.amount ?? 0) * (item.quantity || 1),
    0
  );
  const totalSavings = Math.round(snapshotTotalPrice - liveTotalPrice);

  if (loading && filteredItems.length === 0) {
    return (
      <div className="cart-container">
        <div className="cart-loading">Loading your cart...</div>
      </div>
    );
  }

  return (
    
    <div className="cart-container">
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

                const variantsArray = Array.isArray(item.product?.variants) ? item.product.variants : [];
                const matchedVariant = variantsArray.find(
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

                // Price change detection: compare snapshot price vs current live price
                const livePrice = getCurrentLivePrice(item, matchedVariant);
                const snapshotPrice = item.price?.amount ?? null;

                // Use live price for the per-item subtotal display
                const effectiveUnitPrice = livePrice ?? item.price?.amount ?? 0;
                const itemSubtotal = effectiveUnitPrice * currentQuantity;

                // Snapshot subtotal (old price × qty) for the card breakdown
                const snapshotUnitPrice = item.price?.amount ?? 0;
                const snapshotSubtotal = snapshotUnitPrice * currentQuantity;
                const itemDelta = Math.round(itemSubtotal - snapshotSubtotal);
                const priceChanged = snapshotPrice != null && livePrice != null && itemDelta !== 0;
                const currency = item.price?.currency || "INR";

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
                        {/* Always show live price as primary */}
                        <span className="item-price-current">
                          {formatPrice({
                            amount: effectiveUnitPrice,
                            currency: item.price?.currency || "INR",
                          })}{" "}
                          each
                        </span>
                        {/* Strike through old snapshot price if it changed */}
                        {snapshotPrice != null &&
                          livePrice != null &&
                          Math.round(livePrice) !== Math.round(snapshotPrice) && (
                            <span className="item-price-snapshot">
                              {formatPrice(item.price)}
                            </span>
                          )}
                      </p>

                      {/* Price change alert banner */}
                      <PriceChangeBanner
                        snapshotAmount={snapshotPrice}
                        currentAmount={livePrice}
                        currency={item.price?.currency || "INR"}
                      />
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

                        {priceChanged ? (
                          // Price changed — show full breakdown
                          <div className="subtotal-breakdown">
                            {/* Old subtotal, struckthrough */}
                            <p className="subtotal-old">
                              {formatPrice({ amount: snapshotSubtotal, currency })}
                            </p>
                            {/* Delta: green discount or red surcharge */}
                            <p className={itemDelta < 0 ? "subtotal-delta discount" : "subtotal-delta surcharge"}>
                              {itemDelta < 0
                                ? `− ${formatPrice({ amount: Math.abs(itemDelta), currency })}`
                                : `+ ${formatPrice({ amount: itemDelta, currency })}`}
                            </p>
                            {/* Final live subtotal */}
                            <p className="subtotal subtotal-final">
                              {formatPrice({ amount: itemSubtotal, currency })}
                            </p>
                          </div>
                        ) : (
                          // Price unchanged — normal single subtotal
                          <p className="subtotal">
                            {formatPrice({ amount: itemSubtotal, currency })}
                          </p>
                        )}
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

              {/* Subtotal = original snapshot prices (what was stored when items were added) */}
              <div className="summary-row">
                <span>Subtotal</span>
                <span>
                  {formatPrice({ amount: snapshotTotalPrice, currency: "INR" })}
                </span>
              </div>

              {/* Price dropped: show savings (snapshot - live = positive) */}
              {totalSavings > 0 && (
                <div className="summary-row summary-savings">
                  <span>Price drop savings</span>
                  <span className="savings-amount">
                    − {formatPrice({ amount: totalSavings, currency: "INR" })}
                  </span>
                </div>
              )}

              {/* Price increased: show adjustment (snapshot - live = negative) */}
              {totalSavings < 0 && (
                <div className="summary-row summary-increase">
                  <span>Price adjustments</span>
                  <span className="increase-amount">
                    + {formatPrice({ amount: Math.abs(totalSavings), currency: "INR" })}
                  </span>
                </div>
              )}

              <div className="summary-row">
                <span>Estimated Shipping</span>
                <span className="free-shipping-tag">Calculated at checkout</span>
              </div>

              {/* Total = live price (what the customer actually pays) */}
              <div className="summary-row total">
                <span>Total</span>
                <span>
                  {formatPrice({ amount: liveTotalPrice, currency: "INR" })}
                </span>
              </div>

              <button type="button" className="btn-checkout" onClick={handleCheckOut}>
                Proceed to Checkout
              </button>


              

              <div className="security-note">
                <span>🔒</span>
                <span>Secure Checkout • Veyro Guarantee</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Cart;
