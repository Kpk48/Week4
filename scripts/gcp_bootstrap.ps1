param(
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$Region,
  [string]$ArtifactRepoId = "smart-learning",
  [switch]$CreateRepo,
  [string]$BackendTag = "latest",
  [string]$FrontendTag = "latest",
  [switch]$SkipImageBuild
)

# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "Setting gcloud project..." -ForegroundColor Cyan
gcloud config set project $ProjectId | Out-Null

Write-Host "Enabling required APIs..." -ForegroundColor Cyan
gcloud services enable `
  artifactregistry.googleapis.com `
  run.googleapis.com `
  secretmanager.googleapis.com `
  cloudbuild.googleapis.com `
  monitoring.googleapis.com `
  pubsub.googleapis.com `
  cloudfunctions.googleapis.com `
  iam.googleapis.com `
  compute.googleapis.com | Out-Null

Write-Host "Ensuring Terraform state bucket exists (optional manual step)." -ForegroundColor Yellow
Write-Host "Create manually if desired: gsutil mb -l $Region gs://<your-tf-state-bucket>" -ForegroundColor Yellow

$RegistryHost = "us-docker.pkg.dev"  # change to your multi-region if needed
$RepoPath = "$RegistryHost/$ProjectId/$ArtifactRepoId"

if ($CreateRepo) {
  Write-Host "Creating Artifact Registry repo '$ArtifactRepoId' in 'us' if not exists..." -ForegroundColor Cyan
  try {
    gcloud artifacts repositories create $ArtifactRepoId `
      --repository-format=docker `
      --location=us `
      --description="Smart Learning" | Out-Null
  } catch {
    Write-Host "Repo may already exist: $_" -ForegroundColor Yellow
  }
}

Write-Host "Configuring Docker auth for $RegistryHost ..." -ForegroundColor Cyan
gcloud auth configure-docker $RegistryHost -q | Out-Null

$BackendImage = "$RepoPath/backend:$BackendTag"
$FrontendImage = "$RepoPath/frontend:$FrontendTag"

if (-not $SkipImageBuild) {
  Write-Host "Building and pushing backend image: $BackendImage" -ForegroundColor Cyan
  docker build -f app-deployment\backend\Dockerfile -t $BackendImage .
  docker push $BackendImage

  Write-Host "Building and pushing frontend image: $FrontendImage" -ForegroundColor Cyan
  docker build -f app-deployment\frontend\Dockerfile -t $FrontendImage .
  docker push $FrontendImage
}

Write-Host "Done. Use these values in terraform/terraform.tfvars:" -ForegroundColor Green
Write-Host "image_backend  = '$BackendImage'"
Write-Host "image_frontend = '$FrontendImage'"
