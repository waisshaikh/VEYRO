import React, { useEffect, useState, useMemo } from "react";
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
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E2E1] flex flex-col font-sans selection:bg-[#d4af37] selection:text-[#0A0A0A]">
      {/* ── Top Luxury Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#25231F] px-6 sm:px-12 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/seller/dashboard"
              className="flex items-center gap-2.5 text-xs uppercase tracking-widest text-[#A8A399] hover:text-[#D4AF37] transition-all group"
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

            <span className="hidden sm:inline-block w-px h-4 bg-[#2e2b24]" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#D4AF37] border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10">
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
                className="hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A399] hover:text-[#F5F3EE] px-4 py-2 border border-[#2A2823] hover:border-[#D4AF37]/50 rounded transition-colors"
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
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#FFD700] px-5 py-2.5 rounded shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:shadow-[0_0_22px_rgba(212,175,55,0.45)] transition-all active:scale-95"
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
            className={`flex items-center gap-3 px-5 py-3 rounded border text-xs font-medium tracking-wide shadow-2xl backdrop-blur-xl ${
              toast.type === "error"
                ? "bg-[#251010]/90 border-red-500/50 text-red-200"
                : "bg-[#181610]/95 border-[#D4AF37]/50 text-[#F5F3EE]"
            }`}
          >
            {toast.type === "error" ? (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
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
            <div className="h-96 rounded-2xl bg-[#141414] border border-[#25231F]" />
            <div className="h-64 rounded-2xl bg-[#141414] border border-[#25231F]" />
          </div>
        ) : !product ? (
          /* Product Not Found */
          <div className="py-24 text-center rounded-2xl border border-[#25231F] bg-[#121212] p-8 max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl font-serif text-[#D4AF37]">Product Not Found</h2>
            <p className="text-sm text-[#A8A399]">
              The requested garment could not be retrieved from the atelier records.
            </p>
            <Link
              to="/seller/dashboard"
              className="inline-block mt-4 text-xs font-bold uppercase tracking-widest text-[#0A0A0A] bg-[#D4AF37] px-6 py-2.5 rounded"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* ── Section 1: Hero Product Overview Card ───────────────────── */}
            <section className="bg-[#121212] border border-[#25231F] rounded-2xl p-6 sm:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
              {/* Subtle background ambient gold bloom */}
              <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start relative z-10">
                {/* Left: Interactive Media Gallery (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-[#0A0A0A] border border-[#2E2B25] group shadow-inner">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[activeImageIndex] || product.images[0]}
                        alt={product.tittle || "Product image"}
                        className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#555] p-6 text-center">
                        <svg className="w-12 h-12 mb-2 text-[#333]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs uppercase tracking-widest text-[#777]">No Media Available</span>
                      </div>
                    )}

                    {/* Image Counter Badge */}
                    {product.images?.length > 0 && (
                      <div className="absolute bottom-3 right-3 bg-[#0A0A0A]/80 backdrop-blur-md border border-[#333] px-2.5 py-1 rounded text-[10px] uppercase tracking-wider text-[#D0C5AF]">
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
                              ? "border-[#D4AF37] scale-95 shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                              : "border-[#25231F] opacity-60 hover:opacity-100 hover:border-[#666]"
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
                      <span className="font-mono text-[11px] text-[#A8A399] tracking-widest">
                        ID: #{product._id?.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-[#333]">•</span>
                      <span className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-semibold">
                        Master Product Record
                      </span>
                    </div>

                    {/* Main Title */}
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-[#F5F3EE] leading-tight font-medium">
                      {product.tittle || "Untitled Garment"}
                    </h1>

                    {/* Master Base Price */}
                    <div className="flex items-baseline gap-3 pt-1">
                      <span className="text-2xl sm:text-3xl font-serif text-[#D4AF37] font-semibold">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-xs uppercase tracking-widest text-[#888]">
                        Base Listing Price
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[#A8A399] leading-relaxed pt-2 max-w-2xl whitespace-pre-line">
                      {product.description || "No editorial description specified for this collection item."}
                    </p>
                  </div>

                  {/* High-Level Inventory Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[#25231F]">
                    <div className="bg-[#0A0A0A]/60 border border-[#25231F] rounded-xl p-3.5">
                      <span className="text-[10px] uppercase tracking-widest text-[#888] block mb-1">
                        Total Variants
                      </span>
                      <span className="text-xl font-serif text-[#F5F3EE] font-medium">
                        {variants.length}
                      </span>
                    </div>

                    <div className="bg-[#0A0A0A]/60 border border-[#25231F] rounded-xl p-3.5">
                      <span className="text-[10px] uppercase tracking-widest text-[#888] block mb-1">
                        Total Stock
                      </span>
                      <span className="text-xl font-serif text-[#D4AF37] font-medium">
                        {totalStockUnits} <span className="text-xs font-sans font-normal text-[#888]">units</span>
                      </span>
                    </div>

                    <div className="bg-[#0A0A0A]/60 border border-[#25231F] rounded-xl p-3.5">
                      <span className="text-[10px] uppercase tracking-widest text-[#888] block mb-1">
                        Active Lines
                      </span>
                      <span className="text-xl font-serif text-emerald-400 font-medium">
                        {inStockCount}
                      </span>
                    </div>

                    <div className="bg-[#0A0A0A]/60 border border-[#25231F] rounded-xl p-3.5">
                      <span className="text-[10px] uppercase tracking-widest text-[#888] block mb-1">
                        Depleted Lines
                      </span>
                      <span className={`text-xl font-serif font-medium ${outOfStockCount > 0 ? "text-rose-400" : "text-[#888]"}`}>
                        {outOfStockCount}
                      </span>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#FFD700] px-7 py-3.5 rounded shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_28px_rgba(212,175,55,0.45)] transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create New Variant</span>
                    </button>

                    <button
                      onClick={fetchProductsDetails}
                      title="Sync data with server"
                      className="inline-flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-[#A8A399] hover:text-[#F5F3EE] bg-transparent border border-[#2E2B25] hover:border-[#D4AF37] px-5 py-3.5 rounded transition-colors"
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
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#25231F]">
                <div>
                  <h2 className="text-2xl font-serif text-[#F5F3EE] font-medium tracking-tight">
                    Product Variants & Inventory
                  </h2>
                  <p className="text-xs text-[#A8A399] mt-0.5">
                    Adjust real-time stock levels, pricing, and custom specifications across all SKUs.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative min-w-[220px]">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#666]">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search attributes, size, color..."
                      className="w-full bg-[#121212] border border-[#2E2B25] focus:border-[#D4AF37] text-xs text-[#F5F3EE] placeholder-[#666] pl-9 pr-3 py-2 rounded focus:outline-none transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute inset-y-0 right-2.5 flex items-center text-[#666] hover:text-[#bbb]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Stock Filter Pills */}
                  <div className="inline-flex rounded border border-[#2E2B25] p-0.5 bg-[#121212]">
                    <button
                      onClick={() => setStockFilter("ALL")}
                      className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded transition-colors ${
                        stockFilter === "ALL"
                          ? "bg-[#D4AF37] text-[#0A0A0A] font-bold"
                          : "text-[#A8A399] hover:text-[#F5F3EE]"
                      }`}
                    >
                      All ({variants.length})
                    </button>
                    <button
                      onClick={() => setStockFilter("IN_STOCK")}
                      className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded transition-colors ${
                        stockFilter === "IN_STOCK"
                          ? "bg-[#D4AF37] text-[#0A0A0A] font-bold"
                          : "text-[#A8A399] hover:text-[#F5F3EE]"
                      }`}
                    >
                      In Stock ({inStockCount})
                    </button>
                    {lowStockCount > 0 && (
                      <button
                        onClick={() => setStockFilter("LOW_STOCK")}
                        className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded transition-colors ${
                          stockFilter === "LOW_STOCK"
                            ? "bg-[#D4AF37] text-[#0A0A0A] font-bold"
                            : "text-[#A8A399] hover:text-[#F5F3EE]"
                        }`}
                      >
                        Low ({lowStockCount})
                      </button>
                    )}
                    {outOfStockCount > 0 && (
                      <button
                        onClick={() => setStockFilter("OUT_OF_STOCK")}
                        className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded transition-colors ${
                          stockFilter === "OUT_OF_STOCK"
                            ? "bg-[#D4AF37] text-[#0A0A0A] font-bold"
                            : "text-[#A8A399] hover:text-[#F5F3EE]"
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
                <div className="border border-dashed border-[#D4AF37]/30 hover:border-[#D4AF37]/60 rounded-2xl p-12 sm:p-16 text-center bg-[#121212]/50 transition-all space-y-5">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>

                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-xl font-serif text-[#F5F3EE] font-medium">
                      No Product Variants Configured
                    </h3>
                    <p className="text-xs text-[#A8A399] leading-relaxed">
                      Transform this single product into a bespoke collection by offering specific sizes, bespoke colors, and distinct pricing variants.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#FFD700] px-8 py-3 rounded shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Your First Variant</span>
                  </button>
                </div>
              ) : filteredVariants.length === 0 ? (
                /* Filter returned 0 */
                <div className="py-16 text-center border border-[#25231F] rounded-xl bg-[#121212] space-y-3">
                  <p className="text-sm text-[#A8A399]">No variants match your current filter or search criteria.</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStockFilter("ALL");
                    }}
                    className="text-xs uppercase tracking-widest text-[#D4AF37] underline"
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
                        className="bg-[#141414] border border-[#25231F] hover:border-[#D4AF37]/50 rounded-xl p-5 shadow-lg transition-all duration-300 flex flex-col justify-between space-y-5 group relative overflow-hidden"
                      >
                        {/* Subtle top border accent */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Top: Image & Essential Info */}
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            {/* Variant Thumbnail */}
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#0A0A0A] border border-[#2E2B25] shrink-0 relative">
                              {variantImage ? (
                                <img
                                  src={variantImage}
                                  alt="Variant"
                                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] uppercase text-[#666]">
                                  No Img
                                </div>
                              )}
                            </div>

                            {/* Price & SKU Header */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-[#888] truncate">
                                  #{variant._id?.slice(-6).toUpperCase()}
                                </span>

                                {/* Stock Badge */}
                                {stockNum > 10 ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    In Stock
                                  </span>
                                ) : stockNum > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-400 font-semibold bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    Low Stock
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-rose-400 font-semibold bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    Depleted
                                  </span>
                                )}
                              </div>

                              <div className="text-lg font-serif text-[#D4AF37] font-semibold">
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
                                  className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-[#1C1A14] border border-[#D4AF37]/30 text-[#E5D5A6] px-2.5 py-1 rounded"
                                >
                                  <span className="text-[10px] uppercase tracking-wider text-[#A8A399] font-normal">
                                    {key}:
                                  </span>
                                  <span>{val}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-[#666] italic">
                                Standard specification
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom: Stock Controller & Action Menu */}
                        <div className="pt-4 border-t border-[#25231F] space-y-3">
                          {/* Inline Stock Editor */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#A8A399]">
                              <span>Inventory Stock</span>
                              <span className="font-mono text-xs font-semibold text-[#F5F3EE]">
                                {currentStockDraft} units
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Decrement Button */}
                              <button
                                type="button"
                                onClick={() => handleStockIncrement(variant._id, -1)}
                                className="w-9 h-9 rounded bg-[#1C1B1B] hover:bg-[#2A2926] border border-[#2E2B25] hover:border-[#D4AF37]/50 text-[#E5E2E1] flex items-center justify-center font-bold text-base transition-colors select-none"
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
                                className="flex-1 min-w-0 bg-[#0A0A0A] border border-[#2E2B25] focus:border-[#D4AF37] text-center text-sm font-mono text-[#F5F3EE] py-1.5 rounded focus:outline-none"
                              />

                              {/* Increment Button */}
                              <button
                                type="button"
                                onClick={() => handleStockIncrement(variant._id, 1)}
                                className="w-9 h-9 rounded bg-[#1C1B1B] hover:bg-[#2A2926] border border-[#2E2B25] hover:border-[#D4AF37]/50 text-[#E5E2E1] flex items-center justify-center font-bold text-base transition-colors select-none"
                              >
                                +
                              </button>

                              {/* Quick Save button (Glows when modified) */}
                              {isStockModified && (
                                <button
                                  type="button"
                                  disabled={isUpdatingThis}
                                  onClick={() => handleSaveStock(variant._id)}
                                  className="h-9 px-3.5 rounded bg-[#D4AF37] hover:bg-[#FFD700] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(212,175,55,0.4)] transition-all animate-fade-in shrink-0 flex items-center gap-1.5"
                                >
                                  {isUpdatingThis ? (
                                    <span className="w-3 h-3 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
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
                              className="inline-flex items-center gap-1.5 text-xs text-[#A8A399] hover:text-[#D4AF37] transition-colors py-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit Details</span>
                            </button>

                            {deleteConfirmId === variant._id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase text-red-400">Sure?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteConfirm(variant._id)}
                                  className="text-[11px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 underline"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-[11px] uppercase text-[#777] hover:text-[#aaa]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(variant._id)}
                                className="inline-flex items-center gap-1 text-xs text-[#777] hover:text-red-400 transition-colors py-1"
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
      <footer className="mt-auto border-t border-[#1F1E1B] bg-[#0A0A0A] py-8 text-center text-xs uppercase tracking-widest text-[#6E6A62]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif tracking-widest text-[#D4AF37]">SNITCH ATELIER</span>
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
  const [imageUrl, setImageUrl] = useState(
    initialData?.images?.[0]?.url || initialData?.images?.[0] || ""
  );

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

    const payload = {
      priceAmount: Number(amount),
      priceCurrency: currency,
      stock: Math.max(0, parseInt(stock, 10) || 0),
      attributes: attributesObj,
      images: imageUrl.trim() ? [{ url: imageUrl.trim() }] : [],
    };

    try {
      setSubmitting(true);
      if (isEdit) {
        const res = await handleUpdateVariant(product._id, initialData._id, payload);
        onSuccess(res?.product);
      } else {
        const res = await handleAddVariant(product._id, payload);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#141414] border border-[#2E2B25] rounded-2xl w-full max-w-xl p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#25231F]">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#D4AF37]">
              {isEdit ? "Refine SKU" : "Atelier Expansion"}
            </span>
            <h3 className="text-xl sm:text-2xl font-serif text-[#F5F3EE] font-medium mt-0.5">
              {isEdit ? "Edit Product Variant" : "Add New Variant"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1C1B1B] text-[#888] hover:text-[#F5F3EE] flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
          {formError && (
            <div className="p-3 rounded bg-red-950/50 border border-red-800/60 text-xs text-red-200">
              {formError}
            </div>
          )}

          {/* Pricing & Stock Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] uppercase tracking-widest text-[#A8A399] block font-semibold">
                Price Amount
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="400"
                className="w-full bg-[#0A0A0A] border border-[#2E2B25] focus:border-[#D4AF37] text-sm text-[#F5F3EE] px-3.5 py-2.5 rounded focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] uppercase tracking-widest text-[#A8A399] block font-semibold">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2E2B25] focus:border-[#D4AF37] text-sm text-[#F5F3EE] px-3 py-2.5 rounded focus:outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-[10px] uppercase tracking-widest text-[#A8A399] block font-semibold">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2E2B25] focus:border-[#D4AF37] text-sm text-[#F5F3EE] px-3.5 py-2.5 rounded focus:outline-none"
              />
            </div>
          </div>

          {/* Attributes Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-[#A8A399] font-semibold">
                Garment Attributes (Size, Color, Fit)
              </label>
              <button
                type="button"
                onClick={handleAddAttributeRow}
                className="text-[10px] uppercase font-bold tracking-wider text-[#D4AF37] hover:underline"
              >
                + Add Attribute
              </button>
            </div>

            {/* Quick Preset Badges */}
            <div className="space-y-2 bg-[#0A0A0A] border border-[#25231F] rounded-xl p-3">
              <span className="text-[9px] uppercase tracking-wider text-[#666] block">
                Quick Select Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ATTRIBUTES[0].presets.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleQuickPreset("Size", s)}
                    className="text-[10px] uppercase font-medium bg-[#1C1B1B] hover:bg-[#D4AF37]/20 border border-[#2E2B25] hover:border-[#D4AF37] text-[#D0C5AF] px-2 py-0.5 rounded transition-colors"
                  >
                    Size: {s}
                  </button>
                ))}
                {PRESET_ATTRIBUTES[1].presets.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleQuickPreset("Color", c)}
                    className="text-[10px] uppercase font-medium bg-[#1C1B1B] hover:bg-[#D4AF37]/20 border border-[#2E2B25] hover:border-[#D4AF37] text-[#D0C5AF] px-2 py-0.5 rounded transition-colors"
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
                    className="w-1/3 bg-[#0A0A0A] border border-[#2E2B25] focus:border-[#D4AF37] text-xs text-[#F5F3EE] px-3 py-2 rounded focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. XL or Onyx)"
                    value={attr.value}
                    onChange={(e) => handleAttributeChange(idx, "value", e.target.value)}
                    className="flex-1 bg-[#0A0A0A] border border-[#2E2B25] focus:border-[#D4AF37] text-xs text-[#F5F3EE] px-3 py-2 rounded focus:outline-none"
                  />
                  {attributesList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttributeRow(idx)}
                      className="text-[#666] hover:text-red-400 p-1.5"
                      title="Remove attribute"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Variant Specific Image (Optional) */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-[#A8A399] block font-semibold">
              Variant Image URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ik.imagekit.io/... or paste image URL"
              className="w-full bg-[#0A0A0A] border border-[#2E2B25] focus:border-[#D4AF37] text-xs text-[#F5F3EE] px-3.5 py-2.5 rounded focus:outline-none"
            />

            {/* Quick Pick from Master Product Images */}
            {product?.images && product.images.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] uppercase tracking-wider text-[#666] block">
                  Or pick from master garment gallery:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImageUrl(img)}
                      className={`w-12 h-12 rounded border overflow-hidden shrink-0 transition-all ${
                        imageUrl === img
                          ? "border-[#D4AF37] scale-95"
                          : "border-[#25231F] opacity-50 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="choice" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#25231F] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-xs uppercase tracking-widest text-[#888] hover:text-[#E5E2E1] border border-[#2E2B25] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#FFD700] rounded shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2"
            >
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
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
