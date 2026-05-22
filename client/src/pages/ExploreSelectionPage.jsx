import React, { useState, useMemo, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";

/**
 * VideoSelectionCard
 * Highly optimized selection card using standard HTML divs, targeted CSS transitions,
 * and a lightweight overlay instead of expensive opacity and grayscale filters.
 */
const VideoSelectionCard = memo(({ video, isSelected, onToggle }) => {
  const watchedCount = useMemo(() => {
    return video.clips?.filter(c => c.is_watched).length || 0;
  }, [video.clips]);

  const totalCount = video.clips?.length || 0;
  const watchPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

  return (
    <div
      style={{ 
        contentVisibility: "auto", 
        containIntrinsicSize: "0 180px" 
      }}
      onClick={onToggle}
      className={`relative cursor-pointer rounded-2xl overflow-hidden active:scale-[0.97] transition-shadow duration-200 select-none ${
        isSelected 
          ? "ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]" 
          : "ring-1 ring-white/10"
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden bg-surface-container-high">
        <img 
          src={video.image} 
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />

        {/* Dimming overlay for unselected — simple opacity layer, no filters */}
        {!isSelected && (
          <div className="absolute inset-0 bg-black/50 z-10" />
        )}

        {/* Selection Checkbox — solid backgrounds only, NO backdrop-blur */}
        <div className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center z-20 ${
          isSelected 
            ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
            : "bg-slate-800/90 border border-white/20"
        }`}>
          {isSelected && (
            <span className="material-symbols-outlined text-black !text-lg font-black">
              check
            </span>
          )}
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 inset-x-0 p-3 z-20">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-white/90 uppercase tracking-wider">
              {totalCount} clips
            </span>
            <span className="text-[9px] font-bold text-emerald-400">
              {watchPercent}%
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-1.5 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${watchPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className={`px-3 py-3 transition-colors duration-200 ${isSelected ? "bg-emerald-500/10" : "bg-surface-container"}`}>
        <h3 className="text-[11px] font-semibold leading-tight line-clamp-2 text-white/80">
          {video.title}
        </h3>
      </div>
    </div>
  );
});

VideoSelectionCard.displayName = "VideoSelectionCard";

/**
 * ExploreSelectionPage
 */
export default function ExploreSelectionPage() {
  const navigate = useNavigate();
  const { library, toggleVideoExplore } = useLibrary();

  const eligibleVideos = useMemo(() => {
    return library.filter(v => v.status === "completed" && v.clips?.length > 0);
  }, [library]);

  const [selected, setSelected] = useState(new Set());
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (eligibleVideos.length > 0 && !hasInitialized.current) {
      const initial = new Set();
      eligibleVideos.forEach(v => {
        if (v.in_explore) initial.add(v.id);
      });
      setSelected(initial);
      hasInitialized.current = true;
    }
  }, [eligibleVideos]);

  const [isSaving, setIsSaving] = useState(false);

  const allSelected = eligibleVideos.length > 0 && selected.size === eligibleVideos.length;

  const handleToggleVideo = (videoId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleVideos.map(v => v.id)));
    }
  };

  const handleStartDoomscrolling = async () => {
    setIsSaving(true);

    const promises = eligibleVideos.map(v => {
      const shouldBeExplore = selected.has(v.id);
      if (v.in_explore !== shouldBeExplore) {
        return toggleVideoExplore(v.id, shouldBeExplore);
      }
      return Promise.resolve();
    });

    try {
      await Promise.all(promises);
    } catch (e) {
      console.error("Failed to save selection:", e);
    } finally {
      setIsSaving(false);
    }

    navigate("/feed", { state: { exploreMode: true } });
  };

  const totalClips = useMemo(() => {
    return eligibleVideos
      .filter(v => selected.has(v.id))
      .reduce((sum, v) => sum + (v.clips?.length || 0), 0);
  }, [selected, eligibleVideos]);

  return (
    <div className="min-h-screen bg-background text-on-surface pb-32">
      <header className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl flex items-center gap-4 px-6 py-4 border-b border-white/5">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary active:scale-90 transition-transform border border-white/5"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col overflow-hidden">
          <h1 className="text-sm font-bold tracking-tight truncate text-white/90">
            Explore Feed
          </h1>
          <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Select Videos</span>
        </div>
      </header>

      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pt-24 px-6"
      >
        <section className="max-w-lg mx-auto text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-emerald-400 !text-4xl">explore</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">
            Build Your Feed
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
            Select the videos you want to mix into your personalized doomscroll. 
            Clips will play in order across all selected videos.
          </p>
        </section>

        {eligibleVideos.length > 0 && (
          <section className="max-w-lg mx-auto mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
                {selected.size} of {eligibleVideos.length} videos
              </span>
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-container-high text-white/60 border border-white/10 hover:border-emerald-500/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined !text-sm">
                  {allSelected ? "check_box" : "select_all"}
                </span>
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          {eligibleVideos.length > 0 ? (
            eligibleVideos.map((video) => (
              <VideoSelectionCard
                key={video.id}
                video={video}
                isSelected={selected.has(video.id)}
                onToggle={() => handleToggleVideo(video.id)}
              />
            ))
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <span className="material-symbols-outlined !text-6xl">movie_filter</span>
              <p className="font-medium text-lg text-white">
                No videos ready yet.<br/>
                <span className="text-sm font-normal">Process some videos first to build your feed.</span>
              </p>
            </div>
          )}
        </section>
      </motion.main>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-28 left-0 right-0 z-50 px-6"
          >
            <div className="max-w-lg mx-auto">
              <button
                onClick={handleStartDoomscrolling}
                disabled={isSaving}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 font-black text-sm uppercase tracking-widest shadow-[0_8px_30px_rgba(16,185,129,0.35)] active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Preparing Feed...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined !text-xl">rocket_launch</span>
                    Start Doomscrolling — {totalClips} Clips
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
