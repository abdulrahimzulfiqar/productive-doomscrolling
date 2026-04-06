"""
=============================================================================
Step 1: Video Downloader (yt-dlp)
=============================================================================

PURPOSE:
    Downloads a YouTube video given a URL using `yt-dlp`.
    This is the first stage in our AI pipeline:

    [YouTube URL] --> step1_download.py --> [Raw Video File (.mp4)] + [Metadata]

DESIGN DECISIONS:
    - We download the BEST quality pre-merged video+audio as a single .mp4.
    - Output is saved to `data/raw_videos/` with a sanitized filename.
    - We extract YouTube chapter markers (if available) and pass them forward 
      to Gemini in Step 3 for richer context about visual/action segments.
    - Single extract_info(download=True) call instead of two separate calls 
      to avoid duplicate network round-trips to YouTube.
    - All yt-dlp configuration is done via Python dict (not CLI flags)
      for better control, error handling, and testability.

USAGE:
    from server.pipeline.step1_download import download_video
    result = download_video("https://www.youtube.com/watch?v=...")
"""

import os
import yt_dlp


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Where downloaded videos are stored (relative to project root)
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw_videos")


# ---------------------------------------------------------------------------
# Core Download Function
# ---------------------------------------------------------------------------

def download_video(url: str) -> dict:
    """
    Downloads a YouTube video and returns metadata about the download.

    Args:
        url: A valid YouTube URL (e.g., https://www.youtube.com/watch?v=...)

    Returns:
        dict with keys:
            - "filepath":   Absolute path to the downloaded .mp4 file
            - "title":      Video title (sanitized for filesystem)
            - "duration":   Video duration in seconds
            - "video_id":   YouTube video ID
            - "chapters":   List of chapter dicts (title, start_time, end_time)
                            Empty list if the video has no chapters.

    Raises:
        ValueError: If the URL is empty or clearly invalid.
        yt_dlp.utils.DownloadError: If yt-dlp fails to download.
    """

    # --- Input Validation ---
    if not url or not url.strip():
        raise ValueError("URL cannot be empty.")

    # Ensure the output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # --- Local File Bypass ---
    # If the user provides a direct path to an .mp4 file instead of a URL,
    # skip yt-dlp entirely. Copy it to our workspace and calculate its duration.
    if os.path.isfile(url):
        print(f"\n📂 Local file detected: {url}")
        
        base_name = os.path.basename(url)
        import re
        safe_name = re.sub(r'[^\w\-_.]', '_', os.path.splitext(base_name)[0]) + ".mp4"
        dest_path = os.path.join(OUTPUT_DIR, safe_name)
        
        # Only copy if it's not already in the target directory
        if os.path.abspath(url) != os.path.abspath(dest_path):
            import shutil
            print(f"   Copying to workspace: {dest_path}")
            shutil.copy2(url, dest_path)
        else:
            print(f"   File already in workspace.")
            
        # Get duration using ffprobe
        import subprocess
        try:
            cmd = [
                "ffprobe", "-v", "error", "-show_entries",
                "format=duration", "-of",
                "default=noprint_wrappers=1:nokey=1", dest_path
            ]
            duration_str = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().strip()
            duration_sec = float(duration_str)
        except Exception as e:
            print(f"   ⚠️ Could not read duration via ffprobe: {e}")
            duration_sec = 0.0

        print(f"📹 Title:    {safe_name}")
        print(f"⏱️  Duration: {duration_sec}s ({int(duration_sec) // 60}m {int(duration_sec) % 60}s)")

        return {
            "title": safe_name,
            "filepath": dest_path,
            "duration": duration_sec,
            "chapters": []  # Local files lack parsed chapters initially
        }

    # --- yt-dlp Options ---
    # These options control HOW yt-dlp downloads the video.
    # Industry practice: configure via dict, not CLI args.
    ydl_opts = {
        # Output template: save as <video_title>.mp4 inside our data folder.
        "outtmpl": os.path.join(OUTPUT_DIR, "%(title)s.%(ext)s"),

        # Format selection (2026 SABR-compatible):
        # YouTube now forces SABR streaming for most clients, which means
        # the old pre-merged "format 18" (360p) is often unavailable.
        # We request the best separate video+audio streams and let yt-dlp
        # merge them via ffmpeg into a single mp4 container.
        "format": "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best",

        # Force merge into mp4 container.
        "merge_output_format": "mp4",

        # Restrict filenames to ASCII characters to avoid filesystem issues.
        "restrictfilenames": True,

        # Show download progress.
        "quiet": False,
        "no_warnings": False,

        # Don't download playlists — only the single video.
        "noplaylist": True,

        # Retry up to 5 times on transient network failures.
        "retries": 5,

        # Skip unavailable fragments instead of failing the whole download.
        "skip_unavailable_fragments": True,

        # --- Cookie Authentication ---
        # YouTube's anti-bot system blocks repeat requests from the same IP.
        # Browser cookies authenticate us as a real logged-in user.
        "cookiesfrombrowser": ("chrome",),
    }

    # --- Execute Download ---
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:

        # Single extract_info call with download=True.
        # This avoids the previous bug where we called extract_info twice
        # (once without download, once with), causing duplicate YouTube requests.
        print(f"\n📡 Fetching & downloading: {url}")
        info = ydl.extract_info(url, download=True)

        video_title = info.get("title", "unknown")
        video_id = info.get("id", "unknown")
        duration = info.get("duration", 0)

        print(f"📹 Title:    {video_title}")
        print(f"🆔 ID:       {video_id}")
        print(f"⏱️  Duration: {duration}s ({duration // 60}m {duration % 60}s)")

        # --- Extract YouTube Chapters ---
        # Many creators add chapter markers (e.g., "0:00 Intro", "2:30 Drop Test").
        # yt-dlp parses these from the video description automatically.
        # We forward them to Gemini so it understands visual/action segments 
        # that may have little or no dialogue.
        raw_chapters = info.get("chapters", []) or []
        chapters = []
        for ch in raw_chapters:
            chapters.append({
                "title": ch.get("title", "Untitled"),
                "start_time": ch.get("start_time", 0),
                "end_time": ch.get("end_time", 0),
            })

        if chapters:
            print(f"📑 Found {len(chapters)} YouTube chapters")
        else:
            print(f"📑 No YouTube chapters found (video has no chapter markers)")

        # Build the expected output filepath.
        filepath = ydl.prepare_filename(info)
        filepath = os.path.splitext(filepath)[0] + ".mp4"
        filepath = os.path.abspath(filepath)

        print(f"✅ Download complete: {filepath}")

    return {
        "filepath": filepath,
        "title": video_title,
        "duration": duration,
        "video_id": video_id,
        "chapters": chapters,
    }


# ---------------------------------------------------------------------------
# Standalone Test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    TEST_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"

    print("=" * 60)
    print("  PIPELINE STEP 1: Video Download Test")
    print("=" * 60)

    result = download_video(TEST_URL)

    print("\n" + "=" * 60)
    print("  RESULT:")
    print(f"  File:     {result['filepath']}")
    print(f"  Title:    {result['title']}")
    print(f"  Duration: {result['duration']}s")
    print(f"  Video ID: {result['video_id']}")
    print(f"  Chapters: {len(result['chapters'])}")
    print("=" * 60)

    if os.path.exists(result["filepath"]):
        size_mb = os.path.getsize(result["filepath"]) / (1024 * 1024)
        print(f"  ✅ File verified on disk ({size_mb:.1f} MB)")
    else:
        print(f"  ❌ ERROR: File not found at {result['filepath']}")
