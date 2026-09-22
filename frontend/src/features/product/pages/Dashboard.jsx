import React, { useEffect, useMemo, useState } from "react";
import { Link} from "react-router";
import { useNavigate } from "react-router";
import { useProduct } from "../hook/useProduct";
import { useSelector } from "react-redux";

const Dashboard = () => {
  const { handleGetSellerproduct } = useProduct();
  const sellerProducts = useSelector((state) => state.product.sellerProducts);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate()

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError("");
        await handleGetSellerproduct();
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load seller products."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const products = useMemo(() => {
    if (!sellerProducts) return [];
    return Array.isArray(sellerProducts) ? sellerProducts : [sellerProducts];
  }, [sellerProducts]);

  const totalValue = products.reduce((sum, product) => {
    return sum + Number(product?.price?.amount || 0);
  }, 0);

  const formatPrice = (price) => {
    if (!price) return "INR 0";

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: price.currency || "INR",
      maximumFractionDigits: 0,
    }).format(Number(price.amount || 0));
  };

  const getImageUrl = (image) => {
    if (!image) return "";

    const markdownUrl = String(image).match(/\((https?:\/\/[^)]+)\)/);
    return markdownUrl ? markdownUrl[1] : image;
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/95 px-6 py-4 shadow-xs backdrop-blur-md sm:px-10">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-4">
          <Link
            to="/"
            className="text-xs font-bold text-slate-600 transition hover:text-teal-700"
          >
            Back to Home
          </Link>

          <Link
            to="/seller/create-product"
            className="rounded-full bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
          >
            Add Product
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-7">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Seller Studio
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Product Dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Manage the products published from your seller account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Products
              </p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {products.length}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Stock Value
              </p>
              <p className="mt-1 text-xl font-black text-teal-700">
                ₹{totalValue.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[245px] animate-pulse rounded-lg border border-slate-200 bg-white shadow-sm"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
            <h2 className="text-xl font-black text-slate-950">
              No products yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Start your seller catalog by publishing your first garment.
            </p>
            <Link
              to="/seller/create-product"
              className="mt-6 inline-flex rounded-full bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
            >
              Create Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {products.map((product) => {
              const imageUrl = getImageUrl(product?.images?.[0]);

              return (
                <div
                onClick={()=>{navigate(`/seller/product/${product._id}`)}}
                  key={product._id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative h-48 bg-slate-100 sm:h-52">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.tittle || "Product image"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                        No image
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-teal-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-sm">
                      Published
                    </span>
                  </div>

                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-xs font-black uppercase text-slate-950">
                          {product.tittle || "Untitled Product"}
                        </h2>
                        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          Product ID {product._id?.slice(-6)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-black text-teal-700">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 min-h-8 text-[11px] leading-4 text-slate-500">
                      {product.description || "No description added."}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px]">
                      <span className="font-bold text-slate-500">
                        {product.images?.length || 0} image
                        {(product.images?.length || 0) === 1 ? "" : "s"}
                      </span>
                      <span className="font-bold text-teal-700">
                        VEYRO VERIFIED
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>

  );
};

export default Dashboard;
