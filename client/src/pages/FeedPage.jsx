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

  // Freeze the explore feed IDs for the duration of this doomscrolling session.
  // This prevents clips from re-sorting or jumping around when watch progress updates.
  const [exploreFeedIds, setExploreFeedIds] = useState([]);

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

  // Freeze the feed IDs when computed feed becomes available
  useEffect(() => {
    if (isExploreMode && computedFeed.length > 0 && exploreFeedIds.length === 0) {
      setExploreFeedIds(computedFeed.map(c => c.id));
    }
  }, [isExploreMode, computedFeed, exploreFeedIds.length]);

  // Live-map the frozen IDs back to the actual, up-to-date clip objects in the library context.
  // Use a lookup Map for maximum O(N) performance.
  const exploreFeed = React.useMemo(() => {
    if (exploreFeedIds.length === 0) return [];
    const clipMap = new Map();
    library.forEach(video => {
      video.clips?.forEach(clip => {
        clipMap.set(clip.id, { ...clip, parentVideo: video });
      });
    });
    return exploreFeedIds.map(id => clipMap.get(id)).filter(Boolean);
  }, [exploreFeedIds, library]);

  useEffect(() => {
    if (!isInitializing) return;
    
    if (isExploreMode && libraryFetched && (exploreFeed.length > 0 || computedFeed.length === 0)) {
      const activeFeed = exploreFeed.length > 0 ? exploreFeed : computedFeed;
      if (resumeKey) {
        const savedClipId = localStorage.getItem(resumeKey);
        
        // Find the saved clip in the active feed
        const savedClip = activeFeed.find(c => c.id === savedClipId);
        
        if (savedClip) {
          // If the saved clip is already watched, find the first unwatched clip in the feed instead
          if (savedClip.is_watched) {
            const firstUnwatched = activeFeed.find(c => !c.is_watched);
            if (firstUnwatched) {
              console.log(`[FeedPage] Saved clip ${savedClipId} is watched. Resuming at first unwatched: ${firstUnwatched.id}`);
              setStartClipId(firstUnwatched.id);
            } else {
              // If all clips are watched, default to the saved clip
              setStartClipId(savedClipId);
            }
          } else {
            setStartClipId(savedClipId);
          }
        } else if (activeFeed.length > 0) {
          // Fallback to first unwatched clip
          const firstUnwatched = activeFeed.find(c => !c.is_watched);
          setStartClipId(firstUnwatched ? firstUnwatched.id : activeFeed[0].id);
        }
      } else if (activeFeed.length > 0) {
        const firstUnwatched = activeFeed.find(c => !c.is_watched);
        setStartClipId(firstUnwatched ? firstUnwatched.id : activeFeed[0].id);
      }
      setIsInitializing(false);
    }
  }, [isExploreMode, exploreFeed, computedFeed, resumeKey, libraryFetched, isInitializing]);

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
