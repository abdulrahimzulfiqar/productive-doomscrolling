# ADR-001: Architecture Stack

**Status:** Accepted
**Date:** March 31, 2026

## Context
We need a highly scalable tech stack for a video-to-clip AI pipeline (Productive Doomscrolling app). The primary goal is to build a production-grade MVP that balances minimal infrastructure costs with high-accuracy clip generation while supporting rapid iteration.

## Decision
We've selected the following stack:
1. **Frontend:** Mobile-first Web App built using React (Vite).
2. **Backend:** FastAPI (Python) for asynchronous handling of machine learning workloads and HTTP logic.
3. **ML Transcription:** Groq API (Whisper) for speed and cost-effectiveness initially, with a fallback to OpenAI Whisper API if needed.
4. **ML Segmentation:** Google Gemini (3.1 Flash) for state-of-the-art cost-effective reasoning on long transcripts. 
5. **Video processing:** `ffmpeg` via command-line wrapper combined with `yt-dlp` for YouTube ingestion.

## Consequences
- Cost remains extremely low (pennies per video) due to the use of Groq free-tier and Gemini API.
- We must handle asynchronous backgrounds jobs for parsing videos because video ingestion and FFmpeg can still take seconds to minutes. FastAPI Background Tasks are an easy starting point, but a robust queue like Celery or RQ might be necessary if we scale up.
