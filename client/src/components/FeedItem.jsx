import React, { useState } from "react";
import { useInView } from "react-intersection-observer";
import YouTubePlayer from "./YouTubePlayer";
import { motion, AnimatePresence } from "framer-motion";

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
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const { ref, inView } = useInView({
    threshold: 0.6, // Industrial Balance: 60% visibility required
    triggerOnce: false,
  });

  // Notify parent when this specific item becomes the center of attention
  React.useEffect(() => {
    if (inView) {
      onInView(clip.id);
    }
  }, [inView, clip.id, onInView]);

  return (
    <div 
      ref={ref}
      className="h-screen w-full flex-shrink-0 snap-start relative bg-black flex flex-col items-center justify-center overflow-hidden"
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
              onProgress={(p) => setProgress(p)}
              onReady={() => setIsLoading(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Spinner */}
      {isActive && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
        </div>
      )}

      {/* Overlay: Branding & Info */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/60 to-transparent p-8 pb-32">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
              Golden Nugget
            </span>
            <span className="text-white/40 text-xs font-medium italic">#{clip.id.split('-c')[1] || '?'}</span>
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight leading-tight">
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
