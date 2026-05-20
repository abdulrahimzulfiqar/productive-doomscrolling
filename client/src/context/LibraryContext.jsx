import React, { createContext, useState, useCallback, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

export const LibraryContext = createContext(null);

export const LibraryProvider = ({ children }) => {
  const { user } = useAuth();
  const [library, setLibrary] = useState([]);

  // Load library from Supabase (RLS enforces user_id filtering automatically)
  const fetchLibrary = useCallback(async () => {
    const { data, error } = await supabase
      .from("videos")
      .select(`*, clips(*)`)
      .order("created_at", { ascending: false });
      
    if (!error && data) {
      // Map Supabase snake_case back to frontend camelCase/Short names
      const mappedData = data.map(video => ({
        ...video,
        aspectRatio: video.aspect_ratio,
        clips: video.clips?.map(clip => ({
          ...clip,
          start: clip.start_time ?? clip.start,
          end: clip.end_time ?? clip.end,
          is_watched: clip.is_watched ?? false,
          user_notes: clip.user_notes ?? ""
        })).sort((a, b) => (a.start_time ?? a.start) - (b.start_time ?? b.start)) || []
      }));
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
    // Check if ID already exists
    const { data: existing } = await supabase
      .from("videos")
      .select("*, clips(*)")
      .eq("id", candidate.id)
      .single();
    
    if (existing) {
      console.log(`[LibraryContext] Video ID ${candidate.id} already exists. Returning existing.`);
      const mappedExisting = {
        ...existing,
        aspectRatio: existing.aspect_ratio,
        clips: existing.clips?.map(clip => ({
          ...clip,
          start: clip.start_time ?? clip.start,
          end: clip.end_time ?? clip.end,
          is_watched: clip.is_watched ?? false,
          user_notes: clip.user_notes ?? ""
        })).sort((a, b) => (a.start_time ?? a.start) - (b.start_time ?? b.start)) || []
      };
      return { video: mappedExisting, isNew: false };
    }

    // Insert new video
    const { data, error } = await supabase
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
      .select(`*, clips(*)`)
      .single();

    if (!error && data) {
      const mappedNew = { ...data, aspectRatio: data.aspect_ratio, clips: [] };
      setLibrary(prev => [mappedNew, ...prev]);
      return { video: mappedNew, isNew: true };
    }
    
    console.error("Error inserting video:", error);
    return { video: candidate, isNew: true };
  }, []);

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

    // 2. If there are clips, insert them
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
        .insert(clipsToInsert);

      if (clipsError) {
        console.error("Error inserting clips:", clipsError);
      }
    }

    // Re-fetch to get the fresh record with clips
    fetchLibrary();
  }, [fetchLibrary]);

  const deleteVideo = useCallback(async (id) => {
    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", id);
      
    if (!error) {
      setLibrary(prev => prev.filter(v => v.id !== id));
    } else {
      console.error("Error deleting video:", error);
    }
  }, []);

  /**
   * Marks a specific clip as watched in Supabase
   */
  const markClipWatched = useCallback(async (clipId) => {
    const { error } = await supabase
      .from("clips")
      .update({ is_watched: true })
      .eq("id", clipId);

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
  }, []);

  /**
   * Saves a personal note to a specific clip
   */
  const saveClipNote = useCallback(async (clipId, note) => {
    const { error } = await supabase
      .from("clips")
      .update({ user_notes: note })
      .eq("id", clipId);

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
  }, []);

  /**
   * Fetches full video data including clips for a single video.
   */
  const fetchVideoDetail = useCallback(async (videoId) => {
    const { data, error } = await supabase
      .from("videos")
      .select("*, clips(*)")
      .eq("id", videoId)
      .single();
    
    if (!error && data) {
      const mapped = {
        ...data,
        aspectRatio: data.aspect_ratio,
        clips: data.clips?.map(clip => ({
          ...clip,
          start: clip.start_time ?? clip.start,
          end: clip.end_time ?? clip.end,
          is_watched: clip.is_watched ?? false,
          user_notes: clip.user_notes ?? ""
        })).sort((a, b) => (a.start_time ?? a.start) - (b.start_time ?? b.start)) || []
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
    saveClipNote
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};
