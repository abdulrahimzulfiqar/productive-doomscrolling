"""
=============================================================================
Step 4: FFmpeg Multi-Ratio Clipping Engine
=============================================================================

PURPOSE:
    Takes the raw video and the AI-generated clips JSON (from Step 3).
    Uses FFmpeg to cut at exact timestamps and applies the AI-recommended 
    aspect ratio transformation to ALL clips uniformly.

    [Raw Video] + [Metadata JSON] --> (FFmpeg) --> [Formatted .mp4 Clips]

DESIGN DECISIONS:
    1. Single Aspect Ratio Per Video:
       - Step 3's AI picks ONE ratio for the entire video. This keeps the 
         viewing experience consistent when the user scrolls through clips.
    2. Four Supported Modes:
       - vertical_crop: Center-crops 16:9 → 9:16 (talking heads)
       - letterbox:     Scales full frame into 9:16 with black bars (visual content)
       - square:        Center-crops to 1:1 (safe default)
       - original:      No transformation (already vertical or non-standard)
    3. FFmpeg Fast Seeking:
       - `-ss` placed BEFORE `-i` for instant keyframe seeking.
    4. Encoding:
       - libx264 CRF 23 for visually lossless quality at small file sizes.

USAGE:
    from server.pipeline.step4_clip import process_clips
    process_clips("video.mp4", "clips.json")
"""

import os
import json
import re
import subprocess

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CLIPS_OUTPUT_DIR = os.path.join(BASE_DIR, "data", "clips")


def sanitize_filename(name: str) -> str:
    """Removes illegal characters for safe filenames."""
    return re.sub(r'[^A-Za-z0-9_-]', '_', name.strip())


# ---------------------------------------------------------------------------
# Aspect Ratio Filter Builders
# ---------------------------------------------------------------------------

def get_video_filter(aspect_ratio: str) -> list:
    """
    Returns the appropriate FFmpeg -vf filter chain for the chosen aspect ratio.

    Each mode is designed to output a mobile-friendly vertical video:
    - vertical_crop: Crops the horizontal center to produce a 9:16 frame.
    - letterbox:     Shrinks the full frame and pads it into 1080x1920 with black bars.
    - square:        Crops the horizontal center to produce a 1:1 frame.
    - original:      No cropping — keeps the source aspect ratio as-is.
    """
    if aspect_ratio == "vertical_crop":
        # crop=ih*(9/16):ih — takes a 9:16 vertical slice from the center
        # ih = input height. Width becomes 56.25% of height.
        return ["-vf", "crop=ih*(9/16):ih"]

    elif aspect_ratio == "letterbox":
        # Two-stage filter:
        # 1. scale=1080:1920:force_original_aspect_ratio=decrease
        #    This safely shrinks/expands the video to fit exactly inside a 
        #    1080x1920 bounding box without distorting the aspect ratio.
        # 2. pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black
        #    This places the perfectly scaled video into the center of a pitch
        #    black 1080x1920 canvas.
        return ["-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black"]

    elif aspect_ratio == "square":
        # Crop a centered square from the landscape frame.
        # min(iw,ih) finds the smaller dimension (height for 16:9 video)
        # and uses it as both width and height for a perfect 1:1 crop.
        return ["-vf", "crop=min(iw\\,ih):min(iw\\,ih)"]

    elif aspect_ratio == "original":
        # No video filter — keep the source frame as-is.
        return []

    else:
        # Fallback: default to square if unknown ratio string
        print(f"⚠️ Unknown aspect ratio '{aspect_ratio}', defaulting to square.")
        return ["-vf", "crop=min(iw\\,ih):min(iw\\,ih)"]


# ---------------------------------------------------------------------------
# Core Clipping Logic
# ---------------------------------------------------------------------------

