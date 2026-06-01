import React from "react";
import { useNavigate } from "react-router-dom";

export default function RefundPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-lexend selection:bg-emerald-500/30 py-16 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-colors"
        >
          <span className="material-symbols-outlined !text-lg">arrow_back</span>
          Back to Home
        </button>

        <div className="space-y-4">
          <h1 className="text-3xl font-black tracking-tight border-b border-white/10 pb-4">Refund Policy</h1>
          <p className="text-white/40 text-xs">Last updated: May 30, 2026</p>
        </div>

        <div className="space-y-6 text-white/70 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Refund Eligibility</h2>
            <p>
              We want you to be completely satisfied with Udoom. We offer a **14-day money-back guarantee** for our paid subscriptions (Plus and Pro plans) under the following conditions:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1 text-white/60">
              <li>Your refund request must be submitted within 14 days of your initial purchase or billing date.</li>
              <li>Your account must have processed **0 videos** during the active billing cycle for which the refund is requested.</li>
            </ul>
            <p className="text-white/50 text-xs">
              Note: We reserve the right to refuse or deny refunds to accounts showing signs of system abuse, sharing login credentials, or violating our Terms of Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Proactive Credit Consumption</h2>
            <p>
              Because Udoom uses costly GPU and LLM pipeline resources to transcribe, segment, and summarize videos, processing credits are immediately consumed upon submitting a video link. If any videos have been processed, the transaction is non-refundable. Deleting a processed video or clip from your library will not restore your processed video quota or make you eligible for a refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. How to Request a Refund</h2>
            <p>
              To request a refund, please send an email to our support team at <a href="mailto:contact@udoom.pro" className="text-emerald-400 hover:underline">contact@udoom.pro</a>. Please include the following details in your email:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1 text-white/60">
              <li>Your Udoom account email address.</li>
              <li>Your transaction reference number or invoice ID (provided by our merchant of record, Lemon Squeezy).</li>
              <li>A brief explanation of why you are requesting a refund (your feedback helps us improve!).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Refund Processing</h2>
            <p>
              Once your request is received and verified for eligibility, we will process your refund. The refund will automatically be applied to your original method of payment within 5 to 10 business days, depending on your bank or credit card issuer.
            </p>
            <p className="text-white/50 text-xs">
              All refunds are processed in the original currency of purchase. Any currency exchange fluctuations or foreign transaction fees charged by your bank are outside our control and non-refundable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Plan Cancellations</h2>
            <p>
              You can cancel your subscription at any time through your billing settings. Upon cancellation, your account will remain active with premium benefits until the end of your current billing period. Cancelled subscriptions are not eligible for partial or prorated refunds for the remaining days of that cycle.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
