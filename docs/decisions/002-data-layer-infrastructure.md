# ADR-002: Data Layer Infrastructure

**Status:** Accepted
**Date:** April 01, 2026

## Context
As the Productive Doomscrolling application scales, it requires a robust, distributed data layer capable of handling high-throughput video ingestion, complex structured metadata storage, semantic vector similarity searches for dynamic content recommendation, and low-latency global media delivery. Designing a cohesive data architecture early is critical to avoid system bottlenecks and ensure maintainability as concurrent users and background pipelines expand.

## Decision
We have architected the following infrastructure stack for the data and storage layer:

1. **Relational & Vector Database: PostgreSQL paired with `pgvector`**
   - **Reasoning:** PostgreSQL provides ACID-compliant, battle-tested relational storage for user profiles, video metadata, and application state. By utilizing the `pgvector` extension, we can store high-dimensional ML embeddings (generated from video transcripts and visual context) directly alongside the relational data. This unified architecture eliminates the operational overhead, network latency, and data synchronization complexities of maintaining a discrete, standalone vector database infrastructure. It enables native SQL-based cosine similarity searches required for our AI recommendation engine.

2. **In-Memory Caching & Asynchronous Message Broker: Redis**
   - **Reasoning:** Video processing pipelines (downloading via yt-dlp, FFmpeg extraction, Whisper transcription, and Gemini segmentation) are inherently bounded by heavy I/O and compute times. Executing these synchronously would block the application's event loop and degrade the user experience. Redis provides a highly concurrent, low-latency message broker to queue background ingestion jobs reliably. Furthermore, Redis acts as a caching layer for aggressively accessed endpoints (e.g., the primary scrolling feed interface), guaranteeing sub-millisecond retrieval of hot data.

3. **Object Storage & Global CDN: Cloudflare R2**
   - **Reasoning:** Processed `.mp4` clips and high-resolution thumbnail assets require highly durable object storage that scales horizontally distinct from our application servers. Cloudflare R2 implements the standard S3 API, ensuring seamless code integration. More critically, R2 natively integrates with Cloudflare's massive global Edge routing network. This guarantees ultra-low latency video streaming to end-users worldwide by caching content structurally close to the client requesting it, without requiring the configuration and management of an isolated CDN routing layer (such as AWS CloudFront). This deeply reduces architectural topology complexity and minimizes potential points of failure during asset delivery.

## Consequences
- **Architectural Elegance:** The system remains structurally streamlined into exactly three specialized data tools (PostgreSQL, Redis, Cloudflare R2) capable of orchestrating relational data, distributed machine learning vectors, asynchronous task scheduling, and global media streaming.
- **Local Environment Parity:** Development environments must structurally mirror this stack. Local infrastructure will be containerized via `docker-compose` wrapping the official `pgvector` image and Redis image to ensure perfect parity between developer machines and production.
