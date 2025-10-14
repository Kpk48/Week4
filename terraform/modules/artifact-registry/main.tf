# Artifact Registry Module
# Creates a Docker repository, optional cleanup policies, and IAM bindings

resource "google_artifact_registry_repository" "this" {
  location      = var.location
  repository_id = var.repository_id
  description   = var.description
  format        = "DOCKER"
}

# Cleanup policy example: delete images older than X days keeping last N versions
resource "google_artifact_registry_repository_cleanup_policy" "age_policy" {
  count         = var.enable_cleanup ? 1 : 0
  project       = var.project_id
  location      = var.location
  repository    = google_artifact_registry_repository.this.repository_id
  policy_id     = "age-policy"
  condition {
    older_than = var.cleanup_older_than
  }
  most_recent_versions {
    keep_count = var.cleanup_keep_versions
  }
}

# IAM bindings
resource "google_artifact_registry_repository_iam_binding" "bindings" {
  for_each   = var.iam_roles
  project    = var.project_id
  location   = var.location
  repository = google_artifact_registry_repository.this.name
  role       = each.key
  members    = each.value
}

output "repository" {
  value = google_artifact_registry_repository.this.name
}
