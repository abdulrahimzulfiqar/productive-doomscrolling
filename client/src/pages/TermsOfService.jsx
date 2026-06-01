import React from "react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-black tracking-tight border-b border-white/10 pb-4">Terms of Service</h1>
          <p className="text-white/40 text-xs">Last updated: May 30, 2026</p>
        </div>

        <div className="space-y-6 text-white/70 text-sm leading-relaxed">
          <p>
            Welcome to Udoom. These Terms of Service govern your use of the website located at udoom.pro (including its subdomains) and any related services provided by Udoom.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing our website and using our services, you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, you are prohibited from using the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">2. Description of Service</h2>
            <p>
              Udoom is a productivity-focused web application that uses artificial intelligence to segment and summarize public educational videos (primarily from YouTube) into structured, swipeable short-form feeds. 
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. User Accounts & Eligibility</h2>
            <p>
              To access certain features of the service, you must create a registered account. You represent and warrant that you are at least 16 years of age. You agree to provide accurate information during registration and are responsible for maintaining the confidentiality of your account credentials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">4. Fair Usage, Billing, & Merchant of Record</h2>
            <p>
              We enforce quota limits based on your subscription tier (Free, Plus, or Pro). Video processing quotas represent the number of videos transcribed, segmented, and indexed by our backend servers.
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1 text-white/60">
              <li>Credits do not roll over to the next billing cycle.</li>
              <li>You may not use bots, scripts, or automated tools to scrape, exploit, or overload our AI processing pipeline.</li>
              <li>All subscription billing, payment processing, and invoicing are securely handled by our authorized Merchant of Record, **Paddle**. By completing a purchase, you agree to their buyer terms and conditions.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">5. Video & Copyright Rules</h2>
            <p>
              Udoom relies on public video embeds. We do not host or claim ownership over any original video footage or transcripts processed on the platform. All copyrights belong to the respective content creators. Users must only submit video links that comply with YouTube's Terms of Service and do not infringe on intellectual property rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">6. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account immediately, without prior notice or liability, if you breach these Terms of Service, engage in platform abuse, or fail to pay subscription invoices.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Udoom and its developers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of or inability to use the service, including AI processing inaccuracies, video unavailability, or server downtime.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white">8. Contact Us</h2>
            <p>
              If you have any questions or feedback regarding these Terms of Service, please contact us at <a href="mailto:contact@udoom.pro" className="text-emerald-400 hover:underline">contact@udoom.pro</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
