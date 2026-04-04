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

# Directory definitions relative to this file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
AUDIO_OUTPUT_DIR = os.path.join(BASE_DIR, "data", "raw_videos") # Store temp audio next to video
TRANSCRIPT_DIR = os.path.join(BASE_DIR, "data", "transcripts")


# ---------------------------------------------------------------------------
# Core Audio & Transcription Functions
# ---------------------------------------------------------------------------

def extract_audio(video_filepath: str) -> str:
    """
    Extracts audio from a video file into a highly compressed MP3 format.
    
    Args:
        video_filepath: Absolute path to the .mp4 file.
    Returns:
        Absolute path to the resulting .mp3 file.
    """
    # Create the output filename by replacing .mp4 with .mp3
    base_name = os.path.splitext(os.path.basename(video_filepath))[0]
    audio_filepath = os.path.join(AUDIO_OUTPUT_DIR, f"{base_name}.mp3")

    # If we already extracted it, skip to save time!
    if os.path.exists(audio_filepath):
        print(f"⏩ Audio already extracted: {audio_filepath}")
        return audio_filepath

    print(f"\n🎵 Extracting audio using FFmpeg...")
    
    # Standard FFmpeg command to extract and compress audio:
    # -vn : No Video (discards frames)
    # -c:a libmp3lame : Use the standard MP3 encoder
    # -q:a 5 : Moderate compression quality (good for voice, keeps file size tiny)
    # -y : Overwrite if exists
    ffmpeg_cmd = [
        "ffmpeg",
        "-i", video_filepath,
        "-vn",
        "-c:a", "libmp3lame",
        "-q:a", "5",
        "-y",
        audio_filepath
    ]

    try:
        # Run FFmpeg as a subprocess. We capture stdout/stderr so it doesn't
        # spam our developer terminal unless there's an error.
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Verify file size to ensure it's under Groq's 25MB limit
        size_mb = os.path.getsize(audio_filepath) / (1024 * 1024)
        print(f"✅ Audio Extraction Complete! Size: {size_mb:.2f} MB")
        
        if size_mb > 25:
            print("⚠️ WARNING: Audio file exceeds Groq's 25MB limit. Chunking may be required for long videos in the future.")
            
        return audio_filepath

    except subprocess.CalledProcessError as e:
        print(f"❌ FFmpeg Error: {e.stderr.decode('utf-8')}")
        raise RuntimeError("Failed to extract audio from video.")


def transcribe_audio(audio_filepath: str, video_title: str) -> str:
    """
    Sends the MP3 file to Groq Whisper for transcription.
    
    Args:
        audio_filepath: Absolute path to the extracted .mp3.
        video_title: Base name of the video for saving the JSON output.
    Returns:
        Absolute path to the saved transcript JSON file.
    """
    os.makedirs(TRANSCRIPT_DIR, exist_ok=True)
    transcript_filepath = os.path.join(TRANSCRIPT_DIR, f"{video_title}_transcript.json")

    # Caching check: Don't spend API limits if we already transcribed this!
    if os.path.exists(transcript_filepath):
        print(f"⏩ Transcript already exists: {transcript_filepath}")
        return transcript_filepath

    print(f"\n🧠 Sending to Groq Whisper API for transcription...")
    
    # Open the newly minted audio file in binary read mode
    with open(audio_filepath, "rb") as audio_file:
        # Send to Groq. Notice response_format="verbose_json". 
        # This is the secret sauce for clipping pipelines.
        transcription = client.audio.transcriptions.create(
            file=(os.path.basename(audio_filepath), audio_file.read()),
            model="whisper-large-v3",
            response_format="verbose_json",
        )

    # Save the raw JSON data to disk so we can inspect it and use it in Step 3
    # The transcription object is a Pydantic model, so we can convert it to a dict
    transcript_data = transcription.model_dump()
    
    with open(transcript_filepath, 'w', encoding='utf-8') as f:
        json.dump(transcript_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Transcription saved to: {transcript_filepath}")
    return transcript_filepath


def process_transcription(video_filepath: str) -> dict:
    """
    Main orchestrator for Step 2. Groups extraction and transcription.
    """
    if not os.path.exists(video_filepath):
        raise FileNotFoundError(f"Video file not found: {video_filepath}")

    base_name = os.path.splitext(os.path.basename(video_filepath))[0]
    
    audio_path = extract_audio(video_filepath)
    transcript_path = transcribe_audio(audio_path, base_name)
    
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
