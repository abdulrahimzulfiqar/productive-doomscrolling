import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setShowSuccess(true);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-400 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-lexend">Check Your Email</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            We sent a confirmation link to <span className="text-emerald-400 font-semibold">{email}</span>. 
            Please verify your email to continue.
          </p>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs text-white/40 space-y-2 text-left leading-relaxed">
            <p className="font-bold text-white/60 flex items-center gap-1.5">
              <span className="material-symbols-outlined !text-sm text-emerald-400">help</span>
              Didn't get an email?
            </p>
            <p>
              Check your spam folder, or you might already have an account with this email. Try returning to the sign-in screen.
            </p>
          </div>

          <button
            onClick={() => { setShowSuccess(false); setIsSignUp(false); }}
            className="text-emerald-400 hover:text-emerald-300 text-sm font-bold underline underline-offset-4 transition-colors"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo & Tagline */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black tracking-tighter text-emerald-400 font-lexend">
            Udoom
          </h1>
          <p className="text-white/40 text-sm tracking-wide">
            Turn doomscrolling into learning
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder:text-white/30 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm placeholder:text-white/30 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs text-center font-medium"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider py-4 rounded-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin mx-auto" />
            ) : (
              isSignUp ? "Create Account" : "Sign In"
            )}
          </button>
        </form>


        {/* Toggle Sign In / Sign Up */}
        <p className="text-center text-white/30 text-sm">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
            className="text-emerald-400 font-bold hover:underline underline-offset-4"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>


      </motion.div>
    </div>
  );
}
