import { useMemo } from "react";
import { useLibrary } from "./useLibrary";

/**
 * Helper to convert duration string (e.g. "05:23" or "01:23:45") to seconds.
 */
export function durationToSeconds(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  return parts[0] || 0;
}

/**
 * useExploreFeed
 * Re-orders clips across all selected explore videos sequentially (round-robin)
 * putting unwatched clips first to preserve progress, and sorting within
 * each round by duration-normalized engagement score.
 */
export function useExploreFeed() {
  const { library } = useLibrary();

  // 1. Get all selected videos that have clips
  const selectedVideos = useMemo(() => {
    return library.filter(v => v.in_explore && v.status === "completed" && v.clips?.length > 0);
  }, [library]);

  // 2. Interleave clips using Sequential Round-Robin + Duration-Normalized Scoring
  const exploreFeed = useMemo(() => {
    if (selectedVideos.length === 0) return [];

    // For each video, order its clips: unwatched clips first, followed by watched clips.
    // This ensures that when a new video is added, its first unwatched clip (Clip 1)
    // is aligned with the active unwatched round of other videos, rather than being
    // placed back at the beginning of the container which the user has already scrolled past.
    const videosClipsLists = selectedVideos.map(video => {
      const unwatched = video.clips.filter(clip => !clip.is_watched);
      const watched = video.clips.filter(clip => clip.is_watched);
      return {
        video,
        orderedClips: [...unwatched, ...watched]
      };
    });

    // Find the maximum number of clips any video has
    const maxClipsCount = Math.max(...selectedVideos.map(v => v.clips.length));
    const interleavedClips = [];

    // Round-robin iteration
    for (let roundIndex = 0; roundIndex < maxClipsCount; roundIndex++) {
      const roundClips = [];

      // Collect clip at roundIndex from each video's ordered list
      videosClipsLists.forEach(({ video, orderedClips }) => {
        if (roundIndex < orderedClips.length) {
          const clip = orderedClips[roundIndex];
          const durationSec = durationToSeconds(clip.duration);
          
          // Calculate Effective Engagement Time (EET)
          // Default to 40% (0.4) of duration for unseen clips (watch_percent = 0)
          const watchPercent = clip.watch_percent ?? 0;
          const eet = watchPercent === 0 
            ? 0.4 * durationSec 
            : (watchPercent / 100) * durationSec;

          roundClips.push({
            ...clip,
            parentVideo: video, // Attach parent video info
            eetScore: eet,
          });
        }
      });

      // Sort clips within this round by engagement score descending (highest first)
      roundClips.sort((a, b) => b.eetScore - a.eetScore);

      // Append this round's sorted clips to feed
      interleavedClips.push(...roundClips);
    }

    return interleavedClips;
  }, [selectedVideos]);

  return {
    exploreFeed,
    selectedVideos,
  };
}
