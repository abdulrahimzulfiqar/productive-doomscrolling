import { useState, useCallback, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * useLibrary Hook (Supabase Edition)
 * Centralizes all CRUD operations for the Productive Doomscrolling app.
 * Persists data to Supabase PostgreSQL database.
 */
export const useLibrary = () => {
  const [library, setLibrary] = useState([]);

  // Load library from Supabase
  const fetchLibrary = useCallback(async () => {
    const { data, error } = await supabase
      .from("videos")
      .select(`*, clips(*)`)
      .order("created_at", { ascending: false });
      
    if (!error && data) {
      setLibrary(data);
    } else if (error) {
      console.error("Error fetching library:", error);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  /**
   * Adds a new video to the library.
   * Enforces deduplication based on videoId inside Supabase.
   */
  const addVideo = useCallback(async (candidate) => {
    // Check if ID already exists
    const { data: existing } = await supabase
      .from("videos")
      .select("*, clips(*)")
      .eq("id", candidate.id)
      .single();
    
    if (existing) {
      console.log(`[useLibrary] Video ID ${candidate.id} already exists. Returning existing.`);
      return { video: existing, isNew: false };
    }

    // Insert new video
    const { data, error } = await supabase
      .from("videos")
      .insert([
        {
          id: candidate.id,
          url: candidate.url,
          title: candidate.title || "Processing Masterclass...",
          image: candidate.image,
          duration: candidate.duration || "Calculating...",
          status: candidate.status || "processing"
        }
      ])
      .select(`*, clips(*)`)
      .single();

    if (!error && data) {
      setLibrary(prev => [data, ...prev]);
      return { video: data, isNew: true };
    }
    
    console.error("Error inserting video:", error);
    return { video: candidate, isNew: true };
  }, []);

  /**
   * Updates an existing video record
   */
  const updateVideo = useCallback(async (id, updates) => {
    // 1. Update the videos table
    const { error: videoError } = await supabase
      .from("videos")
      .update({
        title: updates.title,
        status: updates.status
      })
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


  /**
   * Deletes a video from the library.
   */
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
   * Clears the entire library (not recommended for production DB, kept for API compat)
   */
  const clearLibrary = useCallback(async () => {
    console.warn("clearLibrary is disabled in Supabase mode to prevent accidental deletion.");
  }, []);

  return {
    library,
    addVideo,
    updateVideo,
    deleteVideo,
    clearLibrary,
    fetchLibrary
  };
};
