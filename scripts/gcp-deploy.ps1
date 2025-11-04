param(
  [Parameter(Mandatory=$true)][string]$PROJECT_ID,
  [string]$REGION = "us-central1",
  [string]$REPO = "smart-learning",
  [switch]$UseSecrets
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Assert-Success($action) {
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to $action (exit code $LASTEXITCODE). See the output above for details."
  }
}

function Require-Cli($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required CLI '$name' not found in PATH. Please install it and retry."
  }
}

Require-Cli gcloud
Require-Cli docker

Write-Host "Setting GCP project to $PROJECT_ID"
gcloud config set project $PROJECT_ID | Out-Null

Write-Host "Enabling required APIs (may take a minute)..."
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  secretmanager.googleapis.com | Out-Null

Write-Host "Ensuring Artifact Registry repo '$REPO' exists in $REGION..."
# Check repo existence
$repoExists = $false
try {
  gcloud artifacts repositories describe $REPO --location=$REGION | Out-Null
  $repoExists = $true
} catch {
  $repoExists = $false
}
if (-not $repoExists) {
  Write-Host "Creating Artifact Registry repo '$REPO' in $REGION..."
  try {
    gcloud artifacts repositories create $REPO `
      --repository-format=docker `
      --location=$REGION `
      --description="App images for Smart Learning" | Out-Null
  } catch {
    throw "Failed to create Artifact Registry repo '$REPO' in region '$REGION'. Ensure your account has permissions (Artifact Registry Admin) and billing is enabled."
  }
  # Verify creation
  try {
    gcloud artifacts repositories describe $REPO --location=$REGION | Out-Null
  } catch {
    throw "Artifact Registry repo '$REPO' still not found in region '$REGION'. Create it manually: gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION"
  }
}

Write-Host "Configuring Docker to push to $REGION-docker.pkg.dev"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet | Out-Null

# Image tags
$BACKEND_IMAGE  = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:manual"
$FRONTEND_IMAGE = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:manual"

Write-Host "Building backend image from app-deployment\\backend\\Dockerfile (context=repo root)"
docker build `
  -f app-deployment\backend\Dockerfile `
  -t $BACKEND_IMAGE `
  .
Assert-Success "build backend Docker image"

Write-Host "Building frontend image from app-deployment\\frontend\\Dockerfile (context=repo root)"
# If backend URL is available (existing service), bake it into the frontend build as VITE_API_BASE_URL
$EXISTING_BACKEND_URL = ''
try { $EXISTING_BACKEND_URL = gcloud run services describe smart-learning-backend --region=$REGION --format="value(status.url)" } catch {}

if ($EXISTING_BACKEND_URL) {
  Write-Host "Detected existing backend URL: $EXISTING_BACKEND_URL - baking into frontend build"
  docker build `
    -f app-deployment\frontend\Dockerfile `
    --build-arg VITE_API_BASE_URL=$EXISTING_BACKEND_URL `
    -t $FRONTEND_IMAGE `
    .
} else {
  docker build `
    -f app-deployment\frontend\Dockerfile `
    -t $FRONTEND_IMAGE `
    .
}
Assert-Success "build frontend Docker image"

Write-Host "Pushing backend image to Artifact Registry"
docker push $BACKEND_IMAGE
Assert-Success "push backend image"

# Deploy backend first (without FRONTEND_URL); set secrets/env
$FRONTEND_SERVICE = "smart-learning-frontend"
$BACKEND_SERVICE  = "smart-learning-backend"

Write-Host "Deploying backend service '$BACKEND_SERVICE' to Cloud Run ($REGION)"
$baseEnv = "NODE_ENV=production"
if ($UseSecrets) {
  Write-Host "Upserting Secret Manager secrets from current environment (if present)"
  function Ensure-Secret($name, $value) {
    if (-not $value) { return }
    $exists = $false
    try { gcloud secrets describe $name | Out-Null; $exists = $true } catch { $exists = $false }
    if (-not $exists) { gcloud secrets create $name --replication-policy="automatic" | Out-Null }
    $tmp = New-TemporaryFile
    Set-Content -Path $tmp -Value $value -NoNewline
    gcloud secrets versions add $name --data-file="$tmp" | Out-Null
    Remove-Item $tmp -Force
  }
  $envSUPABASE_URL = [Environment]::GetEnvironmentVariable('SUPABASE_URL')
  $envSUPABASE_SERVICE_ROLE_KEY = [Environment]::GetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY')
  $envJWT_SECRET = [Environment]::GetEnvironmentVariable('JWT_SECRET')
  $envGEMINI_API_KEY = [Environment]::GetEnvironmentVariable('GEMINI_API_KEY')
  Ensure-Secret -name 'SUPABASE_URL' -value $envSUPABASE_URL
  Ensure-Secret -name 'SUPABASE_SERVICE_ROLE_KEY' -value $envSUPABASE_SERVICE_ROLE_KEY
  Ensure-Secret -name 'JWT_SECRET' -value $envJWT_SECRET
  if ($envGEMINI_API_KEY) { Ensure-Secret -name 'GEMINI_API_KEY' -value $envGEMINI_API_KEY }
  $setSecrets = "SUPABASE_URL=SUPABASE_URL:latest,SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,JWT_SECRET=JWT_SECRET:latest"
  if ($envGEMINI_API_KEY) { $setSecrets += ",GEMINI_API_KEY=GEMINI_API_KEY:latest" }

  gcloud run deploy $BACKEND_SERVICE `
    --image=$BACKEND_IMAGE `
    --region=$REGION `
    --platform=managed `
    --allow-unauthenticated `
    --port=3000 `
    --min-instances=0 `
    --max-instances=1 `
    --cpu-throttling `
    --set-env-vars=$baseEnv `
    --set-secrets=$setSecrets | Out-Null
} else {
  $envPairs = @()
  foreach ($k in 'SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','JWT_SECRET','AI_PROVIDER','GEMINI_API_KEY','GEMINI_MODEL','GEMINI_EMBEDDING_MODEL','OPENAI_API_KEY','OPENAI_MODEL','OPENAI_EMBEDDING_MODEL') {
    $v = [Environment]::GetEnvironmentVariable($k)
    if ($v) { $envPairs += "$k=$v" }
  }
  $envString = if ($envPairs.Count -gt 0) { $baseEnv + "," + ($envPairs -join ',') } else { $baseEnv }

  gcloud run deploy $BACKEND_SERVICE `
    --image=$BACKEND_IMAGE `
    --region=$REGION `
    --platform=managed `
    --allow-unauthenticated `
    --port=3000 `
    --min-instances=0 `
    --max-instances=1 `
    --cpu-throttling `
    --set-env-vars=$envString | Out-Null
}
Assert-Success "deploy backend service"

$BACKEND_URL = gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)"
if (-not $BACKEND_URL) { throw "Failed to obtain backend URL." }
Write-Host "Backend URL: $BACKEND_URL"

Write-Host "Building frontend image from app-deployment\\frontend\\Dockerfile (context=repo root) with API base $BACKEND_URL"
docker build `
  -f app-deployment\frontend\Dockerfile `
  --build-arg VITE_API_BASE_URL=$BACKEND_URL `
  -t $FRONTEND_IMAGE `
  .
Assert-Success "build frontend Docker image"

Write-Host "Pushing frontend image to Artifact Registry"
docker push $FRONTEND_IMAGE
Assert-Success "push frontend image"

Write-Host "Deploying frontend service '$FRONTEND_SERVICE' to Cloud Run ($REGION)"
gcloud run deploy $FRONTEND_SERVICE `
  --image=$FRONTEND_IMAGE `
  --region=$REGION `
  --platform=managed `
  --allow-unauthenticated `
  --port=8080 `
  --min-instances=0 `
  --max-instances=1 `
  --cpu-throttling | Out-Null
Assert-Success "deploy frontend service"

$FRONTEND_URL = gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)"
if (-not $FRONTEND_URL) { throw "Failed to obtain frontend URL." }
Write-Host "Frontend URL: $FRONTEND_URL"

# Finally, update backend CORS with the frontend URL
Write-Host "Updating backend env FRONTEND_URL to $FRONTEND_URL"
gcloud run services update $BACKEND_SERVICE `
  --region=$REGION `
  --platform=managed `
  --set-env-vars=FRONTEND_URL=$FRONTEND_URL | Out-Null

Write-Host "Deployment complete."
Write-Host ("Backend URL: {0}" -f $BACKEND_URL)
Write-Host ("Frontend URL: {0}" -f $FRONTEND_URL)
