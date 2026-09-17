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
   */

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">

        {/* Back */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#8A8175] transition hover:text-[#17140F]"
        >
          <span aria-hidden="true">←</span> Back to shop
        </Link>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[88px_1fr_1fr] md:gap-8 lg:gap-12">

          {/* ==================================================
              THUMBNAIL RAIL — desktop only, sits left of hero
          ================================================== */}

          {images.length > 1 && (
            <div className="order-2 hidden flex-col gap-3 md:order-1 md:flex md:sticky md:top-8 md:self-start">
              {images.map((image, index) => {
                const isSelected = selectedImage === image;
                return (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    aria-label={`View image ${index + 1}`}
                    className={`aspect-[4/5] w-full overflow-hidden rounded-sm bg-[#EFEBE1] transition ${
                      isSelected
                        ? "ring-1 ring-[#17140F] ring-offset-2 ring-offset-[#FAFAF8]"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* ==================================================
              HERO IMAGE
          ================================================== */}

          <section className="order-1 w-full md:order-2 md:sticky md:top-8 md:self-start">
            <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-[#EFEBE1]">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.tittle || "Product image"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#8A8175]">
                  No image available
                </div>
              )}

              {canSlideImages && (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    aria-label="Show previous image"
                    className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-[#17140F] opacity-0 shadow-sm transition hover:bg-white active:scale-95 group-hover:flex group-hover:opacity-100 group-focus-within:flex group-focus-within:opacity-100"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={showNextImage}
                    aria-label="Show next image"
                    className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-[#17140F] opacity-0 shadow-sm transition hover:bg-white active:scale-95 group-hover:flex group-hover:opacity-100 group-focus-within:flex group-focus-within:opacity-100"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails — mobile only */}
            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1 md:hidden">
                {images.map((image, index) => {
                  const isSelected = selectedImage === image;
                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(image)}
                      className={`h-20 w-16 flex-none overflow-hidden rounded-sm bg-[#EFEBE1] transition ${
                        isSelected ? "ring-1 ring-[#17140F]" : "opacity-60"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.tittle || "Product"} thumbnail ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ==================================================
              PRODUCT INFO
          ================================================== */}

          <section className="order-3 flex w-full flex-col md:pt-1">

            <div className="flex items-center justify-between">
              <p className="text-sm text-[#8A8175]">Snitch collection</p>
              {isViewingMainProduct ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                  Main Product
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                  Variant Selected
                </span>
              )}
            </div>

            <h1 className="mt-3 font-serif text-3xl leading-tight text-[#17140F] sm:text-[2.35rem]">
              {product.tittle || "Untitled product"}
            </h1>

            {/* Price Section */}
            <div className="mt-5 flex items-baseline gap-3">
              <p className="font-serif text-2xl text-[#17140F]">
                {formatPrice(selectedVariant?.price || product.price)}
              </p>
              {!isViewingMainProduct && product.price?.amount && (
                <span className="text-xs text-[#8A8175]">
                  (Main product base: {formatPrice(product.price)})
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#8A8175]">
              Inclusive of all applicable taxes
            </p>

            <div className="my-8 h-px bg-[#E8E3D9]" />

            {/* Visual Swatches & Main Product Switcher */}
            {product?.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[#17140F]">
                    Select Option
                  </h3>
                  {!isViewingMainProduct && (
                    <button
                      type="button"
                      onClick={handleSelectMainProduct}
                      className="text-xs font-semibold text-amber-800 underline transition hover:text-amber-950"
                    >
                      ← Back to Main Product
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {/* Main Product Switcher Pill */}
                  <button
                    type="button"
                    onClick={handleSelectMainProduct}
                    className={`flex items-center gap-2 rounded-lg border-2 p-1.5 pr-3 text-xs font-medium transition ${
                      isViewingMainProduct
                        ? "border-[#17140F] bg-[#17140F] text-[#FAFAF8] shadow-sm"
                        : "border-[#E8E3D9] bg-white text-[#17140F] hover:border-[#17140F]"
                    }`}
                  >
                    {product?.images?.[0] && (
                      <img
                        src={getImageUrl(product.images[0])}
                        alt="Main Product"
                        className="h-8 w-8 rounded object-cover"
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
                        className={`flex items-center gap-2 rounded-lg border-2 p-1.5 pr-3 text-xs font-medium transition ${
                          isSelected
                            ? "border-[#17140F] bg-[#17140F] text-[#FAFAF8] shadow-sm"
                            : "border-[#E8E3D9] bg-white text-[#17140F] hover:border-[#17140F]"
                        }`}
                      >
                        {vImg && (
                          <img
                            src={getImageUrl(vImg)}
                            alt={label}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant Attribute Selectors (Size, Color, etc.) */}
            {Object.keys(attributeOptions).length > 0 && (
              <div className="mb-8 space-y-4">
                {Object.entries(attributeOptions).map(([attrKey, attrValues]) => (
                  <div key={attrKey}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[#17140F]">
                        {attrKey}:{" "}
                        <span className="font-normal text-[#8A8175]">
                          {selectedAttributes[attrKey] || "Select " + attrKey}
                        </span>
                      </h3>
                      {selectedAttributes[attrKey] && (
                        <button
                          type="button"
                          onClick={() => handleSelectAttribute(attrKey, selectedAttributes[attrKey])}
                          className="text-xs text-[#8A8175] hover:text-[#17140F]"
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
                            className={`rounded-md border-2 px-4 py-2 text-sm font-medium transition ${
                              isSelected
                                ? "border-[#17140F] bg-[#17140F] text-[#FAFAF8]"
                                : "border-[#D4CBBB] text-[#17140F] hover:border-[#17140F]"
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

            {/* Stock Status */}
            <div className="mb-6">
              {selectedVariant ? (
                <p className={`text-sm font-medium ${
                  selectedVariant.stock > 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {selectedVariant.stock > 0 
                    ? `${selectedVariant.stock} in stock` 
                    : "Out of stock"}
                </p>
              ) : (
                <p className="text-sm font-medium text-green-600">
                  ✓ Available to order (Main Product)
                </p>
              )}
            </div>

            {/* Specifications Card */}
            <div className="mb-8 rounded-sm bg-[#F5F0E8] p-4">
              <h3 className="mb-3 text-sm font-medium text-[#17140F]">
                {selectedVariant ? "Variant Specifications" : "Main Product Details"}
              </h3>
              <div className="space-y-2">
                {selectedVariant ? (
                  <>
                    {Object.entries(selectedAttributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-[#8A8175]">{key}:</span>
                        <span className="font-medium text-[#17140F]">{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8A8175]">Price:</span>
                      <span className="font-medium text-[#17140F]">
                        {formatPrice(selectedVariant.price || product.price)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8A8175]">Item Type:</span>
                      <span className="font-medium text-[#17140F]">Main Product (Base)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#8A8175]">Price:</span>
                      <span className="font-medium text-[#17140F]">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                    {product?.variants?.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8A8175]">Available Variants:</span>
                        <span className="font-medium text-[#17140F]">
                          {product.variants.length} options available
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-[#17140F]">Description</h2>
              <p className="mt-3 max-w-[46ch] text-sm leading-7 text-[#5C564A]">
                {product.description || "No description available."}
              </p>
            </div>

            <div className="mt-7 border-t border-[#E8E3D9] pt-6">
              <h2 className="text-sm font-medium text-[#17140F]">Sold by</h2>
              <p className="mt-2 break-all text-sm text-[#8A8175]">
                {product.seller || "Snitch seller"}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                className="h-13 rounded-sm bg-[#17140F] px-6 py-4 text-sm font-medium text-[#FAFAF8] transition hover:bg-[#2B2620] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cartLoading
                  ? "Adding..."
                  : selectedVariant
                  ? `Add Variant to Bag • ${formatPrice(selectedVariant.price || product.price)}`
                  : `Add Main Product to Bag • ${formatPrice(product.price)}`}
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
                className="h-13 rounded-sm border border-[#17140F] px-6 py-4 text-sm font-medium text-[#17140F] transition hover:bg-[#17140F] hover:text-[#FAFAF8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cartLoading ? "Processing..." : "Buy now"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
