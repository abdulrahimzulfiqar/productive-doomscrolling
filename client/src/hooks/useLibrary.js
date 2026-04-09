import { useState, useCallback, useEffect } from "react";

/**
 * useLibrary Hook
 * Centralizes all CRUD operations for the Productive Doomscrolling app.
 * Persists data to localStorage while enforcing ID-based uniqueness.
 */
export const useLibrary = () => {
  const [library, setLibrary] = useState([]);

  // Load library on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("library") || "[]");
    setLibrary(saved);
  }, []);

  const saveLibrary = (newLibrary) => {
    localStorage.setItem("library", JSON.stringify(newLibrary));
    setLibrary(newLibrary);
  };

  /**
   * Adds a new video to the library.
   * Enforces deduplication based on videoId.
   */
  const addVideo = useCallback((candidate) => {
    const existing = JSON.parse(localStorage.getItem("library") || "[]");
    
    // Check if ID already exists (Deduplication)
    const duplicateIndex = existing.findIndex(v => v.id === candidate.id);
    
    if (duplicateIndex !== -1) {
      console.log(`[useLibrary] Video ID ${candidate.id} already exists. Returning existing.`);
      return { video: existing[duplicateIndex], isNew: false };
    }

    const updated = [candidate, ...existing];
    saveLibrary(updated);
    return { video: candidate, isNew: true };
  }, []);

  /**
   * Updates an existing video record (e.g. after AI finishes)
   */
  const updateVideo = useCallback((id, updates) => {
    const existing = JSON.parse(localStorage.getItem("library") || "[]");
    const updated = existing.map(v => 
      v.id === id ? { ...v, ...updates } : v
    );
    saveLibrary(updated);
  }, []);

  /**
   * Deletes a video from the library.
   */
  const deleteVideo = useCallback((id) => {
    const existing = JSON.parse(localStorage.getItem("library") || "[]");
    const updated = existing.filter(v => v.id !== id);
    saveLibrary(updated);
  }, []);

  /**
   * Clears the entire library (mostly for internal testing/reset)
   */
  const clearLibrary = useCallback(() => {
    saveLibrary([]);
  }, []);

  return {
    library,
    addVideo,
    updateVideo,
    deleteVideo,
    clearLibrary
  };
};
