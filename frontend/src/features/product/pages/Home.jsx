import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useSelector } from "react-redux";
import { useProduct } from "../hook/useProduct";

const POPULAR_TAGS = ["All", "Men", "Women", "Kurti", "Dress", "Blazer", "Silk", "Solid"];

const Home = () => {
  const products = useSelector((state) => state.product.products);
  const user = useSelector((state) => state.auth.user);
  const { handelGetProduct } = useProduct();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError("");
        await handelGetProduct();
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load products."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const productList = useMemo(() => {
    if (!products) return [];
    const list = Array.isArray(products) ? products : [products];
    if (!searchQuery.trim() || searchQuery.toLowerCase() === "all") return list;

    const q = searchQuery.toLowerCase().trim();

    const isMatch = (p) => {
      const titleMatch = (p.tittle || "").toLowerCase().includes(q);
      const descMatch = (p.description || "").toLowerCase().includes(q);
      const priceMatch = String(p.price?.amount || "").includes(q);

      const variantMatch = p.variants?.some((v) => {
        const attrValues = v.attributes
          ? Object.values(
              v.attributes instanceof Map
                ? Object.fromEntries(v.attributes)
                : v.attributes
            ).join(" ").toLowerCase()
          : "";
        return attrValues.includes(q);
      });

      return titleMatch || descMatch || priceMatch || variantMatch;
    };

    // Sort matching items to TOP, followed by non-matching
    const matching = list.filter(isMatch);
    const nonMatching = list.filter((p) => !isMatch(p));
    return [...matching, ...nonMatching];
  }, [products, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localSearch.trim() && localSearch.toLowerCase() !== "all") {
      setSearchParams({ search: localSearch.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    setSearchParams({});
  };

  const getImageUrl = (image) => {
    if (!image) return "";
    const markdownUrl = String(image).match(/\((https?:\/\/[^)]+)\)/);
    return markdownUrl ? markdownUrl[1] : image;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: price?.currency || "INR",
      maximumFractionDigits: 0,
    }).format(Number(price?.amount || 0));
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-amber-500 selection:text-white pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 space-y-10">
        
        {/* ── Minimalist Marketplace Header ───────────────────────────────── */}
        <div className="pt-6 pb-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-amber-600">
                BUYER MARKETPLACE
              </span>
              <h1 className="text-2xl sm:text-4xl font-serif text-slate-950 font-semibold mt-1 tracking-tight">
                Shop Latest Products
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
                Explore curated garments and exclusive collections from VEYRO sellers.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {searchQuery && (
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-xs text-slate-700 font-medium">
                  <span>Filter: <strong>"{searchQuery}"</strong></span>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="ml-1 font-bold text-slate-400 hover:text-slate-900"
                    title="Clear Filter"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {/* ── Product Grid ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-xs"
              />
            ))}
          </div>
        ) : productList.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 max-w-md mx-auto space-y-4 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-serif font-bold text-slate-900">
              No garments found
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't find any items matching "{searchQuery}". Try refining your search or browsing our popular categories.
            </p>
            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-block px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-sm transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {productList.map((product) => {
              const imageUrl = getImageUrl(product?.images?.[0]);
              const variantCount = product.variants?.length || 0;

              return (
                <article
                  key={product._id}
                  onClick={() => navigate(`/product/${product._id}`)}
                  className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer relative"
                >
                  {/* Top Image Box */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-slate-100 border-b border-slate-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.tittle || "Product image"}
                        className="w-full h-full object-contain p-2 transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 uppercase font-medium">
                        No Image
                      </div>
                    )}


                    {variantCount > 0 && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-amber-500/95 backdrop-blur-md text-slate-950 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border border-amber-400 shadow">
                          {variantCount} option{variantCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Info Box */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 block">
                        VEYRO COLLECTION
                      </span>
                      <h3 className="text-sm sm:text-base font-serif font-bold text-slate-950 group-hover:text-amber-600 transition-colors line-clamp-1 leading-snug">
                        {product.tittle || "Untitled Product"}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 font-normal">
                        {product.description || "Bespoke designer garment from seller catalog."}
                      </p>
                    </div>

                    {/* Price & Action Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-base font-bold font-serif text-slate-950">
                        {formatPrice(product.price)}
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 group-hover:translate-x-0.5 transition-transform">
                        <span>View</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
};

export default Home;
