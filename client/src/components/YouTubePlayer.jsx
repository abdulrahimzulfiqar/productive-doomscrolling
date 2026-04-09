import React, { useRef, useEffect } from "react";
import YouTube from "react-youtube";

/**
 * YouTubePlayer Component
 * Handles the logic for playing a specific segment of a video.
 * Loops automatically between start and end times.
 */
export default function YouTubePlayer({ videoId, start, end, onReady, isMuted }) {
  const playerRef = useRef(null);
  const scrollInterval = useRef(null);

  // Sync mute state when prop changes
  useEffect(() => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
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
    
    // Industrial Standard: Force high quality for mobile desktop simulation
    if (playerRef.current.setPlaybackQuality) {
      playerRef.current.setPlaybackQuality('hd720');
    }

    // Initial mute state
    if (isMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
    }
    
    console.log(`[YouTubePlayer] Segment Synced: ${start}s - ${end}s`);
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    
    scrollInterval.current = setInterval(() => {
      const currentTime = playerRef.current.getCurrentTime();
      if (currentTime >= end) {
        playerRef.current.seekTo(start);
      }
    }, 200);

    if (onReady) onReady(event);
  };

  useEffect(() => {
    return () => {
      if (scrollInterval.current) clearInterval(scrollInterval.current);
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
