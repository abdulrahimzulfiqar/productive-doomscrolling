import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FeedItem from "./FeedItem";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FeedContainer
 * High-performance scroller for a list of video clips.
 */
export default function FeedContainer({ 
  video, 
  clips, 
  startClipId, 
  onClose,
  exploreMode = false,
  onActiveClipChange
}) {
  const navigate = useNavigate();
  const [activeClipId, setActiveClipId] = useState(startClipId || (clips[0]?.id));
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef(null);

  // Refs to track absolute display counter in exploreMode
  const initialWatchedCountRef = useRef(null);
  if (initialWatchedCountRef.current === null) {
    initialWatchedCountRef.current = clips.filter(c => c.is_watched).length;
  }

  const sessionStartIndexRef = useRef(null);
  if (sessionStartIndexRef.current === null) {
    const idx = clips.findIndex(c => c.id === (startClipId || clips[0]?.id));
    sessionStartIndexRef.current = idx !== -1 ? idx : 0;
  }

  // Industrial Standard: Handle Initial Scroll Position
  useEffect(() => {
    if (startClipId && containerRef.current) {
      const targetElement = document.getElementById(`feed-item-${startClipId}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [startClipId]);

  // Determine the display counter index
  let displayIndex;
  if (exploreMode) {
    const currentWatchedCount = clips.filter(c => c.is_watched).length;
    const sessionWatchedCount = Math.max(0, currentWatchedCount - initialWatchedCountRef.current);
    const activeIndex = clips.findIndex(c => c.id === activeClipId);
    const sessionOffset = activeIndex !== -1 ? activeIndex - sessionStartIndexRef.current : 0;
    
    displayIndex = initialWatchedCountRef.current + sessionOffset + sessionWatchedCount + 1;
    displayIndex = Math.max(1, Math.min(clips.length, displayIndex));
  } else {
    displayIndex = clips.findIndex(c => c.id === activeClipId) + 1;
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] h-[100dvh] w-full flex flex-col overflow-hidden">
      
      {/* Top Floating Controls */}
      <div className="absolute top-0 w-full z-50 p-6 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center opacity-60 hover:opacity-100 active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined text-white">close</span>
          </button>
 
          {exploreMode && (
            <button
              onClick={() => navigate("/explore/select")}
              className="h-12 px-6 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center gap-2 text-white text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 active:scale-90 transition-all duration-200"
            >
              <span className="material-symbols-outlined !text-sm">tune</span>
              Select
            </button>
          )}
        </div>
        
        {/* Center: Clip Counter */}
        <div className="flex items-center">
          <span className="text-emerald-400 text-[10px] font-mono font-bold tracking-widest">
            {displayIndex} / {clips.length}
          </span>
        </div>
 
        <div className="text-right pointer-events-auto">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center opacity-60 hover:opacity-100 active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined text-white">{isMuted ? "volume_off" : "volume_up"}</span>
          </button>
        </div>
      </div>

      {/* The Scroll Engine */}
      <div 
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
      >
        {clips.map((clip) => (
          <div 
            key={clip.id} 
            id={`feed-item-${clip.id}`} 
            className="snap-start snap-always h-[100dvh] w-full"
            style={{ contentVisibility: 'auto', containIntrinsicSize: '100dvh' }}
          >
            <FeedItem 
              video={clip.parentVideo || video}
              clip={clip}
              isActive={activeClipId === clip.id}
              isMuted={isMuted}
              showGoToVideo={exploreMode}
              onInView={(id) => {
                setActiveClipId(id);
                if (onActiveClipChange) {
                  onActiveClipChange(id);
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Unmute Overlay (Persistent) */}
      <AnimatePresence>
        {isMuted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMuted(false)}
            className="absolute inset-0 z-40 flex items-center justify-center bg-transparent cursor-pointer pointer-events-none"
          >
            <div className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full flex items-center gap-3 border border-white/10 pointer-events-auto shadow-2xl">
              <span className="material-symbols-outlined text-emerald-400">volume_up</span>
              <span className="text-sm font-bold tracking-tight text-white">Tap to Unmute</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
