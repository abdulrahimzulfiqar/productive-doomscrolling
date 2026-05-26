import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import BottomNav from "./components/BottomNav";
import HomePage from "./pages/HomePage";
import AddVideoPage from "./pages/AddVideoPage";
import ProcessingPage from "./pages/ProcessingPage";
import ClipsPage from "./pages/ClipsPage";
import FeedPage from "./pages/FeedPage";
import ExploreSelectionPage from "./pages/ExploreSelectionPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LibraryProvider } from "./context/LibraryContext";

/**
 * AppContent: The authenticated app shell.
 * Renders either the Login page or the main app based on auth state.
 */
function AppContent() {
  const { user, authLoading } = useAuth();

  // Auth loading state: show a minimal dark spinner
  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in: show login page
  if (!user) {
    return <LoginPage />;
  }

  // Logged in: show the full app
  return (
    <LibraryProvider>
      <BrowserRouter>
        <div className="mx-auto w-full bg-surface min-h-[100dvh] relative shadow-2xl overflow-hidden">
          <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/add" element={<AddVideoPage />} />
              <Route path="/processing" element={<ProcessingPage />} />
              <Route path="/clips" element={<ClipsPage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/explore/select" element={<ExploreSelectionPage />} />
            </Routes>
          </div>

          {/* Global Bottom Navigation */}
          <BottomNav />
        </div>

        {/* Vercel Web Analytics */}
        <Analytics />
      </BrowserRouter>
    </LibraryProvider>
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
