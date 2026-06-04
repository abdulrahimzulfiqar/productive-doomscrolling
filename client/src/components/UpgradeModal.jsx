import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function UpgradeModal({ isOpen, onClose, reason = "Unlock premium features" }) {
  const { user, subscription, refreshSubscription } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Client-side Token and Environment
  const PADDLE_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || ""; 
  const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";

  // Price IDs mapping (Sandbox)
  const PRICE_PLUS_MONTH = import.meta.env.VITE_PADDLE_PRICE_PLUS_MONTHLY || "";
  const PRICE_PLUS_YEAR = import.meta.env.VITE_PADDLE_PRICE_PLUS_YEARLY || "";
  const PRICE_PRO_MONTH = import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY || "";
  const PRICE_PRO_YEAR = import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY || "";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setCheckoutSuccess(false);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const plans = [
    {
      id: "plus",
      name: "Udoom Plus",
      price: billingPeriod === "monthly" ? "$9.99" : "$7.99",
      period: billingPeriod === "monthly" ? "mo" : "mo (billed annually)",
      priceId: billingPeriod === "monthly" ? PRICE_PLUS_MONTH : PRICE_PLUS_YEAR,
      description: "For active daily learners.",
      features: [
        "Process 25 videos / month",
        "Unlimited video lengths",
        "Interactive learning summaries",
        "Early access to beta controls"
      ],
      popular: true,
      color: "from-emerald-500 to-teal-500",
      glow: "rgba(16,185,129,0.15)"
    },
    {
      id: "pro",
      name: "Udoom Pro",
      price: billingPeriod === "monthly" ? "$24.99" : "$19.99",
      period: billingPeriod === "monthly" ? "mo" : "mo (billed annually)",
      priceId: billingPeriod === "monthly" ? PRICE_PRO_MONTH : PRICE_PRO_YEAR,
      description: "For high-volume research and study.",
      features: [
        "Process 50 videos / month",
        "Unlimited video lengths",
        "Priority AI segmentation queue",
        "Dedicated email support (<12h)"
      ],
      popular: false,
      color: "from-teal-500 to-cyan-500",
      glow: "rgba(20,184,166,0.1)"
    }
  ];

  const handleUpgrade = async (plan) => {
    if (!user) {
      alert("Please sign in or create an account to upgrade.");
      return;
    }

    if (!window.Paddle) {
      alert("Paddle SDK has not loaded yet. Please try again in a moment.");
      return;
    }

    setLoading(true);

    try {
      // 1. Update Paddle's eventCallback for this modal instance
      window.Paddle.Update({
        eventCallback: (event) => {
          if (event.name === "checkout.completed") {
            console.log("Paddle checkout success event received client-side", event.data);
            setCheckoutSuccess(true);
            refreshSubscription();
          }
        }
      });

      // 2. Open Paddle checkout overlay
      // Per official Paddle docs: https://developer.paddle.com/paddle-js/methods/paddle-checkout-open
      window.Paddle.Checkout.open({
        items: [
          {
            priceId: plan.priceId,
            quantity: 1
          }
        ],
        customer: {
          email: user.email
        },
        customData: {
          user_id: user.id
        },
        settings: {
          displayMode: "overlay",
          theme: "dark"
        }
      });
    } catch (error) {
      console.error("Failed to mount checkout overlay:", error);
      alert("Could not load checkout. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors cursor-pointer w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:border-white/10"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {checkoutSuccess ? (
          /* Checkout Success Screen */
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">Upgrade Successful!</h2>
            <p className="text-white/60 max-w-md text-sm leading-relaxed">
              Your subscription status has been updated. You now have full access to your new limits. Happy learning!
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Back to Udoom
            </button>
          </div>
        ) : (
          /* Core Pricing Plan Screen */
          <div className="space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-[10px] text-emerald-400 tracking-[0.25em] font-bold uppercase block">Subscription Upgrade</span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">{reason}</h2>
              <p className="text-white/40 text-xs md:text-sm">
                Get more processing power, longer video support, and custom insights.
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-xs font-semibold ${billingPeriod === 'monthly' ? 'text-white' : 'text-white/40'}`}>Monthly</span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className="relative w-12 h-6 bg-white/10 rounded-full transition-colors duration-200 border border-white/10 flex items-center p-0.5"
              >
                <div className={`w-4.5 h-4.5 bg-emerald-400 rounded-full transition-transform duration-200 ${billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingPeriod === 'yearly' ? 'text-white' : 'text-white/40'}`}>
                Yearly
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Save 20%</span>
              </span>
            </div>

            {/* Plan Display Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white/[0.02] border rounded-3xl p-6 md:p-8 flex flex-col justify-between transition-all duration-300 ${plan.popular ? 'border-emerald-500/30' : 'border-white/5'}`}
                  style={{ boxShadow: plan.popular ? `0 0 40px ${plan.glow}` : "none" }}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-6 bg-emerald-500 text-slate-950 text-[9px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
                      Highly Recommended
                    </span>
                  )}
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                      <p className="text-white/40 text-xs mt-1">{plan.description}</p>
                      <div className="flex items-baseline gap-1 mt-4">
                        <span className="text-3xl font-black text-white">{plan.price}</span>
                        <span className="text-white/40 text-xs">/ {plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-3 pt-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-xs text-white/70">
                          <span className="material-symbols-outlined text-emerald-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={loading}
                      className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                        plan.popular 
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        `Upgrade to ${plan.id === "plus" ? "Plus" : "Pro"}`
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-[10px] text-white/30">
                Secured by Paddle. All plans include 256-bit encryption. Cancel anytime.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
