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
- FRONTEND_URLS=<comma-separated list of allowed frontend origins> (optional; e.g., https://your-frontend.a.run.app,https://admin.yourdomain.com)
- ALLOW_ALL_ORIGINS=true (optional; for emergencies/testing only; allows any origin in production)
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
    - SUPABASE_URL=...
    - SUPABASE_SERVICE_ROLE_KEY=...
    - JWT_SECRET=...
    Note: Do not set PORT in Cloud Run; it is injected automatically by the platform.
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



## One-command deploy to GCP (scripts)
This repository now includes ready-to-run scripts to deploy both backend and frontend to Cloud Run in your GCP project. They build Docker images locally, push to Artifact Registry, deploy the services, and wire CORS automatically by setting FRONTEND_URL on the backend.

Supported environments:
- Windows PowerShell: scripts\gcp-deploy.ps1
- Linux/macOS/Cloud Shell (bash): scripts/gcp-deploy.sh

Prerequisites
- Installed locally: Google Cloud CLI (gcloud) and Docker Desktop (running).
- A Google Cloud project with billing enabled.
- You are signed in to gcloud: gcloud auth login
- Optional but recommended: create secrets in Secret Manager or let the script create them from your current environment.

Environment you should have available (do not commit secrets):
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
- Optional AI: AI_PROVIDER, GEMINI_API_KEY, GEMINI_MODEL, GEMINI_EMBEDDING_MODEL, OPENAI_API_KEY, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL

Windows PowerShell usage

```powershell
# From repo root
# Plain env vars deployment (reads values from your current environment)
$env:SUPABASE_URL="https://YOUR.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
$env:JWT_SECRET="YOUR_RANDOM_SECRET"
# Optional AI
$env:AI_PROVIDER="gemini"; $env:GEMINI_API_KEY="YOUR_GEMINI_KEY"

# Deploy (replace with your project id; region defaults to us-central1)
./scripts/gcp-deploy.ps1 -PROJECT_ID "YOUR_PROJECT_ID"

# Or: use Secret Manager (script will upsert secrets from your env and deploy with --set-secrets)
./scripts/gcp-deploy.ps1 -PROJECT_ID "YOUR_PROJECT_ID" -UseSecrets
```

Bash (Linux/macOS/Cloud Shell) usage

```bash
# From repo root
export SUPABASE_URL="https://YOUR.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
export JWT_SECRET="YOUR_RANDOM_SECRET"
# Optional AI
export AI_PROVIDER=gemini
export GEMINI_API_KEY="YOUR_GEMINI_KEY"

# Plain env deployment
./scripts/gcp-deploy.sh YOUR_PROJECT_ID

# Or deploy with Secret Manager (upserts from your env)
USE_SECRETS=1 ./scripts/gcp-deploy.sh YOUR_PROJECT_ID
```

What the scripts do
- Enable required APIs: Cloud Run, Cloud Build, Artifact Registry, Secret Manager
- Ensure an Artifact Registry repo (default name: smart-learning) exists in your region (default: us-central1)
- docker build backend and frontend using the correct Dockerfiles with the repository root as context
- Push images to ${REGION}-docker.pkg.dev/PROJECT_ID/smart-learning/{backend|frontend}:manual
- Deploy frontend first to Cloud Run (port 8080), then read its URL
- Deploy backend (port 3000) with NODE_ENV=production and FRONTEND_URL=<frontend-url>
  Note: Do not set PORT in Cloud Run; it is provided automatically.
- If USE_SECRETS/-UseSecrets is set: upsert your env values into Secret Manager and deploy with --set-secrets

Result
- Two Cloud Run services:
  - smart-learning-frontend → public URL serving the SPA
  - smart-learning-backend → public API; GET /health for status
- Backend CORS is configured to allow the frontend URL.

Notes and troubleshooting
- If Docker build fails with COPY package*.json, ensure the build context is the repository root. The scripts already do this.
- Make sure Docker Desktop is running and you are authenticated to gcloud.
- PowerShell tip: when manually running gcloud describe commands that use --format=value(status.url), wrap the format in quotes to avoid PS parsing errors, e.g., --format="value(status.url)".
- Secret access: if you use Secret Manager, ensure the runtime service account has roles/secretmanager.secretAccessor for referenced secrets.
- Costs: keep min instances 0 and max 1; region us-central1 to leverage free tier.

---


## Deploy both services via a single Cloud Build trigger (from your GitHub repo)
This repo includes cloudbuild.full.yaml which builds and deploys the backend and frontend to Cloud Run in one pipeline. Use this if you want a single trigger to handle both services consistently and wire the frontend to the backend automatically.

Prerequisites
- Enable APIs in your GCP project: Cloud Run, Cloud Build, Artifact Registry, Secret Manager
- Connect your GitHub repo to Cloud Build (Console will prompt you via the GitHub App)
- Region: us-central1 (free-tier friendly)
- Artifact Registry: the pipeline ensures the repository exists (default name smart-learning)

Steps
1) Open Google Cloud Console → Cloud Build → Triggers → Create Trigger
2) Repository: select your GitHub repo and branch (e.g., main)
3) Event: Push to a branch (or manual)
4) Build configuration: Cloud Build configuration file (yaml/json)
5) File: cloudbuild.full.yaml
6) Substitutions (optional; defaults shown below):
   - _REGION=us-central1
   - _REPO=smart-learning
   - _BACKEND_SERVICE=smart-learning-backend
   - _FRONTEND_SERVICE=smart-learning-frontend
   - Optional Secret Manager secret names to inject into backend at deploy time:
     - _SUPABASE_URL_SECRET=SUPABASE_URL
     - _SUPABASE_SERVICE_ROLE_KEY_SECRET=SUPABASE_SERVICE_ROLE_KEY
     - _JWT_SECRET_SECRET=JWT_SECRET
     - _GEMINI_API_KEY_SECRET=GEMINI_API_KEY (optional)

