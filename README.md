# Reels Interest-Recommender Backend 🎬🧠

A Node.js + Express backend that logs student watch events, calculates engagement-weighted signals, infers technical interests using Groq LLM (`llama-3.3-70b-versatile`), and recommends high-substance technical reels while avoiding hype-bait and token waste.

---

## ⚡ Engagement-Weighted Recommendation Logic

### 1. Signal Rules & Scoring Formula
| User Signal | Rule & Action |
|---|---|
| **Watched once (low watch%)** | Weak signal — log to MongoDB, do NOT trigger Groq call (token saver). |
| **Watched 2+ times (replay) OR watch% > 80%** | Strong interest signal (`score >= 1.5`) → trigger debounced recommendation refresh for that topic. |
| **Liked** | Strongest signal → immediate same-category recommendation (`recommendFromSameCategory`) prioritizing deep educational continuation. |
| **Skipped early (<20% in <3s)** | Negative penalty (`-1.0`) → deprioritizes shallow content. |

**Engagement Score Formula:**
```
score = (watchPercent / 100) + (replayCount * 0.5) + (isLiked ? 1.5 : 0) - (isSkipped ? 1.0 : 0)
```
- If `score >= 1.5` or `isLiked === true`: triggers recommendation pipeline.
- Otherwise: only logs the interaction (no LLM call, saving 80%+ of tokens).

---

### 2. RecommendationLog Table & DB Caching
Recommendations are saved to MongoDB in `RecommendationLog` keyed by `sourceReelId` and `userId`:
```
RecommendationLog:
  userId, sourceReelId, sourceReelTitle,
  recommendedReelId, recommendedReelTitle,
  category, difficulty, confidence, reasonWhy, reasonWhyThis,
  triggerSignal [replay|like|watchtime], createdAt
```
- **24-Hour Cache**: `GET /recommendations/:userId` first checks `RecommendationLog` for an unexpired (<24h) entry. If found, returns it immediately without calling Groq.
- **7-Day Anti-Repetition**: Excludes reels recommended to the user within the last 7 days.
- **Debounced Batching**: Debounces rapid interaction bursts (<5s) to avoid duplicate concurrent LLM invocations.

---

## 🛠 Tech Stack

- **Backend**: Node.js & Express
- **Frontend**: React 19 + Vite (Instagram-style Reels SPA with live telemetry & recommendation drawer)
- **Database**: MongoDB (Mongoose) with `Reel`, `Interaction`, and `RecommendationLog` models
- **Cache**: Redis (`ioredis`) with automatic In-Memory fallback
- **Video Storage**: Cloudinary SDK (with duration and streaming support)
- **LLM**: Groq SDK (`llama-3.3-70b-versatile`)
- **Validation**: Zod

---

## 📦 Project Structure

```
instarecomend/
├── backend/                  # Express REST API Server
│   ├── config/               # Database, Redis, Cloudinary & Env config
│   ├── controllers/          # Reel, Interaction & Recommendation handlers
│   ├── models/               # Reel, Interaction, RecommendationLog
│   ├── routes/               # Express routes
│   ├── services/
│   │   ├── engagement.js     # Engagement score formula & threshold logic
│   │   ├── groqService.js    # Groq Llama 3.3 inferInterest, rankSameCategory, rankRecommendation
│   │   ├── recommendationService.js # 24h DB caching, 7d exclusion & same-category recs
│   │   ├── profileService.js # Redis 1h TTL profile cache
│   │   └── cloudinaryService.js # Video uploads
│   ├── validators/schemas.js # Zod schemas
│   ├── scripts/seed.js       # Database seeder
│   └── scripts/test-recommender.js # Verification test script
│
├── frontend/                 # React 19 + Vite Frontend
│   ├── src/components/       # ReelCard, ReelsFeed, Sidebar, RecommendationModal, ProfileModal
│   ├── src/context/          # UserContext
│   └── src/styles/           # Instagram dark-theme CSS
│
├── .ai/                      # Token-Optimized Project Memory
│   ├── brain.md, architecture.md, conventions.md, decisions.md, todo.md
│
├── package.json              # Workspace root scripts
└── README.md
```

---

## ⚙️ Environment Variables

Configure `backend/.env` (or copy `backend/.env.example`):

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/reels_recommender
REDIS_URL=redis://127.0.0.1:6379
GROQ_API_KEY=gsk_your_groq_api_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🚦 Getting Started

### 1. Seed Sample Reels
```bash
npm run seed
```

### 2. Run the Verification Script
Tests engagement scoring calculations, like-triggered same-category recommendations, and 24h DB caching:
```bash
npm run test:recommend
```

### 3. Start Application
```bash
# Unified server (Express serves compiled React frontend):
npm start

# Or with live React dev server:
npm run dev           # Terminal 1 (Backend API on :3000)
npm run dev:frontend  # Terminal 2 (React Vite on :5173)
```

---

## 📡 API Endpoints

### 1. Log Interaction (`POST /interactions`)
```json
{
  "userId": "student_101",
  "reelId": "65b9f71c4f1c2b001a1e8001",
  "eventType": "like",
  "watchPercent": 100,
  "dwellMs": 45000,
  "replayCount": 1
}
```

### 2. Get Structured Recommendation (`GET /recommendations/:userId`)
Returns JSON matching the exact schema:
```json
{
  "currentReel": "Designing a Distributed Rate Limiter with Token Bucket & Redis",
  "interestDetected": "HLD Domain Mastery",
  "why": "Triggered directly by a like interaction on \"Designing a Distributed Rate Limiter with Token Bucket & Redis\". Focused on deepening expertise in HLD.",
  "recommendedTechReel": "Zero-Downtime Blue/Green Deployments with Kubernetes & Ingress",
  "category": "Cloud",
  "whyThisRecommendation": "Recommended following your like to bridge system design with resilient production deployments.",
  "difficulty": "Advanced",
  "confidence": "High"
}
```

### 3. Get User Interest Profile (`GET /interest-profile/:userId`)
Returns cached profile from Redis (1-hour TTL) with supporting evidence.
