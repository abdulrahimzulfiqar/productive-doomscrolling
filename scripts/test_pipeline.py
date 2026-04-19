import sys
import os
import json
import asyncio

# Fix Python path so we can resolve absolute imports like 'from server...'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.api.routes import process_video_endpoint
from server.schemas.processing import ProcessVideoRequest

async def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_pipeline.py <youtube_url_or_filepath>")
        sys.exit(1)

    target = sys.argv[1]
    
    print("=" * 70)
    print("🚀 PRODUCTIVE DOOMSCROLLING AI PIPELINE (FastAPI Web Core)")
    print("=" * 70)
    print(f"🔗 Target: {target}\n")

    # This schema forces Pydantic validation on the target!
    req = ProcessVideoRequest(url=target)
    
    try:
        # Call the FastAPI endpoint logic directly to test Phase 1 cleanly
        res = await process_video_endpoint(req)
        
        print("\n======================================================================")
        print("✅ PIPELINE COMPLETE! API JSON RESPONSE:")
        print("======================================================================")
        print(res.model_dump_json(indent=2))
        print(f"\n📦 Success! Total AI Clips Identified: {len(res.clips)}")
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
