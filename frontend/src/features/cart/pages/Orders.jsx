import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router";
import "../styles/Cart.css";
import { API_BASE_URL } from "../../../config/api";
import { useAuth } from "../../auth/hook/useAuth";

function getImageUrl(raw) {
  if (!raw) return "";
  const value = typeof raw === "object" ? raw.url || "" : String(raw);
  const match = value.match(/\((https?:\/\/[^)]+)\)/);
  return match ? match[1] : value;
}

function resolveItemImage(item) {
  if (item.images && item.images.length > 0) {
    const url = getImageUrl(item.images[0]);
    if (url) return url;
  }
  if (item.productId && typeof item.productId === "object") {
    if (Array.isArray(item.productId.images) && item.productId.images.length > 0) {
      const url = getImageUrl(item.productId.images[0]);
      if (url) return url;
    }
  }
  return "";
}

function formatPrice(amt, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(Number(amt || 0));
}

const Orders = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/payment`, {
          withCredentials: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setPayments(response.data.payments || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load your orders");
        setLoading(false);
      }
    };

    if (user || isAuthenticated) {
      fetchPayments();
    } else {
      setLoading(false);
    }
  }, [user, isAuthenticated, token]);

  if (!user && !isAuthenticated) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">🔒</div>
          <p>Please login to view your orders</p>
          <Link to="/login" className="btn-continue-shopping">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cart-container">
        <div className="cart-loading">
          <div className="spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-continue-shopping">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="cart-container">
        <div className="empty-cart">
          <div className="empty-cart-icon">📋</div>
          <p>Make your first order</p>
          <p className="empty-cart-subtext">Your orders will appear here</p>
          <Link to="/" className="btn-continue-shopping">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="orders-header">
        <h1>My Orders</h1>
        <p className="orders-count">{payments.length} {payments.length === 1 ? "order" : "orders"} placed</p>
      </div>

      <div className="orders-list">
        {payments.map((payment) => {
          const items = payment.orderitems || [];
          const shipping = payment.shippingAddress;

          return (
            <div key={payment._id} className="order-card border border-stone-200 bg-white rounded-xl p-5 shadow-2xs">
              {/* Card Header */}
              <div className="order-card-header pb-3 mb-3 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400 block">
                    Order Reference
                  </span>
                  <span className="text-xs font-semibold text-stone-900 tracking-tight font-mono">
                    {payment.razorpay?.orderId || payment._id}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <span className="text-stone-500 font-medium">
                    {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className={`font-semibold uppercase tracking-wider text-xs ${
                    payment.status === "paid" ? "text-emerald-700" : "text-amber-700"
                  }`}>
                    ● {payment.status === "paid" ? "Paid" : payment.status}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="order-card-body divide-y divide-stone-100">
                {items.map((item, idx) => {
                  const imgUrl = resolveItemImage(item);
                  const title = item.tittle || item.productId?.tittle || "Garment Product";
                  const qty = item.quantity || 1;
                  const priceAmount = item.price?.amount || 0;
                  const currency = item.price?.currency || "INR";
                  const status = item.orderStatus || "Confirmed";

                  return (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4 first:pt-1 last:pb-1">
                      {/* Left: Product Image & Metadata */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-14 h-18 rounded-md bg-stone-100 border border-stone-200 shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                          {imgUrl ? (
                            <img src={imgUrl} alt={title} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[9px] text-stone-400 uppercase font-medium">No Img</span>
                          )}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-stone-900 truncate">{title}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                            <span>Qty: <strong className="text-stone-800">{qty}</strong></span>
                            <span>Unit: <strong className="text-stone-800">{formatPrice(priceAmount, currency)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Dispatch Status & Subtotal */}
                      <div className="text-right shrink-0 space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block">
                          {status}
                        </span>
                        <span className="text-xs font-bold text-stone-900 block">
                          {formatPrice(priceAmount * qty, currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Delivery Address Snippet */}
                {shipping && (
                  <div className="pt-3 text-xs text-stone-600 font-normal">
                    <span className="font-semibold text-stone-800">Deliver to: </span>
                    <span>
                      {shipping.fullName} ({shipping.phone}) • {shipping.street}, {shipping.city}, {shipping.state} - {shipping.pincode}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer: Total Paid */}
              <div className="order-card-footer pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">
                  Payment ID: <strong className="text-stone-700 font-mono">{payment.razorpay?.paymentId || "N/A"}</strong>
                </span>
                <div className="text-right">
                  <span className="text-stone-500 mr-2">Total Amount:</span>
                  <span className="text-sm font-bold text-stone-900">
                    {formatPrice(payment.price?.amount, payment.price?.currency || "INR")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;
