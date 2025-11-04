# Smart Learning Hub

This repository contains:
- Backend: Express API (Node.js)
- Frontend: React (Vite)
- CI/CD: GitHub Actions
- Containerization: Optimized Dockerfiles and docker-compose for local dev

Express + Supabase backend with a React (Vite) SPA frontend featuring RBAC for student/instructor/admin, login/register, landing, courses (browse, detail), student enroll/unenroll, and instructor course creation.

Run Locally (Quick Start)
- Prereq: Node 18+ and npm installed.
- In project root:
  1) npm install
  2) Copy .env.example to .env and fill values (see below)
  3) Development: open two terminals
     - Terminal A (backend): npm run dev
     - Terminal B (frontend): cd frontend && npm install && npm run dev
     - Backend API: http://localhost:3000, Frontend: http://localhost:5173 (proxied to backend for /api and /health)
  4) Production-like single command:
     - npm run start:prod
     - This builds the React app and starts Express which serves frontend/dist and API on http://localhost:3000

Getting Started (Backend)
- Install deps: npm install
- Configure .env (see below)
- Start backend API: npm start (or node server.js)
- API base: http://localhost:3000

Getting Started (Frontend Dev)
- cd frontend
- npm install
- npm run dev (Vite at http://localhost:5173)
- The Vite dev server proxies /api and /health to http://localhost:3000 to avoid CORS.

Production Build & Serve
- Option A (single command): npm run start:prod
- Option B (manual): cd frontend && npm run build, then from root run: node server.js
- The backend is configured to serve the built SPA from frontend/dist when present, with SPA fallback for client routes.
- Legacy demo remains available under /public for quick API testing.

Environment Variables (.env)
- PORT=3000
- FRONTEND_URL=http://localhost:5173 (optional in dev; CORS allow-list already includes 5173)
- SUPABASE_URL=... (required)
- SUPABASE_SERVICE_ROLE_KEY=... (or appropriate anon/service key depending on your setup)
- JWT_SECRET=... (used by middleware/auth)

RBAC & Roles
- Roles: student, instructor, admin
- Students can: browse courses, enroll/unenroll, view their courses and progress
- Instructors can: create/update/delete their own courses, view instructor analytics
- Admins can: everything instructors can, plus users and platform analytics

Frontend (Vite + React)
- Location: /frontend
- Key pages:
  - Landing: /
  - Auth: /login, /register
  - Courses: /courses (list), /courses/:id (detail)
  - Student: /my-courses (unenroll supported)
  - Instructor/Admin: /create-course
- Auth state stored in localStorage (token, user). ProtectedRoute enforces auth and role-based access.

API Quick Links
- GET /health — health check
- GET /api — API overview
- Auth: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
- Courses: GET /api/courses, GET /api/courses/:id, POST /api/courses (instructor/admin), PUT/DELETE /api/courses/:id (owner/admin)
- Enrollments: GET /api/enrollments/my-courses, POST /api/enrollments, DELETE /api/enrollments/:course_id
- Progress: GET /api/progress/course/:course_id, POST /api/progress/lesson/:lesson_id, GET /api/progress/stats
- Users (admin/instructor where applicable): GET /api/users, GET/PUT/DELETE /api/users/:id, GET /api/users/:id/stats
- Analytics: GET /api/analytics (admin), GET /api/analytics/instructor/:id (self/admin)

Deploy Steps (summary)
1) Set environment variables on your host (see .env section).
2) Build the frontend: cd frontend && npm ci && npm run build.
3) Start the server (Node): npm ci && npm start. The Express app will serve frontend/dist and provide SPA fallback.
4) Set FRONTEND_URL to your production domain if you deploy the SPA separately; otherwise not required when served by Express.

Notes
- The Vite dev server is whitelisted in CORS. For custom origins, add FRONTEND_URL in .env.
- If you only need the SPA in production, ensure frontend/dist exists before starting the server.
- Health check: visit http://localhost:3000/health to verify the backend is running.

