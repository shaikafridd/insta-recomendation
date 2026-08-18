# Architecture Decision Records (ADR)

- 2026-08-18: Chose Redis for InterestProfile caching with automatic in-memory fallback to support zero-crash local dev.
- 2026-08-18: Added `isHypeBait` boolean directly on Reel schema to filter shallow clickbait content deterministically before LLM ranking.
- 2026-08-18: Model selection locked to `llama-3.3-70b-versatile` via Groq for fast inference latency and strong JSON output fidelity.
- 2026-08-18: Used Zod for request validation across query params, bodies, and multipart form schemas.
- 2026-08-18: Implemented asynchronous profile regeneration (`setImmediate`) on `POST /interactions` so event logging responses remain sub-50ms.
- 2026-08-18: Split repository into `backend/` and `frontend/` directories, with backend serving frontend static assets and handling CORS for seamless unified or standalone execution.
- 2026-08-18: Upgraded frontend architecture to modular React 19 + Vite SPA with Context-driven telemetry tracking and Vite proxy bridge.
- 2026-08-18: Implemented deterministic engagement scoring formula (watch% + replay*0.5 + like*1.5 - skip*1.0) with threshold >= 1.5; created RecommendationLog table for 24h DB caching and 7d anti-repetition filtering to cut Groq token usage.
- 2026-08-18: Added Cloudinary video media library sync (`POST /reels/sync-cloudinary`) with automated Groq LLM title, topic, caption, and hashtag generation; enhanced Groq recommendation reasoning to synthesize topic/hashtag vectors alongside watch engagement.
