import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useProduct } from "../hook/useProduct";
import { useCart } from "../../cart/hook/useCart";


/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

function getImageUrl(raw) {
  if (!raw) return "";
  const value = String(raw);
  // Handles URLs accidentally stored like:
  // [https://example.com/image.jpg](https://example.com/image.jpg)
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

/* ─────────────────────────────────────────────
   Product Detail
───────────────────────────────────────────── */

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { handleGetProductByid} = useProduct();
  const { handleAddToCart, loading: cartLoading } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [quantity, setQuantity] = useState(1); // Store selected attribute values

  // Helper to convert attributes to object
  const getAttributesObject = (attrs) => {
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
  };

  useEffect(() => {
    async function loadProduct() {
      try {
        setIsLoading(true);
        setError("");
        const data = await handleGetProductByid(productId);
        setProduct(data);

        // Always show the MAIN product by default on load
        setSelectedAttributes({});
        setSelectedImage(getImageUrl(data?.images?.[0]));
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Unable to load product details."
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [productId]);

  // Get all available attribute keys and their unique values from variants
  const attributeOptions = useMemo(() => {
    if (!product?.variants) return {};
    
    const attrs = {};
    product.variants.forEach((variant) => {
      const variantAttrs = getAttributesObject(variant.attributes);
      Object.entries(variantAttrs).forEach(([key, value]) => {
        if (!attrs[key]) {
          attrs[key] = new Set();
        }
        attrs[key].add(value);
      });
    });
    
    // Convert Sets to Arrays
    Object.keys(attrs).forEach(key => {
      attrs[key] = Array.from(attrs[key]);
    });
    
    return attrs;
  }, [product]);

  // Find matching variant based on selected attributes
  const selectedVariant = useMemo(() => {
    if (!product?.variants || Object.keys(selectedAttributes).length === 0) return null;
    
    return product.variants.find((variant) => {
      const variantAttrs = getAttributesObject(variant.attributes);
      return Object.entries(selectedAttributes).every(([key, value]) => {
        return variantAttrs[key] === value;
      });
    });
  }, [product, selectedAttributes]);

  const isViewingMainProduct = !selectedVariant;

  // Images: use variant images if variant is selected, otherwise main product images
  const images = useMemo(() => {
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      const variantImgs = selectedVariant.images
        .map((img) => {
          if (typeof img === "string") return getImageUrl(img);
          if (img?.url) return getImageUrl(img.url);
          return null;
        })
        .filter(Boolean);
      if (variantImgs.length > 0) return variantImgs;
    }
    
    return (product?.images || [])
      .map((img) => getImageUrl(img))
      .filter(Boolean);
  }, [product, selectedVariant]);

  const selectedImageIndex = images.findIndex((image) => image === selectedImage);
  const canSlideImages = images.length > 1;

  const showPreviousImage = () => {
    if (!canSlideImages) return;
    const currentIndex = selectedImageIndex === -1 ? 0 : selectedImageIndex;
    const previousIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setSelectedImage(images[previousIndex]);
  };

  const showNextImage = () => {
    if (!canSlideImages) return;
    const currentIndex = selectedImageIndex === -1 ? 0 : selectedImageIndex;
    const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    setSelectedImage(images[nextIndex]);
  };

  // Update image when images list changes
  useEffect(() => {
    if (images.length > 0) {
      setSelectedImage(images[0]);
    }
  }, [images]);

  const handleSelectMainProduct = () => {
    setSelectedAttributes({});
    if (product?.images?.length > 0) {
      setSelectedImage(getImageUrl(product.images[0]));
    }
  };

  const handleSelectAttribute = (attrKey, value) => {
    if (!product?.variants || product.variants.length === 0) return;

    // Toggle off if already selected
    if (selectedAttributes[attrKey] === value) {
      const updated = { ...selectedAttributes };
      delete updated[attrKey];
      setSelectedAttributes(updated);
      if (Object.keys(updated).length === 0 && product?.images?.[0]) {
        setSelectedImage(getImageUrl(product.images[0]));
      }
      return;
    }

    const targetAttributes = {
      ...selectedAttributes,
      [attrKey]: value,
    };

    // 1. Check if an exact variant matches all target attributes
    let matchingVariant = product.variants.find((variant) => {
      const variantAttrs = getAttributesObject(variant.attributes);
      return Object.entries(targetAttributes).every(
        ([k, v]) => variantAttrs[k] === v
      );
    });

    // 2. If no exact match, find any variant that has this attribute value
    if (!matchingVariant) {
      matchingVariant = product.variants.find((variant) => {
        const variantAttrs = getAttributesObject(variant.attributes);
        return variantAttrs[attrKey] === value;
      });
    }

    if (matchingVariant) {
      const fullAttrs = getAttributesObject(matchingVariant.attributes);
      setSelectedAttributes(fullAttrs);
      const vImg =
        matchingVariant.images?.[0]?.url ||
        (typeof matchingVariant.images?.[0] === "string" ? matchingVariant.images[0] : null);
      if (vImg) {
        setSelectedImage(getImageUrl(vImg));
      }
    } else {
      setSelectedAttributes(targetAttributes);
    }
  };

  const handleSelectVariant = (variant) => {
    if (!variant) return;
    const fullAttrs = getAttributesObject(variant.attributes);
    setSelectedAttributes(fullAttrs);
    const variantImg =
      variant.images?.[0]?.url ||
      (typeof variant.images?.[0] === "string" ? variant.images[0] : null);
    if (variantImg) {
      setSelectedImage(getImageUrl(variantImg));
    }
  };

  /* ─────────────────────────────────────────────
     Loading
  ───────────────────────────────────────────── */

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <div className="mb-10 h-3 w-24 animate-pulse rounded-full bg-[#EFEBE1]" />
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[88px_1fr_1fr]">
            <div className="hidden md:block" />
            <div className="aspect-[4/5] w-full animate-pulse rounded-sm bg-[#EFEBE1]" />
            <div className="space-y-6 pt-2">
              <div className="h-3 w-28 animate-pulse rounded-full bg-[#EFEBE1]" />
              <div className="h-9 w-72 animate-pulse rounded-sm bg-[#EFEBE1]" />
              <div className="h-6 w-28 animate-pulse rounded-sm bg-[#EFEBE1]" />
              <div className="h-28 w-full animate-pulse rounded-sm bg-[#EFEBE1]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ─────────────────────────────────────────────
     Error
  ───────────────────────────────────────────── */

  if (error || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAFAF8] px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-2xl text-[#17140F]">
            We couldn't find this piece
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#8A8175]">
            {error || "This product may have sold out or been removed."}
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex h-12 items-center rounded-sm bg-[#17140F] px-7 text-sm font-medium text-[#FAFAF8] transition hover:bg-[#2B2620]"
          >
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  /* ─────────────────────────────────────────────
     Main UI
  ───────────────────────────────────────────── */

  return (
    <main className="min-h-screen bg-[#FBFBF9] text-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">

        {/* Back Link */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 transition hover:text-slate-900"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Collection
          </Link>
          <div className="flex items-center gap-2">
            {isViewingMainProduct ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/80 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                Main Product
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                Variant Selected
              </span>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12 lg:gap-10">

          {/* ==================================================
              MEDIA SECTION (Left Column - 6/12 or 7/12)
          ================================================== */}
          <div className="md:col-span-6 lg:col-span-7 md:sticky md:top-20">
            <div className="flex flex-col gap-3 sm:flex-row">

              {/* Thumbnails list (Desktop & Tablet) */}
              {images.length > 1 && (
                <div className="order-2 flex gap-2 overflow-x-auto pb-2 sm:order-1 sm:flex-col sm:overflow-y-auto sm:pb-0 sm:pr-1 max-h-[480px] scrollbar-thin">
                  {images.map((image, index) => {
                    const isSelected = selectedImage === image;
                    return (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setSelectedImage(image)}
                        aria-label={`View image ${index + 1}`}
                        className={`relative h-16 w-14 sm:h-20 sm:w-16 flex-shrink-0 overflow-hidden rounded-lg bg-stone-50 border transition-all ${
                          isSelected
                            ? "border-slate-900 ring-2 ring-slate-900 ring-offset-1 ring-offset-[#FBFBF9] opacity-100 scale-95"
                            : "border-slate-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-contain p-1"
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Main Display Image */}
              <div className="group relative order-1 flex-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/10 sm:order-2">
                <div className="relative aspect-[3/4] max-h-[500px] w-full overflow-hidden bg-white flex items-center justify-center p-2">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={product.tittle || "Product preview"}
                      className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-102"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No image available
                    </div>
                  )}

                  {/* Navigation Arrows */}
                  {canSlideImages && (
                    <>
                      <button
                        type="button"
                        onClick={showPreviousImage}
                        aria-label="Previous image"
                        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-md backdrop-blur-sm opacity-0 transition-all hover:bg-slate-900 active:scale-95 group-hover:opacity-100"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={showNextImage}
                        aria-label="Next image"
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-md backdrop-blur-sm opacity-0 transition-all hover:bg-slate-900 active:scale-95 group-hover:opacity-100"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================
              PRODUCT DETAILS SECTION (Right Column - 6/12 or 5/12)
          ================================================== */}
          <div className="flex flex-col md:col-span-6 lg:col-span-5">

            {/* Brand / Collection */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-800/80">
                Veyro Signature
              </span>
              {selectedVariant ? (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  selectedVariant.stock > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : "Out of stock"}
                </span>
              ) : (
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  In Stock
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="mt-2 font-serif text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
              {product.tittle || "Untitled product"}
            </h1>

            {/* Pricing Section */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
                {formatPrice(selectedVariant?.price || product.price)}
              </span>
              {!isViewingMainProduct && product.price?.amount && (
                <span className="text-xs text-slate-400">
                  (Base: {formatPrice(product.price)})
                </span>
              )}
              <span className="text-xs text-slate-500">Inclusive of all taxes</span>
            </div>

            <div className="my-4 h-px bg-slate-200/80" />

            {/* Variant / Option Pills */}
            {product?.variants && product.variants.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-700">
                    Select Option / Edition
                  </span>
                  {!isViewingMainProduct && (
                    <button
                      type="button"
                      onClick={handleSelectMainProduct}
                      className="font-medium text-amber-800 underline transition hover:text-amber-950"
                    >
                      Reset to Main Product
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Main Product Switcher Pill */}
                  <button
                    type="button"
                    onClick={handleSelectMainProduct}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      isViewingMainProduct
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                    }`}
                  >
                    {product?.images?.[0] && (
                      <img
                        src={getImageUrl(product.images[0])}
                        alt="Main Product"
                        className="h-6 w-6 rounded-md object-contain bg-stone-100 p-0.5"
                      />
                    )}
                    <span>Main Product</span>
                  </button>

                  {/* Variant Swatches */}
                  {product.variants.map((v, idx) => {
                    const isSelected = selectedVariant?._id === v._id;
                    const vImg =
                      v.images?.[0]?.url ||
                      (typeof v.images?.[0] === "string" ? v.images[0] : null);
                    const vAttrs = getAttributesObject(v.attributes);
                    const label =
                      Object.values(vAttrs).join(" / ") || `Variant ${idx + 1}`;
                    return (
                      <button
                        key={v._id || idx}
                        type="button"
                        onClick={() => handleSelectVariant(v)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                        }`}
                      >
                        {vImg && (
                          <img
                            src={getImageUrl(vImg)}
                            alt={label}
                            className="h-6 w-6 rounded-md object-contain bg-stone-100 p-0.5"
                          />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Attribute Selectors (Size, Color, etc.) */}
            {Object.keys(attributeOptions).length > 0 && (
              <div className="mb-4 space-y-3">
                {Object.entries(attributeOptions).map(([attrKey, attrValues]) => (
                  <div key={attrKey}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wider text-slate-700">
                        {attrKey}: <span className="font-normal text-slate-500">{selectedAttributes[attrKey] || "Choose option"}</span>
                      </span>
                      {selectedAttributes[attrKey] && (
                        <button
                          type="button"
                          onClick={() => handleSelectAttribute(attrKey, selectedAttributes[attrKey])}
                          className="text-slate-400 hover:text-slate-700 underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attrValues.map((value) => {
                        const isSelected = selectedAttributes[attrKey] === value;
                        return (
                          <button
                            key={value}
                            onClick={() => handleSelectAttribute(attrKey, value)}
                            className={`min-w-[42px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                              isSelected
                                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"
                            }`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Selector + Stock Note */}
            <div className="mb-5 flex items-center gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Quantity</span>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 active:scale-95 disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-semibold text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* CTAs IMMEDIATELY VISIBLE WITHOUT SCROLLING */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={async () => {
                  const variantId = selectedVariant ? selectedVariant._id : null;
                  const result = await handleAddToCart(
                    productId,
                    variantId,
                    quantity
                  );
                  if (result.success) {
                    navigate("/cart");
                  }
                }}
                disabled={
                  (selectedVariant && selectedVariant.stock === 0) || cartLoading
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 px-5 text-sm font-medium text-white shadow-md shadow-slate-900/10 transition-all hover:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 11h14l1 12H4L5 11z" />
                </svg>
                {cartLoading ? "Adding..." : "Add to Bag"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const variantId = selectedVariant ? selectedVariant._id : null;
                  const result = await handleAddToCart(
                    productId,
                    variantId,
                    quantity
                  );
                  if (result.success) {
                    navigate("/cart");
                  }
                }}
                disabled={
                  (selectedVariant && selectedVariant.stock === 0) || cartLoading
                }
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white py-3.5 px-5 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-900 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cartLoading ? "Processing..." : "Buy Now"}
              </button>
            </div>


            {/* Description & Details Accordion / Cards */}
            <div className="mt-5 space-y-3">
              <details className="group rounded-xl bg-stone-50 border border-stone-200/70 p-3.5 [&_summary::-webkit-details-marker]:hidden" open>
                <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-800">
                  <span>Description</span>
                  <span className="transition group-open:rotate-180">
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {product.description || "No description provided for this product."}
                </p>
              </details>

              <details className="group rounded-xl bg-stone-50 border border-stone-200/70 p-3.5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-800">
                  <span>Product Specifications</span>
                  <span className="transition group-open:rotate-180">
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                  {selectedVariant ? (
                    <>
                      {Object.entries(selectedAttributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-slate-200/50 pb-1">
                          <span className="text-slate-500">{key}:</span>
                          <span className="font-semibold text-slate-800">{value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-0.5">
                        <span className="text-slate-500">Variant Price:</span>
                        <span className="font-semibold text-slate-800">
                          {formatPrice(selectedVariant.price || product.price)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between border-b border-slate-200/50 pb-1">
                        <span className="text-slate-500">Item Type:</span>
                        <span className="font-semibold text-slate-800">Main Product (Base)</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/50 pb-1">
                        <span className="text-slate-500">Seller:</span>
                        <span className="font-semibold text-slate-800">{product.seller || "Veyro Direct"}</span>
                      </div>
                      {product?.variants?.length > 0 && (
                        <div className="flex justify-between pt-0.5">
                          <span className="text-slate-500">Total Variants:</span>
                          <span className="font-semibold text-slate-800">
                            {product.variants.length} available
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </details>
            </div>

          </div>

        </div>
      </div>
    </main>
  );
}

