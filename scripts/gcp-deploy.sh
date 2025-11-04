#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/gcp-deploy.sh <PROJECT_ID> [REGION] [REPO]
# Example: ./scripts/gcp-deploy.sh my-gcp-project us-central1 smart-learning
# If you export USE_SECRETS=1, the script will create/update Secret Manager secrets
# from your current environment and deploy the backend with --set-secrets.

PROJECT_ID=${1:?"PROJECT_ID is required"}
REGION=${2:-us-central1}
REPO=${3:-smart-learning}

command -v gcloud >/dev/null 2>&1 || { echo >&2 "gcloud is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo >&2 "docker is required"; exit 1; }

echo "Setting GCP project to $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com >/dev/null

echo "Ensuring Artifact Registry repo '$REPO' exists in $REGION..."
if ! gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="App images for Smart Learning" >/dev/null
fi

echo "Configuring Docker to push to $REGION-docker.pkg.dev"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet >/dev/null

BACKEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:manual"
FRONTEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:manual"

echo "Building backend image (context=repo root)"
docker build -f app-deployment/backend/Dockerfile -t "$BACKEND_IMAGE" .

echo "Pushing backend image"
docker push "$BACKEND_IMAGE"

FRONTEND_SERVICE=smart-learning-frontend
BACKEND_SERVICE=smart-learning-backend

echo "Deploying backend to Cloud Run ($REGION)"
BASE_ENV="NODE_ENV=production"
if [ "${USE_SECRETS:-0}" = "1" ]; then
  echo "Upserting secrets from environment to Secret Manager (if present)"
  ensure_secret(){
    local name="$1"; local value="$2";
    [ -z "$value" ] && return 0
    if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
      gcloud secrets create "$name" --replication-policy="automatic" >/dev/null
    fi
    printf "%s" "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
  }
  ensure_secret SUPABASE_URL "${SUPABASE_URL:-}"
  ensure_secret SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY:-}"
  ensure_secret JWT_SECRET "${JWT_SECRET:-}"
  [ -n "${GEMINI_API_KEY:-}" ] && ensure_secret GEMINI_API_KEY "$GEMINI_API_KEY"

  SET_SECRETS="SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,JWT_SECRET=JWT_SECRET:latest"
  if [ -n "${GEMINI_API_KEY:-}" ]; then SET_SECRETS="$SET_SECRETS,GEMINI_API_KEY=GEMINI_API_KEY:latest"; fi

  gcloud run deploy "$BACKEND_SERVICE" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --min-instances=0 \
    --max-instances=1 \
    --cpu-throttling \
    --set-env-vars="$BASE_ENV" \
    --set-secrets="$SET_SECRETS" >/dev/null
else
  EXTRA_ENV=""
  add_env(){ local k="$1"; local v="${!1:-}"; [ -n "$v" ] && EXTRA_ENV="$EXTRA_ENV,$k=$v"; }
  for k in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY JWT_SECRET AI_PROVIDER GEMINI_API_KEY GEMINI_MODEL GEMINI_EMBEDDING_MODEL OPENAI_API_KEY OPENAI_MODEL OPENAI_EMBEDDING_MODEL; do
    add_env "$k"
  done
  ENV_STR="$BASE_ENV$EXTRA_ENV"

  gcloud run deploy "$BACKEND_SERVICE" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --min-instances=0 \
    --max-instances=1 \
    --cpu-throttling \
    --set-env-vars="$ENV_STR" >/dev/null
fi

BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" --region="$REGION" --format=value(status.url))
if [ -z "$BACKEND_URL" ]; then echo "Failed to obtain backend URL"; exit 1; fi

echo "Backend URL: $BACKEND_URL"

echo "Building frontend image (context=repo root) with API base $BACKEND_URL"
docker build -f app-deployment/frontend/Dockerfile \
  --build-arg VITE_API_BASE_URL="$BACKEND_URL" \
  -t "$FRONTEND_IMAGE" .

echo "Pushing frontend image"
docker push "$FRONTEND_IMAGE"

echo "Deploying frontend to Cloud Run ($REGION)"
gcloud run deploy "$FRONTEND_SERVICE" \
  --image="$FRONTEND_IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=1 \
  --cpu-throttling >/dev/null

FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" --region="$REGION" --format=value(status.url))
if [ -z "$FRONTEND_URL" ]; then echo "Failed to obtain frontend URL"; exit 1; fi

echo "Frontend URL: $FRONTEND_URL"

echo "Updating backend env FRONTEND_URL to $FRONTEND_URL"
gcloud run services update "$BACKEND_SERVICE" \
  --region="$REGION" \
  --platform=managed \
  --set-env-vars=FRONTEND_URL="$FRONTEND_URL" >/dev/null

echo "Deployment complete."
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
