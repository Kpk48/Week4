terraform {
  backend "gcs" {
    bucket = var.tf_state_bucket
    prefix = var.tf_state_prefix
  }
}

# Enable required Google APIs/services for this stack
# It is safe to run multiple times; resources are idempotent.
resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",                 # Cloud Run
    "artifactregistry.googleapis.com",    # Artifact Registry
    "secretmanager.googleapis.com",       # Secret Manager
    "monitoring.googleapis.com",          # Cloud Monitoring
    "pubsub.googleapis.com",              # Pub/Sub
    "cloudfunctions.googleapis.com",      # Cloud Functions (2nd gen)
    "compute.googleapis.com",             # VPC/Firewall/NAT
    "cloudbuild.googleapis.com",          # Cloud Build (optional)
    "logging.googleapis.com"              # Cloud Logging
  ])
  project                    = var.project_id
  service                    = each.key
  disable_dependent_services = false
  disable_on_destroy         = false
}
