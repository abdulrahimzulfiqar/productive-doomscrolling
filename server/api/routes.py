import os
import json
from fastapi import APIRouter, HTTPException
from server.schemas.processing import ProcessVideoRequest, ProcessVideoResponse

# Import existing pipeline logic (which we will refactor shortly for Web compat)
from server.pipeline.step1_download import download_video
from server.pipeline.step2_transcribe import process_transcription
from server.pipeline.step3_segment import segment_transcript

router = APIRouter()

@router.post("/process", response_model=ProcessVideoResponse)
async def process_video_endpoint(request: ProcessVideoRequest):
    """
    Ingests a YouTube URL, fetches transcripts (via yt-transcript-api or Whisper fallback),
    segments them via Gemini, and returns the timestamps without performing FFmpeg clipping.
    """
    url = str(request.url)
    try:
        print(f"\n[PIPELINE START] Processing URL: {url}")
        
        # 0. Extract ID for Global Cache Check
        from server.pipeline.step1_download import extract_youtube_id
        from server.pipeline.step3_segment import CLIPS_METADATA_DIR
        video_id = extract_youtube_id(url)
        
        if video_id:
            clips_cache_path = os.path.join(CLIPS_METADATA_DIR, f"{video_id}_clips.json")
            if os.path.exists(clips_cache_path):
                print(f">>> [CACHE HIT] Found existing clips for {video_id}. Skipping pipeline.")
                with open(clips_cache_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                return ProcessVideoResponse(
                    video_url=url,
                    video_summary=metadata.get("video_summary", "Cached summary."),
                    recommended_aspect_ratio=metadata.get("recommended_aspect_ratio", "letterbox"),
                    aspect_ratio_reasoning=metadata.get("aspect_ratio_reasoning", "Loaded from cache."),
                    clips=metadata.get("clips", [])
                )

        # Step 1: Ingestion & Metadata
        print(">>> [1/3] STAGE: DEEP INGESTION")
        print("    Fetching video context and metadata...")
        video_metadata = download_video(url)
        video_duration = video_metadata['duration']
        chapters = video_metadata['chapters']
        transcript_path = video_metadata['transcript_ready_path']
        video_id = video_metadata.get('video_id', video_id) # Update if step1 found it
        print(f"    ✓ Metadata acquired. Duration: {video_duration}s")
        
        # Step 2: Transcription Fallback
        if not transcript_path:
            print(">>> [1b/3] STAGE: WHISPER FALLBACK")
            print("    Manual transcript missing. Triggering Whisper AI...")
            video_path = video_metadata['filepath']
            if not video_path:
                print("    ❌ FAILED: No audio/video path found.")
                raise HTTPException(status_code=400, detail="Could not extract native transcript nor download audio for Whisper.")
                
            transcription_result = process_transcription(video_path, video_id=video_id)
            transcript_path = transcription_result['transcript_filepath']
            print("    ✓ Whisper transcription complete.")
        else:
            print("    ✓ Found native YouTube transcript.")
            
        # Step 3: Segment into viral clips
        print(">>> [2/3] STAGE: NEURAL DISTILLATION")
        print("    Analyzing transcript with Gemini 2.5 Flash...")
        clips_metadata_path = segment_transcript(
            transcript_path,
            video_duration=video_duration,
            chapters=chapters
        )
        print("    ✓ AI segmentation complete.")
        
        # Read the generated JSON response
        print(">>> [3/3] STAGE: ASSET SYNTHESIS")
        print("    Formatting clips for reactive UI...")
        with open(clips_metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        print(f"    ✓ Successfully synthesized {len(metadata.get('clips', []))} clips.")
        print("[PIPELINE COMPLETE]\n")
            
        return ProcessVideoResponse(
            video_url=url,
            video_summary=metadata.get("video_summary", "No summary available."),
            recommended_aspect_ratio=metadata.get("recommended_aspect_ratio", "letterbox"),
            aspect_ratio_reasoning=metadata.get("aspect_ratio_reasoning", ""),
            clips=metadata.get("clips", [])
        )

    except Exception as e:
        print(f"\n❌ PIPELINE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
