import os
import json
from fastapi import APIRouter, HTTPException
from server.schemas.processing import ProcessVideoRequest, ProcessVideoResponse, VideoMetadata
from server.api.billing import get_user_subscription, increment_user_quota

# Import existing pipeline logic (which we will refactor shortly for Web compat)
from server.pipeline.step1_download import download_video
from server.pipeline.step2_transcribe import process_transcription
from server.pipeline.step3_segment import segment_transcript

router = APIRouter()

@router.get("/metadata")
async def get_metadata_endpoint(url: str):
    """
    Fast-fetch only basic YouTube metadata (Title, Duration) for instant UI feedback.
    """
    try:
        from server.pipeline.step1_download import extract_youtube_id, download_video
        video_id = extract_youtube_id(url)
        # Download info only (download=False)
        video_metadata = download_video(url)
        
        minutes = int(video_metadata['duration'] // 60)
        seconds = int(video_metadata['duration'] % 60)
        formatted_dur = f"{minutes}:{seconds:02d}"

        return {
            "id": video_id,
            "title": video_metadata['title'],
            "duration": formatted_dur,
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process", response_model=ProcessVideoResponse)
async def process_video_endpoint(request: ProcessVideoRequest):
    """
    Ingests a YouTube URL, fetches transcripts (via yt-transcript-api or Whisper fallback),
    segments them via Gemini, and returns the timestamps without performing FFmpeg clipping.
    """
    url = str(request.url)
    
    # Check quota first if user_id is provided
    subscription = None
    if request.user_id:
        subscription = await get_user_subscription(request.user_id)
        if subscription.get("quota_used", 0) >= subscription.get("quota_limit", 5):
            raise HTTPException(
                status_code=403, 
                detail=f"You have reached your monthly processing limit of {subscription.get('quota_limit')} videos. Please upgrade your subscription."
            )

    try:
        print(f"\n[PIPELINE START] Processing URL: {url}")
        
        # Step 1: Ingestion & Metadata
        from server.pipeline.step1_download import extract_youtube_id
        video_id = extract_youtube_id(url)
        
        print(">>> [1/3] STAGE: DEEP INGESTION")
        print("    Fetching video context and metadata...")
        video_metadata = download_video(url)
        video_duration = video_metadata['duration']
        chapters = video_metadata['chapters']
        transcript_path = video_metadata['transcript_ready_path']
        video_id = video_metadata.get('video_id', video_id) # Update if step1 found it
        print(f"    ✓ Metadata acquired. Duration: {video_duration}s")
        
        # Enforce video duration limits based on subscription tier
        if subscription:
            tier = subscription.get("subscription_tier", "free")
            # Free tier: max 15 minutes (900 seconds)
            if tier == "free" and video_duration > 900:
                raise HTTPException(
                    status_code=403,
                    detail="Free tier users can only process videos up to 15 minutes long. Please upgrade to Plus or Pro."
                )
            # Plus tier: max 45 minutes (2700 seconds)
            elif tier == "plus" and video_duration > 2700:
                raise HTTPException(
                    status_code=403,
                    detail="Plus tier users can only process videos up to 45 minutes long. Please upgrade to Pro."
                )
            # Pro tier: max 2 hours (7200 seconds)
            elif tier == "pro" and video_duration > 7200:
                raise HTTPException(
                    status_code=403,
                    detail="Pro tier is limited to videos up to 2 hours long due to processing limits."
                )

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
        metadata = segment_transcript(
            transcript_path,
            video_duration=video_duration,
            chapters=chapters
        )
        # Format duration for the UI
        minutes = int(video_duration // 60)
        seconds = int(video_duration % 60)
        formatted_dur = f"{minutes}:{seconds:02d}"

        # Increment quota after successful process if tracking user
        if request.user_id and subscription:
            await increment_user_quota(request.user_id, subscription.get("quota_used", 0))

        return ProcessVideoResponse(
            video_url=url,
            video_title=video_metadata.get('title', "Mindful Insights"),
            video_summary=metadata.get("video_summary", "No summary available."),
            video_duration=formatted_dur,
            recommended_aspect_ratio=metadata.get("recommended_aspect_ratio", "letterbox"),
            aspect_ratio_reasoning=metadata.get("aspect_ratio_reasoning", ""),
            clips=metadata.get("clips", [])
        )

    except HTTPException:
        # Re-raise HTTP exceptions (like quota/duration block) directly
        raise
    except Exception as e:
        print(f"\n❌ PIPELINE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
