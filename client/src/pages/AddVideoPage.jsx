import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";
import { extractYoutubeId, getYoutubeThumbnail } from "../utils/videoUtils";

export default function AddVideoPage() {
  const navigate = useNavigate();
  const { addVideo, library } = useLibrary();
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleProcess = async (e) => {
    e.preventDefault();
    if (url.trim()) {
      const videoId = extractYoutubeId(url);
      
      if (!videoId) {
        alert("Please enter a valid YouTube URL");
        return;
      }

      // 1. Synchronous check on the pre-loaded local library
      const existing = library.find(v => v.id === videoId);
      if (existing && existing.status === "completed") {
        navigate("/clips", { state: { video: existing } });
        return;
      }

      setIsChecking(true);

      // 2. Prepare default video structure
      const newVideo = {
        id: videoId,
        title: "Analyzing Video...",
        duration: "Calculating...",
        image: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        url: url.trim(),
        aspectRatio: aspectRatio,
        status: "processing",
        clips: []
      };

      try {
        // 3. Await database check and addition (cross-account cache check)
        const res = await addVideo(newVideo);
        if (res && !res.isNew) {
          // Cross-account cached! Redirect directly to clips page
          navigate("/clips", { state: { video: res.video } });
        } else {
          // Brand new video -> redirect to processing page to run backend pipeline
          navigate("/processing", { state: { videoId, url: url.trim() } });
        }
      } catch (err) {
        console.error("Failed to add video:", err);
        alert("An error occurred adding the video: " + err.message);
        setIsChecking(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-12">
      {/* Header - Already handled by App layout, but we can add secondary refinement if needed */}
      <header className="fixed top-0 w-full z-40 bg-slate-950/60 backdrop-blur-xl flex justify-between items-center px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-4">
        <h1 className="text-xl font-bold tracking-tighter text-emerald-400 font-lexend">Udoom</h1>
        <button className="text-slate-400">
           <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <main className="pt-[calc(5rem+env(safe-area-inset-top))] md:pt-[calc(6rem+env(safe-area-inset-top))] px-6 max-w-md mx-auto space-y-6 md:space-y-12">
        {/* Hero Section */}
        <section className={`relative group transition-all duration-300 ${showInput ? "hidden md:block" : "block"}`}>
          <div className="overflow-hidden rounded-3xl w-64 h-64 md:w-full md:h-[340px] mx-auto relative">
            <img 
              alt="Serene Setting" 
              className="w-full h-full object-cover grayscale-[0.2] brightness-50 group-hover:scale-105 transition-transform duration-700" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAm3uLayL12LuyUgsF71MgaUZymwbdkjAudUw-MRyvdiCnC1l9feWymCqMvCxTPAa9Ow_53y_kHWTeO2umOUuvLVqoWbo3xZsPluaBamdvGgbBxT3TAMQTGHD69kOg0Y6oFBH0Ulx4FN42R74KjuaYYs-8KNPqWyHHTsXaNQ824O2bY0iMshS6Aw4KOg31cAA1XrjCOOo1ZVhrumnRzCxVl1mk-5ttmh_ef7bQlBI13KSFxvpDBnWAzdfedTrA0rQ6xCCEV8t3Hars"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-6 md:bottom-10 left-0 w-full px-6 text-center">
              <h2 className="text-3xl md:text-[3rem] leading-[1.1] font-extrabold tracking-tight text-on-surface">
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
                <div className="bg-surface-container-low p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all duration-300 border border-white/5">
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
                  className="bg-surface-container-low p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all duration-300 border border-white/5"
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
                className="bg-surface-container-low p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-primary/20 shadow-2xl shadow-primary/5"
              >
                <div className="flex justify-between items-center mb-4 md:mb-6 px-2">
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

                  <div className="pt-2">
                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={() => setAspectRatio("1:1")}
                        className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 transition-all ${aspectRatio === '1:1' ? 'border-primary bg-primary/10 text-primary' : 'border-surface-container-highest bg-surface-container-lowest text-slate-400 hover:border-primary/50 hover:text-primary/70'}`}
                      >
                        <div className="w-8 h-8 border-[3px] border-current rounded-sm"></div>
                      </button>
                      <button 
                        onClick={() => setAspectRatio("16:9")}
                        className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 transition-all ${aspectRatio === '16:9' ? 'border-primary bg-primary/10 text-primary' : 'border-surface-container-highest bg-surface-container-lowest text-slate-400 hover:border-primary/50 hover:text-primary/70'}`}
                      >
                        <div className="w-10 h-6 border-[3px] border-current rounded-sm"></div>
                      </button>
                      <button 
                        onClick={() => setAspectRatio("9:16")}
                        className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 transition-all ${aspectRatio === '9:16' ? 'border-primary bg-primary/10 text-primary' : 'border-surface-container-highest bg-surface-container-lowest text-slate-400 hover:border-primary/50 hover:text-primary/70'}`}
                      >
                        <div className="w-6 h-10 border-[3px] border-current rounded-sm"></div>
                      </button>
                    </div>
                  </div>

                  {/* Action Button Section - specifically for the link input */}
                  <div className="pt-4">
                    <motion.button 
                      disabled={!url.trim() || !aspectRatio || isChecking}
                      onClick={handleProcess}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: (url.trim() && aspectRatio && !isChecking) ? 1 : 0.4,
                        y: 0,
                        scale: (url.trim() && aspectRatio && !isChecking) ? 1 : 0.98
                      }}
                      className="w-full bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-600 text-slate-950 py-5 rounded-full font-bold shadow-[0_0_25px_rgba(62,180,137,0.3)] hover:shadow-[0_0_35px_rgba(62,180,137,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:cursor-not-allowed disabled:hover:shadow-none"
                    >
                      {isChecking ? (
                        <>
                          <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span className="text-lg">Checking Cache...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">Let's Go</span>
                          <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </>
                      )}
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
