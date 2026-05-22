import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FeedContainer from "../components/FeedContainer";
import { useExploreFeed } from "../hooks/useExploreFeed";
import { useAuth } from "../context/AuthContext";
import { useLibrary } from "../hooks/useLibrary";

/**
 * FeedPage
 * Acts as a wrapper around the FeedContainer engine.
 * Supports both:
 * 1. Single Video Mode (Clips Flow)
 * 2. Explore Mode (Sequential Round-Robin, interleaved and normalized across selected videos)
 */
export default function FeedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { library } = useLibrary();

  // Mode resolution
  // Direct clip play mode (from clips list page) passes state.video and state.clip
  const initialVideo = location.state?.video || null;
  const initialClip = location.state?.clip || null;
  const isExploreMode = location.state?.exploreMode || (!initialVideo && !initialClip);

  // Get the interleaved, normalized explore feed
  const { exploreFeed: computedFeed, selectedVideos } = useExploreFeed();

  // Freeze the explore feed order for the duration of this doomscrolling session.
  // This prevents clips from re-sorting or jumping around when watch progress updates.
  const [exploreFeed, setExploreFeed] = useState([]);

  // Resolve starting clip for explore mode (from localStorage)
  const resumeKey = user ? `explore_resume_clip_id_${user.id}` : null;
  const [startClipId, setStartClipId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(isExploreMode);
  
  // Guard against layout flash of "empty feed" state while library fetches
  const [libraryFetched, setLibraryFetched] = useState(false);

  useEffect(() => {
    if (library.length > 0) {
      setLibraryFetched(true);
    } else {
      const timer = setTimeout(() => {
        setLibraryFetched(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [library]);

  // Freeze the feed when computed feed becomes available
  useEffect(() => {
    if (isExploreMode && computedFeed.length > 0 && exploreFeed.length === 0) {
      setExploreFeed(computedFeed);
    }
  }, [isExploreMode, computedFeed, exploreFeed.length]);

  useEffect(() => {
    if (isExploreMode && libraryFetched && (exploreFeed.length > 0 || computedFeed.length === 0)) {
      const activeFeed = exploreFeed.length > 0 ? exploreFeed : computedFeed;
      if (resumeKey) {
        const savedClipId = localStorage.getItem(resumeKey);
        // Verify that the saved clip actually exists in our current explore feed
        if (savedClipId && activeFeed.some(c => c.id === savedClipId)) {
          setStartClipId(savedClipId);
        } else if (activeFeed.length > 0) {
          setStartClipId(activeFeed[0].id);
        }
      } else if (activeFeed.length > 0) {
        setStartClipId(activeFeed[0].id);
      }
      setIsInitializing(false);
    }
  }, [isExploreMode, exploreFeed, computedFeed, resumeKey, libraryFetched]);

  // Handle active clip change to persist resume state
  const handleActiveClipChange = (clipId) => {
    if (isExploreMode && resumeKey) {
      localStorage.setItem(resumeKey, clipId);
    }
  };

  // If in explore mode
  if (isExploreMode) {
    if (!libraryFetched) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        </div>
      );
    }

    if (selectedVideos.length === 0) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white p-6">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-400 !text-4xl">explore</span>
            </div>
            <h2 className="text-xl font-bold">Your feed is empty</h2>
            <p className="opacity-60 text-sm max-w-xs mx-auto">
              Please select at least one video to include in your personalized doomscroll feed.
            </p>
            <button 
              onClick={() => navigate("/explore/select")} 
              className="bg-emerald-500 text-slate-950 px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"
            >
              Select Videos
            </button>
          </div>
        </div>
      );
    }

    if (isInitializing || !startClipId) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        </div>
      );
    }

    return (
      <FeedContainer
        video={null} // Pass null, as each clip will use clip.parentVideo in Explore mode
        clips={exploreFeed}
        startClipId={startClipId}
        onClose={() => navigate("/")}
        exploreMode={true}
        onActiveClipChange={handleActiveClipChange}
      />
    );
  }

  // Fallback to single video play mode
  if (!initialVideo || !initialClip) {
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
      video={initialVideo}
      clips={initialVideo.clips}
      startClipId={initialClip.id}
      onClose={() => navigate(-1)}
    />
  );
}
