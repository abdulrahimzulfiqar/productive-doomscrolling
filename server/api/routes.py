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
        # Step 1: Ingestion & Metadata (this will soon primarily fetch transcripts instantly)
        video_metadata = download_video(url)
        video_duration = video_metadata['duration']
        chapters = video_metadata['chapters']
        transcript_path = video_metadata['transcript_ready_path']
        
        # Step 2: Transcription Fallback
        # If step 1 didn't find manual youtube captions, fallback to Whisper!
        if not transcript_path:
            video_path = video_metadata['filepath']
            if not video_path:
                raise HTTPException(status_code=400, detail="Could not extract native transcript nor download audio for Whisper.")
                
            transcription_result = process_transcription(video_path)
            transcript_path = transcription_result['transcript_filepath']
            
        # Step 3: Segment into viral clips
        clips_metadata_path = segment_transcript(
            transcript_path,
            video_duration=video_duration,
            chapters=chapters
        )
        
        # Read the generated JSON response
        with open(clips_metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
            
        return ProcessVideoResponse(
            video_url=url,
            video_summary=metadata.get("video_summary", "No summary available."),
            recommended_aspect_ratio=metadata.get("recommended_aspect_ratio", "letterbox"),
            aspect_ratio_reasoning=metadata.get("aspect_ratio_reasoning", ""),
            clips=metadata.get("clips", [])
        )

    except Exception as e:
        # In a real app we'd use proper logging here
        print(f"PIPELINE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
