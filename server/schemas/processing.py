from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional

class ProcessVideoRequest(BaseModel):
    """
    Incoming payload from the frontend asking to process a video.
    """
    url: HttpUrl = Field(..., description="The YouTube URL or local file path to process")

class ClipResponse(BaseModel):
    """
    Format of a single generated clip for the frontend.
    """
    clip_number: int
    title: str
    reason: Optional[str] = None
    start: float
    end: float
    virality_score: Optional[int] = 50

class ProcessVideoResponse(BaseModel):
    """
    Outgoing payload returned to the frontend.
    """
    video_url: str
    video_summary: str
    recommended_aspect_ratio: str
    aspect_ratio_reasoning: str
    clips: List[ClipResponse]
