import os
import re
import json
import yt_dlp
import subprocess
import shutil
from typing import Dict, Any

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

# --- Directory Setup ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "raw_videos")
TRANSCRIPTS_DIR = os.path.join(BASE_DIR, "data", "transcripts")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)

def sanitize_filename(name: str) -> str:
    return re.sub(r'[^\w\-_.]', '_', name)

def extract_youtube_id(url: str) -> str:
    """Extracts the 11-character YouTube video ID from a URL."""
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    return match.group(1) if match else None

def get_native_transcript(video_id: str, video_title: str) -> bool:
    """
    Attempts to fetch the transcript instantly via youtube-transcript-api.
    Returns the path if successfully saved (or cached), False if we need to fallback.
    """
    out_path = os.path.join(TRANSCRIPTS_DIR, f"{video_id}_transcript.json")
    if os.path.exists(out_path):
        print(f"   ⏩ Native transcript already cached: {out_path}")
        return out_path

    try:
        print(f"\n📝 Attempting to fetch native YouTube captions for {video_id}...")
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)
        
        # We explicitly demand manual english transcripts first. 
        # If none exist, we accept auto-generated english. 
        try:
            transcript = transcript_list.find_manually_created_transcript(['en'])
            print("   ✅ Found manual high-quality English transcript!")
        except Exception:
            transcript = transcript_list.find_generated_transcript(['en'])
            print("   ⚠️ Found auto-generated English transcript.")
            
        raw_data = transcript.fetch()
        
        # Convert to Whisper-style format
        whisper_format = []
        for segment in raw_data:
            whisper_format.append({
                "start": segment.start,
                "end": segment.start + segment.duration,
                "text": segment.text
            })
            
        out_path = os.path.join(TRANSCRIPTS_DIR, f"{video_id}_transcript.json")
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(whisper_format, f, indent=2, ensure_ascii=False)
            
        print(f"   💾 Saved instantly to {out_path}")
        return out_path
        
    except (TranscriptsDisabled, NoTranscriptFound, Exception) as e:
        print(f"   ❌ Native captions unavailable: {e}")
        return None

def download_video(url: str) -> Dict[str, Any]:
    """
    Ingests a video. Fetches metadata and native transcripts if possible.
    If transcript fails, downloads ONLY the audio for Whisper fallback.
    """
    if not url or not url.strip():
        raise ValueError("URL cannot be empty.")

    # --- Local File Bypass ---
    if os.path.isfile(url):
        print(f"\n📂 Local file detected: {url}")
        base_name = os.path.basename(url)
        safe_name = sanitize_filename(os.path.splitext(base_name)[0]) + ".mp4"
        dest_path = os.path.join(OUTPUT_DIR, safe_name)
        
        if os.path.abspath(url) != os.path.abspath(dest_path):
            print(f"   Copying to workspace: {dest_path}")
            shutil.copy2(url, dest_path)
        else:
            print(f"   File already in workspace.")
            
        try:
            cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", dest_path]
            duration_sec = float(subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().strip())
        except Exception:
            duration_sec = 0.0

        return {
            "title": safe_name,
            "filepath": dest_path,
            "duration": duration_sec,
            "chapters": [],
            "transcript_ready_path": None # Forces Whisper
        }

    # --- YouTube API / Metadata Extraction ---
    print(f"\n📡 Fetching metadata: {url}")
    
    # We only want metadata now!
    ydl_opts_info = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
        info = ydl.extract_info(url, download=False)

        video_title = info.get("title", "unknown")
        video_id = info.get("id", extract_youtube_id(url))
        duration = info.get("duration", 0)

        raw_chapters = info.get("chapters", []) or []
        chapters = [{"title": ch.get("title"), "start_time": ch.get("start_time"), "end_time": ch.get("end_time")} for ch in raw_chapters]

    print(f"📹 Title:    {video_title}")
    print(f"🆔 ID:       {video_id}")
    print(f"⏱️  Duration: {duration}s")
    if chapters: print(f"📑 Found {len(chapters)} YouTube chapters")

    # --- Attempt Instant Transcript ---
    transcript_path = None
    if video_id:
        transcript_path = get_native_transcript(video_id, video_title)
        
    downloaded_filepath = None
    
    # --- Whisper Fallback (Audio Download) ---
    if not transcript_path:
        print("\n🔈 Triggering Audio-Only Download Fallback for Whisper...")
        ydl_opts_download = {
            "outtmpl": os.path.join(OUTPUT_DIR, "%(title)s.%(ext)s"),
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "restrictfilenames": True,
            "quiet": False,
            "cookiesfrombrowser": ("chrome",),
        }
        with yt_dlp.YoutubeDL(ydl_opts_download) as ydl:
            dl_info = ydl.extract_info(url, download=True)
            downloaded_filepath = os.path.abspath(ydl.prepare_filename(dl_info))
            print(f"✅ Audio downloaded to: {downloaded_filepath}")

    return {
        "title": video_title,
        "video_id": video_id,
        "duration": duration,
        "chapters": chapters,
        "transcript_ready_path": transcript_path,
        "filepath": downloaded_filepath
    }
