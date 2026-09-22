import React, { useState, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { useProduct } from "../hook/useProduct";

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "INR (₹)" },
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
];

const MAX_IMAGES = 7;

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function CreateProduct() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);
  const { handleCreateproduct, handleCreateProduct } = useProduct();
  const createProductAction = handleCreateProduct || handleCreateproduct;

  const [formData, setFormData] = useState({
    tittle: "",
    description: "",
    priceAmount: "",
    priceCurrency: "INR",
    selectedSizes: [],
    selectedColors: [],
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [colorInput, setColorInput] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFilesAdded = (files) => {
    if (!files || !files.length) return;
    const newFiles = Array.from(files);

    const validImageFiles = newFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validImageFiles.length === 0) {
      setErrors((prev) => ({
        ...prev,
        images: "Please upload valid images (PNG, JPG, WEBP).",
      }));
      return;
    }

    const totalAllowed = MAX_IMAGES - selectedFiles.length;
    if (totalAllowed <= 0) {
      setErrors((prev) => ({
        ...prev,
        images: `Maximum ${MAX_IMAGES} images allowed.`,
      }));
      return;
    }

    const filesToAdd = validImageFiles.slice(0, totalAllowed);
    const updatedFiles = [...selectedFiles, ...filesToAdd];
    setSelectedFiles(updatedFiles);

    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);

    if (errors.images) {
      setErrors((prev) => ({ ...prev, images: "" }));
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
    e.target.value = "";
  };

  const handleRemoveImage = (indexToRemove) => {
    URL.revokeObjectURL(previewUrls[indexToRemove]);
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const validate = () => {
    const errs = {};
    if (!formData.tittle.trim()) {
      errs.tittle = "Title is required.";
    } else if (formData.tittle.trim().length < 2) {
      errs.tittle = "At least 2 characters.";
    }

    if (!formData.description.trim()) {
      errs.description = "Description is required.";
    } else if (formData.description.trim().length < 5) {
      errs.description = "At least 5 characters.";
    }

    if (!formData.priceAmount) {
      errs.priceAmount = "Price is required.";
    } else if (isNaN(Number(formData.priceAmount)) || Number(formData.priceAmount) <= 0) {
      errs.priceAmount = "Valid positive price required.";
    }

    if (!formData.priceCurrency) {
      errs.priceCurrency = "Select currency.";
    }

    if (selectedFiles.length === 0) {
      errs.images = "At least one image is required.";
    }

    if (formData.selectedSizes.length === 0) {
      errs.sizes = "Select at least one size.";
    }

    if (formData.selectedColors.length === 0) {
      errs.colors = "Select at least one color.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setApiError("");
    setSuccessMessage("");

    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const data = new FormData();
      data.append("tittle", formData.tittle.trim());
      data.append("description", formData.description.trim());
      data.append("priceAmount", formData.priceAmount);
      data.append("priceCurrency", formData.priceCurrency);

      selectedFiles.forEach((file) => {
        data.append("images", file);
      });

      await createProductAction(data);

      setSuccessMessage("Product published successfully!");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      console.error("Error creating product:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to publish product.";
      setApiError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCurrency =
    CURRENCIES.find((c) => c.code === formData.priceCurrency) || CURRENCIES[0];

  return (
    <div className="min-h-screen lg:h-screen w-full bg-slate-50 text-slate-900 flex flex-col overflow-y-auto lg:overflow-hidden font-sans">
      
      {/* Top Header */}
      <header className="shrink-0 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 sm:px-12 py-3.5 flex items-center justify-between z-20 shadow-xs">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-teal-700 transition group"
        >
          <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold font-outfit text-teal-700 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200">
            Seller Studio
          </span>
        </div>
      </header>

      {/* Main Studio Viewport (Expanded max-w-7xl with slightly taller components) */}
      <main className="flex-1 max-w-[1480px] w-full mx-auto p-4 sm:p-8 flex flex-col justify-center overflow-y-auto lg:overflow-hidden">
        
        {/* Status Feedback */}
        {apiError && (
          <div className="mb-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{apiError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* 2-Column Balanced Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Left Form Area (7 Cols) */}
          <div className="lg:col-span-8 flex flex-col">
            <form onSubmit={handleSubmit} noValidate className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-5 min-h-[520px]">
              
              {/* Image Upload Zone */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Garment Imagery</span>
                  <span className="text-xs font-semibold text-teal-700">
                    {selectedFiles.length}/{MAX_IMAGES} uploaded
                  </span>
                </div>

                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl py-7 px-5 text-center cursor-pointer transition-all select-none ${
                    isDragging
                      ? "border-teal-500 bg-teal-50/70 scale-[1.01]"
                      : "border-slate-300 hover:border-teal-400 bg-slate-50/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="pointer-events-none flex items-center justify-center gap-4 text-slate-500">
                    <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-teal-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-tight">
                        <span className="text-teal-700 underline">Upload photos</span> or drag & drop here
                      </p>
                      <span className="text-[11px] text-slate-400">PNG, JPG, WEBP (Max 7 images)</span>
                    </div>
                  </div>
                </div>

                {errors.images && (
                  <p className="text-xs text-red-600">{errors.images}</p>
                )}

                {/* Thumbnails Strip */}
                {previewUrls.length > 0 && (
                  <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs group">
                        <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-[10px] hover:bg-red-600 transition"
                        >
                          &times;
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 text-[8px] uppercase text-center font-bold bg-teal-600 text-white py-0.5">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title, Currency & Price in One Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-6 space-y-1">
                  <label htmlFor="tittle" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Product Title
                  </label>
                  <input
                    id="tittle"
                    name="tittle"
                    type="text"
                    placeholder="e.g. Tailored Wool Blazer"
                    value={formData.tittle}
                    onChange={handleInputChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl input-luxury text-sm ${
                      errors.tittle ? "border-red-500" : ""
                    }`}
                  />
                  {errors.tittle && (
                    <p className="text-xs text-red-600">{errors.tittle}</p>
                  )}
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label htmlFor="priceCurrency" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Currency
                  </label>
                  <select
                    id="priceCurrency"
                    name="priceCurrency"
                    value={formData.priceCurrency}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl input-luxury text-sm cursor-pointer"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label htmlFor="priceAmount" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Price ({currentCurrency.symbol})
                  </label>
                  <input
                    id="priceAmount"
                    name="priceAmount"
                    type="number"
                    placeholder="2999"
                    value={formData.priceAmount}
                    onChange={handleInputChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl input-luxury text-sm ${
                      errors.priceAmount ? "border-red-500" : ""
                    }`}
                  />
                  {errors.priceAmount && (
                    <p className="text-xs text-red-600">{errors.priceAmount}</p>
                  )}
                </div>
              </div>

              {/* Sizes & Colors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Sizes */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Available Sizes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_PRESETS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => {
                            const updated = prev.selectedSizes.includes(size)
                              ? prev.selectedSizes.filter((s) => s !== size)
                              : [...prev.selectedSizes, size];
                            return { ...prev, selectedSizes: updated };
                          });
                          if (errors.sizes) {
                            setErrors((prev) => ({ ...prev, sizes: "" }));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          formData.selectedSizes.includes(size)
                            ? "bg-teal-600 text-white border border-teal-700"
                            : "bg-slate-100 text-slate-700 border border-slate-200 hover:border-teal-400"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {errors.sizes && (
                    <p className="text-xs text-red-600">{errors.sizes}</p>
                  )}
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Available Colors
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Black, Navy Blue, Red..."
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && colorInput.trim()) {
                          e.preventDefault();
                          const color = colorInput.trim();
                          if (!formData.selectedColors.includes(color)) {
                            setFormData((prev) => ({
                              ...prev,
                              selectedColors: [...prev.selectedColors, color],
                            }));
                            if (errors.colors) {
                              setErrors((prev) => ({ ...prev, colors: "" }));
                            }
                          }
                          setColorInput("");
                        }
                      }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl input-luxury text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (colorInput.trim()) {
                          const color = colorInput.trim();
                          if (!formData.selectedColors.includes(color)) {
                            setFormData((prev) => ({
                              ...prev,
                              selectedColors: [...prev.selectedColors, color],
                            }));
                            if (errors.colors) {
                              setErrors((prev) => ({ ...prev, colors: "" }));
                            }
                          }
                          setColorInput("");
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition"
                    >
                      Add
                    </button>
                  </div>

                  {/* Selected Colors Tags */}
                  {formData.selectedColors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.selectedColors.map((color) => (
                        <div
                          key={color}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-xs font-medium text-slate-700"
                        >
                          {color}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                selectedColors: prev.selectedColors.filter((c) => c !== color),
                              }));
                            }}
                            className="ml-1 text-teal-600 hover:text-red-600 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.colors && (
                    <p className="text-xs text-red-600">{errors.colors}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="description" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Description & Composition
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Describe fabric composition, fit, and styling details..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`w-full px-3.5 py-2 rounded-xl input-luxury text-sm resize-none ${
                    errors.description ? "border-red-500" : ""
                  }`}
                />
                {errors.description && (
                  <p className="text-xs text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-5 rounded-xl btn-gradient-primary font-bold text-sm uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing to Catalog...</span>
                  </>
                ) : (
                  "Publish to VEYRO Collection"
                )}
              </button>

            </form>
          </div>

          {/* Right Live Catalog Preview (5 Cols) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full min-h-[520px]">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-800">
                  Live Catalog Preview
                </span>
                <span className="text-xs text-slate-400">Customer Viewport</span>
              </div>

              {/* Photo Preview Container (Taller & Proportional) */}
              <div className="w-full h-60 sm:h-72 bg-slate-100 rounded-xl relative flex items-center justify-center overflow-hidden my-4 border border-slate-200">
                {previewUrls.length > 0 ? (
                  <img
                    src={previewUrls[0]}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-400">
                    <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-medium">Garment image preview</p>
                  </div>
                )}

                <div className="absolute top-2.5 left-2.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-teal-600 text-white shadow">
                    NEW DROP
                  </span>
                </div>
              </div>

              {/* Card Meta Info */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold font-outfit text-slate-900 uppercase truncate">
                    {formData.tittle || "Product Title"}
                  </h3>
                  <span className="text-base font-black font-outfit text-teal-700 shrink-0">
                    {formData.priceAmount
                      ? `${currentCurrency.symbol}${Number(formData.priceAmount).toLocaleString()}`
                      : `${currentCurrency.symbol}0`}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-light">
                  {formData.description || "Garment composition specifications will appear here..."}
                </p>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-teal-700">VEYRO VERIFIED</span>
                  <span>Direct Dispatch</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
