"""
=============================================================================
Step 3: AI Segmentation — Full-Coverage Video Splitting (Gemini)
=============================================================================

PURPOSE:
    Takes the verbose transcript JSON generated in Step 2 and optionally 
    YouTube chapter metadata from Step 1, feeds it to Google's Gemini model,
    and instructs it to divide the ENTIRE video into consecutive, 
    non-overlapping short-form clips.

    [Transcript JSON] + [Chapter Metadata] --> (Gemini) --> [Full Clips JSON]

DESIGN DECISIONS:
    1. Full-Coverage Segmentation (not cherry-picking):
       - Our app's goal is "Productive Doomscrolling" — the user should be 
         able to scroll through ALL the clips and absorb the ENTIRE video's 
         content, not just highlights.
       - We instruct Gemini to cover every second of the video (0s → end).
    2. Single Aspect Ratio Per Video:
       - Mixing vertical crops and letterboxes within one video looks jarring.
       - Gemini analyzes the video type ONCE and picks ONE aspect ratio for 
         all clips: vertical_crop, letterbox, square, or original.
    3. Clip Duration Range (30s–120s):
       - Gives the AI breathing room to find natural breakpoints (topic 
         shifts, pauses) instead of cutting mid-sentence or mid-action.
    4. Strict Pydantic JSON Schema:
       - Guarantees the downstream clipper (Step 4) never crashes on 
         malformed AI output.

USAGE:
    from server.pipeline.step3_segment import segment_transcript
    clips_path = segment_transcript(
        "data/transcripts/video_transcript.json",
        video_duration=1261.0,
        chapters=[{"title": "Intro", "start_time": 0, "end_time": 30}]
    )
"""

import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
    raise ValueError("Missing valid GEMINI_API_KEY in .env file.")

client = genai.Client(api_key=GEMINI_API_KEY)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CLIPS_METADATA_DIR = os.path.join(BASE_DIR, "data", "clips_metadata")

# ---------------------------------------------------------------------------
# Strict JSON Output Schema (Pydantic)
# ---------------------------------------------------------------------------

class ViralClip(BaseModel):
    """Represents a single short-form clip extracted from the video."""
    clip_number: int = Field(description="Sequential clip number starting from 1.")
    title: str = Field(description="A catchy 3-8 word title for the clip.")
    start: float = Field(description="Exact start timestamp in seconds.")
    end: float = Field(description="Exact end timestamp in seconds.")
    virality_score: int = Field(description="Score from 1-10 predicting virality and educational value.")
    clip_type: str = Field(description="One of: 'content', 'sponsor_ad', 'filler'. Use 'content' for the vast majority.")
    reason: str = Field(description="Brief 1-sentence reason for this segmentation choice.")

class SegmentationResult(BaseModel):
    """The complete segmentation output for one video."""
    video_summary: str = Field(description="A 2 sentence summary of the entire video.")
    recommended_aspect_ratio: str = Field(
        description="ONE aspect ratio for ALL clips. Choose from: 'vertical_crop' (talking heads/podcasts), 'letterbox' (screen demos/comparisons/visual content), 'square' (mixed/general), 'original' (already vertical or unusual ratio)."
    )
    aspect_ratio_reasoning: str = Field(description="Brief 1-sentence reason for the chosen aspect ratio.")
    clips: list[ViralClip] = Field(description="List of ALL clips covering the entire video from start to finish.")


# ---------------------------------------------------------------------------
# Core Segmentation Logic
# ---------------------------------------------------------------------------

def build_system_prompt(video_duration: float, chapters: list = None) -> str:
    """
    Constructs the master prompt that turns Gemini into a full-coverage
    video segmentation engine.
    """
    # Build optional chapter context string
    chapter_context = ""
    if chapters and len(chapters) > 0:
        chapter_lines = []
        for ch in chapters:
            chapter_lines.append(f"  - [{ch.get('start_time', 0)}s] {ch.get('title', 'Untitled')}")
        chapter_context = f"""
    YOUTUBE CHAPTER MARKERS (creator-defined sections):
{chr(10).join(chapter_lines)}
    
    Use these chapter titles as additional context to understand visual/action 
    segments that may have little or no dialogue.
    """

    return f"""
    You are an expert Video Segmentation AI for a "Productive Doomscrolling" app.
    The app transforms long-form YouTube videos into scrollable short-form clips 
    so users can learn the COMPLETE content of a video by scrolling through bite-sized pieces.

    CRITICAL RULES:
    1. You MUST cover the ENTIRE video from 0.0 to {video_duration} seconds.
       You ARE ALLOWED to have slight overlaps (e.g., 2-10 seconds) between adjacent 
       clips IF it helps preserve the flow and context for the viewer.
    2. DURATION: Each clip must be between 60 seconds (1 minute) and 300 seconds (5 minutes) long.
    3. INDEPENDENT CONTEXT: This is highest priority. Every single clip MUST be an 
       independent, complete thought. If a user clicks on a random clip, they must 
       be able to understand the full context of what is being discussed. Do not generate 
       short fragments that lack context.
    4. BREAKPOINTS: Focus heavily on major topic changes and transitions. Let the speaker 
       finish their complete thought before ending the clip. 
    5. Cover the entire video INCLUDING intros and outros — do not skip anything.
    6. Tag each clip as 'content' (default for most), 'sponsor_ad' (if the speaker 
       is clearly promoting a product/sponsor), or 'filler' (only for truly empty  
       moments like long silence or music-only transitions).
    7. Rate each clip's virality_score from 1-10 based on educational value, 
       entertainment, and how well it works as a standalone short clip.

    ASPECT RATIO DECISION:
    Analyze the overall video type and choose ONE aspect ratio for ALL clips:
    - 'vertical_crop': Best for talking-head videos, podcasts, vlogs where the 
       speaker is centered. Crops the center of the landscape frame to 9:16.
    - 'letterbox': Best for screen recordings, code tutorials, side-by-side 
       comparisons, demos with important edge content. Places the full landscape 
       frame inside a vertical frame with black bars.
    - 'square': Best for mixed content or when unsure. A 1:1 crop is a safe 
       middle ground that works on all platforms.
    - 'original': Use only if the source video is already vertical or has an 
       unusual aspect ratio. Keeps the source ratio.


    TIMESTAMP RULES:
    - Each line in the transcript below starts with [seconds].
    - Use these exact timestamps for your 'start' and 'end' values.
    - Each clip's start must equal the previous clip's end (no gaps).
    {chapter_context}
    """


