# Productive Doomscrolling

An AI-powered web application that transforms long-form videos into useful, short-form clips using an intelligent pipeline.

## Overview
This project processes long-form content (YouTube URLs or local files), extracts audio, transcribes it using Groq/Whisper, segments the transcription intelligently using Gemini 3.1 Flash, and cuts the video into short-form, vertical "TikTok-style" clips.

## Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS (Mobile-First)
- **Backend**: FastAPI (Python)
- **AI Pipeline**:
  - Transcriptions: Groq Whisper API (Fast & Free)
  - Segmentation: Google Gemini 3.1 Flash API (Cost-effective, rapid reasoning)
  - Video Processing: local `ffmpeg` and `yt-dlp`
- **Database**: SQLite (local)

## Getting Started
(Documentation in progress...)
