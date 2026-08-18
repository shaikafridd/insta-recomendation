# System Architecture — Reels Interest-Recommender

## 1. System Overview & Flow
```
[Client Feed / API Consumer]
       │  (watch events: watch%, dwell_ms, like, skip, replay)
       ▼
[POST /interactions] ────────► [MongoDB: Interaction Store]
                                         │ (async trigger)
                                         ▼
                               [Groq: inferInterest] (llama-3.3-70b-versatile)
                                         │
                                         ▼
                               [Redis: InterestProfile] (TTL: 1 hour)
                                         │
[GET /recommendations/:userId] ──────────┤
                                         ▼
                               [MongoDB: Reel Catalog] (Filter tech, exclude isHypeBait)
                                         ▼
                               [Groq: rankRecommendation] (Scoring, educational value)
                                         ▼
                               [Structured Recommendation Output]
```

## 2. Core Components & Responsibilities
- **Reel Ingestion (`POST /reels`)**: Accepts video file via Multer, uploads to Cloudinary, stores metadata in MongoDB (`Reel`).
- **Interaction Logger (`POST /interactions`)**: Validates watch events, writes to MongoDB (`Interaction`), triggers async profile recomputation.
- **Interest Inference Service (`services/groqService.js`)**: Evaluates multi-reel watch session context through Groq LLM to deduce deep technical interest clusters (avoiding narrow keyword traps).
- **Profile Store & Cache (`services/profileService.js`)**: Caches inferred profile in Redis with 1-hour TTL, supported by automatic in-memory fallback.
- **Recommendation Engine (`services/recommendationService.js`)**: Gathers non-hype tech candidate reels and calls Groq reasoner for `why` and `whyThisRecommendation`.

## 3. Data Models
- **Reel (`models/Reel.js`)**: `title`, `caption`, `transcript`, `cloudinaryUrl`, `cloudinaryPublicId`, `category` (AI, DSA, JavaScript, HLD, Cybersecurity, Cloud, Hardware, Career, Entertainment, Other), `difficulty` (Beginner, Intermediate, Advanced), `tags` ([]), `isHypeBait` (Boolean), `createdAt`.
- **Interaction (`models/Interaction.js`)**: `userId`, `reelId`, `eventType` (watch, like, skip, replay, share), `watchPercent`, `dwellMs`, `timestamp`.
- **InterestProfile (Redis JSON)**: `userId`, `primaryInterest`, `evidence` ([]), `confidence` (High|Medium|Low), `updatedAt`.

## 4. Key Endpoints
- `POST /reels` — Upload video to Cloudinary & store metadata.
- `POST /interactions` — Log interaction & trigger async interest profile refresh.
- `GET /interest-profile/:userId` — Retrieve cached or calculated interest profile.
- `GET /recommendations/:userId` — Return strict structured recommendation object.
- `GET /health` — Service readiness & status check.
