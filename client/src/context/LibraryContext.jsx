import React, { createContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

export const LibraryContext = createContext(null);

export const LibraryProvider = ({ children }) => {
  const { user } = useAuth();
  const [library, setLibrary] = useState([]);

  // Load library from Supabase (RLS enforces user_id filtering automatically)
  const fetchLibrary = useCallback(async () => {
    // Fetch from user_library table, joining videos, clips, and user_clip_interactions
    const { data, error } = await supabase
      .from("user_library")
      .select(`
        video_id,
        created_at,
        in_explore,
        videos (
          id,
          url,
          title,
          image,
          duration,
          status,
          aspect_ratio,
          clips (
            id,
            title,
            start_time,
            end_time,
            duration,
            summary,
            user_clip_interactions (
              is_watched,
              user_notes,
              watch_percent
            )
          )
        )
      `)
      .order("created_at", { ascending: false });
      
    if (!error && data) {
      // Filter out any user_library records where the video might be missing/deleted (defensive check)
      const validRecords = data.filter(item => item.videos);
      
      const mappedData = validRecords.map(item => {
        const video = item.videos;
        return {
          ...video,
          aspectRatio: video.aspect_ratio,
          in_explore: item.in_explore ?? false,
          // Keep the user_library created_at so sorting remains correct by when user added it
          created_at: item.created_at, 
          clips: video.clips?.map(clip => {
            // Since user_clip_interactions is a list filtered by auth.uid(), there will be at most 1 item
            const interaction = clip.user_clip_interactions?.[0] || {};
            return {
              ...clip,
              start: clip.start_time ?? clip.start,
              end: clip.end_time ?? clip.end,
              is_watched: interaction.is_watched ?? false,
              user_notes: interaction.user_notes ?? "",
              watch_percent: interaction.watch_percent ?? 0
            };
          }).sort((a, b) => (a.start_time ?? a.start) - (b.start_time ?? b.start)) || []
        };
      });
      setLibrary(mappedData);
    } else if (error) {
      console.error("Error fetching library:", error);
    }
  }, []);

  // Re-fetch library when user changes (login/logout)
  useEffect(() => {
    if (user) {
      fetchLibrary();
    } else {
      setLibrary([]);
    }
  }, [user, fetchLibrary]);

  /**
   * Adds a new video to the library.
   */
  const addVideo = useCallback(async (candidate) => {
    if (!user) return { video: candidate, isNew: true };

    // 1. Check if video exists globally
    const { data: existingVideo } = await supabase
      .from("videos")
      .select("*, clips(*)")
      .eq("id", candidate.id)
      .maybeSingle();

    if (existingVideo) {
      console.log(`[LibraryContext] Video ID ${candidate.id} already exists globally.`);
      
      // 2. Link to user_library if not already linked
      const { data: userLibEntry } = await supabase
        .from("user_library")
        .select("*")
        .eq("video_id", candidate.id)
        .maybeSingle();

      if (!userLibEntry) {
        await supabase.from("user_library").insert([
          { video_id: candidate.id, user_id: user.id }
        ]);
      }

      // 3. Fetch user interactions for the clips
      const { data: interactions } = await supabase
        .from("user_clip_interactions")
        .select("*")
        .in("clip_id", existingVideo.clips?.map(c => c.id) || []);

      const mappedExisting = {
        ...existingVideo,
        aspectRatio: existingVideo.aspect_ratio,
        clips: existingVideo.clips?.map(clip => {
          const inter = interactions?.find(i => i.clip_id === clip.id) || {};
          return {
            ...clip,
            start: clip.start_time ?? clip.start,
            end: clip.end_time ?? clip.end,
            is_watched: inter.is_watched ?? false,
            user_notes: inter.user_notes ?? "",
            watch_percent: inter.watch_percent ?? 0
          };
        }).sort((a, b) => (a.start_time ?? a.start) - (b.start_time ?? b.start)) || []
      };

      await fetchLibrary(); // Reload local library list
      return { video: mappedExisting, isNew: false };
    }

    // 4. Video does not exist globally -> Insert it in videos table
    const { data: newVideoData, error: videoError } = await supabase
      .from("videos")
      .insert([
        {
          id: candidate.id,
          url: candidate.url,
          title: candidate.title || "Analyzing Video...",
          image: candidate.image,
          duration: candidate.duration || "Calculating...",
          status: candidate.status || "processing",
          aspect_ratio: candidate.aspectRatio || "9:16"
        }
      ])
      .select()
      .maybeSingle();

    if (videoError) {
      console.error("Error inserting shared video:", videoError);
      return { video: candidate, isNew: true };
    }

    // 5. Link to user_library
    await supabase.from("user_library").insert([
      { video_id: candidate.id, user_id: user.id }
    ]);

    const mappedNew = { ...newVideoData, aspectRatio: newVideoData.aspect_ratio, clips: [] };
    await fetchLibrary();
    return { video: mappedNew, isNew: true };
  }, [user, fetchLibrary]);

  /**
   * Updates an existing video record
   */
  const updateVideo = useCallback(async (id, updates) => {
    const updatePayload = {
      title: updates.title,
      status: updates.status
    };
    if (updates.duration) {
      updatePayload.duration = updates.duration;
    }

    const { error: videoError } = await supabase
      .from("videos")
      .update(updatePayload)
      .eq("id", id);

    if (videoError) {
      console.error("Error updating video:", videoError);
      return;
    }

    // 2. If there are clips, upsert them to avoid conflicts
    if (updates.clips && updates.clips.length > 0) {
      const clipsToInsert = updates.clips.map(c => ({
        id: c.id,
        video_id: id,
        title: c.title,
        start_time: c.start,
        end_time: c.end,
        duration: c.duration,
        summary: c.summary
      }));

      const { error: clipsError } = await supabase
        .from("clips")
        .upsert(clipsToInsert);

      if (clipsError) {
        console.error("Error upserting clips:", clipsError);
      }
    }

    // Re-fetch to get the fresh record with clips
    fetchLibrary();
  }, [fetchLibrary]);

  const deleteVideo = useCallback(async (id) => {
    if (!user) return;

    // Fetch video status to check if it completed successfully
    const { data: videoData } = await supabase
      .from("videos")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("user_library")
      .delete()
      .eq("video_id", id)
      .eq("user_id", user.id);
      
    if (!error) {
      setLibrary(prev => prev.filter(v => v.id !== id));
      
      // If the video was never completed successfully (e.g. failed during ingestion/processing),
      // clean it up from the global videos table so retries can process it fresh.
      if (videoData && videoData.status !== "completed") {
        console.log(`[LibraryContext] Cleaning up incomplete/failed video ID ${id} from shared pool.`);
        await supabase
          .from("videos")
          .delete()
          .eq("id", id);
      }
    } else {
      console.error("Error deleting video from user library:", error);
    }
  }, [user]);

  /**
   * Marks a specific clip as watched in Supabase
   */
  const markClipWatched = useCallback(async (clipId) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_clip_interactions")
      .upsert({
        user_id: user.id,
        clip_id: clipId,
        is_watched: true
      }, { onConflict: "user_id,clip_id" });

    if (!error) {
      // Optimistic Update: Update local state immediately
      setLibrary(prev => prev.map(video => ({
        ...video,
        clips: video.clips?.map(clip => 
          clip.id === clipId ? { ...clip, is_watched: true } : clip
        ) || []
      })));
    } else {
      console.error("Error marking clip as watched:", error);
    }
  }, [user]);

  /**
   * Saves a personal note to a specific clip
   */
  const saveClipNote = useCallback(async (clipId, note) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_clip_interactions")
      .upsert({
        user_id: user.id,
        clip_id: clipId,
        user_notes: note
      }, { onConflict: "user_id,clip_id" });

    if (!error) {
      // Optimistic Update
      setLibrary(prev => prev.map(video => ({
        ...video,
        clips: video.clips?.map(clip => 
          clip.id === clipId ? { ...clip, user_notes: note } : clip
        ) || []
      })));
    } else {
      console.error("Error saving note:", error);
    }
  }, [user]);

  /**
   * Persists the peak watch progress (0-100) for a clip.
   * Only call with a value higher than the previous to avoid regression.
   */
  const updateClipWatchPercent = useCallback(async (clipId, percent) => {
    if (!user || percent <= 0) return;
    const rounded = Math.round(percent);
    const { error } = await supabase
      .from("user_clip_interactions")
      .upsert({
        user_id: user.id,
        clip_id: clipId,
        watch_percent: rounded
      }, { onConflict: "user_id,clip_id" });

    if (!error) {
      setLibrary(prev => prev.map(video => ({
        ...video,
        clips: video.clips?.map(clip => 
          clip.id === clipId ? { ...clip, watch_percent: rounded } : clip
        ) || []
      })));
    } else {
      console.error("Error updating watch percent:", error);
    }
  }, [user]);

  /**
   * Toggles whether a video is included in the Explore feed.
   */
  const toggleVideoExplore = useCallback(async (videoId, inExplore) => {
    if (!user) return;
    const { error } = await supabase
      .from("user_library")
      .update({ in_explore: inExplore })
      .eq("video_id", videoId)
      .eq("user_id", user.id);

    if (!error) {
      setLibrary(prev => prev.map(video =>
        video.id === videoId ? { ...video, in_explore: inExplore } : video
      ));
    } else {
      console.error("Error toggling explore:", error);
    }
  }, [user]);

  /**
   * Fetches full video data including clips for a single video.
   */
  const fetchVideoDetail = useCallback(async (videoId) => {
    const { data, error } = await supabase
      .from("videos")
      .select(`
        *,
        clips (
          *,
          user_clip_interactions (
            is_watched,
            user_notes,
            watch_percent
          )
        )
      `)
      .eq("id", videoId)
      .maybeSingle();
    
    if (!error && data) {
      const mapped = {
        ...data,
        aspectRatio: data.aspect_ratio,
        clips: data.clips?.map(clip => {
          const interaction = clip.user_clip_interactions?.[0] || {};
          return {
            ...clip,
            start: clip.start_time ?? clip.start,
            end: clip.end_time ?? clip.end,
            is_watched: interaction.is_watched ?? false,
            user_notes: interaction.user_notes ?? "",
            watch_percent: interaction.watch_percent ?? 0
          };
        }).sort((a, b) => (a.start_time ?? a.start) - (b.start_time ?? b.start)) || []
      };
      
      setLibrary(prev => prev.map(v => v.id === videoId ? mapped : v));
      return mapped;
    }
    return null;
  }, []);

  const clearLibrary = useCallback(async () => {
    console.warn("clearLibrary is disabled in Supabase mode to prevent accidental deletion.");
  }, []);

  const value = {
    library,
    addVideo,
    updateVideo,
    deleteVideo,
    clearLibrary,
    fetchLibrary,
    fetchVideoDetail,
    markClipWatched,
    saveClipNote,
    updateClipWatchPercent,
    toggleVideoExplore
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};
