import os
import re
import json
import yt_dlp
import subprocess
import shutil
from typing import Dict, Any, Optional

from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from youtube_transcript_api.proxies import WebshareProxyConfig

# --- Directory Setup ---
import tempfile
from googleapiclient.discovery import build
import isodate

TEMP_DIR = tempfile.gettempdir()

def get_youtube_metadata_api(video_id: str) -> Dict[str, Any]:
    """Fetches video metadata using the official YouTube Data API v3."""
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        print("⚠️ No YOUTUBE_API_KEY found. Falling back to scraper.")
        return None
    
    try:
        print(f"📡 Fetching metadata via Official YouTube API for {video_id}...")
        youtube = build("youtube", "v3", developerKey=api_key, cache_discovery=False)
        request = youtube.videos().list(
            part="snippet,contentDetails",
            id=video_id
        )
        response = request.execute()
        
        if not response.get('items'):
            print("   ❌ Video not found or private via API.")
            return None
            
        item = response['items'][0]
        title = item['snippet']['title']
        duration_iso = item['contentDetails']['duration']
        duration_sec = isodate.parse_duration(duration_iso).total_seconds()
        
        print(f"   ✅ API success: {title}")
        return {
            "title": title,
            "duration": int(duration_sec),
            "chapters": [] # API chapters are complex, keeping it for now
        }
    except Exception as e:
        print(f"   ❌ YouTube API error: {e}")
        return None



def sanitize_filename(name: str) -> str:
    return re.sub(r'[^\w\-_.]', '_', name)

def extract_youtube_id(url: str) -> str:
    """Extracts the 11-character YouTube video ID from a URL."""
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    return match.group(1) if match else None

def get_native_transcript(video_id: str, video_title: str) -> bool:
    """
    Attempts to fetch the transcript instantly via youtube-transcript-api.
    Uses Webshare rotating proxies if credentials are provided in environment.
    """
    out_path = os.path.join(TEMP_DIR, f"{video_id}_transcript.json")
    if os.path.exists(out_path):
        print(f"   ⏩ Native transcript already cached in tmp: {out_path}")
        return out_path

    cookies_path = None
    cookie_file = "www.youtube.com_cookies.txt"
    if os.path.exists(cookie_file):
        cookies_path = cookie_file

    try:
        print(f"\n📝 Attempting to fetch native YouTube captions for {video_id}...")
        
        # Correct method is .list() in this version
        transcript_list = YouTubeTranscriptApi.list(
            video_id, 
            cookies=cookies_path
        )
        
        # 1. Try to find Manual English (Best) or Generated English (Okay)
        try:
            transcript = transcript_list.find_transcript(['en'])
            print("   ✅ Found English transcript (Native/Auto).")
        except Exception:
            # 2. Global Fallback: Find ANY first available transcript
            print("   ⚠️ English transcript not found. Searching for alt languages...")
            available = list(transcript_list)
            if not available:
                raise ValueError("No transcripts available.")
            
            transcript = available[0]
            print(f"   🌐 Falling back to {transcript.language} ({transcript.language_code}) transcript.")
            
        raw_data = transcript.fetch()
        
        # Convert to Whisper-style format
        whisper_format = []
        for segment in raw_data:
            whisper_format.append({
                "start": segment.start,
                "end": segment.start + segment.duration,
                "text": segment.text
            })
            
        out_path = os.path.join(TEMP_DIR, f"{video_id}_transcript.json")
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
        dest_path = os.path.join(TEMP_DIR, safe_name)
        
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

    # --- Cookie Configuration (Root Level) ---
    cookie_file = "www.youtube.com_cookies.txt"
    cookies_path = None
    if os.path.exists(cookie_file):
        print(f"   🍪 Using Cookie Session (VIP Authentication) for {url}...")
        cookies_path = cookie_file

    # --- YouTube API / Metadata Extraction ---
    video_id = extract_youtube_id(url)
    api_metadata = get_youtube_metadata_api(video_id) if video_id else None

    if api_metadata:
        video_title = api_metadata['title']
        duration = api_metadata['duration']
        chapters = api_metadata['chapters']
    else:
        print(f"\n📡 Falling back to scraping metadata: {url}")
        # We only want metadata now!
        ydl_opts_info = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "cookiefile": cookies_path if cookies_path else None,
            "extractor_args": {
                "youtube": {
                    "player_client": ["web_creator", "android", "ios"],
                    "skip": ["dash", "hls"]
                }
            },
        }

        with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
            info = ydl.extract_info(url, download=False)
            video_title = info.get("title", "unknown")
            video_id = info.get("id", video_id)
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
            "outtmpl": os.path.join(TEMP_DIR, "%(id)s.%(ext)s"), # Use ID for cleaner tracking
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "restrictfilenames": True,
            "quiet": False,
            "cookiefile": cookies_path if cookies_path else None,
            "extractor_args": {
                "youtube": {
                    "player_client": ["web_creator", "android", "ios"],
                    "skip": ["dash", "hls"]
                }
            },
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
