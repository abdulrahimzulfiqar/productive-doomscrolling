import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoCard from "../components/VideoCard";
import { useLibrary } from "../hooks/useLibrary";

export default function HomePage() {
  const navigate = useNavigate();
  const { library } = useLibrary();
  const [activeTab, setActiveTab] = useState("All Clips");

  const tabs = ["All Clips", "Habits", "Career", "Mental Health"];
  
  // Industrial Performance: Memoize the filtered list so it doesn't re-calculate on EVERY scroll
  const filteredVideos = React.useMemo(() => {
    return library.filter(v => v.status !== 'failed');
  }, [library]);

  const handleVideoClick = (video) => {
    if (video.status === "completed") {
      navigate(`/video/${video.id}`, { state: { video } });
    } else {
      navigate("/processing", { state: { videoId: video.id, url: video.url } });
    }
  };
  
  return (
    <>
      {/* Top Header */}
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
              placeholder="Search saved clips..." 
              type="text"
            />
          </div>
          
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-6 px-6">
            {tabs.map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap active:scale-90 transition-all ${
                  activeTab === tab 
                    ? "bg-gradient-to-br from-emerald-300 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "bg-surface-container-high text-on-surface font-medium hover:bg-surface-variant"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>
        
        {/* Corrected Video Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-10 max-w-5xl mx-auto">
          {filteredVideos.length > 0 ? (
            filteredVideos.map((video) => (
                <div 
                  key={video.id} 
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
      </main>
    </>
  );
}
