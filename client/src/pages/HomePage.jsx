import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import VideoCard from "../components/VideoCard";
import { useLibrary } from "../hooks/useLibrary";

/**
 * ClipNote Component
 * A single clip's note within a video group.
 * Shows clip title, the user's note, and a Re-watch button.
 */
function ClipNote({ clip, onPlay, onDelete }) {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
      {/* Clip Header */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setShowSummary(!showSummary)}
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-emerald-400 !text-lg">play_arrow</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <h4 className="text-sm font-bold text-white/90 truncate">{clip.title}</h4>
          <span className="text-[10px] font-mono text-white/30">{clip.duration}</span>
        </div>
        <span className={`material-symbols-outlined text-white/20 !text-lg transition-transform duration-300 ${showSummary ? 'rotate-180 text-emerald-400' : ''}`}>
          expand_more
        </span>
      </div>

      {/* AI Summary (expandable) */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              <p className="text-[12px] text-white/40 leading-relaxed pl-3 border-l border-emerald-500/20">
                {clip.summary}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Note — always visible */}
      <div className="mx-4 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-400 !text-sm">format_quote</span>
            <span className="text-[9px] font-bold text-emerald-400/50 uppercase tracking-tighter">Your Note</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="relative z-30 w-7 h-7 flex items-center justify-center rounded-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all active:scale-90"
              title="Delete note"
            >
              <span className="material-symbols-outlined !text-[14px]">delete</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              className="relative z-30 flex items-center gap-1.5 bg-emerald-400/10 hover:bg-emerald-400 px-3 py-1 rounded-full text-emerald-400 hover:text-slate-950 transition-all active:scale-95"
            >
              <span className="text-[9px] font-black uppercase tracking-widest">Re-watch</span>
              <span className="material-symbols-outlined !text-sm">play_circle</span>
            </button>
          </div>
        </div>
        <p className="text-[13px] text-white/90 italic leading-relaxed break-words">
          "{clip.user_notes}"
        </p>
      </div>
    </div>
  );
}

/**
 * VideoInsightGroup Component
 * Groups all noted clips under their parent video.
 * Click to expand and see individual clip notes.
 */
