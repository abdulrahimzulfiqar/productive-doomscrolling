import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import BottomNav from "./components/BottomNav";
import HomePage from "./pages/HomePage";
import AddVideoPage from "./pages/AddVideoPage";
import ProcessingPage from "./pages/ProcessingPage";
import ClipsPage from "./pages/ClipsPage";
import FeedPage from "./pages/FeedPage";

function App() {
  return (
    <BrowserRouter>
      {/* 
        We wrap the entire application in a mobile-first container 
        that caps the width to 480px on desktop screens to simulate a native app.
      */}
      <div className="mx-auto w-full bg-surface min-h-[100dvh] relative shadow-2xl overflow-hidden">
        
        {/* Main Content Area */}
        <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-24">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/add" element={<AddVideoPage />} />
            <Route path="/processing" element={<ProcessingPage />} />
            <Route path="/clips" element={<ClipsPage />} />
            <Route path="/feed" element={<FeedPage />} />
          </Routes>
        </div>

        {/* Global Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Vercel Web Analytics */}
      <Analytics />
    </BrowserRouter>
  );
}

export default App;
