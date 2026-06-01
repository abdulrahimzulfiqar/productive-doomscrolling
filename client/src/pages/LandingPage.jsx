import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: "menu_book",
      title: "Active Learning Feed",
      description: "Convert mindless doomscrolling into targeted education. Learn concepts in bite-sized, structured intervals."
    },
    {
      icon: "psychology",
      title: "Semantic Video Slicing",
      description: "Our AI model analyzes transcripts to automatically segment long lectures and podcasts into coherent, stand-alone lessons."
    },
    {
      icon: "edit_note",
      title: "Interactive Insights",
      description: "Summarize key ideas, write custom notes, and build your digital library directly inside the video feed."
    },
    {
      icon: "speed",
      title: "Variable Speed Engine",
      description: "Speed up clips, loop complex segments, and master high-density information at your own pace."
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for exploring the platform and testing our video feed.",
      features: [
        "Process 5 videos / month",
        "AI-generated transcripts & summaries",
        "Standard mobile-optimized swipeable feed",
        "Custom clip-wise learning notes",
        "Standard email support"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Plus",
      price: "$10",
      period: "monthly",
      description: "For active learners who want to accelerate their knowledge intake.",
      features: [
        "Process 25 videos / month",
        "Includes all Free features",
        "Early access to beta features",
        "Priority email support"
      ],
      cta: "Go Plus",
      popular: true
    },
    {
      name: "Pro",
      price: "$20",
      period: "monthly",
      description: "For high-volume learners and intensive researchers.",
      features: [
        "Process 50 videos / month",
        "Includes all Plus features",
        "Priority support with < 12hr turnaround"
      ],
      cta: "Go Pro",
      popular: false
    }
  ];

  const faqs = [
    {
      question: "How does Udoom process long videos?",
      answer: "We download the video index and use generative AI models to semantically partition transcripts. This splits a 2-hour podcast or lecture into short, logical segments based on the sub-topics being discussed."
    },
    {
      question: "What is your refund policy?",
      answer: "We offer a 14-day refund window for Plus and Pro plans, provided no video processing minutes have been consumed on your account. To request a refund, please contact us at contact@udoom.pro."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription easily through your account billing panel. Your premium access will remain fully functional until the end of your current monthly billing period."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-lexend selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-10%] left-[20%] w-[300px] h-[300px] bg-emerald-500 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] right-[15%] w-[400px] h-[400px] bg-teal-500 rounded-full blur-[160px]" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <span className="text-2xl font-black tracking-tighter text-emerald-400">Udoom</span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="bg-white/5 hover:bg-white/10 border border-white/15 px-5 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200"
        >
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24 text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            Turn Doomscrolling Into Learning
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
            Every scroll makes you smarter
          </h1>
          <p className="max-w-2xl mx-auto text-white/60 text-lg leading-relaxed pt-2">
            Udoom uses Generative AI to semantically slice educational YouTube lectures, podcasts, and talks into a personalized, interactive mobile learning feed.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4"
        >
          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider px-8 py-4.5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98]"
          >
            Start Learning For Free
          </button>
          <a
            href="#pricing"
            className="w-full sm:w-auto text-white/70 hover:text-white text-sm font-semibold tracking-wide px-8 py-4.5 rounded-2xl border border-white/10 hover:border-white/20 transition-all text-center"
          >
            View Pricing
          </a>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight">Supercharged for Retention</h2>
          <p className="text-white/40 text-sm leading-relaxed">
            Engineered from the ground up for high-efficiency mobile micro-learning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 hover:border-white/15 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">{feature.icon}</span>
              </div>
              <h3 className="font-bold text-lg">{feature.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight">Simple, Transparent Pricing</h2>
          <p className="text-white/40 text-sm leading-relaxed">
            All plans include a 14-day refund window. Scale or cancel at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative bg-white/[0.02] border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${plan.popular ? 'border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.05)] bg-slate-900/40' : 'border-white/5'}`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white/70">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-white/40 text-xs font-medium">/ {plan.period}</span>
                  </div>
                  <p className="text-white/50 text-xs mt-3 leading-relaxed">{plan.description}</p>
                </div>

                <div className="border-t border-white/5 pt-6 space-y-3">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-white/70">
                      <span className="material-symbols-outlined text-emerald-400 !text-sm mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate("/login")}
                className={`w-full mt-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] ${plan.popular ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 border-t border-white/5">
        <h2 className="text-3xl font-extrabold tracking-tight text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-2.5">
              <h3 className="font-bold text-lg text-emerald-400">{faq.question}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} Udoom. All rights reserved.
          </p>
          <p className="text-white/25 text-[10px] max-w-xs leading-relaxed">
            Payments on Udoom are securely processed by Lemon Squeezy, our authorized Merchant of Record.
          </p>
          <p className="text-white/15 text-[9px] max-w-xs leading-normal">
            Disclaimer: Udoom is an independent platform and is not affiliated, endorsed, or officially connected with YouTube, LLC or Google LLC. We utilize public embeds and APIs in compliance with standard developer terms.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs text-white/50">
          <Link to="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
          <Link to="/refund" className="hover:text-emerald-400 transition-colors">Refund Policy</Link>
          <a href="mailto:contact@udoom.pro" className="hover:text-emerald-400 transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