function VideoInsightGroup({ videoData, navigate, onDeleteNote }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { video, notedClips } = videoData;

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] overflow-hidden hover:border-emerald-500/20 transition-all">
      {/* Video Header — always visible */}
      <div 
        className="flex gap-4 p-5 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-24 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/10 shadow-lg">
          <img src={video.image} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex flex-col justify-center flex-1 overflow-hidden">
          <h3 className="text-sm font-bold text-white/90 line-clamp-2 mb-1.5">{video.title}</h3>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              {notedClips.length} {notedClips.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <span className={`material-symbols-outlined text-white/20 transition-all duration-300 ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`}>
            expand_more
          </span>
        </div>
      </div>

      {/* Expanded: All noted clips */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 space-y-3">
              {notedClips.map((clip) => (
                <ClipNote
                  key={clip.id}
                  clip={clip}
                  onPlay={() => {
                    const singleClipVideo = { ...video, clips: [clip] };
                    navigate("/feed", { state: { video: singleClipVideo, clip } });
                  }}
                  onDelete={() => onDeleteNote(clip.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { library, saveClipNote } = useLibrary();
  const [activeTab, setActiveTab] = useState("Videos");
  
  const tabs = ["Videos", "My Insights"];

  // Industrial Performance: Memoize the filtered list
  const filteredVideos = React.useMemo(() => {
    return library.filter(v => v.status !== 'failed');
  }, [library]);

  // Group clips-with-notes by their parent video
  const { groupedInsights, totalNotes } = React.useMemo(() => {
    const videoMap = new Map(); // videoId → { video, notedClips[] }
    let count = 0;

    library.forEach(video => {
      video.clips?.forEach(clip => {
        if (clip.user_notes) {
          count++;
          if (!videoMap.has(video.id)) {
            videoMap.set(video.id, { video, notedClips: [] });
          }
          videoMap.get(video.id).notedClips.push(clip);
        }
      });
    });

    return { groupedInsights: Array.from(videoMap.values()), totalNotes: count };
  }, [library]);
  
  return (
    <>
      <header className="fixed top-0 w-full z-40 bg-slate-950/60 backdrop-blur-xl shadow-sm shadow-black/50 flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container border border-outline-variant/20">
            <img 
              alt="User Profile" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDABeo83baanpZeGAD3Bpz7llI3umlTK1RBo0JX7SeOIkJkxWAVVI0ElApdU6mHXMpC_Taq4hTXZEyKiSHSAKmaS7b_4N5OFCd1bDfdTySG0oXMuGjQi2FEJeIvDK5OkqGw2KWdMiCQohluUNCo1GmPOyYJWsvQeumfNpHy3b-b0naDBobt1HYZ0bV1TfkWfs4vNPaETENH4O3v8_Kk1OpcuTRIxbmfQCZXRfVvYwvaiZkE8qU37119YW7ANDcFe9WjhLuT5vSY7g8"
            />
          </div>
          <h1 className="font-lexend tracking-tight text-xl font-bold text-emerald-400">
            The Mindful Flow
          </h1>
        </div>
        <button className="text-slate-400 hover:opacity-80 transition-opacity active:scale-95 transition-transform duration-200">
          <span className="material-symbols-outlined text-emerald-400">settings</span>
        </button>
      </header>

      <main className="pt-24 px-6 pb-24">
        {/* Search & Filter Section */}
        <section className="mb-8 max-w-lg mx-auto text-left">
          <h2 className="text-3xl font-extrabold tracking-tight mb-6">Library</h2>
          
          <div className="relative mb-6 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input 
              className="w-full bg-surface-container-highest border-none rounded-full py-4 pl-12 pr-6 text-on-surface focus:ring-2 focus:ring-primary/40 focus:outline-none placeholder:text-outline transition-all" 
              placeholder={activeTab === "Videos" ? "Search saved videos..." : "Search your insights..."} 
              type="text"
            />
          </div>
          
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-6 px-6">
            {tabs.map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap active:scale-90 transition-all ${
                  activeTab === tab 
                    ? "bg-gradient-to-br from-emerald-300 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "bg-surface-container-high text-on-surface font-medium hover:bg-surface-variant"
                }`}
              >
                {tab === "My Insights" && totalNotes > 0 ? `${tab} (${totalNotes})` : tab}
              </button>
            ))}
          </div>
        </section>
        
        {/* Switchable Display */}
        {activeTab === "Videos" ? (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-10 max-w-5xl mx-auto">
            {filteredVideos.length > 0 ? (
              filteredVideos.map((video) => (
                  <div 
                    key={video.id} 
                    style={{ 
                      contentVisibility: 'auto', 
                      containIntrinsicSize: '0 200px' 
                    }}
                    onClick={() => {
                      if (video.status === 'completed') {
                        navigate("/clips", { state: { video } });
                      } else {
                        navigate("/processing", { state: { videoId: video.id, url: video.url } });
                      }
                    }}
                  >
                    <VideoCard video={video} />
                  </div>
                ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <span className="material-symbols-outlined !text-6xl">movie_filter</span>
                <p className="font-medium text-lg text-white">Your library is empty.<br/><span className="text-sm font-normal">Add a video to get started.</span></p>
              </div>
            )}
          </section>
        ) : (
          <section className="max-w-lg mx-auto space-y-6">
            {groupedInsights.length > 0 ? (
              groupedInsights.map((videoData) => (
                <VideoInsightGroup
                  key={videoData.video.id}
                  videoData={videoData}
                  navigate={navigate}
                  onDeleteNote={(clipId) => saveClipNote(clipId, '')}
                />
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <span className="material-symbols-outlined !text-6xl">edit_note</span>
                <p className="font-medium text-lg text-white">No insights captured yet.<br/><span className="text-sm font-normal text-emerald-400/60">Tap the Pencil while watching a clip.</span></p>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
