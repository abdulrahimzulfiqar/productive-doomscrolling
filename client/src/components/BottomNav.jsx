import { Link, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-center items-center z-50">
      <div className="w-full max-w-2xl flex justify-around items-center px-4 pb-8 pt-4 bg-slate-950/60 backdrop-blur-xl rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.6)] border-t border-white/5">
      
      {/* Home / Library */}
      <Link 
        to="/" 
        className={`flex flex-col items-center justify-center px-6 py-2 transition-all duration-300 active:scale-90 ${
          location.pathname === '/' ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-200'
        }`}
      >
        <span className="material-symbols-outlined mb-1" style={location.pathname === '/' ? { fontVariationSettings: "'FILL' 1" } : {}}>
          home
        </span>
        <span className="font-lexend text-[10px] uppercase tracking-widest">Library</span>
      </Link>

      {/* Add / Process Video - We style this more prominently */}
      <Link 
        to="/add" 
        className={`flex flex-col items-center justify-center rounded-full px-6 py-3 transition-all duration-300 active:scale-90 ${
          location.pathname === '/add' 
            ? 'bg-gradient-to-br from-emerald-300 to-emerald-600 text-slate-950 shadow-[0_0_15px_rgba(62,180,137,0.4)]'
            : 'bg-surface-container-high text-emerald-400 border border-emerald-500/20 shadow-lg'
        }`}
      >
        <span className="material-symbols-outlined mb-1 text-2xl">add_circle</span>
        <span className="font-lexend text-[9px] uppercase tracking-widest font-bold">Process</span>
      </Link>

      {/* Explore / Feed */}
      <Link 
        to="/feed" 
        className={`flex flex-col items-center justify-center px-6 py-2 transition-all duration-300 active:scale-90 ${
          location.pathname === '/feed' ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-200'
        }`}
      >
        <span className="material-symbols-outlined mb-1" style={location.pathname === '/feed' ? { fontVariationSettings: "'FILL' 1" } : {}}>
          explore
        </span>
        <span className="font-lexend text-[10px] uppercase tracking-widest">Explore</span>
      </Link>

      </div>
    </nav>
  );
}
