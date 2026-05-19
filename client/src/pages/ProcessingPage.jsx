import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";

export default function ProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateVideo, deleteVideo } = useLibrary();
  const fetching = React.useRef(false);
  const mountedRef = React.useRef(true);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const { videoId, url } = location.state || {};

  // Simplified Udoom pipeline steps
  const steps = [
    { label: "Reading Video", status: "success", time: "12s", desc: "Gathering the transcript and video information..." },
    { label: "Finding Key Moments", status: "processing", time: "Analyzing...", desc: "Selecting the most valuable, productive insights..." },
    { label: "Building Your Feed", status: "pending", time: "Queued", desc: "Preparing short, easy-to-read clips for you..." }
  ];

  useEffect(() => {
    mountedRef.current = true;

    // Phase 1 -> Phase 2 (UI only for engagement)
    const t1 = setTimeout(() => {
      if (mountedRef.current) setStep(1);
    }, 3500);

    // Phase 2 -> Phase 3 (UI only for engagement)
    const t2 = setTimeout(() => {
      if (mountedRef.current) setStep(2);
    }, 8000);

    // Call the real backend
    const processVideo = async () => {
      if (fetching.current) return;
      fetching.current = true;

      try {
        console.log("Starting real AI pipeline for:", url);
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const response = await fetch(`${backendUrl}/api/v1/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Pipeline failed");
        }

        const data = await response.json();
        console.log("Pipeline Finished Successfully:", data);

        if (mountedRef.current) {
          // Update the library via Hook logic
          await updateVideo(videoId, {
            title: data.video_title || data.video_summary?.split('.')[0] || "AI Processed Content",
            duration: data.video_duration,
            status: "completed",
            clips: data.clips.map((c, i) => ({
              id: `${videoId}-c${i}`,
              title: c.title || `Insight ${i + 1}`,
              start: c.start,
              end: c.end,
              duration: `${Math.floor((c.end - c.start) / 60)}:${String(Math.floor((c.end - c.start) % 60)).padStart(2, '0')}`,
              summary: c.reason || "AI extracted Udoom clip."
            }))
          });

          setStep(3);
          setIsFinished(true);

          // Automatic redirect after tick
          setTimeout(() => {
            if (mountedRef.current) navigate("/");
          }, 2000);
        }
      } catch (error) {
        console.error("Processing error:", error);
        if (mountedRef.current) {
          setError(error.message);
          // Industrial Cleanup: Automatically remove the failed entry from the library
          // so it doesn't leave a 'broken' card behind.
          await deleteVideo(videoId);
        }
      }
    };

    if (url) processVideo();

    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [navigate, videoId, url, updateVideo, deleteVideo]);

  return (
    <div className="h-screen bg-surface text-on-surface flex flex-col overflow-hidden">
      <header className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl flex justify-between items-center px-6 py-4">
        <h1 className="text-xl font-bold tracking-tighter text-emerald-400 font-lexend">Udoom</h1>
        <button className="text-slate-400">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <main className="flex-grow pt-24 pb-4 md:pt-32 md:pb-32 px-6 flex flex-col items-center max-w-md mx-auto w-full justify-start md:justify-center">
        {/* Status Header */}
        <div className="w-full mb-6 md:mb-12 text-center">
          <span className="text-[10px] text-primary tracking-[0.2em] font-bold uppercase mb-1 block">Detox in Progress</span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">Distilling Video</h2>
        </div>

        {/* Central Pulse Indicator */}
        <div className="relative w-36 h-36 md:w-64 md:h-64 flex items-center justify-center mb-8 md:mb-16">
          <motion.div
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-[radial-gradient(circle,rgba(140,239,206,0.2)_0%,transparent_70%)] rounded-full"
            style={{ willChange: "opacity" }}
          />

          <svg viewBox="0 0 256 256" className="w-full h-full transform -rotate-90 relative z-10 transition-all duration-1000">
            <circle
              className="text-surface-container-highest"
              cx="128" cy="128" r="110"
              fill="transparent" stroke="currentColor" strokeWidth="8"
            />
            {/* Glow stroke underlay (Replaces dynamic drop-shadow filter) */}
            <motion.circle
              initial={{ strokeDashoffset: 690 }}
              animate={{ strokeDashoffset: isFinished ? 0 : 690 - (690 * 0.65) }}
              transition={{ duration: 10, ease: "linear" }}
              className="text-primary/30"
              cx="128" cy="128" r="110"
              fill="transparent" stroke="currentColor" strokeWidth="14"
              strokeDasharray="690" strokeLinecap="round"
            />
            <motion.circle
              initial={{ strokeDashoffset: 690 }}
              animate={{ strokeDashoffset: isFinished ? 0 : 690 - (690 * 0.65) }}
              transition={{ duration: 10, ease: "linear" }}
              className="text-primary"
              cx="128" cy="128" r="110"
              fill="transparent" stroke="currentColor" strokeWidth="8"
              strokeDasharray="690" strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <motion.div
              animate={isFinished ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
              className={`w-12 h-12 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-2xl border border-white/5 transition-colors duration-500 ${isFinished ? 'bg-primary text-slate-950' : 'bg-surface-container text-primary'}`}>
              <span className="material-symbols-outlined text-2xl md:text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isFinished ? 'check_circle' : 'psychology'}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Status Label */}
        <div className="text-center mb-6 md:mb-12 h-14 md:h-20">
          <h3 className={`text-xl md:text-2xl font-bold mb-1 transition-all ${error ? 'text-red-400' : 'text-primary'}`}>
            {error ? "Synthesis Failed" : isFinished ? "Success!" : "Detoxifying content..."}
          </h3>
          <p className="text-on-surface-variant text-sm max-w-[260px] mx-auto leading-relaxed opacity-70">
            {error ? error : isFinished ? "Redirecting to your flow..." : ""}
          </p>
        </div>

        {/* Pipeline Steps */}
        <div className="w-full space-y-2 md:space-y-4">
          {steps.map((s, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: step >= idx ? 1 : 0.4, x: 0 }}
              className={`p-3 md:p-5 rounded-2xl flex items-center justify-between transition-all duration-500 ${step === idx ? "bg-surface-container border border-primary/20 shadow-xl" : "bg-surface-container-low"
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step > idx ? "bg-primary/20 text-primary" :
                  step === idx ? "bg-primary text-slate-950" : "bg-surface-container-highest text-outline"
                  }`}>
                  {step > idx ? (
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  ) : step === idx ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-2xl">{idx === 2 ? 'auto_awesome' : 'neurology'}</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[15px]">{s.label}</p>
                  <p className="text-[10px] uppercase tracking-wider text-outline mt-0.5 font-bold">
                    {step > idx ? "Success" : step === idx ? "In Progress" : "Queued"}
                  </p>
                </div>
              </div>
              <div className="text-outline text-xs tabular-nums font-bold">
                {step === idx ? s.time : step > idx ? "Done" : "..."}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Decorative Blur */}
      <div className="fixed top-1/4 -left-20 w-64 h-64 bg-primary/5 blur-[120px] pointer-events-none rounded-full" />

      {/* Error Popup Modal */}
      <AnimatePresence>
        {error && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center text-white"
            >
              <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-400 text-3xl">subtitles_off</span>
              </div>
              <h3 className="text-xl font-bold mb-2">No Transcript Available</h3>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">
                {error.includes("No transcript available")
                  ? "This YouTube video does not have any transcript/captions available."
                  : "We encountered an issue downloading the video metadata or transcript."}
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition-all active:scale-95 duration-150"
              >
                Go to Library
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