What the trigger does
- Builds and pushes backend image from app-deployment/backend/Dockerfile
- Deploys backend to Cloud Run (port 3000, unauthenticated, min 0 / max 1, CPU during request)
  - If you provided secret names above, it deploys with --set-secrets mapping to those names (latest versions)
- Reads the backend Cloud Run URL and bakes it into the frontend build as VITE_API_BASE_URL
- Builds and pushes the frontend image from app-deployment/frontend/Dockerfile
- Deploys frontend to Cloud Run (port 8080, unauthenticated, min 0 / max 1, CPU during request)
- Updates backend FRONTEND_URL to the deployed frontend URL (for CORS)

Secret setup (recommended)
- Create these secrets once in Secret Manager (Console → Security → Secret Manager → Create secret):
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - JWT_SECRET
  - (Optional) GEMINI_API_KEY
- In the trigger’s substitutions, set the _*_SECRET names to match the secret IDs above. The pipeline references :latest versions.
- Ensure your Cloud Run runtime service account has roles/secretmanager.secretAccessor on these secrets.

Verification
- After trigger completes, in Cloud Run you should see two services:
  - smart-learning-backend → test GET /health
  - smart-learning-frontend → open the URL; the SPA will call the backend via the baked API base URL
- CORS is auto-wired by setting FRONTEND_URL on the backend.

Troubleshooting
- COPY package*.json error during backend build: the pipeline builds from repo root (.), so this should not occur. If it does, ensure the Dockerfile path is correct.
- Image push errors: confirm Artifact Registry repo exists in the chosen region; the pipeline creates it if missing.
- Secrets access denied: grant Secret Manager Secret Accessor to the Cloud Run runtime service account.
- Frontend 405s when calling /api: make sure you use cloudbuild.full.yaml (it bakes VITE_API_BASE_URL) or configure VITE_API_BASE_URL in your own builds.



## Single-service deployment (Unified API + Frontend)
You can run the entire app (Express API + React SPA) as ONE Cloud Run service. The backend image now builds the frontend and serves it from `frontend/dist` via Express.

What changed
- Backend Dockerfile (app-deployment/backend/Dockerfile) now:
  - Builds the frontend (Vite) during the Docker build.
  - Copies the built assets into the image at `/app/frontend/dist`.
  - Runs the Express server on port 3000 to serve both the API and the SPA with fallback routing.
- New Cloud Build file `cloudbuild.unified.yaml` builds and deploys a single Cloud Run service.

Why this is nice
- One URL for both frontend and backend.
- No CORS wiring required (the SPA calls relative `/api/...`).
- Fewer services to manage and lower cost/complexity.

Local usage (unchanged)
- Dev mode remains the same (Vite + API):
  - Terminal A: `npm run dev` (backend at http://localhost:3000)
  - Terminal B: `cd frontend && npm run dev` (frontend at http://localhost:5173)
- Production-like: `npm run start:prod` (builds frontend, serves via Express on http://localhost:3000)

Deploy via Google Cloud Console (single service)
1) Open Cloud Run → Create service → "Continuously deploy from a repository (source or function)" → Set up with Cloud Build.
2) Select your repo/branch.
3) Build type: Dockerfile.
4) Dockerfile path: `app-deployment/backend/Dockerfile` (this builds the SPA too).
5) Service name: `smart-learning-app` (or your choice).
6) Region: `us-central1`. Authentication: Allow unauthenticated. Autoscaling: Min 0, Max 1. CPU: Only during request.
7) Container port: `3000`.
8) Variables & Secrets:
   - Env vars: `NODE_ENV=production`.
   - Secrets via Secret Manager (recommended): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` (and optionally `GEMINI_API_KEY`).
   - Do NOT set `PORT` (Cloud Run injects it).
9) Create. The single service URL serves both the SPA and API.

Deploy via Cloud Build trigger (single service)
- Create a Cloud Build Trigger using file: `cloudbuild.unified.yaml`.
- Optional substitutions: `_REGION`, `_SERVICE`, `_REPO`, `_IMAGE_NAME` (defaults are fine).
- The pipeline:
  - Ensures Artifact Registry repo exists.
  - Builds the unified image (backend + SPA) from `app-deployment/backend/Dockerfile`.
  - Deploys one Cloud Run service on port 3000 with `NODE_ENV=production`.

Frontend API base
- When served by Express (single-service), the frontend can call relative paths (e.g., `fetch('/api/...')`).
- The build also accepts `VITE_API_BASE_URL` arg if you ever need to hardcode an external API, but this is not required in unified mode.

Notes
- Secrets: Use Secret Manager in production. Grant the service's runtime SA `roles/secretmanager.secretAccessor` on each secret.
- Health: Backend exposes `GET /health`. Cloud Run port must be set to 3000.
- Existing two-service deployment still works; this adds a simpler alternative.
