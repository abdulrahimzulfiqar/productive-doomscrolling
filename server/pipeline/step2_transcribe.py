"""
=============================================================================
Step 2: Audio Extraction & Transcription (Groq Whisper)
=============================================================================

PURPOSE:
    Takes a raw video file, extracts a lightweight audio track, and then
    sends it to the Groq API for lightning-fast Whisper transcription.

    [Raw .mp4] --> (FFmpeg) --> [.mp3] --> (Groq) --> [Transcript JSON]

DESIGN DECISIONS:
    1. Audio Extraction Strategy:
       - We don't send the `.mp4` directly to Groq. Groq (and most APIs)
         has a strict 25 MB file upload limit.
       - We use Python's `subprocess` to trigger `ffmpeg` to strip the 
         video track (`-vn`) and compress the audio heavily to MP3. Voice 
         transcription doesn't need high bitrates!
    2. Prompting & Format:
       - We use `verbose_json` as the response type. This forces Whisper
         to give us exact start and end timestamps for every sentence!
    3. Caching / Saving:
       - Transcribing is an API call (costs money/rate limits). We save 
         the resulting JSON to disk so we never have to transcribe the same 
         video twice during development.

USAGE:
    from server.pipeline.2_transcribe import process_transcription
    result = process_transcription("data/raw_videos/My Video.mp4")
"""

import os
import json
import subprocess
from dotenv import load_dotenv
from groq import Groq

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Load API keys from the .env file we created earlier
load_dotenv()

# We need to initialize the Groq client securely using the environment variable
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY or GROQ_API_KEY == "your_groq_api_key_here":
    raise ValueError("Missing valid GROQ_API_KEY in .env file.")

client = Groq(api_key=GROQ_API_KEY)

import tempfile
TEMP_DIR = tempfile.gettempdir()

# ---------------------------------------------------------------------------
# Core Audio & Transcription Functions
# ---------------------------------------------------------------------------

def get_audio_duration(filepath: str) -> float:
    """Helper to get audio duration using ffprobe."""
    try:
        cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", filepath
        ]
        return float(subprocess.check_output(cmd).decode().strip())
    except Exception:
        return 0.0

def extract_audio(video_filepath: str) -> str:
    """
    Extracts audio into a highly compressed 32kbps Mono MP3 format.
    Voice transcription doesn't need high bitrates or stereo.
    """
    base_name = os.path.splitext(os.path.basename(video_filepath))[0]
    audio_filepath = os.path.join(TEMP_DIR, f"{base_name}.mp3")

    print(f"\n🎵 Extracting & Optimizing audio (48kbps Mono)...")
    ffmpeg_cmd = [
        "ffmpeg", "-i", video_filepath,
        "-vn",          # No video
        "-ac", "1",     # Mono
        "-b:a", "48k",  # 48kbps (Perfect balance for speech)
        "-y", audio_filepath
    ]

    try:
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # INDUSTRIAL CLEANUP: If the source was an .m4a (yt-dlp default), delete it
        # now that we have the optimized .mp3.
        if video_filepath.endswith(".m4a") and video_filepath != audio_filepath:
            print(f"   🧹 Cleaning up source audio: {os.path.basename(video_filepath)}")
            os.remove(video_filepath)

        size_mb = os.path.getsize(audio_filepath) / (1024 * 1024)
        print(f"✅ Audio Optimized! Size: {size_mb:.2f} MB")
        return audio_filepath
    except Exception as e:
        print(f"❌ FFmpeg Error: {e}")
        raise

def transcribe_chunk(audio_file_payload, chunk_index: int, offset_seconds: float) -> dict:
    """Helper to transcribe a single chunk and adjust timestamps."""
    print(f"   🧠 Transcribing Chunk #{chunk_index+1} (Offset: {offset_seconds}s)...")
    transcription = client.audio.transcriptions.create(
        file=audio_file_payload,
        model="whisper-large-v3",
        response_format="verbose_json",
    )
    data = transcription.model_dump()
    
    # Adjust timestamps in segments
    if "segments" in data:
        for seg in data["segments"]:
            seg["start"] += offset_seconds
            seg["end"] += offset_seconds
    
    return data

