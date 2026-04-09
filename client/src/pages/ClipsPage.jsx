import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function ClipsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { video } = location.state || { video: { title: "Unknown Video", clips: [] } };

  return (
    <div className="min-h-screen bg-surface text-on-surface pb-32">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl flex items-center gap-4 px-6 py-4 shadow-xl shadow-black/30">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-emerald-400 active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold tracking-tighter truncate max-w-[240px]">
          {video.title}
        </h1>
      </header>

      <main className="pt-24 px-6 space-y-8">
        {/* Banner Section */}
        <div className="relative h-48 rounded-3xl overflow-hidden shadow-2xl">
          <img 
            src={video.image} 
            alt={video.title}
            className="w-full h-full object-cover brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6">
            <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
              {video.clips?.length || 0} Clips Generated
            </span>
          </div>
        </div>

        {/* Clips List */}
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold tracking-tight px-1">Golden Nuggets</h2>
          
          <div className="space-y-4">
            {video.clips && video.clips.length > 0 ? (
              video.clips.map((clip, index) => (
                <motion.div 
                  key={clip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => navigate("/feed", { state: { video, clip } })}
                  className="bg-surface-container-low p-5 rounded-[2rem] flex items-center gap-4 border border-white/5 active:scale-[0.98] transition-all cursor-pointer group hover:bg-surface-container"
                >
                  {/* Play Indicator */}
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-slate-950 transition-colors">
                    <span className="material-symbols-outlined !text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        play_circle
                    </span>
                  </div>

                  <div className="flex-grow overflow-hidden">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-[15px] truncate max-w-[180px]">{clip.title}</h3>
                        <span className="text-[10px] text-primary font-bold tabular-nums bg-primary/10 px-2 rounded-full">{clip.duration}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed opacity-70">
                      {clip.summary}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
                <div className="text-center py-20 opacity-50">
                    <span className="material-symbols-outlined text-6xl mb-4">movie_edit</span>
                    <p>No clips identified in this masterclass.</p>
                </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
