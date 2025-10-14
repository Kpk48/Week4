# Pub/Sub Module - Topic, Subscription, and Cloud Function (2nd gen) for email notifications

resource "google_pubsub_topic" "alerts" {
  name = var.topic_name
}

resource "google_pubsub_subscription" "alerts_sub" {
  name  = var.subscription_name
  topic = google_pubsub_topic.alerts.name
}

# Placeholder Cloud Function to process messages and send emails via SendGrid
# Note: This module only provisions infra placeholders; deploying function source is out of scope.
resource "google_service_account" "function_sa" {
  account_id   = var.function_service_account_id
  display_name = "Alerts Function SA"
}

resource "google_cloudfunctions2_function" "alerts_handler" {
  name        = var.function_name
  location    = var.region
  description = "Handles alert messages and sends email via SendGrid"

  build_config {
    runtime     = "nodejs20"
    entry_point = var.entry_point
    # Source must be provided via repo or storage; left configurable
    source {
      storage_source {
        bucket = var.source_bucket
        object = var.source_object
      }
    }
    environment_variables = {
      SENDGRID_API_KEY = var.sendgrid_api_key_secret != null ? "${var.sendgrid_api_key_secret}" : null
    }
  }

  service_config {
    available_memory   = "256M"
    timeout_seconds    = 60
    service_account_email = google_service_account.function_sa.email
    environment_variables = {
      EMAIL_FROM = var.email_from
      EMAIL_TO   = join(",", var.email_to)
    }
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.alerts.id
    retry_policy   = "RETRY_POLICY_RETRY"
  }
}