import time

def segment_transcript(
    transcript_filepath: str, 
    video_duration: float = None,
    chapters: list = None
) -> dict:
    """
    Analyzes a transcript and returns AI-generated full-coverage clip metadata as a dictionary.
    """
    # --- Idempotency Check: Skip Gemini if already processed ---
    video_id = os.path.basename(transcript_filepath).replace("_transcript.json", "")
    cached_metadata_path = os.path.join(CLIPS_METADATA_DIR, f"{video_id}_clips.json")
    
    if os.path.exists(cached_metadata_path):
        print(f"   ⏩ AI segmentation already cached: {cached_metadata_path}")
        with open(cached_metadata_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    print(f"\n📖 Loading transcript from memory/tmp: {transcript_filepath}")
    with open(transcript_filepath, 'r', encoding='utf-8') as f:
        transcript_data = json.load(f)

    # Clean segments: only send what Gemini needs (start, end, text)
    clean_segments = []
    if isinstance(transcript_data, list):
        segments = transcript_data
    else:
        segments = transcript_data.get("segments", [])

    for seg in segments:
        clean_segments.append({
            "start": seg.get("start"),
            "end": seg.get("end"),
            "text": seg.get("text", "").strip()
        })

    # If video_duration wasn't passed, estimate from the last segment
    if video_duration is None:
        video_duration = clean_segments[-1]["end"] if clean_segments else 0.0

    # --- COMPRESSION: Build a compact string to save 70%+ tokens ---
    compact_lines = []
    for seg in clean_segments:
        start_time = seg.get("start", 0)
        text = seg.get("text", "").strip()
        compact_lines.append(f"[{start_time:.1f}] {text}")
    
    transcript_text_payload = " || ".join(compact_lines)
    
    # Industrial Est: Each '||' and bracket helps Gemini delineate thoughts
    model_label = "Gemini 1.5 Flash"
    print(f"🧠 Asking {model_label} to segment {len(clean_segments)} lines (~{video_duration:.0f}s)...")

    # --- Industrial Retry Logic (Backoff) ---
    max_retries = 5
    retry_delay = 2  # Start with 2s
    
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='gemma-4-31b-it', #'gemma-4-31b-it'. 'gemini-2.5-flash-lite'
                contents=transcript_text_payload,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=SegmentationResult,
                    system_instruction=build_system_prompt(video_duration, chapters)
                )
            )
            
            ai_response_json = json.loads(response.text)

            # INDUSTRIAL CLEANUP: Delete the transcript file
            if os.path.exists(transcript_filepath):
                try:
                    os.remove(transcript_filepath)
                except Exception:
                    pass

            clips = ai_response_json.get("clips", [])
            ratio = ai_response_json.get("recommended_aspect_ratio", "square")
            print(f"✅ Full segmentation complete: {len(clips)} clips.")
            print(f"📐 Recommended aspect ratio: {ratio}")
            
            return ai_response_json

        except Exception as e:
            error_msg = str(e)
            # Retry on Transient/Server Errors
            is_transient = any(code in error_msg for code in ["500", "503", "429", "Unavailable", "Internal"])
            
            if is_transient:
                print(f"   ⚠️ Gemini Busy/Error: {error_msg}")
                print(f"   ⏳ (Attempt {attempt+1}/{max_retries}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                print(f"❌ Gemini Segmentation Error (Fatal): {e}")
                raise

    raise RuntimeError(f"Gemini API failed after {max_retries} attempts due to high demand.")


# ---------------------------------------------------------------------------
# Standalone Test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    
    test_transcript_path = os.path.join(BASE_DIR, "data", "transcripts", "Me_at_the_zoo_transcript.json")
    
    if not os.path.exists(test_transcript_path):
        print(f"❌ Cannot find transcript at {test_transcript_path}.")
        print("Please ensure you ran step 2 first.")
        sys.exit(1)

    print("=" * 60)
    print("  PIPELINE STEP 3: Full-Coverage Segmentation Test")
    print("=" * 60)

    try:
        result_path = segment_transcript(test_transcript_path)
        
        print("\n" + "=" * 60)
        print("  RESULT PREVIEW:")
        print("=" * 60)
        
        with open(result_path, 'r') as f:
            data = json.load(f)
            print(f"Summary: {data.get('video_summary', 'N/A')}")
            print(f"Aspect:  {data.get('recommended_aspect_ratio', 'N/A')}")
            print(f"Reason:  {data.get('aspect_ratio_reasoning', 'N/A')}\n")
            
            for clip in data.get('clips', []):
                tag = "🟢" if clip.get('clip_type') == 'content' else "🟡" if clip.get('clip_type') == 'filler' else "🔴"
                print(f"{tag} Clip {clip.get('clip_number')}: {clip.get('title')}")
                print(f"   ⏱️  {clip.get('start_time')}s → {clip.get('end_time')}s | 🔥 {clip.get('virality_score')}/10")
                print(f"   💡 {clip.get('reason')}\n")
                
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
