import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useSelector } from "react-redux";
import { useAuth } from "../../features/auth/hook/useAuth.js";

const Nav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, isAuthenticated, handleLogout } = useAuth();
  const isUserLoggedIn = Boolean(user || token || isAuthenticated);
  const cartItems = useSelector((state) => state.cart?.items || []);
  const cartCount = Array.isArray(cartItems)
    ? cartItems.reduce((total, item) => total + (item.quantity || 1), 0)
    : 0;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    setIsDropdownOpen(false);
    await handleLogout();
    navigate("/login");
  };

  const isSeller = user?.role === "seller";
  const userDisplayName = user?.fullname || user?.email?.split("@")[0] || "User";
  const userInitial = userDisplayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-8 py-3.5">
        
        {/* Left: Brand Logo & Main Links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-[0.25em] text-slate-950 transition-colors group-hover:text-amber-600">
              SNITCH
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-200" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link
              to="/"
              className={`transition hover:text-slate-950 ${
                location.pathname === "/" ? "font-semibold text-slate-950" : ""
              }`}
            >
              Shop
            </Link>

            {isSeller && (
              <>
                <Link
                  to="/seller/dashboard"
                  className={`flex items-center gap-1.5 transition hover:text-slate-950 ${
                    location.pathname.startsWith("/seller/dashboard")
                      ? "font-semibold text-slate-950"
                      : ""
                  }`}
                >
                  <span>Dashboard</span>
                  <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 uppercase">
                    Seller
                  </span>
                </Link>

                <Link
                  to="/seller/create-product"
                  className={`transition hover:text-slate-950 ${
                    location.pathname === "/seller/create-product"
                      ? "font-semibold text-slate-950"
                      : ""
                  }`}
                >
                  + Add Product
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Right: Actions (Cart, User, Auth) */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Cart Icon (Buyer / Public) */}
          <Link
            to="/cart"
            className="relative flex items-center justify-center p-2 text-slate-700 hover:text-slate-950 rounded-full hover:bg-slate-100 transition"
            title="Cart"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>

            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-xs animate-scale-in">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* User Auth Section */}
          {isUserLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 text-left transition hover:border-slate-300 hover:bg-slate-100 focus:outline-none"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white uppercase">
                  {userInitial}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-slate-800 leading-tight max-w-[100px] truncate">
                    {userDisplayName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium capitalize">
                    {user?.role || "Member"}
                  </p>
                </div>
                <svg
                  className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-100 bg-white py-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {user?.fullname || "Account"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    {user?.role && (
                      <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                        {user.role}
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      to="/"
                      className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      Shop Collection
                    </Link>
                    <Link
                      to="/cart"
                      className="flex items-center justify-between px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <span>My Cart</span>
                      {cartCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {cartCount}
                        </span>
                      )}
                    </Link>

                    {isSeller && (
                      <>
                        <div className="my-1 border-t border-slate-100" />
                        <Link
                          to="/seller/dashboard"
                          className="block px-4 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50"
                        >
                          Seller Dashboard
                        </Link>
                        <Link
                          to="/seller/create-product"
                          className="block px-4 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50"
                        >
                          Add New Product
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-flex rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center p-2 text-slate-700 hover:text-slate-950 rounded-lg hover:bg-slate-100"
            aria-label="Toggle navigation"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-5 py-4 shadow-lg animate-in slide-in-from-top duration-150">
          <div className="flex flex-col gap-3">
            <Link
              to="/"
              className={`py-2 text-sm font-medium ${
                location.pathname === "/" ? "font-bold text-slate-950" : "text-slate-700"
              }`}
            >
              Shop All
            </Link>
            <Link
              to="/cart"
              className="flex items-center justify-between py-2 text-sm font-medium text-slate-700"
            >
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {isSeller && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                  Seller Studio
                </p>
                <Link
                  to="/seller/dashboard"
                  className="block py-1.5 text-sm font-medium text-teal-700"
                >
                  Dashboard
                </Link>
                <Link
                  to="/seller/create-product"
                  className="block py-1.5 text-sm font-medium text-teal-700"
                >
                  + Add Product
                </Link>
              </div>
            )}

            {!isUserLoggedIn && (
              <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="w-full text-center rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-800"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="w-full text-center rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Nav;