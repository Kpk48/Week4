# Monitoring Module - Log-based metrics, alerting policies, notification channels

# Notification channels (email)
resource "google_monitoring_notification_channel" "email" {
  for_each    = toset(var.notification_emails)
  display_name = "Email ${each.value}"
  type         = "email"
  labels = {
    email_address = each.value
  }
}

# Uptime check for backend URL
resource "google_monitoring_uptime_check_config" "backend" {
  display_name = "Backend Health"
  timeout      = "10s"
  period       = "60s"
  http_check {
    path = "/health"
  }
  monitored_resource {
    type   = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.backend_host
    }
  }
}

# Metrics based alerts
# CPU utilization > 80%
resource "google_monitoring_alert_policy" "cpu_high" {
  display_name = "Cloud Run CPU > 80%"
  combiner     = "OR"
  conditions {
    display_name = "CPU Utilization"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/container/cpu/utilizations\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"
      trigger {
        count = 1
      }
    }
  }
  notification_channels = values(google_monitoring_notification_channel.email)[*].name
}

# Memory > 85%
resource "google_monitoring_alert_policy" "memory_high" {
  display_name = "Cloud Run Memory > 85%"
  combiner     = "OR"
  conditions {
    display_name = "Memory Utilization"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/container/memory/utilizations\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "300s"
      trigger {
        count = 1
      }
    }
  }
  notification_channels = values(google_monitoring_notification_channel.email)[*].name
}

# Request latency > 2s
resource "google_monitoring_alert_policy" "latency_high" {
  display_name = "Cloud Run Latency > 2s"
  combiner     = "OR"
  conditions {
    display_name = "Request Latency"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
      trigger {
        count = 1
      }
    }
  }
  notification_channels = values(google_monitoring_notification_channel.email)[*].name
}

# Error rate > 5%
resource "google_monitoring_alert_policy" "error_rate" {
  display_name = "Cloud Run Error rate > 5%"
  combiner     = "OR"
  conditions {
    display_name = "Error rate"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" metric.label.response_code_class=\"5xx\" resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      duration        = "300s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATIO"
        cross_series_reducer = "REDUCE_FRACTION_TRUE"
      }
      trigger {
        count = 1
      }
    }
  }
  notification_channels = values(google_monitoring_notification_channel.email)[*].name
}
