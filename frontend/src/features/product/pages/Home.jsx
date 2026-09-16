import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate} from "react-router";
import { useSelector } from "react-redux";
import { useProduct } from "../hook/useProduct";

const Home = () => {
  const products = useSelector((state) => state.product.products);
  const user = useSelector((state) => state.auth.user);
  const { handelGetProduct } = useProduct();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const Navigate = useNavigate()

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
    return Array.isArray(products) ? products : [products];
  }, [products]);

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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-md sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-[0.25em] text-slate-950">
              SNITCH
            </span>
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
          </Link>

          {!user && (
            <Link
              to="/login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-yellow-500 hover:text-slate-950"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <div className="mb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-600">
              Buyer Marketplace
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Shop latest products
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Explore all available products from SNITCH sellers.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm"
              />
            ))}
          </div>
        ) : productList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
            <h2 className="text-2xl font-black">No products found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Products will appear here after sellers publish them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {productList.map((product) => {
              const imageUrl = getImageUrl(product?.images?.[0]);

              return (
                <article
                onClick={()=>Navigate(`/product/${product._id}`)}
                  key={product._id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.tittle || "Product image"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h2 className="truncate text-sm font-bold capitalize text-slate-950">
                      {product.tittle || "Untitled Product"}
                    </h2>

                    <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-slate-500">
                      {product.description || "No description available."}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-black text-slate-950">
                        {formatPrice(product.price)}
                      </p>
                      {product.variants?.length > 0 && (
                        <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5">
                          {product.variants.length} variant{product.variants.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Home;
