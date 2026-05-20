import { useContext } from "react";
import { LibraryContext } from "../context/LibraryContext";

/**
 * useLibrary Hook (Supabase Edition - Context Version)
 * Centralizes all CRUD operations for the Productive Doomscrolling app.
 * Consumers read from a shared global context rather than creating isolated hook instances.
 */
export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
};