Dockerization
- Backend Dockerfile: app-deployment/backend/Dockerfile (multi-stage, distroless, non-root)
- Frontend Dockerfile: app-deployment/frontend/Dockerfile (multi-stage, nginx:alpine, non-root)
- Build locally:
  - Backend: docker build -f app-deployment\\backend\\Dockerfile -t smart-learning/backend:local .
  - Frontend: docker build -f app-deployment\\frontend\\Dockerfile -t smart-learning/frontend:local .
- docker-compose local stack (Supabase-only; no local Postgres):
  1) Copy .env.example to .env and fill values (SUPABASE_* and JWT_SECRET)
  2) Copy frontend/.env.example to frontend/.env and fill values
  3) docker compose up --build
  - Backend: http://localhost:3000
  - Frontend: http://localhost:5173

CI/CD (GitHub Actions)
- Workflows in .github/workflows:
  - app-deployment.yml: Builds, scans (Trivy), and pushes images to Artifact Registry using GitHub Workload Identity.
- Required GitHub secrets:
  - GCP_PROJECT_ID
  - GCP_WORKLOAD_IDP (Workload Identity Provider resource)
  - GCP_CICD_SA (email of CI/CD service account)
- Notes:
  - Pull requests from forks do not receive repository secrets by default. In that case, the workflow will skip Google Cloud authentication and pushing images, but it will still build and scan images using local tags.
  - To enable deployments from CI, push from a branch in this repository (not a fork) or manually run the workflow with the required secrets configured.
  - Make sure your GCP Workload Identity Federation pool/provider and the service account trust the GitHub OIDC issuer for this repo. Then set the three secrets above in the repo settings.

Security
- Services run as non-root in containers.
- Secret Manager integration for sensitive config.
- CI includes Trivy image scanning.
- HTTPS: Prefer Cloud Run managed TLS or configure LB/custom domains as needed.

Architecture Overview
- Frontend (Vite) built and served via Nginx container in Cloud Run.
- Backend (Express) container in Cloud Run exposes /health and /api routes and can serve SPA if desired.
- New AI capabilities: RAG pipeline with local vector store (or bring-your-own Pinecone/Weaviate), Embeddings via OpenAI (with offline fallback), and endpoints for chat, summarization, and sentiment.
- Security layers for AI endpoints: API key gate, rate limiting, payload size limits, prompt-injection guard, and PII-safe logging guidance.
- Container images stored in Artifact Registry.
- Monitoring alerts configured for CPU, memory, latency, and error rate; notifications via email and Pub/Sub function hook.
- Optional VPC, firewall, and Cloud NAT provided.

Deploy via Google Cloud Console (Cloud Run)
Follow these repo-specific instructions to deploy backend and frontend as separate Cloud Run services directly from the GCP Console.

Prereqs
- Enable APIs: Cloud Run, Cloud Build, Artifact Registry, Secret Manager.
- Have a repo connected to Google Cloud (GitHub/Bitbucket/CSR).
- Decide your GCP project and region (we use us-central1 below).

Service 1: Backend (Express API)
1. Open console.cloud.google.com and go to Cloud Run.
2. Click CREATE SERVICE.
3. Select "Continuously deploy from a repository (source or function)".
4. Click SET UP WITH CLOUD BUILD.
5. Choose your repository and branch (main/master).
6. Build type: Dockerfile.
7. Source location (Dockerfile path): app-deployment/backend/Dockerfile
8. Service name: smart-learning-backend (or your preferred name).
9. Region: us-central1.
10. Authentication: Allow unauthenticated invocations.
11. Autoscaling: Min instances 0, Max instances 1. CPU: only during request processing.
12. Container port: 3000. Health path: /health (optional).
13. Environment variables:
    - NODE_ENV=production
    - PORT=3000
    - SUPABASE_URL=...
    - SUPABASE_SERVICE_ROLE_KEY=...
    - JWT_SECRET=...
