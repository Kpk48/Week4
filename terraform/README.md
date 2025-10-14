Terraform + GCP deployment guide (Smart Learning Hub)

This document explains how to deploy the backend (Express) and frontend (Vite+Nginx) to Google Cloud Run using Terraform. Images are stored in Artifact Registry, and sensitive config comes from Secret Manager. These steps are optimized for Windows/PowerShell, but the flow is the same on macOS/Linux.

Prerequisites
- A GCP project with billing enabled
- Roles (or equivalent) on your user/SA: Project Editor/Admin, Artifact Registry Admin, Cloud Run Admin, Secret Manager Admin, Service Account Admin, IAM Service Account User, Pub/Sub Admin (if using the sample alerting), Cloud Functions Admin (if using pubsub function), Compute Network Admin (if enabling VPC), Monitoring Admin
- gcloud CLI installed and authenticated: gcloud auth login; gcloud config set project <PROJECT_ID>
- Terraform 1.6+
- Docker installed (for building/pushing images)
- Supabase project with keys (SUPABASE_URL, ANON, SERVICE_ROLE)

Repository overview (infra)
- terraform/          — root module
- terraform/modules/* — reusable modules (cloud-run, secret-manager, etc.)
- terraform/terraform.tfvars.example — fill this into terraform.tfvars

High-level steps
1) Prepare GCP project and enable APIs
2) Create a GCS bucket for Terraform remote state (recommended)
3) Create an Artifact Registry repository
4) Build and push backend/frontend images to Artifact Registry
5) Create Secret Manager secrets and load values
6) Configure terraform.tfvars
7) terraform init/plan/apply
8) Verify deployed URLs and set frontend VITE_API_BASE_URL

Quick automation (PowerShell)
You can use helper scripts we ship under scripts/ to automate most tasks:
1. scripts\gcp_bootstrap.ps1 — enables APIs, creates the state bucket, creates/pulls Artifact Registry repo (optional), builds and pushes images. It outputs the image URLs to paste into terraform.tfvars.
2. scripts\secret_manager_setup.ps1 — after terraform creates the Secret Manager secret shells, use this to add/update secret versions (safe to rerun).

Manual step-by-step
Step 0 — Login and pick project
- gcloud auth login
- gcloud config set project <PROJECT_ID>

Step 1 — Enable necessary APIs
If you aren’t using the bootstrap script:
- gcloud services enable artifactregistry.googleapis.com run.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com monitoring.googleapis.com pubsub.googleapis.com cloudfunctions.googleapis.com iam.googleapis.com compute.googleapis.com

Step 2 — Remote state bucket (recommended)
- Create a regional GCS bucket: gsutil mb -l us-central1 gs://<TF_STATE_BUCKET>
- In terraform/backend.tf (optional) set the backend to use this bucket, or pass via CLI. This repo expects variables tf_state_bucket and tf_state_prefix; you can keep local for first apply.

Step 3 — Artifact Registry
- Create repo (Docker):
  gcloud artifacts repositories create smart-learning --repository-format=docker --location=us --description="Smart Learning"
- Authenticate Docker to Artifact Registry:
  gcloud auth configure-docker us-docker.pkg.dev

Step 4 — Build and push images
From repo root:
- Backend:
  $BACKEND_IMAGE="us-docker.pkg.dev/<PROJECT_ID>/smart-learning/backend:latest"
  docker build -f app-deployment\backend\Dockerfile -t $BACKEND_IMAGE .
  docker push $BACKEND_IMAGE
- Frontend:
  $FRONTEND_IMAGE="us-docker.pkg.dev/<PROJECT_ID>/smart-learning/frontend:latest"
  docker build -f app-deployment\frontend\Dockerfile -t $FRONTEND_IMAGE .
  docker push $FRONTEND_IMAGE

Step 5 — Create secrets in Secret Manager
Terraform root module declares the following secret ids:
- jwt-secret
- supabase-url
- supabase-anon-key
- supabase-service-role-key

Apply terraform first to create the secret containers, then add versions:
- echo -n "<JWT_SECRET>" | gcloud secrets versions add jwt-secret --data-file=-
- echo -n "https://<YOUR>.supabase.co" | gcloud secrets versions add supabase-url --data-file=-
- echo -n "<ANON_KEY>" | gcloud secrets versions add supabase-anon-key --data-file=-
- echo -n "<SERVICE_ROLE_KEY>" | gcloud secrets versions add supabase-service-role-key --data-file=-

Note: Do NOT commit secrets. You can also inject initial secret values via Terraform variables using the module’s initial_values map, but it’s safer to add versions with gcloud.

Step 6 — Configure terraform.tfvars
Copy terraform.tfvars.example to terraform.tfvars and set values:
- project_id           = "<YOUR_PROJECT_ID>"
- region               = "us-central1" (or your region)
- image_backend        = "us-docker.pkg.dev/<PROJECT_ID>/smart-learning/backend:latest"
- image_frontend       = "us-docker.pkg.dev/<PROJECT_ID>/smart-learning/frontend:latest"
- env_vars = {
    NODE_ENV    = "production"
    FRONTEND_URL = "<will be set to frontend URL after first apply, or your custom domain>"
  }
- frontend_env_vars = {
    VITE_API_BASE_URL = "<backend URL after apply>"
  }
Option: You can leave FRONTEND_URL/VITE_API_BASE_URL blank for the first apply. After outputs show backend_url/frontend_url, update tfvars and apply again to bake exact URLs into environment.

Step 7 — Terraform init/plan/apply
From terraform/ directory:
- terraform init
- terraform validate
- terraform plan -out plan.out
- terraform apply plan.out
Outputs:
- backend_url
- frontend_url

Step 8 — Wire frontend to backend
If you didn’t set VITE_API_BASE_URL earlier, update terraform.tfvars to:
- frontend_env_vars = { VITE_API_BASE_URL = "<backend_url from outputs>" }
Re-run:
- terraform apply

Notes and troubleshooting
- Authentication: Ensure gcloud is authenticated with an account that has permissions.
- Artifact Registry auth: If docker push fails with 403, re-run gcloud auth configure-docker us-docker.pkg.dev
- Cloud Run env: Backend’s CORS allows the provided FRONTEND_URL in env_vars. Set it to your Cloud Run frontend URL (or your custom domain) to avoid CORS in production.
- Cold starts: With min_instances = 0 you may see cold-start latency. Increase to 1 for snappier UX.
- Costs: Minimize always-on instances; use managed HTTPS provided by Cloud Run.
- VPC access: If you need private egress, set enable_vpc_connector=true and provide vpc_connector_name.
- Secrets access: Terraform module binds the Cloud Run service account to Secret Manager accessor for the required secrets.

Cleanup
- terraform destroy (removes Cloud Run services, but will not delete Artifact Registry images or the state bucket unless you do it manually)
- Delete images: gcloud artifacts docker images delete ...
- Delete secrets: gcloud secrets delete <id>

Security reminders
- Never commit real secrets.
- Prefer Workload Identity Federation for CI/CD to push images and run terraform.
- Keep service account permissions scoped to least privilege.
