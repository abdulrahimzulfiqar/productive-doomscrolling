import React from "react";
import { useLibrary } from "../hooks/useLibrary";

export default function VideoCard({ video }) {
  const { deleteVideo } = useLibrary();

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this video?")) {
      deleteVideo(video.id);
    }
  };

  return (
    <div className="flex flex-col gap-2 group cursor-pointer mb-4 relative active:scale-[0.97] transition-transform duration-200">
      {/* Cinematic Thumbnail Card */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-surface-container-high shadow-lg transition-all duration-500 lg:group-hover:scale-[1.03] lg:group-hover:shadow-emerald-500/10">
        <img 
          alt={video.title} 
          src={video.image}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 lg:group-hover:scale-110" 
        />
        
        {/* Modern Delete Button: Always visible on mobile, hover-only on desktop */}
        <button 
          onClick={handleDelete}
          className="absolute top-2 right-2 p-2 bg-black/40 backdrop-blur-md rounded-xl text-white/60 hover:text-red-400 hover:bg-black/80 transition-all z-20 lg:opacity-0 lg:group-hover:opacity-100"
        >
          <span className="material-symbols-outlined !text-lg">delete</span>
        </button>

        {/* Status Overlay */}
        {video.status !== "completed" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center gap-3 z-10">
            <div className={`p-3 rounded-full bg-white/5 border border-white/10 ${video.status === 'failed' ? '' : 'animate-pulse'}`}>
              <span className={`material-symbols-outlined text-3xl ${video.status === 'failed' ? 'text-red-400' : 'text-primary'}`}>
                {video.status === 'failed' ? 'priority_high' : 'neurology'}
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
              {video.status === 'failed' ? 'Analysis Failed' : 'Synthesizing...'}
            </p>
          </div>
        )}

        {/* Quick Play Info (Glass Overlay): Persistent on mobile for clarity */}
        {video.status === "completed" && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/40 to-transparent flex justify-between items-end lg:translate-y-2 lg:group-hover:translate-y-0 transition-transform">
             <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30">
                  <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </div>
                <span className="text-[10px] font-bold text-white tracking-widest leading-none">{video.clips?.length || 0} CLIPS</span>
             </div>
             <div className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-white/5">
                {video.duration || "0:00"}
             </div>
          </div>
        )}
      </div>
      
      {/* Refined Typography */}
      <h3 className="text-[13px] font-semibold leading-tight px-1 text-on-surface line-clamp-2 transition-colors lg:group-hover:text-primary">
        {video.title}
      </h3>
    </div>
  );
}