14. Click CREATE.

Service 2: Frontend (Vite build served by Nginx)
1. In Cloud Run, click CREATE SERVICE again.
2. Same deploy method and repo as above.
3. Build type: Dockerfile.
4. Source location (Dockerfile path): app-deployment/frontend/Dockerfile
5. Service name: smart-learning-frontend.
6. Region: us-central1.
7. Authentication: Allow unauthenticated invocations.
8. Autoscaling: Min 0, Max 1. CPU during request.
9. Container port: 8080.
10. Click CREATE.

Notes
- Alternatively, you can use the provided Cloud Build configs:
  - Backend: cloudbuild.backend.yaml
  - Frontend: cloudbuild.frontend.yaml
  These can be used to create Cloud Build triggers that both build and deploy.
- Optional Cloud Run service manifests are provided (cloudrun-backend.yaml, cloudrun-frontend.yaml) if you prefer "gcloud run services replace -f <file>".
- The backend can also serve the built SPA if you choose to bake frontend/dist into the backend image, but our default deploy uses separate services.
- Store secrets in Secret Manager and expose via Cloud Run env vars or secret mounts. Make sure not to commit secrets to the repo.


AI/RAG Capabilities
Overview
- New endpoints under /api/ai add retrieval-augmented generation (RAG), summarization, and sentiment analysis.
- Vector store options: local JSON store by default (RAG_STORE=local). You can later wire Pinecone or Weaviate by adding adapters.
- Embeddings via OpenAI (recommended) with an offline hashing fallback to enable local testing without keys.
- Security: API key gate (optional), rate limiting, payload limits, and prompt-injection guard.

Endpoints
- POST /api/ai/ingest
  Purpose: Load documents into the vector store (chunk + embed + upsert).
  Body JSON:
  {
    "texts": ["plain text..."],
    "urls": ["https://example.com/docs"],
    "md": ["# markdown ..."],
    "namespace": "my-collection",         // optional; default "default"
    "metadata": { "courseId": 123 },      // optional
    "chunk": { "size": 800, "overlap": 80 } // optional
  }
  Response: { ok: true, chunks: <num>, upserted: <num>, namespace: "..." }

- POST /api/ai/chat
  Purpose: Chat assistant that answers strictly from retrieved context.
  Body JSON:
  { "query": "What is X?", "namespace": "my-collection", "topK": 5, "filter": {"courseId": 123} }
  Response: { answer: "...", contexts: [ { text, score, meta, ... } ] }

- POST /api/ai/summarize
  Body JSON: { "text": "large text..." }
  Response: { summary: "..." }

- POST /api/ai/sentiment
  Body JSON: { "text": "I love this course!" }
  Response: { sentiment: { label: "positive|negative|neutral", score: -1..1, raw?: "LLM output" } }

Environment variables
- AI_PROVIDER: auto | gemini | openai (default: auto). Determines which LLM/embeddings to use.
- GEMINI_API_KEY: Optional. If set (and AI_PROVIDER=gemini or auto), uses Google Gemini for chat/summarize/sentiment and embeddings.
- GEMINI_MODEL: Optional. Default gemini-1.5-flash.
- GEMINI_EMBEDDING_MODEL: Optional. Default text-embedding-004.
- OPENAI_API_KEY: Optional. If set (and AI_PROVIDER=openai or auto), uses OpenAI for chat/summarize/sentiment and embeddings.
- OPENAI_MODEL: Optional. Default gpt-4o-mini.
- OPENAI_EMBEDDING_MODEL: Optional. Default text-embedding-3-small.
- RAG_STORE: local | pinecone | weaviate (default: local). pinecone/weaviate currently require adding adapters described below.
- AI_API_KEY: Optional. If set, AI endpoints require Authorization: Bearer <AI_API_KEY>.
- AI_RATE_LIMIT_MAX: Optional. Requests per minute per IP for AI routes. Default 30.

