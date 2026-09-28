import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { getSellerOrdersApi, updateSellerOrderStatusApi, markOrdersAsSeen } from "../services/sellerOrders.api";

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updatingId, setUpdatingId] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await getSellerOrdersApi();
      if (response?.success) {
        setOrders(response.orders || []);
        markOrdersAsSeen();
      } else {
        setError(response?.message || "Failed to load seller orders.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load seller orders."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (paymentId, productId, newStatus) => {
    try {
      setUpdatingId(`${paymentId}-${productId}`);
      const res = await updateSellerOrderStatusApi(paymentId, productId, newStatus);
      if (res.success) {
        setSuccessToast(`Order status updated to "${newStatus}"`);
        setTimeout(() => setSuccessToast(""), 4000);
        // Update local state
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.paymentId === paymentId && ord.item?.productId === productId) {
              return { ...ord, orderStatus: newStatus };
            }
            return ord;
          })
        );
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingId("");
    }
  };

  const getImageUrl = (raw) => {
    if (!raw) return "";
    const str = String(raw);
    const match = str.match(/\((https?:\/\/[^)]+)\)/);
    return match ? match[1] : str;
  };

  const formatPrice = (priceObj) => {
    if (!priceObj) return "₹0";
    const amt = typeof priceObj === "number" ? priceObj : priceObj.amount || 0;
    const curr = priceObj.currency || "INR";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0,
    }).format(amt);
  };

  // Filtered orders
  const filteredOrders = orders.filter((ord) => {
    if (filterStatus === "ALL") return true;
    return ord.orderStatus?.toUpperCase() === filterStatus.toUpperCase();
  });

  const totalRevenue = orders.reduce((sum, ord) => {
    const qty = ord.item?.quantity || 1;
    const amt = ord.item?.price?.amount || 0;
    return sum + amt * qty;
  }, 0);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/95 px-6 py-4 shadow-xs backdrop-blur-md sm:px-10">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/seller/dashboard"
              className="text-xs font-bold text-slate-600 transition hover:text-teal-700 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/seller/create-product"
              className="rounded-full bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
            >
              + Add Product
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-8">
        
        {/* Title & Stat Cards */}
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Seller Order Studio
              </span>
              <span className="rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold px-2.5 py-0.5">
                Owner Verified
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Customer Orders & Dispatch
            </h1>
            <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-500">
              Manage order status (Confirmed, Shipped, Delivered) for garments purchased from your catalog.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Received Orders
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {orders.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Order Value
              </p>
              <p className="mt-1 text-2xl font-black text-teal-700">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Status Toast */}
        {successToast && (
          <div className="mb-4 rounded-xl bg-teal-600 text-white px-4 py-3 text-xs font-bold shadow-md flex items-center justify-between animate-in fade-in">
            <span>✓ {successToast}</span>
            <button onClick={() => setSuccessToast("")} className="text-white hover:text-teal-200">✕</button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
          {["ALL", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((status) => {
            const count = status === "ALL"
              ? orders.length
              : orders.filter((o) => o.orderStatus?.toUpperCase() === status).length;

            const isSelected = filterStatus === status;

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {status} <span className={`ml-1 text-[10px] rounded-full px-1.5 py-0.2 ${isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Main Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl border border-slate-200 bg-white p-5 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center max-w-lg mx-auto my-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
              📦
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No {filterStatus !== "ALL" ? filterStatus.toLowerCase() : ""} orders found
            </h3>
            <p className="text-xs text-slate-500">
              {filterStatus !== "ALL"
                ? `You have no orders currently marked as "${filterStatus}".`
                : "When customers purchase your garments, orders will appear here automatically."}
            </p>
            {filterStatus !== "ALL" && (
              <button
                onClick={() => setFilterStatus("ALL")}
                className="mt-2 text-xs font-bold text-teal-700 hover:underline"
              >
                View All Orders
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((ord, idx) => {
              const imgUrl = getImageUrl(ord.item?.image);
              const qty = ord.item?.quantity || 1;
              const unitPrice = ord.item?.price?.amount || 0;
              const subtotal = unitPrice * qty;
              const isUpdating = updatingId === `${ord.paymentId}-${ord.item?.productId}`;

              const shippingAddr = ord.shippingAddress;
              const customerName = shippingAddr?.fullName || ord.buyer?.name || "Customer";
              const customerPhone = shippingAddr?.phone || ord.buyer?.phone || "N/A";
              const fullAddressString = shippingAddr
                ? `${customerName}\nPhone: ${customerPhone}\nAddress: ${shippingAddr.street}, ${shippingAddr.city}, ${shippingAddr.state} - ${shippingAddr.pincode}`
                : `${customerName}\nPhone: ${customerPhone}`;

              const copyToClipboard = (text, label) => {
                navigator.clipboard.writeText(text);
                setSuccessToast(`Copied ${label} to clipboard!`);
                setTimeout(() => setSuccessToast(""), 3000);
              };

              return (
                <div
                  key={`${ord.paymentId}-${ord.item?.productId}-${idx}`}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col gap-4"
                >
                  {/* Top Header Row: Product Info + Status Selector */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-4">
                    {/* Left: Product Info */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Image */}
                      <div className="w-20 h-24 rounded-xl overflow-hidden bg-stone-100 border border-slate-200 shrink-0 flex items-center justify-center p-1">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={ord.item?.tittle || "Product preview"}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium uppercase">No Img</span>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {ord.orderStatus === "Confirmed" && (
                            <span className="text-[10px] uppercase font-black tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                              🔔 NEW ORDER
                            </span>
                          )}
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                            ord.paymentStatus === "paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            Payment: {ord.paymentStatus === "paid" ? "✓ Paid" : "Pending"}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {ord.item?.tittle || "Untitled Product"}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Quantity: <strong className="text-slate-800">{qty}</strong></span>
                          <span>Unit Price: <strong className="text-slate-800">{formatPrice(ord.item?.price)}</strong></span>
                          <span>Subtotal: <strong className="text-slate-900 font-bold">{formatPrice({ amount: subtotal, currency: ord.item?.price?.currency || "INR" })}</strong></span>
                        </div>

                        <div className="pt-0.5 text-[11px] text-slate-400">
                          Order Date: <strong className="text-slate-600">{new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Right: Dispatch Status Selector */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Dispatch Status
                        </span>
                        
                        <div className="relative">
                          <select
                            value={ord.orderStatus || "Confirmed"}
                            disabled={isUpdating}
                            onChange={(e) => handleStatusChange(ord.paymentId, ord.item?.productId, e.target.value)}
                            className={`appearance-none font-bold text-xs rounded-xl px-3.5 py-2.5 pr-8 border shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                              ord.orderStatus === "Delivered"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500"
                                : ord.orderStatus === "Shipped"
                                ? "bg-blue-50 text-blue-800 border-blue-300 focus:ring-blue-500"
                                : ord.orderStatus === "Cancelled"
                                ? "bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-500"
                                : "bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-500"
                            }`}
                          >
                            <option value="Confirmed">✓ Confirmed</option>
                            <option value="Shipped">🚚 Shipped</option>
                            <option value="Delivered">🎉 Delivered</option>
                            <option value="Cancelled">❌ Cancelled</option>
                          </select>
                          <svg className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {isUpdating && (
                        <span className="text-xs text-teal-600 font-semibold animate-pulse">
                          Updating...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Customer Details & Shipping Address Card */}
                  <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
                      {/* Recipient & Contact */}
                      <div className="space-y-1 min-w-[200px]">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span>👤 Customer:</span>
                          <span>{customerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span>📞 Phone:</span>
                          {customerPhone !== "N/A" ? (
                            <a
                              href={`tel:${customerPhone}`}
                              className="font-bold text-teal-700 hover:underline"
                            >
                              {customerPhone}
                            </a>
                          ) : (
                            <span className="text-slate-400">Not provided</span>
                          )}
                          {customerPhone !== "N/A" && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(customerPhone, "phone number")}
                              className="ml-1 text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100 font-semibold cursor-pointer text-slate-600"
                              title="Copy Phone Number"
                            >
                              📋 Copy
                            </button>
                          )}
                        </div>
                        {ord.buyer?.email && (
                          <div className="text-[11px] text-slate-400">
                            ✉️ {ord.buyer.email}
                          </div>
                        )}
                      </div>

                      {/* Delivery Address */}
                      <div className="space-y-1 flex-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <span>📍 Shipping Address:</span>
                        </div>
                        {shippingAddr ? (
                          <div className="text-slate-700 space-y-0.5">
                            <p className="font-medium text-slate-800">{shippingAddr.street}</p>
                            <p>{shippingAddr.city}, {shippingAddr.state} - <strong className="text-slate-900">{shippingAddr.pincode}</strong></p>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">No specific address provided.</p>
                        )}
                      </div>
                    </div>

                    {/* Copy Address Action Button */}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(fullAddressString, "shipping details")}
                      className="self-start md:self-center shrink-0 rounded-xl bg-white border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:border-slate-400 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy Full Address
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>
    </main>
  );
}
