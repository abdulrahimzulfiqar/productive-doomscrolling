import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FeedContainer from "../components/FeedContainer";

/**
 * FeedPage
 * Now acts as a thin wrapper around the FeedContainer engine.
 * Receives the video and specific starting clip.
 */
export default function FeedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { video, clip } = location.state || {};

  if (!video || !clip) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white p-6">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-red-400 text-6xl">videocam_off</span>
          <p className="opacity-60 text-lg">Clip metadata missing.</p>
          <button 
            onClick={() => navigate("/")} 
            className="bg-emerald-500 text-slate-950 px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <FeedContainer 
      video={video}
      clips={video.clips} // ALL clips from this video
      startClipId={clip.id} // Start scrolling at the one clicked
      onClose={() => navigate(-1)} // Go back to Clips list or Library
    />
  );
}
