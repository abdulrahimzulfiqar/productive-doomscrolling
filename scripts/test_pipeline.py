"""
=============================================================================
Productive Doomscrolling — End-to-End Pipeline Orchestrator
=============================================================================

PURPOSE:
    Chains all 4 pipeline modules together. Accepts a YouTube URL and 
    outputs a folder of formatted short-form clips covering the entire video.

USAGE:
    python scripts/test_pipeline.py [YOUTUBE_URL]

EXAMPLE:
    python scripts/test_pipeline.py "https://www.youtube.com/watch?v=..."
"""

import os
import sys
import time
import argparse

# Ensure we can import the `server` package from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.pipeline.step1_download import download_video
from server.pipeline.step2_transcribe import process_transcription
from server.pipeline.step3_segment import segment_transcript
from server.pipeline.step4_clip import process_clips


def orchestrate_pipeline(url: str):
    """Executes the full 4-step pipeline."""
    
    print("\n" + "="*70)
    print("🚀 PRODUCTIVE DOOMSCROLLING AI PIPELINE")
    print("="*70)
    print(f"🔗 Target URL: {url}\n")
    
    pipeline_start = time.time()
    
    try:
        # --- Step 1: Download Video ---
        print("\n[1/4] INGESTION (yt-dlp)")
        print("-" * 40)
        video_metadata = download_video(url)
        video_path = video_metadata['filepath']
        video_duration = video_metadata['duration']
        chapters = video_metadata['chapters']
        
        # --- Step 2: Extract Audio & Transcribe ---
        print("\n[2/4] TRANSCRIPTION (FFmpeg + Groq Whisper)")
        print("-" * 40)
        transcription_result = process_transcription(video_path)
        transcript_path = transcription_result['transcript_filepath']
        
        # --- Step 3: AI Full-Coverage Segmentation ---
        print("\n[3/4] AI SEGMENTATION (Gemini 2.5 Flash)")
        print("-" * 40)
        clips_metadata_path = segment_transcript(
            transcript_path,
            video_duration=video_duration,
            chapters=chapters
        )
        
        # --- Step 4: FFmpeg Clipping ---
        print("\n[4/4] VIDEO EXPORT (FFmpeg Multi-Ratio)")
        print("-" * 40)
        final_clips = process_clips(video_path, clips_metadata_path)
        
        total_time = time.time() - pipeline_start
        
        # --- Summary ---
        print("\n" + "="*70)
        print("✅ PIPELINE COMPLETE!")
        print("="*70)
        print(f"⏱️  Total Time:  {total_time:.1f}s")
        print(f"🎥 Clips Made:  {len(final_clips)}")
        
        total_size = 0
        for idx, clip in enumerate(final_clips, 1):
            size_mb = os.path.getsize(clip) / (1024 * 1024)
            total_size += size_mb
            print(f"   [{idx:02d}] {os.path.basename(clip)} ({size_mb:.1f} MB)")
        print(f"\n📦 Total Output: {total_size:.1f} MB")
            
    except Exception as e:
        print("\n" + "="*70)
        print("❌ PIPELINE FAILED")
        print("="*70)
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Full AI Video Pipeline")
    parser.add_argument(
        "url", 
        nargs="?", 
        default="https://www.youtube.com/watch?v=jNQXAC9IVRw",
        help="YouTube URL to process."
    )
    args = parser.parse_args()
    orchestrate_pipeline(args.url)
