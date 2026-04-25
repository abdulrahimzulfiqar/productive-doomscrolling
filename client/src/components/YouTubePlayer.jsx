import React, { useRef, useEffect } from "react";
import YouTube from "react-youtube";

/**
 * YouTubePlayer Component
 * Handles the logic for playing a specific segment of a video.
 * Loops automatically between start and end times.
 */
export default function YouTubePlayer({ videoId, start, end, onReady, onProgress, isMuted, isPaused }) {
  const playerRef = useRef(null);
  const scrollInterval = useRef(null);

  // Sync play/pause state
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      if (isPaused) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  }, [isPaused]);

  // Sync mute state when prop changes
  useEffect(() => {
    // Defensive Check: Ensure the player exists AND has the volume methods
    if (playerRef.current && typeof playerRef.current.mute === 'function') {
      try {
        if (isMuted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch (e) {
        console.warn("YouTube Player initialization in progress, volume command deferred.");
      }
    }
  }, [isMuted]);

  const opts = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      start: Math.floor(start),
    },
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    
    // Initial mute state
    if (isMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
    }
    
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    
    scrollInterval.current = setInterval(() => {
      // Defensive Check: Ensure player exists and is not destroyed
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') {
        return;
      }

      try {
        const currentTime = playerRef.current.getCurrentTime();
        
        // 1. Handle Segment Looping
        if (currentTime >= end) {
          playerRef.current.seekTo(start);
        }

        // 2. Report Real-time Progress
        if (onProgress) {
          const duration = end - start;
          const elapsed = currentTime - start;
          const progress = Math.max(0, Math.min(100, (elapsed / duration) * 100));
          onProgress(progress);
        }
      } catch (e) {
        // Silently catch errors if the API is in a transition state
        console.warn("YouTube API heart-beat skipped:", e);
      }
    }, 200);

    if (onReady) onReady(event);
  };

  useEffect(() => {
    return () => {
      if (scrollInterval.current) {
        clearInterval(scrollInterval.current);
        scrollInterval.current = null;
      }
      playerRef.current = null;
    };
  }, []);

  return (
    <div className="w-full h-full bg-black overflow-hidden pointer-events-none">
      <YouTube 
        videoId={videoId} 
        opts={opts} 
        onReady={onPlayerReady}
        className="youtube-container"
        iframeClassName="youtube-iframe"
      />
      <style>{`
        .youtube-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .youtube-iframe {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100vw;
          height: 100vh;
          transform: translate(-50%, -50%);
        }
        @media (min-aspect-ratio: 16/9) {
          .youtube-iframe {
            height: 56.25vw;
          }
        }
        @media (max-aspect-ratio: 16/9) {
          .youtube-iframe {
            width: 177.78vh;
          }
        }
      `}</style>
    </div>
  );
}
