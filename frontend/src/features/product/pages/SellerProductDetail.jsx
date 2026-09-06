import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link } from "react-router";
import { useProduct } from "../hook/useProduct";

const CURRENCIES = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
];

const PRESET_ATTRIBUTES = [
  { key: "Size", presets: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
  { key: "Color", presets: ["Onyx Black", "Ivory White", "Champagne Gold", "Midnight Navy", "Burgundy", "Emerald", "Charcoal"] },
  { key: "Fit", presets: ["Tailored", "Slim", "Relaxed", "Oversized", "Bespoke"] },
  { key: "Material", presets: ["100% Raw Silk", "Merino Wool", "Egyptian Cotton", "Linen Blend", "Cashmere"] },
];

const SellerProductDetail = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Hook actions
  const {
    handleGetProductByid,
    handleAddVariant,
    handleUpdateVariantStock,
    handleUpdateVariant,
    handleDeleteVariant,
  } = useProduct();

  // Local state for stock inline edits: { [variantId]: number }
  const [stockDrafts, setStockDrafts] = useState({});
  const [updatingStockId, setUpdatingStockId] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK

  

  // Feedback notifications
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // ── Fetch Product ──────────────────────────────────────────────────────────
  async function fetchProductsDetails() {
    try {
      setLoading(true);
      const data = await handleGetProductByid(productId);
      const productData = data?.product || data;
      setProduct(productData);

      // Initialize stock drafts for inline edits
      if (productData?.variants && Array.isArray(productData.variants)) {
        const drafts = {};
        productData.variants.forEach((v) => {
          drafts[v._id] = v.stock;
        });
        setStockDrafts(drafts);
      }
    } catch (error) {
      console.log("failed to fetch product details", error);
      showToast("Failed to load product details", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProductsDetails();
  }, [productId]);

  console.log(product);

  // ── Stats Calculations ────────────────────────────────────────────────────
  const variants = useMemo(() => {
    if (!product?.variants || !Array.isArray(product.variants)) return [];
    return product.variants;
  }, [product]);

  const totalStockUnits = useMemo(() => {
    return variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
  }, [variants]);

  const inStockCount = useMemo(() => {
    return variants.filter((v) => Number(v.stock) > 0).length;
  }, [variants]);

  const lowStockCount = useMemo(() => {
    return variants.filter((v) => Number(v.stock) > 0 && Number(v.stock) <= 10).length;
  }, [variants]);

  const outOfStockCount = useMemo(() => {
    return variants.filter((v) => Number(v.stock) === 0).length;
  }, [variants]);

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      // Stock level filter
      if (stockFilter === "IN_STOCK" && (Number(v.stock) || 0) <= 0) return false;
      if (stockFilter === "LOW_STOCK" && ((Number(v.stock) || 0) === 0 || (Number(v.stock) || 0) > 10)) return false;
      if (stockFilter === "OUT_OF_STOCK" && (Number(v.stock) || 0) > 0) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();

      // Check variant ID
      if (v._id?.toLowerCase().includes(q)) return true;

      // Check attributes
      if (v.attributes) {
        const attrObj = v.attributes instanceof Map ? Object.fromEntries(v.attributes) : v.attributes;
        for (const [k, val] of Object.entries(attrObj)) {
          if (String(k).toLowerCase().includes(q) || String(val).toLowerCase().includes(q)) {
            return true;
          }
        }
      }

      // Check price
      if (String(v.price?.amount).includes(q)) return true;

      return false;
    });
  }, [variants, stockFilter, searchQuery]);

  // ── Inline Stock Update Handlers ──────────────────────────────────────────
  const handleStockDraftChange = (variantId, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setStockDrafts((prev) => ({ ...prev, [variantId]: num }));
  };

  const handleStockIncrement = (variantId, delta) => {
    const current = stockDrafts[variantId] !== undefined ? stockDrafts[variantId] : 0;
    const updated = Math.max(0, current + delta);
    setStockDrafts((prev) => ({ ...prev, [variantId]: updated }));
  };

  const handleSaveStock = async (variantId) => {
    const targetStock = stockDrafts[variantId];
    if (targetStock === undefined) return;

    try {
      setUpdatingStockId(variantId);
      if (handleUpdateVariantStock) {
        await handleUpdateVariantStock(productId, variantId, targetStock);
      }

      // Update local product state seamlessly
      setProduct((prev) => {
        if (!prev) return prev;
        const updatedVariants = prev.variants.map((v) =>
          v._id === variantId ? { ...v, stock: targetStock } : v
        );
        return { ...prev, variants: updatedVariants };
      });

      showToast(`Stock updated to ${targetStock} units`);
    } catch (error) {
      console.error("Failed to update stock", error);
      showToast(error?.response?.data?.message || "Failed to update stock", "error");
    } finally {
      setUpdatingStockId(null);
    }
  };

  // ── Delete Variant Handler ────────────────────────────────────────────────
  const handleDeleteConfirm = async (variantId) => {
    try {
      if (handleDeleteVariant) {
        await handleDeleteVariant(productId, variantId);
      }

      setProduct((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          variants: prev.variants.filter((v) => v._id !== variantId),
        };
      });

      setDeleteConfirmId(null);
      showToast("Variant removed from inventory");
    } catch (error) {
      console.error("Failed to delete variant", error);
      showToast(error?.response?.data?.message || "Failed to delete variant", "error");
    }
  };

  // ── Helper: Format Currency ───────────────────────────────────────────────
  const formatPrice = (priceObj) => {
    if (!priceObj) return "—";
    const symbol = CURRENCIES.find((c) => c.code === priceObj.currency)?.symbol || priceObj.currency || "₹";
    return `${symbol} ${Number(priceObj.amount || 0).toLocaleString("en-IN")}`;
  };

  // Helper: Attributes map to object
  const getAttributesObject = (attrs) => {
    if (!attrs) return {};
    if (attrs instanceof Map) return Object.fromEntries(attrs);
    if (typeof attrs === "object") return attrs;
    return {};
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200 px-6 sm:px-12 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/seller/dashboard"
              className="flex items-center gap-2.5 text-xs uppercase tracking-widest text-slate-600 hover:text-teal-700 transition-all group font-semibold"
            >
              <svg
                className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>

            <span className="hidden sm:inline-block w-px h-4 bg-slate-200" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full bg-teal-50">
                Seller Atelier
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {product?._id && (
              <Link
                to={`/product/${product._id}`}
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-600 hover:text-slate-900 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors bg-white shadow-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Live View</span>
              </Link>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] bg-teal-600 text-white hover:bg-teal-700 px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Variant</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-lg border text-xs font-medium tracking-wide shadow-xl backdrop-blur-xl ${
              toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-white border-slate-200 text-slate-900 shadow-lg"
            }`}
          >
            {toast.type === "error" ? (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-teal-600 shadow-[0_0_8px_rgba(13,148,136,0.6)]" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12 space-y-12">
        {loading ? (
          /* Loading State Skeleton */
          <div className="space-y-8 animate-pulse">
            <div className="h-96 rounded-2xl bg-white border border-slate-200 shadow-sm" />
            <div className="h-64 rounded-2xl bg-white border border-slate-200 shadow-sm" />
          </div>
        ) : !product ? (
          /* Product Not Found */
          <div className="py-24 text-center rounded-2xl border border-slate-200 bg-white p-8 max-w-xl mx-auto space-y-4 shadow-sm">
            <h2 className="text-2xl font-serif text-slate-900 font-semibold">Product Not Found</h2>
            <p className="text-sm text-slate-500">
              The requested garment could not be retrieved from the atelier records.
            </p>
            <Link
              to="/seller/dashboard"
              className="inline-block mt-4 text-xs font-bold uppercase tracking-widest text-white bg-teal-600 hover:bg-teal-700 px-6 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* ── Section 1: Hero Product Overview Card ───────────────────── */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
              {/* Subtle background ambient teal bloom */}
              <div className="absolute -top-32 -right-32 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
                {/* Left: Interactive Media Gallery (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group shadow-inner">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[activeImageIndex] || product.images[0]}
                        alt={product.tittle || "Product image"}
                        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <svg className="w-12 h-12 mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">No Media Available</span>
                      </div>
                    )}

                    {/* Image Counter Badge */}
                    {product.images?.length > 0 && (
                      <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded text-[10px] uppercase tracking-wider text-white">
                        {activeImageIndex + 1} / {product.images.length} Photos
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Row */}
                  {product.images && product.images.length > 1 && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
                      {product.images.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                            activeImageIndex === idx
                              ? "border-teal-600 ring-2 ring-teal-600/30 scale-95 shadow-sm"
                              : "border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300"
                          }`}
                        >
                          <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Product Narrative & Master Metrics (7 cols) */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
                  <div className="space-y-4">
                    {/* Header Chips */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono text-[11px] text-slate-400 tracking-widest">
                        ID: #{product._id?.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] uppercase tracking-widest text-teal-700 font-semibold">
                        Master Product Record
                      </span>
                    </div>

                    {/* Main Title */}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-slate-950 leading-tight font-medium">
                      {product.tittle || "Untitled Garment"}
                    </h1>

                    {/* Master Base Price */}
                    <div className="flex items-baseline gap-3 pt-1">
                      <span className="text-2xl sm:text-3xl font-serif text-teal-700 font-bold">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">
                        Base Listing Price
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 leading-relaxed pt-2 max-w-2xl whitespace-pre-line">
                      {product.description || "No editorial description specified for this collection item."}
                    </p>
                  </div>

                  {/* High-Level Inventory Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1">
                        Total Variants
                      </span>
                      <span className="text-xl font-serif text-slate-900 font-medium">
                        {variants.length}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1">
                        Total Stock
                      </span>
                      <span className="text-xl font-serif text-teal-700 font-medium">
                        {totalStockUnits} <span className="text-xs font-sans font-normal text-slate-400">units</span>
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1">
                        Active Lines
                      </span>
                      <span className="text-xl font-serif text-emerald-600 font-medium">
                        {inStockCount}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1">
                        Depleted Lines
                      </span>
                      <span className={`text-xl font-serif font-medium ${outOfStockCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {outOfStockCount}
                      </span>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest bg-teal-600 text-white hover:bg-teal-700 px-7 py-3.5 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create New Variant</span>
                    </button>

                    <button
                      onClick={fetchProductsDetails}
                      title="Sync data with server"
                      className="inline-flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-5 py-3.5 rounded-lg shadow-xs transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Section 2: Variant Catalog & Stock Management ────────────── */}
            <section className="space-y-6">
              {/* Header with Search and Stock Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-2xl font-serif text-slate-950 font-medium tracking-tight">
                    Product Variants & Inventory
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Adjust real-time stock levels, pricing, and custom specifications across all SKUs.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative min-w-[220px]">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search attributes, size, color..."
                      className="w-full bg-white border border-slate-200 focus:border-teal-600 text-xs text-slate-900 placeholder-slate-400 pl-9 pr-3 py-2 rounded-lg focus:outline-none transition-colors shadow-xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Stock Filter Pills */}
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                    <button
                      onClick={() => setStockFilter("ALL")}
                      className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                        stockFilter === "ALL"
                          ? "bg-white text-slate-900 font-bold shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All ({variants.length})
                    </button>
                    <button
                      onClick={() => setStockFilter("IN_STOCK")}
                      className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                        stockFilter === "IN_STOCK"
                          ? "bg-white text-slate-900 font-bold shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      In Stock ({inStockCount})
                    </button>
                    {lowStockCount > 0 && (
                      <button
                        onClick={() => setStockFilter("LOW_STOCK")}
                        className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                          stockFilter === "LOW_STOCK"
                            ? "bg-white text-slate-900 font-bold shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Low ({lowStockCount})
                      </button>
                    )}
                    {outOfStockCount > 0 && (
                      <button
                        onClick={() => setStockFilter("OUT_OF_STOCK")}
                        className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors ${
                          stockFilter === "OUT_OF_STOCK"
                            ? "bg-white text-slate-900 font-bold shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Depleted ({outOfStockCount})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Variants Grid / Empty State */}
              {variants.length === 0 ? (
                /* No Variants Found */
                <div className="border border-dashed border-teal-200 rounded-2xl p-12 sm:p-16 text-center bg-white transition-all space-y-5 shadow-sm">
                  <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>

                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-xl font-serif text-slate-900 font-medium">
                      No Product Variants Configured
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Transform this single product into a bespoke collection by offering specific sizes, bespoke colors, and distinct pricing variants.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-teal-600 text-white hover:bg-teal-700 px-8 py-3 rounded-lg shadow-sm transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Your First Variant</span>
                  </button>
                </div>
              ) : filteredVariants.length === 0 ? (
                /* Filter returned 0 */
                <div className="py-16 text-center border border-slate-200 rounded-xl bg-white space-y-3 shadow-xs p-8">
                  <p className="text-sm text-slate-500">No variants match your current filter or search criteria.</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStockFilter("ALL");
                    }}
                    className="text-xs uppercase tracking-widest text-teal-700 font-bold underline"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                /* Variant Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVariants.map((variant) => {
                    const attrObj = getAttributesObject(variant.attributes);
                    const currentStockDraft =
                      stockDrafts[variant._id] !== undefined
                        ? stockDrafts[variant._id]
                        : variant.stock || 0;
                    const isStockModified = currentStockDraft !== (variant.stock || 0);
                    const isUpdatingThis = updatingStockId === variant._id;

                    const variantImage =
                      variant.images?.[0]?.url ||
                      variant.images?.[0] ||
                      product.images?.[0] ||
                      null;

                    const stockNum = Number(variant.stock) || 0;

                    return (
                      <div
                        key={variant._id}
                        className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl p-5 shadow-xs transition-all duration-300 flex flex-col justify-between space-y-5 group relative overflow-hidden"
                      >
                        {/* Subtle top border accent */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Top: Image & Essential Info */}
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            {/* Variant Thumbnail */}
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                              {variantImage ? (
                                <img
                                  src={variantImage}
                                  alt="Variant"
                                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] uppercase text-slate-400 font-medium">
                                  No Img
                                </div>
                              )}
                              {variant.images?.length > 1 && (
                                <span className="absolute bottom-1 right-1 bg-slate-900/80 backdrop-blur-sm text-[9px] font-bold text-white px-1.5 py-0.5 rounded border border-slate-700">
                                  {variant.images.length} photos
                                </span>
                              )}
                            </div>

                            {/* Price & SKU Header */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-slate-400 truncate">
                                  #{variant._id?.slice(-6).toUpperCase()}
                                </span>

                                {/* Stock Badge */}
                                {stockNum > 10 ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    In Stock
                                  </span>
                                ) : stockNum > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Low Stock
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Depleted
                                  </span>
                                )}
                              </div>

                              <div className="text-lg font-serif text-slate-900 font-bold">
                                {formatPrice(variant.price)}
                              </div>
                            </div>
                          </div>

                          {/* Attribute Badges */}
                          <div className="flex flex-wrap gap-2 pt-1 min-h-[36px]">
                            {Object.entries(attrObj).length > 0 ? (
                              Object.entries(attrObj).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-slate-50 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg"
                                >
                                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-normal">
                                    {key}:
                                  </span>
                                  <span>{val}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Standard specification
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom: Stock Controller & Action Menu */}
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                          {/* Inline Stock Editor */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
                              <span>Inventory Stock</span>
                              <span className="font-mono text-xs font-semibold text-slate-900">
                                {currentStockDraft} units
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Decrement Button */}
                              <button
                                type="button"
                                onClick={() => handleStockIncrement(variant._id, -1)}
                                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-800 flex items-center justify-center font-bold text-base transition-colors select-none"
                              >
                                −
                              </button>

                              {/* Number Input */}
                              <input
                                type="number"
                                min="0"
                                value={currentStockDraft}
                                onChange={(e) =>
                                  handleStockDraftChange(variant._id, e.target.value)
                                }
                                className="flex-1 min-w-0 bg-white border border-slate-200 focus:border-teal-600 text-center text-sm font-mono text-slate-900 py-1.5 rounded-lg focus:outline-none shadow-xs"
                              />

                              {/* Increment Button */}
                              <button
                                type="button"
                                onClick={() => handleStockIncrement(variant._id, 1)}
                                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-800 flex items-center justify-center font-bold text-base transition-colors select-none"
                              >
                                +
                              </button>

                              {/* Quick Save button */}
                              {isStockModified && (
                                <button
                                  type="button"
                                  disabled={isUpdatingThis}
                                  onClick={() => handleSaveStock(variant._id)}
                                  className="h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all animate-fade-in shrink-0 flex items-center gap-1.5"
                                >
                                  {isUpdatingThis ? (
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <span>Save</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Card Footer Actions: Edit & Delete */}
                          <div className="flex items-center justify-between pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingVariant(variant)}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 transition-colors py-1 font-medium"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit Details</span>
                            </button>

                            {deleteConfirmId === variant._id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase text-rose-600 font-bold">Sure?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteConfirm(variant._id)}
                                  className="text-[11px] font-bold uppercase tracking-wider text-rose-600 hover:text-rose-700 underline"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[11px] uppercase text-slate-400 hover:text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(variant._id)}
                                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600 transition-colors py-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* ── Modal: Add New Variant ────────────────────────────────────────── */}
      {isAddModalOpen && (
        <VariantModal
          isOpen={isAddModalOpen}
          mode="CREATE"
          product={product}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(updatedProduct) => {
            setIsAddModalOpen(false);
            if (updatedProduct) {
              setProduct(updatedProduct);
            } else {
              fetchProductsDetails();
            }
            showToast("Variant successfully added to inventory!");
          }}
          handleAddVariant={handleAddVariant}
          formatPrice={formatPrice}
        />
      )}

      {/* ── Modal: Edit Existing Variant ──────────────────────────────────── */}
      {editingVariant && (
        <VariantModal
          isOpen={Boolean(editingVariant)}
          mode="EDIT"
          product={product}
          initialData={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSuccess={(updatedProduct) => {
            setEditingVariant(null);
            if (updatedProduct) {
              setProduct(updatedProduct);
            } else {
              fetchProductsDetails();
            }
            showToast("Variant updated successfully!");
          }}
          handleUpdateVariant={handleUpdateVariant}
          formatPrice={formatPrice}
        />
      )}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs uppercase tracking-widest text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif tracking-widest text-teal-700 font-bold">SNITCH ATELIER</span>
          <span>© 2026 SNITCH LUXE INTERNATIONALE • ALL RIGHTS RESERVED</span>
        </div>
      </footer>
    </div>
  );
};

// ── Reusable Variant Form Modal (Create / Edit) ─────────────────────────────
const VariantModal = ({
  isOpen,
  mode = "CREATE",
  product,
  initialData,
  onClose,
  onSuccess,
  handleAddVariant,
  handleUpdateVariant,
}) => {
  if (!isOpen) return null;

  const isEdit = mode === "EDIT";
  const MAX_VARIANT_IMAGES = 7;
  const fileInputRef = useRef(null);

  // Form states
  const [amount, setAmount] = useState(
    initialData?.price?.amount !== undefined
      ? initialData.price.amount
      : product?.price?.amount || ""
  );
  const [currency, setCurrency] = useState(
    initialData?.price?.currency || product?.price?.currency || "INR"
  );
  const [stock, setStock] = useState(
    initialData?.stock !== undefined ? initialData.stock : 10
  );

  // Existing images attached to variant
  const [existingImages, setExistingImages] = useState(() => {
    if (!initialData?.images) return [];
    return initialData.images
      .map((img) => (typeof img === "string" ? img : img?.url))
      .filter(Boolean);
  });

  // Newly selected file objects & preview URLs
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState("");

  const totalImagesCount = existingImages.length + selectedFiles.length;

  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  // Attributes: array of { key: string, value: string }
  const [attributesList, setAttributesList] = useState(() => {
    if (initialData?.attributes) {
      const obj =
        initialData.attributes instanceof Map
          ? Object.fromEntries(initialData.attributes)
          : initialData.attributes;
      const entries = Object.entries(obj);
      if (entries.length > 0) {
        return entries.map(([key, value]) => ({ key, value }));
      }
    }
    return [
      { key: "Size", value: "M" },
      { key: "Color", value: "" },
    ];
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleFilesAdded = (files) => {
    if (!files || !files.length) return;
    setImageError("");

    const newFiles = Array.from(files);
    const validImageFiles = newFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validImageFiles.length === 0) {
      setImageError("Please upload valid image files (PNG, JPG, WEBP).");
      return;
    }

    const remainingAllowed = MAX_VARIANT_IMAGES - (existingImages.length + selectedFiles.length);
    if (remainingAllowed <= 0) {
      setImageError(`Maximum ${MAX_VARIANT_IMAGES} images allowed per variant.`);
      return;
    }

    const filesToAdd = validImageFiles.slice(0, remainingAllowed);
    if (filesToAdd.length < validImageFiles.length) {
      setImageError(`Only ${remainingAllowed} more image(s) could be added (max ${MAX_VARIANT_IMAGES}).`);
    }

    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
    setSelectedFiles((prev) => [...prev, ...filesToAdd]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveSelectedFile = (index) => {
    if (filePreviews[index]) {
      URL.revokeObjectURL(filePreviews[index]);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
    setImageError("");
  };

  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setImageError("");
  };

  const handleToggleMasterGalleryImage = (imgUrl) => {
    setImageError("");
    if (existingImages.includes(imgUrl)) {
      setExistingImages((prev) => prev.filter((u) => u !== imgUrl));
    } else {
      if (existingImages.length + selectedFiles.length >= MAX_VARIANT_IMAGES) {
        setImageError(`Maximum ${MAX_VARIANT_IMAGES} images allowed per variant.`);
        return;
      }
      setExistingImages((prev) => [...prev, imgUrl]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleAttributeChange = (idx, field, val) => {
    setAttributesList((prev) => {
      const copy = [...prev];
      copy[idx][field] = val;
      return copy;
    });
  };

  const handleAddAttributeRow = () => {
    setAttributesList((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleRemoveAttributeRow = (idx) => {
    setAttributesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuickPreset = (key, val) => {
    setAttributesList((prev) => {
      const existingIdx = prev.findIndex((a) => a.key.toLowerCase() === key.toLowerCase());
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].value = val;
        return copy;
      }
      return [...prev, { key, value: val }];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setFormError("Please provide a valid price amount.");
      return;
    }

    // Convert attributes array to object
    const attributesObj = {};
    attributesList.forEach((item) => {
      const k = item.key.trim();
      const v = item.value.trim();
      if (k && v) {
        attributesObj[k] = v;
      }
    });

    const formData = new FormData();
    formData.append("priceAmount", Number(amount));
    formData.append("priceCurrency", currency);
    formData.append("stock", Math.max(0, parseInt(stock, 10) || 0));
    formData.append("attributes", JSON.stringify(attributesObj));
    formData.append(
      "existingImages",
      JSON.stringify(existingImages.map((url) => ({ url })))
    );

    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      setSubmitting(true);
      if (isEdit) {
        const res = await handleUpdateVariant(product._id, initialData._id, formData);
        onSuccess(res?.product);
      } else {
        const res = await handleAddVariant(product._id, formData);
        onSuccess(res?.product);
      }
    } catch (err) {
      console.error("Variant submit error:", err);
      setFormError(
        err?.response?.data?.message || err?.message || "Failed to save variant. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative max-h-[92vh] flex flex-col text-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-teal-700">
              {isEdit ? "Refine SKU" : "Atelier Expansion"}
            </span>
            <h3 className="text-xl sm:text-2xl font-serif text-slate-950 font-semibold mt-0.5">
              {isEdit ? "Edit Product Variant" : "Add New Variant"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}

          {/* Pricing & Stock Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 block font-semibold">
                Price Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="400"
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white text-sm text-slate-900 px-3.5 py-2.5 rounded-lg focus:outline-none transition-colors shadow-xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 block font-semibold">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white text-sm text-slate-900 px-3 py-2.5 rounded-lg focus:outline-none transition-colors shadow-xs"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 block font-semibold">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white text-sm text-slate-900 px-3.5 py-2.5 rounded-lg focus:outline-none transition-colors shadow-xs"
              />
            </div>
          </div>

          {/* Attributes Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                Garment Attributes (Size, Color, Fit)
              </label>
              <button
                type="button"
                onClick={handleAddAttributeRow}
                className="text-[10px] uppercase font-bold tracking-wider text-teal-700 hover:underline"
              >
                + Add Attribute
              </button>
            </div>

            {/* Quick Preset Badges */}
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">
                Quick Select Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ATTRIBUTES[0].presets.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleQuickPreset("Size", s)}
                    className="text-[10px] uppercase font-medium bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 px-2 py-0.5 rounded-md transition-colors shadow-xs"
                  >
                    Size: {s}
                  </button>
                ))}
                {PRESET_ATTRIBUTES[1].presets.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleQuickPreset("Color", c)}
                    className="text-[10px] uppercase font-medium bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 px-2 py-0.5 rounded-md transition-colors shadow-xs"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Attribute Key-Value rows */}
            <div className="space-y-2">
              {attributesList.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Attribute (e.g. Size)"
                    value={attr.key}
                    onChange={(e) => handleAttributeChange(idx, "key", e.target.value)}
                    className="w-1/3 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white text-xs text-slate-900 px-3 py-2 rounded-lg focus:outline-none transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. XL or Onyx)"
                    value={attr.value}
                    onChange={(e) => handleAttributeChange(idx, "value", e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-teal-600 focus:bg-white text-xs text-slate-900 px-3 py-2 rounded-lg focus:outline-none transition-colors"
                  />
                  {attributesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttributeRow(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                      title="Remove attribute"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Variant Images Upload (Up to 7 Images) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-2">
                <span>Variant Images (Max {MAX_VARIANT_IMAGES})</span>
              </label>
              <span
                className={`text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full font-medium ${
                  totalImagesCount >= MAX_VARIANT_IMAGES
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "text-slate-500 bg-slate-100 border border-slate-200"
                }`}
              >
                {totalImagesCount} / {MAX_VARIANT_IMAGES} images
              </span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={(e) => {
                handleFilesAdded(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />

            {/* Drag & Drop Upload Zone */}
            {totalImagesCount < MAX_VARIANT_IMAGES ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2.5 group ${
                  isDragging
                    ? "border-teal-600 bg-teal-50/50 scale-[0.99]"
                    : "border-slate-300 hover:border-teal-500 bg-slate-50/60 hover:bg-slate-50"
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-teal-600 group-hover:scale-110 group-hover:border-teal-300 transition-all shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-800 font-medium group-hover:text-slate-950 transition-colors">
                    Click to browse or drag & drop variant image files
                  </p>
                  <p className="text-[10px] text-slate-400">
                    PNG, JPG, WEBP • Max 5MB each (Add up to {MAX_VARIANT_IMAGES - totalImagesCount} more)
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-center">
                <p className="text-xs text-slate-600 font-medium">
                  Maximum limit of {MAX_VARIANT_IMAGES} images reached for this variant.
                </p>
              </div>
            )}

            {imageError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                {imageError}
              </p>
            )}

            {/* Gallery of Existing & Newly Added Images */}
            {totalImagesCount > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">
                  Variant Gallery ({totalImagesCount}):
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                  {/* Existing variant images */}
                  {existingImages.map((imgUrl, i) => (
                    <div
                      key={`existing-${i}`}
                      className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group shadow-xs"
                    >
                      <img
                        src={imgUrl}
                        alt={`Variant img ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 bg-teal-600 text-white text-[8px] font-bold px-1 rounded uppercase tracking-tighter shadow">
                          Main
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveExistingImage(i);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] transition-colors shadow"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Newly selected file previews */}
                  {filePreviews.map((previewUrl, i) => (
                    <div
                      key={`new-${i}`}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-teal-500 bg-slate-100 group shadow-xs"
                    >
                      <img
                        src={previewUrl}
                        alt={`New variant img ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[8px] font-bold px-1 rounded uppercase tracking-tighter shadow">
                        New
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSelectedFile(i);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] transition-colors shadow"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Pick from Master Product Images */}
            {product?.images && product.images.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">
                    Or select from master garment gallery:
                  </span>
                  <span className="text-[9px] text-slate-400">Click to toggle</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {product.images.map((img, i) => {
                    const isSelected = existingImages.includes(img);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleToggleMasterGalleryImage(img)}
                        className={`relative w-12 h-12 rounded-lg border overflow-hidden shrink-0 transition-all ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-600/30 scale-95 opacity-100"
                            : "border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400"
                        }`}
                        title={isSelected ? "Click to remove from variant" : "Click to add to variant"}
                      >
                        <img src={img} alt={`Master choice ${i}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-teal-600/30 flex items-center justify-center">
                            <span className="text-white text-xs font-bold drop-shadow">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-2.5 text-xs font-bold uppercase tracking-widest bg-teal-600 text-white hover:bg-teal-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isEdit ? "Save Changes" : "Create Variant"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SellerProductDetail;
