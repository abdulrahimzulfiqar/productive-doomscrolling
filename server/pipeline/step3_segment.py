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
    start_time: float = Field(description="Exact start timestamp in seconds.")
    end_time: float = Field(description="Exact end timestamp in seconds.")
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
    1. You MUST divide the ENTIRE video into consecutive, non-overlapping clips.
       The first clip starts at 0.0 seconds. The last clip ends at {video_duration} seconds.
       Every second of the video must belong to exactly one clip. NO gaps, NO overlaps.
    2. Each clip should be between 30 and 120 seconds long.
    3. Find NATURAL breakpoints: topic shifts, pauses, transitions, or sentence endings.
       Never cut in the middle of a sentence or during an active demonstration.
    4. Cover the entire video INCLUDING intros and outros — do not skip anything.
    5. Tag each clip as 'content' (default for most), 'sponsor_ad' (if the speaker 
       is clearly promoting a product/sponsor), or 'filler' (only for truly empty  
       moments like long silence or music-only transitions).
    6. Rate each clip's virality_score from 1-10 based on educational value, 
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
    - clip start_time must EXACTLY match a segment 'start' value from the transcript.
    - clip end_time must EXACTLY match a segment 'end' value from the transcript.
    - Each clip's start_time must equal the previous clip's end_time (no gaps).
    {chapter_context}
    """


def segment_transcript(
    transcript_filepath: str, 
    video_duration: float = None,
    chapters: list = None
) -> str:
    """
    Analyzes a transcript and returns AI-generated full-coverage clip metadata.
    
    Args:
        transcript_filepath: Path to the Groq Whisper output JSON.
        video_duration: Total video duration in seconds (from Step 1).
        chapters: Optional list of YouTube chapter dicts with title/start_time/end_time.
    Returns:
        Absolute path to the saved clips metadata JSON file.
    """
    os.makedirs(CLIPS_METADATA_DIR, exist_ok=True)
    
    base_name = os.path.basename(transcript_filepath).replace("_transcript.json", "")
    clips_filepath = os.path.join(CLIPS_METADATA_DIR, f"{base_name}_clips.json")

    # Always regenerate during development to test prompt changes
    if os.path.exists(clips_filepath):
        os.remove(clips_filepath)

    print(f"\n📖 Loading transcript: {transcript_filepath}")
    with open(transcript_filepath, 'r', encoding='utf-8') as f:
        transcript_data = json.load(f)

    # Clean segments: only send what Gemini needs (start, end, text)
    clean_segments = []
    for seg in transcript_data.get("segments", []):
        clean_segments.append({
            "start": seg.get("start"),
            "end": seg.get("end"),
            "text": seg.get("text", "").strip()
        })

    # If video_duration wasn't passed, estimate from the last segment
    if video_duration is None:
        video_duration = clean_segments[-1]["end"] if clean_segments else 0.0

    transcript_text_payload = json.dumps(clean_segments, indent=2)

    print(f"🧠 Asking Gemini 2.5 Flash to fully segment {len(clean_segments)} segments ({video_duration:.0f}s)...")

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=transcript_text_payload,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SegmentationResult,
                system_instruction=build_system_prompt(video_duration, chapters)
            )
        )
        
        ai_response_json = json.loads(response.text)

        with open(clips_filepath, 'w', encoding='utf-8') as f:
            json.dump(ai_response_json, f, indent=2, ensure_ascii=False)

        clips = ai_response_json.get("clips", [])
        ratio = ai_response_json.get("recommended_aspect_ratio", "square")
        print(f"✅ Full segmentation complete: {len(clips)} clips.")
        print(f"📐 Recommended aspect ratio: {ratio}")
        print(f"💾 Saved to: {clips_filepath}")
        return clips_filepath

    except Exception as e:
        print(f"❌ Gemini Segmentation Error: {e}")
        raise


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
