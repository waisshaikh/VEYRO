import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../hook/useAuth.js";
import { API_BASE_URL } from "../../../config/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullname: "",
    contact: "",
    email: "",
    password: "",
    isSeller: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState({});

  const { loading, error, successMessage, handleRegister, resetMessages } = useAuth();

  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const pwdStrength = getPasswordStrength(form.password);

  const validate = () => {
    const errs = {};
    if (!form.fullname.trim()) {
      errs.fullname = "Full name is required";
    } else if (form.fullname.trim().length < 2) {
      errs.fullname = "At least 2 characters required";
    }

    if (!form.contact.trim()) {
      errs.contact = "Contact number is required";
    } else if (!/^\d{10}$/.test(form.contact.trim())) {
      errs.contact = "Valid 10-digit phone number required";
    }

    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Enter a valid email";
    }

    if (!form.password) {
      errs.password = "Password is required";
    } else if (form.password.length < 6) {
      errs.password = "At least 6 characters required";
    }

    setLocalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const updateField = (e) => {
    const { name, value, checked, type } = e.target;
    if (localErrors[name]) {
      setLocalErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (error || successMessage) {
      resetMessages();
    }
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const res = await handleRegister({
      fullname: form.fullname.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      password: form.password,
      isSeller: form.isSeller,
    });

    if (res?.success) {
      setTimeout(() => {
        navigate("/");
      }, 700);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden font-sans">
      
      {/* Left Column: Clean Luxury Fashion Banner */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden select-none">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1400&auto=format&fit=crop"
          alt="Veyro Luxury Collection"
          className="w-full h-full object-cover object-center"
        />
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30" />

        {/* Top Brand Logo */}
        <div className="absolute top-8 left-8 z-10">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="text-2xl font-black font-outfit tracking-[0.25em] text-white uppercase">
              VEYRO
            </span>
            <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_10px_#2dd4bf]" />
          </Link>
        </div>
      </div>

      {/* Right Column: Premium Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white overflow-y-auto">
        
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <span className="text-xl font-black font-outfit tracking-widest text-slate-950 uppercase">
              VEYRO
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          </Link>
          <div className="text-xs text-slate-500 ml-auto">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-teal-600 hover:text-teal-700 hover:underline transition"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[460px] mx-auto my-auto py-3">
          
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold font-outfit text-slate-900 tracking-tight">
              Create Account
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Join the VEYRO luxury clothing brand portal.
            </p>
          </div>

          {/* Account Role Selector */}
          <div className="mb-4 p-1 rounded-xl bg-slate-100 border border-slate-200 flex">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isSeller: false }))}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                !form.isSeller
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Customer Member
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isSeller: true }))}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
                form.isSeller
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Seller / Merchant
            </button>
          </div>

          {/* Status Feedback */}
          {error && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-3 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label htmlFor="fullname" className="block text-xs font-semibold text-slate-700">
                Full Name
              </label>
              <input
                id="fullname"
                name="fullname"
                type="text"
                placeholder="Alex Morgan"
                value={form.fullname}
                onChange={updateField}
                className={`w-full px-3.5 py-2.5 rounded-xl input-luxury text-sm ${
                  localErrors.fullname ? "border-red-500 focus:border-red-500" : ""
                }`}
              />
              {localErrors.fullname && (
                <p className="text-xs text-red-600 mt-0.5">{localErrors.fullname}</p>
              )}
            </div>

            {/* Contact & Email Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="contact" className="block text-xs font-semibold text-slate-700">
                  Phone (10-digit)
                </label>
                <input
                  id="contact"
                  name="contact"
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={form.contact}
                  onChange={updateField}
                  className={`w-full px-3.5 py-2.5 rounded-xl input-luxury text-sm ${
                    localErrors.contact ? "border-red-500 focus:border-red-500" : ""
                  }`}
                />
                {localErrors.contact && (
                  <p className="text-xs text-red-600 mt-0.5">{localErrors.contact}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="alex@veyro.com"
                  value={form.email}
                  onChange={updateField}
                  className={`w-full px-3.5 py-2.5 rounded-xl input-luxury text-sm ${
                    localErrors.email ? "border-red-500 focus:border-red-500" : ""
                  }`}
                />
                {localErrors.email && (
                  <p className="text-xs text-red-600 mt-0.5">{localErrors.email}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={updateField}
                  className={`w-full px-3.5 py-2.5 pr-11 rounded-xl input-luxury text-sm ${
                    localErrors.password ? "border-red-500 focus:border-red-500" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {localErrors.password && (
                <p className="text-xs text-red-600 mt-0.5">{localErrors.password}</p>
              )}

              {/* Password Strength */}
              {form.password && (
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 rounded-full transition-all ${
                        pwdStrength >= level
                          ? level === 1
                            ? "bg-red-400"
                            : level === 2
                            ? "bg-amber-400"
                            : level === 3
                            ? "bg-teal-500"
                            : "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl btn-gradient-primary font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                form.isSeller ? "Register as Seller" : "Create Account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google OAuth Button (At the bottom of the form) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 text-slate-700 font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign up with Google</span>
          </button>

        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} VEYRO APPAREL. All rights reserved.
        </div>

      </div>

    </div>
  );
}
