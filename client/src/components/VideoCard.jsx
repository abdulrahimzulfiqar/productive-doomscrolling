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
    <div className="flex flex-col gap-3 group cursor-pointer mb-2 relative">
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-surface-container-high transition-transform duration-300 xl:group-hover:scale-[1.02] active:scale-95">
        <img 
          alt={video.title} 
          src={video.image}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
        />
        
        {/* Delete Button */}
        <button 
          onClick={handleDelete}
          className="absolute top-2 left-2 p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white/60 hover:text-red-400 hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
        >
          <span className="material-symbols-outlined !text-xl">delete</span>
        </button>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-bold tracking-widest text-white shadow-sm">
          {video.duration}
        </div>
        
        {/* Status Overlay for Processing/Failed */}
        {video.status !== "completed" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 text-center gap-2">
            <span className={`material-symbols-outlined text-3xl ${video.status === 'failed' ? 'text-red-400' : 'text-primary animate-spin'}`}>
              {video.status === 'failed' ? 'error' : 'sync'}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-tight text-white/80">
              {video.status === 'failed' ? 'Failed' : 'Analyzing...'}
            </p>
          </div>
        )}

        {/* Gradient Overlay & Play Icon */}
        {video.status === "completed" && (
          <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
            <span 
              className="material-symbols-outlined text-primary text-3xl" 
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_circle
            </span>
          </div>
        )}
      </div>
      
      {/* Title */}
      <h3 className="text-sm font-medium leading-tight px-1 text-on-surface line-clamp-2">
        {video.title}
      </h3>
    </div>
  );
}
