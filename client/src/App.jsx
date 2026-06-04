import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import BottomNav from "./components/BottomNav";
import HomePage from "./pages/HomePage";
import AddVideoPage from "./pages/AddVideoPage";
import ProcessingPage from "./pages/ProcessingPage";
import ClipsPage from "./pages/ClipsPage";
import FeedPage from "./pages/FeedPage";
import ExploreSelectionPage from "./pages/ExploreSelectionPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LibraryProvider } from "./context/LibraryContext";

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function LibraryShell({ children }) {
  return (
    <LibraryProvider>
      <div className="mx-auto w-full bg-surface min-h-[100dvh] relative shadow-2xl overflow-hidden">
        <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav />
      </div>
    </LibraryProvider>
  );
}

function AppContent() {
  const { user, authLoading, subscription } = useAuth();

  // Initialize Paddle.js and configure it for Retain
  useEffect(() => {
    if (authLoading) return;

    const PADDLE_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "test_7db7e163c467a14ee32f7a932d0";
    const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENVIRONMENT || "sandbox";

    const initPaddle = () => {
      if (window.Paddle) {
        try {
          if (!window.Paddle.Initialized) {
            if (PADDLE_ENV === "sandbox") {
              window.Paddle.Environment.set("sandbox");
            }
            window.Paddle.Initialize({ token: PADDLE_TOKEN });
          }
          
          // If user is logged in and has a verified Paddle Customer ID (starts with ctm_), sync it with Retain
          if (user && subscription?.paddle_customer_id?.startsWith("ctm_")) {
            console.log("Syncing customer with Paddle Retain:", subscription.paddle_customer_id);
            window.Paddle.Update({
              pwCustomer: {
                id: subscription.paddle_customer_id
              }
            });
          }
        } catch (err) {
          console.error("Failed to initialize/update Paddle.js:", err);
        }
      }
    };

    if (window.Paddle) {
      initPaddle();
    } else {
      const handleLoad = () => initPaddle();
      window.addEventListener("paddlejs:loaded", handleLoad);
      return () => window.removeEventListener("paddlejs:loaded", handleLoad);
    }
  }, [user, subscription, authLoading]);

  // Auth loading state: show a minimal dark spinner
  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <LibraryShell><HomePage /></LibraryShell> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/refund" element={<RefundPolicy />} />

        {/* Protected Routes */}
        <Route path="/add" element={<ProtectedRoute><LibraryShell><AddVideoPage /></LibraryShell></ProtectedRoute>} />
        <Route path="/processing" element={<ProtectedRoute><LibraryShell><ProcessingPage /></LibraryShell></ProtectedRoute>} />
        <Route path="/clips" element={<ProtectedRoute><LibraryShell><ClipsPage /></LibraryShell></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><LibraryShell><FeedPage /></LibraryShell></ProtectedRoute>} />
        <Route path="/explore/select" element={<ProtectedRoute><LibraryShell><ExploreSelectionPage /></LibraryShell></ProtectedRoute>} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Vercel Web Analytics */}
      <Analytics />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