Security in AI
- Data privacy: Do not send secrets or PII to LLMs unnecessarily. Use Secret Manager in production. Disable logs of request bodies or ensure redaction.
- Prompt injection: Basic guard rejects suspicious phrases ("ignore previous", "reveal prompt", etc.). Keep temperature low and include a system policy (implemented in RAG prompt).
- Access control: Use AI_API_KEY to restrict the AI routes, or front them with your auth middleware. Consider per-user quotas tied to JWT.
- Payload limits & rate limiting: Enforced via sizeGuard and express-rate-limit.

Local vector store (default)
- Stored in ./data/vectorstore.json in the container/host.
- Namespaces: Use namespace to isolate content per course, tenant, or environment.
- Filtering: Pass a filter object to /chat to restrict matches by metadata (exact match).

How to use (step-by-step)
1) Configure env (dev):
   - In .env (do not commit real keys), add as needed:
     OPENAI_API_KEY=sk-... (optional)
     OPENAI_MODEL=gpt-4o-mini (optional)
     OPENAI_EMBEDDING_MODEL=text-embedding-3-small (optional)
     RAG_STORE=local
     AI_API_KEY=your-ai-route-key (optional)
     AI_RATE_LIMIT_MAX=30
2) Start backend: npm run dev (port 3000).
3) Ingest your docs:
   curl -X POST http://localhost:3000/api/ai/ingest \
     -H "Content-Type: application/json" \
     -d '{
           "texts": ["This platform teaches calculus and algebra."],
           "urls": ["https://example.com/policies"],
           "namespace": "docs",
           "metadata": {"courseId": 1}
         }'
   If AI_API_KEY is set, include: -H "Authorization: Bearer YOUR_KEY"
4) Ask questions:
   curl -X POST http://localhost:3000/api/ai/chat \
     -H "Content-Type: application/json" \
     -d '{"query":"What does the platform teach?","namespace":"docs","topK":3}'
5) Summarize:
   curl -X POST http://localhost:3000/api/ai/summarize \
     -H "Content-Type: application/json" \
     -d '{"text":"Your long text here ..."}'
6) Sentiment:
   curl -X POST http://localhost:3000/api/ai/sentiment \
     -H "Content-Type: application/json" \
     -d '{"text":"I love this course!"}'

Cloud Run / Docker notes
- No Dockerfile changes required besides copying ./ai (already added). npm ci installs express-rate-limit.
- For persistence, mount /app/data to a writable volume if you want vector store to survive revisions.
- In production, set AI_API_KEY and rate limits. Also bind your own auth (JWT) before AI routes if required.

Optional: Bring your own vector DB
- Pinecone: set RAG_STORE=pinecone and implement ai/vectorstores/pinecone.js using @pinecone-database/pinecone. Provide env: PINECONE_API_KEY, PINECONE_INDEX, PINECONE_ENV.
- Weaviate: set RAG_STORE=weaviate and implement ai/vectorstores/weaviate.js using weaviate-ts-client. Provide WEAVIATE_URL, WEAVIATE_API_KEY.
  The current code will throw a helpful error if you select these without providing adapters.

Frontend integration (high-level)
- Chat widget: issue POST /api/ai/chat with the user’s question and display the answer along with source snippets (contexts).
- Summarizer: send selected content to /api/ai/summarize and render the bullet points.
- Sentiment: send feedback text to /api/ai/sentiment to color-code feedback or route moderation.

Compliance tips
- Log minimal metadata (timestamps, namespace, counts). Avoid logging raw prompts/LLM outputs in production.
- Rotate OPENAI_API_KEY regularly. Store secrets in Secret Manager on GCP and reference them in Cloud Run env.
- Consider tenant isolation via namespaces and additional metadata filters to avoid cross-tenant leakage.