def process_clips(video_filepath: str, metadata_filepath: str) -> list[str]:
    """
    Reads the AI-generated clips JSON and extracts all clips with the 
    recommended aspect ratio applied uniformly.
    
    Returns:
        List of absolute paths to the generated .mp4 clip files.
    """
    if not os.path.exists(video_filepath):
        raise FileNotFoundError(f"Video file missing: {video_filepath}")
    if not os.path.exists(metadata_filepath):
        raise FileNotFoundError(f"Metadata file missing: {metadata_filepath}")

    os.makedirs(CLIPS_OUTPUT_DIR, exist_ok=True)

    print(f"\n✂️  Loading metadata: {metadata_filepath}")
    with open(metadata_filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    clips = data.get("clips", [])
    if not clips:
        print("⚠️ No clips found in the JSON file.")
        return []

    # Read the single aspect ratio chosen by Gemini for ALL clips
    aspect_ratio = data.get("recommended_aspect_ratio", "square")
    vf_args = get_video_filter(aspect_ratio)

    print(f"🎬 Found {len(clips)} clips | Aspect ratio: {aspect_ratio}")

    base_name = os.path.splitext(os.path.basename(video_filepath))[0]
    
    # Create a dedicated subdirectory for this specific video's clips
    video_clips_dir = os.path.join(CLIPS_OUTPUT_DIR, base_name)
    os.makedirs(video_clips_dir, exist_ok=True)
    
    generated_files = []

    for idx, clip in enumerate(clips, start=1):
        start_time = max(0.0, float(clip.get("start_time", 0.0)))
        end_time = float(clip.get("end_time", start_time + 30.0))
        duration = end_time - start_time

        if duration <= 0:
            print(f"⏩ Skipping Clip {idx}: Invalid duration.")
            continue

        raw_title = clip.get("title", f"Clip_{idx}")
        safe_title = sanitize_filename(raw_title)
        clip_num = clip.get("clip_number", idx)

        # We no longer need the base_name in the filename since the folder provides the context
        output_filename = f"clip{clip_num:02d}_{safe_title}.mp4"
        output_filepath = os.path.join(video_clips_dir, output_filename)

        if os.path.exists(output_filepath):
            print(f"⏩ Clip {clip_num} already exists, skipping.")
            generated_files.append(output_filepath)
            continue

        clip_type = clip.get("clip_type", "content")
        tag = "🟢" if clip_type == "content" else "🟡" if clip_type == "filler" else "🔴"

        print(f"\n{tag} Processing Clip {clip_num}/{len(clips)}: '{raw_title}' [{clip_type}]")
        print(f"    ⏱️  {start_time}s → {end_time}s ({duration:.1f}s)")

        # Build FFmpeg command with fast-seeking
        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-ss", str(start_time),      # FAST SEEK before input
            "-t", str(duration),
            "-i", video_filepath,
        ] + vf_args + [                   # Apply the chosen aspect ratio filter
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            output_filepath
        ]

        try:
            subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            size_mb = os.path.getsize(output_filepath) / (1024 * 1024)
            print(f"    ✅ Done ({size_mb:.2f} MB)")
            generated_files.append(output_filepath)
        except subprocess.CalledProcessError as e:
            print(f"    ❌ FFmpeg error for Clip {clip_num}:")
            print(e.stderr.decode('utf-8')[-500:])  # Print last 500 chars of error
            continue

    print(f"\n🏁 Finished: {len(generated_files)}/{len(clips)} clips exported.")
    return generated_files


# ---------------------------------------------------------------------------
# Standalone Test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    test_video = os.path.join(BASE_DIR, "data", "raw_videos", "Me_at_the_zoo.mp4")
    test_metadata = os.path.join(BASE_DIR, "data", "clips_metadata", "Me_at_the_zoo_clips.json")

    if not os.path.exists(test_video) or not os.path.exists(test_metadata):
        print("❌ Cannot find test video or metadata files.")
        print("Please run Steps 1, 2, and 3 first.")
        sys.exit(1)

    print("=" * 60)
    print("  PIPELINE STEP 4: Multi-Ratio Clipping Test")
    print("=" * 60)

    try:
        final_clips = process_clips(test_video, test_metadata)

        print("\n" + "=" * 60)
        print("  RESULT SUMMARY:")
        print("=" * 60)
        for fpath in final_clips:
            size_mb = os.path.getsize(fpath) / (1024 * 1024)
            print(f"📱 {os.path.basename(fpath)} ({size_mb:.2f} MB)")

    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
