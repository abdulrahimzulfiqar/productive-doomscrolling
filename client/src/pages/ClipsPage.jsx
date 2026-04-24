import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";

export default function ClipsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchVideoDetail } = useLibrary();
  
  // Use local state initialized from route state
  const [video, setVideo] = React.useState(location.state?.video || null);
  const [isLoading, setIsLoading] = React.useState(!video?.clips || video.clips.length === 0);

  React.useEffect(() => {
    if (video && (!video.clips || video.clips.length === 0)) {
      setIsLoading(true);
      fetchVideoDetail(video.id).then(fullVideo => {
        if (fullVideo) setVideo(fullVideo);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [video?.id, fetchVideoDetail]);

  if (!video) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-32">
      {/* Cinematic Header */}
      <header className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl flex items-center gap-4 px-6 py-4 border-b border-white/5">
        <button 
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary active:scale-90 transition-transform border border-white/5"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col overflow-hidden">
          <h1 className="text-sm font-bold tracking-tight truncate text-white/90">
            {video.title}
          </h1>
          <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Library / Masterclass</span>
        </div>
      </header>

      <main className="pt-20 space-y-0">
        {/* Cinema Banner Section */}
        <div className="relative aspect-video w-full overflow-hidden shadow-2xl">
          <img 
            src={video.image} 
            alt={video.title}
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Summary Badge Overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10"
            >
               <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-400 text-sm">auto_awesome</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Mindful Summary</span>
               </div>
               <p className="text-[13px] text-white/90 leading-relaxed italic font-medium">
                 "This masterclass dives deep into {video.title}, distilling {video.clips?.length} core insights for high-impact learning."
               </p>
            </motion.div>
          </div>
        </div>

        {/* Clips List Section */}
        <section className="px-6 pt-10 space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-black tracking-tighter text-white">Golden Nuggets</h2>
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{video.clips?.length || 0} Lessons</span>
          </div>
          
          <div className="grid gap-5 min-h-[300px]">
            <AnimatePresence mode="wait">
            {isLoading ? (
                <motion.div 
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_20px_rgba(16,185,129,0.2)]" />
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Distilling Insights</h3>
                    <p className="text-xs text-white/40 uppercase tracking-widest font-mono">Neural layers are loading...</p>
                  </div>
                </motion.div>
            ) : video.clips && video.clips.length > 0 ? (
              video.clips.map((clip, index) => (
                <motion.div 
                  key={clip.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate("/feed", { state: { video, clip } })}
                  className="group relative bg-surface-container-highest p-0.5 rounded-[1.8rem] border border-white/5 active:scale-[0.96] transition-all cursor-pointer overflow-hidden shadow-lg shadow-black/20"
                >
                  <div className="flex items-center gap-4 p-4 rounded-[1.7rem] bg-slate-900/40 group-hover:bg-emerald-500/10 transition-colors">
                    {/* Lesson Index */}
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/5 group-hover:border-emerald-500/30 transition-all">
                      <span className="text-[10px] font-mono text-white/40 group-hover:text-emerald-400">#{index + 1}</span>
                      <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">play_arrow</span>
                    </div>

                    <div className="flex-grow overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-[15px] truncate text-white/90 group-hover:text-primary transition-colors">{clip.title}</h3>
                          <div className="flex items-center gap-1 opacity-60">
                             <span className="text-[10px] font-mono text-emerald-400">{clip.duration}</span>
                          </div>
                      </div>
                      <p className="text-[12px] text-white/50 line-clamp-2 leading-relaxed opacity-80">
                        {clip.summary}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
                <div className="text-center py-20 opacity-30">
                    <span className="material-symbols-outlined text-6xl mb-4 font-thin">movie_edit</span>
                    <p className="text-sm">No nuggets found for this video.</p>
                </div>
            )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
