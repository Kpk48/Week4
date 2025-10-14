param(
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$JwtSecret,
  [Parameter(Mandatory=$true)][string]$SupabaseUrl,
  [Parameter(Mandatory=$true)][string]$SupabaseAnonKey,
  [Parameter(Mandatory=$true)][string]$SupabaseServiceRoleKey
)

$ErrorActionPreference = "Stop"

gcloud config set project $ProjectId | Out-Null

function Ensure-SecretExists {
  param([string]$SecretId)
  $exists = gcloud secrets list --filter="name:projects/$ProjectId/secrets/$SecretId" --format="value(name)"
  if (-not $exists) {
    Write-Host "Creating secret: $SecretId" -ForegroundColor Cyan
    gcloud secrets create $SecretId --replication-policy="automatic" | Out-Null
  } else {
    Write-Host "Secret exists: $SecretId" -ForegroundColor Yellow
  }
}

Ensure-SecretExists -SecretId "jwt-secret"
Ensure-SecretExists -SecretId "supabase-url"
Ensure-SecretExists -SecretId "supabase-anon-key"
Ensure-SecretExists -SecretId "supabase-service-role-key"

Write-Host "Adding new secret versions..." -ForegroundColor Cyan

$JwtSecret    | Out-File -FilePath jwt.tmp    -NoNewline -Encoding utf8
$SupabaseUrl  | Out-File -FilePath url.tmp    -NoNewline -Encoding utf8
$SupabaseAnonKey | Out-File -FilePath anon.tmp -NoNewline -Encoding utf8
$SupabaseServiceRoleKey | Out-File -FilePath srv.tmp -NoNewline -Encoding utf8

try {
  gcloud secrets versions add jwt-secret --data-file=jwt.tmp | Out-Null
  gcloud secrets versions add supabase-url --data-file=url.tmp | Out-Null
  gcloud secrets versions add supabase-anon-key --data-file=anon.tmp | Out-Null
  gcloud secrets versions add supabase-service-role-key --data-file=srv.tmp | Out-Null
} finally {
  Remove-Item -Force jwt.tmp,url.tmp,anon.tmp,srv.tmp
}

Write-Host "Done. If Cloud Run services already exist, redeploy (terraform apply) to pick up latest secret versions." -ForegroundColor Green
