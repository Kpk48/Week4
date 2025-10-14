# Cloud Run Module - Deploy backend and frontend services

# Service account for Cloud Run (least privilege; permissions can be granted outside)
resource "google_service_account" "cloud_run_sa" {
  account_id   = var.service_account_id
  display_name = "Cloud Run Runtime SA"
}

# Backend Cloud Run service
resource "google_cloud_run_v2_service" "backend" {
  name     = var.service_name_backend
  location = var.region
  template {
    service_account = google_service_account.cloud_run_sa.email
    containers {
      image = var.image_backend
      resources {
        cpu_idle = true
        limits = {
          "memory" = var.memory
          "cpu"    = var.cpu
        }
      }
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
      ports {
        container_port = 3000
      }
    }
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
    timeout    = "300s"
    max_retries = 3
    dynamic "vpc_access" {
      for_each = var.enable_vpc_connector && var.vpc_connector_name != null ? [1] : []
      content {
        connector = var.vpc_connector_name
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }
  }
  ingress = "INGRESS_TRAFFIC_ALL"
}

# Frontend Cloud Run service (container serves static via nginx)
resource "google_cloud_run_v2_service" "frontend" {
  name     = var.service_name_frontend
  location = var.region
  template {
    service_account = google_service_account.cloud_run_sa.email
    containers {
      image = var.image_frontend
      resources {
        cpu_idle = true
        limits = {
          "memory" = var.memory
          "cpu"    = var.cpu
        }
      }
      dynamic "env" {
        for_each = var.frontend_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }
      ports {
        container_port = 8080
      }
    }
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
    timeout    = "120s"
    max_retries = 3
  }
  ingress = "INGRESS_TRAFFIC_ALL"
}

# Allow unauthenticated access if desired
resource "google_cloud_run_v2_service_iam_binding" "backend_invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  members  = ["allUsers"]
}

resource "google_cloud_run_v2_service_iam_binding" "frontend_invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  members  = ["allUsers"]
}

output "backend_url" {
  value = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  value = google_cloud_run_v2_service.frontend.uri
}