def transcribe_audio(audio_filepath: str, video_id: str) -> str:
    """
    Sends the MP3 to Groq. Handles automatic chunking if > 25MB.
    """
    transcript_filepath = os.path.join(TEMP_DIR, f"{video_id}_transcript.json")

    size_mb = os.path.getsize(audio_filepath) / (1024 * 1024)
    
    # --- Case 1: Standard Transcription ---
    if size_mb <= 25.0:
        print(f"\n🧠 Sending to Groq Whisper (Size: {size_mb:.2f} MB)...")
        with open(audio_filepath, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(audio_filepath), audio_file.read()),
                model="whisper-large-v3",
                response_format="verbose_json",
            )
            transcript_data = transcription.model_dump()
    
    # --- Case 2: Industrial Chunked Transcription ---
    else:
        print(f"\n🚧 File ({size_mb:.2f}MB) exceeds 25MB limit. Triggering Stitching Engine...")
        duration = get_audio_duration(audio_filepath)
        # Max chunk size logic: 32kbps mono is ~15MB per hour. 
        # We'll use 50-minute chunks (3000s) to be extremely safe (~12MB per chunk).
        chunk_length = 3000 
        
        all_segments = []
        full_text = []
        
        for i, start_offset in enumerate(range(0, int(duration), chunk_length)):
            chunk_path = f"{audio_filepath}_chunk_{i}.mp3"
            print(f"   ✂️ Slicing chunk {i+1}...")
            # Extract chunk
            subprocess.run([
                "ffmpeg", "-i", audio_filepath,
                "-ss", str(start_offset), "-t", str(chunk_length),
                "-ac", "1", "-b:a", "48k", "-y", chunk_path
            ], check=True, capture_output=True)
            
            with open(chunk_path, "rb") as f:
                chunk_data = transcribe_chunk((os.path.basename(chunk_path), f.read()), i, start_offset)
                all_segments.extend(chunk_data.get("segments", []))
                full_text.append(chunk_data.get("text", ""))
            
            os.remove(chunk_path) # Clean up temp chunk

        transcript_data = {
            "text": " ".join(full_text),
            "segments": all_segments
        }

    with open(transcript_filepath, 'w', encoding='utf-8') as f:
        json.dump(transcript_data, f, indent=2, ensure_ascii=False)

    # INDUSTRIAL CLEANUP: Delete the primary audio file after processing to save disk space
    if os.path.exists(audio_filepath):
        try:
            os.remove(audio_filepath)
            print(f"   🧹 Removed temporary audio file: {audio_filepath}")
        except Exception as e:
            print(f"   ⚠️ Could not remove temporary audio file: {e}")

    print(f"✅ Full Transcription stitched and saved: {transcript_filepath}")
    return transcript_filepath


def process_transcription(video_filepath: str, video_id: str = None) -> dict:
    """
    Main orchestrator for Step 2. Groups extraction and transcription.
    """
    if not os.path.exists(video_filepath):
        raise FileNotFoundError(f"Video file not found: {video_filepath}")

    # Use the provided video_id or fallback to extracting from filename
    if not video_id:
        video_id = os.path.splitext(os.path.basename(video_filepath))[0]
    
    audio_path = extract_audio(video_filepath)
    transcript_path = transcribe_audio(audio_path, video_id)
    
    return {
        "audio_filepath": audio_path,
        "transcript_filepath": transcript_path
    }


# ---------------------------------------------------------------------------
# Standalone Test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    
    # For testing, we dynamically grab whatever file the user downloaded in Step 1
    # We look for "Me_at_the_zoo.mp4" first (yt-dlp restrictfilenames=True replaces spaces with underscores).
    test_video_path = os.path.join(BASE_DIR, "data", "raw_videos", "Me_at_the_zoo.mp4")
    
    if not os.path.exists(test_video_path):
        print(f"❌ Cannot find test video at {test_video_path}.")
        print("Please ensure you successfully ran 'python -m server.pipeline.1_download' first.")
        sys.exit(1)

    print("=" * 60)
    print("  PIPELINE STEP 2: Extraction & Transcription Test")
    print("=" * 60)

    try:
        result = process_transcription(test_video_path)
        
        print("\n" + "=" * 60)
        print("  RESULT:")
        print(f"  Audio Track: {result['audio_filepath']}")
        print(f"  Transcript:  {result['transcript_filepath']}")
        print("=" * 60)
        
        # Let's read a tiny piece of the transcript to prove it worked!
        with open(result['transcript_filepath'], 'r') as f:
            data = json.load(f)
            print("\nPreview of extracted text:")
            print(f'"{data.get("text", "No text found?")}"')
            print("\nPreview of the first timestamp segment:")
            if "segments" in data and len(data["segments"]) > 0:
                first_seg = data["segments"][0]
                print(f"Start: {first_seg.get('start')}s | End: {first_seg.get('end')}s")
                print(f"Text: '{first_seg.get('text')}'")
                
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
