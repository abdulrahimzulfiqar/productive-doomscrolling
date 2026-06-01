import React from "react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-black tracking-tight border-b border-white/10 pb-4">Privacy Policy</h1>
          <p className="text-white/40 text-xs">Last updated: May 30, 2026</p>
        </div>

        <div className="space-y-6 text-white/70 text-sm leading-relaxed">
          <p>
            At Udoom, accessible from udoom.pro, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Udoom and how we use it.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Information We Collect</h2>
            <p>
              We collect information that you directly provide to us, including:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1 text-white/60">
              <li>**Account Information:** Your name, email address, password, and profile preferences when you register.</li>
              <li>**User Content:** Video links (URLs) you submit, processed transcripts, and any personal notes or summaries you create inside the app.</li>
              <li>**Payment Information:** Payment details processed securely by our third-party merchant of record (Paddle). We do not store credit card numbers on our servers.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. How We Use Your Information</h2>
            <p>
              We use the collected information in various ways, including to:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1 text-white/60">
              <li>Provide, operate, and maintain our educational video feed.</li>
              <li>Process and segment the videos you submit using our AI processing pipelines.</li>
              <li>Improve, personalize, and expand Udoom's features.</li>
              <li>Communicate with you, including for customer support and subscription updates.</li>
              <li>Detect and prevent transaction fraud or platform abuse.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. Third-Party Integrations</h2>
            <p>
              Udoom utilizes third-party tools to deliver its services:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1 text-white/60">
              <li>**YouTube API / Embeds:** Our video player displays content from YouTube. By using Udoom, you agree to be bound by the YouTube Terms of Service and Google Privacy Policy.</li>
              <li>**Supabase:** We use Supabase for secure cloud authentication and database storage.</li>
              <li>**Paddle:** All payment transactions, subscription billing, and VAT/sales tax calculations are processed securely by our certified Merchant of Record partner.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Data Retention and Deletion</h2>
            <p>
              We retain your personal information for as long as your account is active. You may request the deletion of your account and associated notes/history at any time by contacting us at <a href="mailto:contact@udoom.pro" className="text-emerald-400 hover:underline">contact@udoom.pro</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Security</h2>
            <p>
              We use industry-standard security measures, including HTTPS encryption and token-based authentication (JWTs) via Supabase, to protect your personal data from unauthorized access, alteration, or disclosure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">6. Children's Privacy</h2>
            <p>
              We do not knowingly collect or solicit personal data from children under 16 years of age. If you are under 16, please do not attempt to register for Udoom or send any personal data about yourself to us. If we learn that we have collected personal data from a child under 16, we will delete that information as quickly as possible. If you believe that a child under 16 may have provided personal data to us, please contact us at <a href="mailto:contact@udoom.pro" className="text-emerald-400 hover:underline">contact@udoom.pro</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
