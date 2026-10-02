import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  User,
  Phone,
  KeyRound,
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coffee,
  RotateCcw,
  MapPin
} from 'lucide-react';
import { qrOrderService, type CustomerAuth, type TableSessionInfo } from '../services/qrOrderService';

interface CustomerLoginModalProps {
  isOpen: boolean;
  clientId: string;
  orgId?: string;
  tableInfo?: TableSessionInfo | null;
  onLoginSuccess: (customer: CustomerAuth) => void;
  onContinueAsGuest?: () => void;
}

export const CustomerLoginModal: React.FC<CustomerLoginModalProps> = ({
  isOpen,
  clientId,
  orgId,
  tableInfo,
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [step, setStep] = useState<'INPUT' | 'OTP'>('INPUT');

  // Form Fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Extract restaurant name & branch name
  const restaurantName = tableInfo?.clientName || tableInfo?.restaurantName || 'Restaurant';
  const rawBranch = tableInfo?.branchName || tableInfo?.branchSlug || tableInfo?.location || '';
  const branchName = rawBranch && rawBranch.trim().toLowerCase() !== restaurantName.trim().toLowerCase() ? rawBranch.trim() : '';
  const tableNumber = tableInfo?.tableNumber;

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const validatePhone = (val: string) => {
    const clean = val.replace(/[\s()-]/g, '');
    return clean.length >= 7;
  };

  // ── Step 1: Send OTP ──────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'SIGNUP') {
      if (!name.trim()) {
        setError('Full Name is required for registration.');
        return;
      }
      if (!phone.trim() || !validatePhone(phone)) {
        setError('A valid Phone Number is required for registration.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        // Check if customer already exists
        const check = await qrOrderService.checkEmail(cleanEmail, clientId);
        if (!check.exists) {
          // Switch to signup mode automatically with a friendly message
          setMode('SIGNUP');
          setError('No existing account found with this email. Please enter your name and phone number to sign up.');
          setLoading(false);
          return;
        }
      }

      await qrOrderService.sendOtp(cleanEmail);
      setStep('OTP');
      setResendCooldown(30);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const auth = await qrOrderService.verifyOtp({
        identifier: cleanEmail,
        name: mode === 'SIGNUP' ? name.trim() : undefined,
        phone: mode === 'SIGNUP' ? phone.trim() : undefined,
        otp: cleanOtp,
        clientId,
        orgId,
      });

      // Persist auth details
      localStorage.setItem('qr_customer_auth', JSON.stringify(auth));
      if (auth.name) localStorage.setItem('qr_customer_name', auth.name);
      if (auth.phone) localStorage.setItem('qr_customer_phone', auth.phone);
      if (auth.email) localStorage.setItem('qr_customer_email', auth.email);

      onLoginSuccess(auth);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await qrOrderService.sendOtp(email.trim().toLowerCase());
      setResendCooldown(30);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to resend code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Soft, Light, Airy Header Banner */}
        <div className="relative pt-7 pb-4 px-6 text-center bg-gradient-to-b from-orange-50/60 via-amber-50/30 to-white border-b border-slate-100/80">
          {/* Subtle Cafe Icon Badge */}
          <div className="inline-flex items-center justify-center w-12 h-12 mb-2.5 rounded-2xl bg-white border border-orange-200/70 text-orange-600 shadow-sm shadow-orange-500/10">
            <Coffee className="w-6 h-6 stroke-[2.2]" />
          </div>

          {/* Restaurant Name */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {restaurantName}
          </h2>

          {/* Branch Name (Displayed right below restaurant name) */}
          {branchName && (
            <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-slate-100/80 text-slate-600 text-xs font-bold border border-slate-200/50">
              <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
              <span>{branchName}</span>
            </div>
          )}

          {/* Table Badge */}
          {tableNumber && (
            <div className="block mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200/70 rounded-full text-xs font-extrabold text-orange-700 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Table #{tableNumber}
              </span>
            </div>
          )}

          <p className="mt-2 text-xs text-slate-500 font-medium max-w-xs mx-auto">
            {step === 'OTP'
              ? 'Enter the 6-digit code sent to your email to continue'
              : mode === 'LOGIN'
              ? 'Sign in with your email to order & track your bill'
              : 'Create your guest account to order & earn loyalty rewards'}
          </p>
        </div>

        {/* Tab Toggle (Only in INPUT step) */}
        {step === 'INPUT' && (
          <div className="px-6 pt-4">
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'LOGIN'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'SIGNUP'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                New Guest? Sign Up
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 pt-4">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-red-700"
              >
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 'INPUT' ? (
            <form onSubmit={handleSendOtp} className="space-y-3.5">
              {/* Email Field (Always visible) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs pl-10 pr-3.5 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white transition-all font-medium text-slate-800 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Sign Up Fields: Name and Phone (Mandatory) */}
              {mode === 'SIGNUP' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3.5"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-orange-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alex Johnson"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs pl-10 pr-3.5 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white transition-all font-medium text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number <span className="text-orange-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs pl-10 pr-3.5 py-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white transition-all font-medium text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Used for order status updates and loyalty reward points.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Email</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Step 2: OTP Verification Form */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center pb-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 mb-2 border border-orange-100">
                  <KeyRound className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Enter the 6-digit OTP code sent to:
                </p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{email}</p>
                <button
                  type="button"
                  onClick={() => {
                    setStep('INPUT');
                    setError(null);
                    setOtp('');
                  }}
                  className="mt-1 text-[11px] text-orange-600 hover:underline font-semibold"
                >
                  Change Email
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[0.5em] text-xl font-black py-3 bg-slate-50/70 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white transition-all text-slate-900"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                  className="font-bold text-orange-600 hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Start Ordering</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Continue as Guest option */}
          {onContinueAsGuest && step === 'INPUT' && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                Browse menu as guest &rarr;
              </button>
            </div>
          )}

          {/* Loyalty notice */}
          {tableInfo?.loyaltyEnabled && (
            <div className="mt-3.5 p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-center gap-2 text-[11px] text-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Logging in lets you collect loyalty reward points on today's order!</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerLoginModal;
