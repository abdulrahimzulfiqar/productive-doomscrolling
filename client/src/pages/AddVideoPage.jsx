import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";
import { extractYoutubeId, getYoutubeThumbnail } from "../utils/videoUtils";

export default function AddVideoPage() {
  const navigate = useNavigate();
  const { addVideo } = useLibrary();
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState("");

  const handleProcess = async (e) => {
    e.preventDefault();
    if (url.trim()) {
      const videoId = extractYoutubeId(url);
      
      if (!videoId) {
        alert("Please enter a valid YouTube URL");
        return;
      }

      // 1. FAST METADATA FETCH
      let meta = {
        id: videoId,
        title: "Analyzing Video...",
        duration: "Calculating...",
        image: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
      };

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const metaRes = await fetch(`${backendUrl}/api/v1/metadata?url=${encodeURIComponent(url.trim())}`);
        if (metaRes.ok) {
           const metaData = await metaRes.json();
           meta = {
             id: metaData.id,
             title: metaData.title,
             duration: metaData.duration,
             image: metaData.thumbnail
           };
        }
      } catch (err) {
        console.warn("Fast metadata fetch failed, using defaults:", err);
      }

      const newVideo = {
        ...meta,
        url: url.trim(),
        status: "processing",
        clips: [] 
      };
      
      const { video, isNew } = await addVideo(newVideo);

      // If video exists and is already completed, go to it.
      // Otherwise, go to processing to sync/wait.
      if (!isNew && video.status === "completed") {
        navigate("/clips", { state: { video } });
      } else {
        navigate("/processing", { state: { videoId: video.id, url: video.url } });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-12">
      {/* Header - Already handled by App layout, but we can add secondary refinement if needed */}
      <header className="fixed top-0 w-full z-40 bg-slate-950/60 backdrop-blur-xl flex justify-between items-center px-6 py-4">
        <h1 className="text-xl font-bold tracking-tighter text-emerald-400 font-lexend">The Mindful Flow</h1>
        <button className="text-slate-400">
           <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <main className="pt-24 px-6 max-w-md mx-auto space-y-12">
        {/* Hero Section */}
        <section className="relative group">
          <div className="overflow-hidden rounded-3xl h-[340px] w-full relative">
            <img 
              alt="Serene Setting" 
              className="w-full h-full object-cover grayscale-[0.2] brightness-50 group-hover:scale-105 transition-transform duration-700" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAm3uLayL12LuyUgsF71MgaUZymwbdkjAudUw-MRyvdiCnC1l9feWymCqMvCxTPAa9Ow_53y_kHWTeO2umOUuvLVqoWbo3xZsPluaBamdvGgbBxT3TAMQTGHD69kOg0Y6oFBH0Ulx4FN42R74KjuaYYs-8KNPqWyHHTsXaNQ824O2bY0iMshS6Aw4KOg31cAA1XrjCOOo1ZVhrumnRzCxVl1mk-5ttmh_ef7bQlBI13KSFxvpDBnWAzdfedTrA0rQ6xCCEV8t3Hars"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-10 left-0 w-full px-6 text-center">
              <h2 className="text-[3rem] leading-[1.1] font-extrabold tracking-tight text-on-surface">
                Ready to <span className="text-primary italic">detox?</span>
              </h2>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <AnimatePresence mode="wait">
            {!showInput ? (
              <motion.div 
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 gap-6"
              >
                <div className="bg-surface-container-low p-8 rounded-[2.5rem] flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all duration-300 border border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-slate-950 transition-colors">
                      <span className="material-symbols-outlined !text-3xl">upload_file</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-on-surface">Upload File</p>
                      <p className="text-sm text-on-surface-variant font-medium">Import your digital logs</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                </div>

                <div 
                  onClick={() => setShowInput(true)}
                  className="bg-surface-container-low p-8 rounded-[2.5rem] flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all duration-300 border border-white/5"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-slate-950 transition-colors">
                      <span className="material-symbols-outlined !text-3xl">link</span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-on-surface">Paste a Link</p>
                      <p className="text-sm text-on-surface-variant font-medium">Sync with external sources</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="input"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface-container-low p-8 rounded-[2.5rem] border border-primary/20 shadow-2xl shadow-primary/5"
              >
                <div className="flex justify-between items-center mb-6 px-2">
                  <h3 className="text-xl font-bold text-on-surface">Paste YouTube Link</h3>
                  <button onClick={() => setShowInput(false)} className="text-slate-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="relative group">
                    <input 
                      autoFocus
                      type="text" 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-surface-container-lowest border-2 border-surface-container-highest rounded-2xl py-4 px-6 text-on-surface focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
                    />
                  </div>

                  {/* Action Button Section - specifically for the link input */}
                  <div className="pt-4">
                    <motion.button 
                      disabled={!url.trim()}
                      onClick={handleProcess}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: url.trim() ? 1 : 0.4,
                        y: 0,
                        scale: url.trim() ? 1 : 0.98
                      }}
                      className="w-full bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-600 text-slate-950 py-5 rounded-full font-bold shadow-[0_0_25px_rgba(62,180,137,0.3)] hover:shadow-[0_0_35px_rgba(62,180,137,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:cursor-not-allowed"
                    >
                      <span className="text-lg">Let's Go</span>
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
