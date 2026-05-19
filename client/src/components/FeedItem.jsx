import React, { useState } from "react";
import { useInView } from "react-intersection-observer";
import YouTubePlayer from "./YouTubePlayer";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";

/**
 * FeedItem Component
 * Represents a single scrollable slide in the TikTok-style feed.
 * 
 * Performance Note: We only spawn the YouTube IFrame when the item is 'In View'.
 * Otherwise, we show a static thumbnail to save massive amounts of RAM.
 */
export default function FeedItem({ 
  video, 
  clip, 
  isActive, 
  isMuted, 
  onInView 
}) {
  const { markClipWatched, saveClipNote } = useLibrary();
  const [isPaused, setIsPaused] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(clip.user_notes || "");
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 2X Playback Speed States & Refs
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isHoldingSpeed, setIsHoldingSpeed] = useState(false);
  const holdTimeoutRef = React.useRef(null);
  const isHoldingRef = React.useRef(false);

  // Unified Gesture Controls for Hold-to-2x
  const handlePointerDown = (e) => {
    if (showNoteInput) return;
    // Only accept primary mouse click or touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);

    holdTimeoutRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setIsHoldingSpeed(true);
      setPlaybackRate(2);
    }, 350);
  };

  const handlePointerUpOrCancel = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (isHoldingSpeed) {
      setIsHoldingSpeed(false);
      setPlaybackRate(1);
      
      // Reset the hold flag after a tiny timeout.
      // This allows the synchronous onClick handler on desktop to run first and ignore the click,
      // while preventing mobile touch-hold from leaving this flag in the 'true' state!
      setTimeout(() => {
        isHoldingRef.current = false;
      }, 50);
    }
  };

  const handleClick = () => {
    if (showNoteInput) return;
    
    if (isHoldingRef.current) {
      // It was a long press, so ignore this click
      isHoldingRef.current = false;
    } else {
      // It was a simple quick tap, toggle Play/Pause
      setIsPaused(prev => !prev);
    }
  };

  const { ref, inView } = useInView({
    threshold: 0.6, // Industrial Balance: 60% visibility required
    triggerOnce: false,
  });

  // Notify parent when this specific item becomes the center of attention
  React.useEffect(() => {
    let watchTimer;

    if (inView) {
      onInView(clip.id);
      
      // Industrial Watch Rule: 20 seconds of active view = Watched
      if (!clip.is_watched) {
        watchTimer = setTimeout(() => {
          console.log(`[FeedItem] Marking clip ${clip.id} as watched...`);
          markClipWatched(clip.id);
        }, 20000);
      }
    } else {
      // Auto-pause when scrolling away
      setIsPaused(false);
      setPlaybackRate(1);
      setIsHoldingSpeed(false);
    }

    return () => {
      if (watchTimer) clearTimeout(watchTimer);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    };
  }, [inView, clip.id, clip.is_watched, onInView, markClipWatched]);

  return (
    <div 
      ref={ref}
      className="h-full w-full flex-shrink-0 snap-start relative bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background Layer: Thumbnail placeholder for performance */}
      {!isActive && (
        <img 
          src={video.image} 
          alt="Video Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm scale-110"
        />
      )}

      {/* Main Player Layer: Only mounted when active */}
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div 
            key={`player-${clip.id}`} // Stable Key: Prevents remounts on progress update
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 w-full h-full"
          >
            <YouTubePlayer 
              videoId={video.id} 
              start={clip.start} 
              end={clip.end} 
              isMuted={isMuted}
              isPaused={isPaused}
              playbackRate={playbackRate}
              aspectRatio={video.aspectRatio || "9:16"}
              onProgress={(p) => setProgress(p)}
              onReady={() => setIsLoading(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speed Indicator Overlay (TikTok Style) */}
      <AnimatePresence>
        {isHoldingSpeed && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full flex items-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.4)] pointer-events-none"
          >
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-400 !text-sm animate-pulse">fast_forward</span>
              <span className="text-white text-xs font-black tracking-widest uppercase">2X Speed</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stop/Play & Speed Gesture Overlay (Ignore if typing note) */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onPointerLeave={handlePointerUpOrCancel}
        onClick={handleClick}
        className={`absolute inset-0 z-10 flex items-center justify-center ${showNoteInput ? 'pointer-events-none' : 'cursor-pointer'}`}
      >
        <AnimatePresence>
          {(isPaused && !showNoteInput) && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10"
            >
              <span className="material-symbols-outlined text-white text-5xl">play_arrow</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading Spinner */}
      {isActive && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
        </div>
      )}

      {/* Overlay: Branding & Info */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/60 to-transparent p-8 pb-12 z-20 pointer-events-none">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                Udoom Clip
              </span>
              <span className="text-white/40 text-xs font-medium italic">#{clip.id.split('-c')[1] || '?'}</span>
            </div>

            {/* Note Toggle Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowNoteInput(!showNoteInput);
                if (!showNoteInput) setIsPaused(true); // Pause while writing
              }}
              className={`p-2 rounded-full transition-all pointer-events-auto ${showNoteInput || clip.user_notes ? 'bg-primary text-black scale-110' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
            >
              <span className="material-symbols-outlined !text-sm">edit_note</span>
            </button>
          </div>
          
          <AnimatePresence>
            {showNoteInput && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed bottom-[45dvh] left-4 right-4 max-w-md mx-auto z-50 pointer-events-auto"
              >
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                  <textarea
                    autoFocus
                    placeholder="Capture your insight here..."
                    className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-white/30 resize-none min-h-[80px]"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={() => {
                        saveClipNote(clip.id, noteText);
                        setShowNoteInput(false);
                      }}
                      className="bg-emerald-500 text-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter"
                    >
                      Save Insight
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <h2 className={`text-2xl font-bold tracking-tight leading-tight transition-opacity ${showNoteInput ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            {clip.title}
          </h2>
          
          <p className="text-white/70 text-sm leading-relaxed line-clamp-3">
            {clip.summary}
          </p>

          {/* Persistent Progress Bar (True Time Synced) */}
          <div className="pt-4 flex items-center gap-4">
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
             <div 
               className="h-full bg-emerald-400 shadow-[0_0_12px_#4ade80] transition-all duration-200 ease-linear"
               style={{ width: `${progress}%` }}
             />
            </div>
            <span className="text-[10px] font-mono text-white/40">{clip.duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
