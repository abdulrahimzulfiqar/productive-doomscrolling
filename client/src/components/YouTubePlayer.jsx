import React, { useRef, useEffect } from "react";
import YouTube from "react-youtube";

/**
 * YouTubePlayer Component
 * Handles the logic for playing a specific segment of a video.
 * Loops automatically between start and end times.
 */
export default function YouTubePlayer({ videoId, start, end, onReady, onProgress, isMuted, isPaused, aspectRatio = "9:16", playbackRate = 1 }) {
  const playerRef = useRef(null);
  const scrollInterval = useRef(null);

  // Sync latest props into a ref to avoid stale closures in onPlayerReady without triggering re-renders
  const latestProps = useRef({ isMuted, isPaused, playbackRate });
  latestProps.current = { isMuted, isPaused, playbackRate };

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

  // Sync playback rate when prop changes
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(playbackRate);
      } catch (e) {
        console.warn("YouTube Player playback rate sync deferred:", e);
      }
    }
  }, [playbackRate]);

  const opts = React.useMemo(() => ({
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      cc_load_policy: 0, // Forces captions OFF
      start: Math.floor(start),
    },
  }), [start]);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;

    // Apply the most up-to-date props (solves the 2x speed race condition)
    if (latestProps.current.isMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
    }

    try {
      if (typeof playerRef.current.setPlaybackRate === 'function') {
        playerRef.current.setPlaybackRate(latestProps.current.playbackRate);
      }
    } catch (e) {
      console.warn("YouTube Player initial playback rate set deferred:", e);
    }

    // Aggressively try to turn off Captions via the Player API
    try {
      if (typeof playerRef.current.unloadModule === 'function') {
        playerRef.current.unloadModule("captions");
        playerRef.current.unloadModule("cc");
      }
      if (typeof playerRef.current.setOption === 'function') {
        playerRef.current.setOption('captions', 'track', {});
      }
    } catch (e) {
      // Ignore errors if the API doesn't support these undocumented methods
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
    <div className="w-full h-full bg-black overflow-hidden pointer-events-none flex items-center justify-center">
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
          ${aspectRatio === '1:1' ? 'aspect-ratio: 1 / 1;' : ''}
          ${aspectRatio === '16:9' ? 'aspect-ratio: 16 / 9;' : ''}
          height: ${aspectRatio === '9:16' ? '100%' : 'auto'};
          overflow: hidden;
        }
        .youtube-iframe {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          ${aspectRatio === '9:16' ? `
          width: 100vw;
          height: 100vh;
          ` : aspectRatio === '1:1' ? `
          width: 177.77%; /* 16/9 ratio to fill square height */
          height: 100%;
          ` : `
          width: 100%;
          aspect-ratio: 16 / 9;
          height: auto;
          `}
        }

        ${aspectRatio === '9:16' ? `
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
        ` : ''}
      `}</style>
    </div>
  );
}
