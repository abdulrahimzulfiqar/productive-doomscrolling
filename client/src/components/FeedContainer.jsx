import React, { useState, useRef, useEffect } from "react";
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
  onClose 
}) {
  const [activeClipId, setActiveClipId] = useState(startClipId || (clips[0]?.id));
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef(null);

  // Industrial Standard: Handle Initial Scroll Position
  useEffect(() => {
    if (startClipId && containerRef.current) {
      const targetElement = document.getElementById(`feed-item-${startClipId}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [startClipId]);

  return (
    <div className="fixed inset-0 bg-black z-[100] h-[100dvh] w-full flex flex-col overflow-hidden">
      
      {/* Top Floating Controls */}
      <div className="absolute top-0 w-full z-50 p-6 flex justify-between items-start pointer-events-none">
        <button 
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center pointer-events-auto active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-white">close</span>
        </button>
        
        <div className="text-right pointer-events-auto">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-white">{isMuted ? "volume_off" : "volume_up"}</span>
          </button>
        </div>
      </div>

      {/* The Scroll Engine */}
      <div 
        ref={containerRef}
        className="flex-1 w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar"
      >
        {clips.map((clip) => (
          <div key={clip.id} id={`feed-item-${clip.id}`} className="snap-start h-screen w-full">
            <FeedItem 
              video={video}
              clip={clip}
              isActive={activeClipId === clip.id}
              isMuted={isMuted}
              onInView={(id) => setActiveClipId(id)}
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
