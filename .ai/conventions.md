# Code Conventions & Standards

## 1. Directory & Layer Organization
- `config/`: Singleton client initializations (`db.js`, `redis.js`, `cloudinary.js`, `env.js`).
- `models/`: Mongoose schemas and exported model constants/enums (`Reel.js`, `Interaction.js`).
- `services/`: Pure business logic, external API calls, and LLM prompting (`groqService.js`, `profileService.js`, etc.).
- `controllers/`: HTTP request handlers parsing params/body and calling services (`reelController.js`, etc.).
- `routes/`: Express routers mapping endpoint paths and middlewares.
- `validators/`: Zod schemas and validation middlewares (`schemas.js`).
- `scripts/`: Standalone CLI execution utilities (`seed.js`, `test-recommender.js`).

## 2. Naming Conventions
- **Files**: camelCase for services/controllers/routes (`groqService.js`, `reelRoutes.js`), PascalCase for Mongoose models (`Reel.js`, `Interaction.js`).
- **Variables/Functions**: camelCase (`inferInterest`, `getUserInterestProfile`).
- **Constants / Enums**: UPPER_SNAKE_CASE (`CATEGORIES`, `GROQ_MODEL`, `PROFILE_CACHE_TTL_SECONDS`).

## 3. Error Handling & Resilience Pattern
- Always use `try/catch` in async controllers and route errors to `next(error)`.
- Central error handler in `app.js` returns uniform `{ success: false, error: string }`.
- LLM API calls must have timeout wrappers, max 2 exponential retries, and heuristic fallbacks with `"confidence": "Low"`.
- External service down states (e.g. Redis offline) must gracefully degrade to in-memory fallback without throwing unhandled exceptions.

## 4. Environment & Secrets
- All environment variables accessed via `config/env.js` with sensible local development defaults.
- Never commit live secrets or `.env` to source control.
