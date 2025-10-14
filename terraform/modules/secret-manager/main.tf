# Secret Manager Module - Creates secrets and IAM bindings

resource "google_secret_manager_secret" "secrets" {
  for_each  = var.secrets
  secret_id = each.key
  replication {
    automatic = true
  }
}

# Optional: initial secret versions (do NOT put real secret values in code; use Terraform variables or CI to supply)
resource "google_secret_manager_secret_version" "versions" {
  for_each    = var.initial_values
  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value
}

# IAM bindings per secret
resource "google_secret_manager_secret_iam_binding" "bindings" {
  for_each = var.iam_bindings
  project  = var.project_id
  secret_id = each.key
  role      = each.value.role
  members   = each.value.members
}
