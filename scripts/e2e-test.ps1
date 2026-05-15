# Ascent — full end-to-end test (incident + support + research)
# Prereq: run scripts/start.ps1 in another terminal first.
param(
    [string]$ApiUrl = "http://localhost:8000",
    [string]$CustomerEmail = "",
    [string]$ServiceName = "",
    [int]$IncidentTimeoutSec = 600,
    [switch]$SkipIncident,
    [switch]$SkipSupport,
    [switch]$SkipResearch
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN: $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  FAIL: $msg" -ForegroundColor Red; exit 1 }

# Load .env for GITHUB_REPO, SMTP_USER, etc.
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $n = $matches[1].Trim()
            $v = $matches[2].Trim()
            if (-not [Environment]::GetEnvironmentVariable($n, "Process")) {
                [Environment]::SetEnvironmentVariable($n, $v, "Process")
            }
        }
    }
}

if (-not $CustomerEmail) {
    $CustomerEmail = $env:SMTP_USER
    if (-not $CustomerEmail) { $CustomerEmail = "you@example.com" }
}

if (-not $ServiceName) {
    $repo = $env:GITHUB_REPO
    if ($repo -match '/([^/]+)$') { $ServiceName = $Matches[1] }
    else { $ServiceName = "ascent-api" }
}

Write-Host @"

Ascent E2E test (no dashboard demo button)
  API:     $ApiUrl
  Service: $ServiceName (alert label — matches your repo context)
  Email:   $CustomerEmail (support test)

"@ -ForegroundColor DarkGray

Write-Step "Preflight"
try {
    $health = Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get -TimeoutSec 10
    if ($health.status -ne "healthy") { Write-Fail "API unhealthy: $($health | ConvertTo-Json -Compress)" }
    Write-Ok "API healthy"
} catch {
    Write-Fail "API not reachable at $ApiUrl — run scripts\start.ps1 first"
}

if ($env:ENABLE_LLM_MOCK -eq "true") {
    Write-Warn "ENABLE_LLM_MOCK=true — set false in .env for real LLM/MCP"
}
if (-not $env:OPENROUTER_API_KEY -and -not $env:NVIDIA_NIM_API_KEY) {
    Write-Warn "No LLM API key — agents may fail or use fallbacks only"
}
if (-not $env:GITHUB_TOKEN) {
    Write-Warn "GITHUB_TOKEN empty — GitHub MCP will not run in RCA"
}

$incidentId = $null
$results = @{ incident = "skipped"; support = "skipped"; research = "skipped" }

# --- 1. INCIDENT (real Prometheus-style webhook) ---
if (-not $SkipIncident) {
    Write-Step "Incident — POST /api/v1/webhooks/alerts"
    $alertBody = @{
        status = "firing"
        labels = @{
            alertname   = "E2EServiceErrorRate"
            severity    = "high"
            service     = $ServiceName
            environment = "staging"
        }
        annotations = @{
            summary     = "E2E: elevated error rate on $ServiceName"
            description = "Automated E2E test alert. Expect LangGraph investigation + GitHub evidence if GITHUB_TOKEN is set."
        }
    } | ConvertTo-Json -Depth 6

    $incident = Invoke-RestMethod -Uri "$ApiUrl/api/v1/webhooks/alerts" -Method Post `
        -ContentType "application/json" -Body $alertBody
    $incidentId = $incident.id
    Write-Ok "Incident created: $incidentId (status=$($incident.status))"
    Write-Host "  Dashboard: http://localhost:3000/incidents/$incidentId" -ForegroundColor DarkGray

    Write-Step "Incident — waiting for workflow (up to ${IncidentTimeoutSec}s)"
    $deadline = (Get-Date).AddSeconds($IncidentTimeoutSec)
    $finalStatus = $null
    $cur = $null
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 10
        $cur = Invoke-RestMethod -Uri "$ApiUrl/api/v1/incidents/$incidentId" -Method Get
        $finalStatus = $cur.status
        $hasRca = [bool]$cur.root_cause
        Write-Host "  status=$finalStatus root_cause=$hasRca" -ForegroundColor DarkGray

        if ($finalStatus -eq "awaiting_approval") {
            Write-Host "  Approving remediation (HITL)..." -ForegroundColor Yellow
            Invoke-RestMethod -Uri "$ApiUrl/api/v1/incidents/$incidentId/approve" -Method Post `
                -ContentType "application/json" `
                -Body (@{ approved_by = "e2e-test-script" } | ConvertTo-Json) | Out-Null
            continue
        }
        if ($finalStatus -in @("resolved", "failed", "cancelled")) { break }
    }

    if (-not $finalStatus -or $finalStatus -notin @("resolved", "failed", "cancelled", "awaiting_approval")) {
        Write-Fail "Incident timed out in status=$finalStatus. Is the WORKER process running? See WORKER pane in start.ps1."
    }

    $trace = Invoke-RestMethod -Uri "$ApiUrl/api/v1/workflows/incident/$incidentId/trace" -Method Get
    if ($finalStatus -eq "resolved") {
        Write-Ok "Incident resolved"
        if ($cur.root_cause) { Write-Ok "Root cause present ($($cur.root_cause.Length) chars)" }
        if ($cur.incident_report) { Write-Ok "Incident report present" }
        $results.incident = "pass"
    } elseif ($finalStatus -eq "awaiting_approval") {
        Write-Warn "Still awaiting_approval — approve manually on dashboard"
        $results.incident = "partial"
    } else {
        Write-Fail "Incident ended as $finalStatus. last_error=$($cur.last_error). Check WORKER logs."
    }
    if ($trace.last_error) { Write-Warn "Trace last_error: $($trace.last_error)" }
}

# --- 2. SUPPORT ---
if (-not $SkipSupport) {
    Write-Step "Support — POST /api/v1/support/complaints"
    $complaint = @{
        customer_email = $CustomerEmail
        customer_name  = "E2E Tester"
        subject        = "E2E: Cannot access dashboard after deploy"
        body           = "Since yesterday I get a 502 when opening the app. Order ID 88421. Please investigate and confirm when fixed."
    } | ConvertTo-Json

    $ticket = Invoke-RestMethod -Uri "$ApiUrl/api/v1/support/complaints" -Method Post `
        -ContentType "application/json" -Body $complaint -TimeoutSec 180
    Write-Ok "Ticket $($ticket.id) status=$($ticket.status) email_status=$($ticket.email_status)"
    if ($ticket.suggested_response) {
        Write-Host "  Response preview: $($ticket.suggested_response.Substring(0, [Math]::Min(120, $ticket.suggested_response.Length)))..." -ForegroundColor DarkGray
    }
    if ($ticket.email_status -eq "sent") {
        Write-Ok "Email sent to $CustomerEmail — check inbox"
        $results.support = "pass"
    } elseif ($ticket.email_status -eq "skipped") {
        Write-Warn "Email skipped (SMTP not configured or empty reply)"
        $results.support = if ($ticket.suggested_response) { "partial" } else { "fail" }
    } else {
        Write-Warn "Email status=$($ticket.email_status) error=$($ticket.email_error)"
        $results.support = "partial"
    }
    Write-Host "  UI: http://localhost:3000/support" -ForegroundColor DarkGray
}

# --- 3. RESEARCH ---
if (-not $SkipResearch) {
    Write-Step "Research — POST /api/v1/research/scan"
    $scanBody = @{ query = "enterprise AI agent orchestration trends 2025" } | ConvertTo-Json
    $scan = Invoke-RestMethod -Uri "$ApiUrl/api/v1/research/scan" -Method Post `
        -ContentType "application/json" -Body $scanBody -TimeoutSec 300
    $trendCount = @($scan.trends).Count
    $newsCount = @($scan.news).Count
    Write-Ok "Scan done: trends=$trendCount news=$newsCount signal_id=$($scan.signal_id)"
    if ($scan.strategic_insights) { Write-Ok "Strategic insights generated" }

    Write-Step "Research — POST /api/v1/research/ask"
    $askBody = @{ query = "What are the main risks of multi-agent systems in production?" } | ConvertTo-Json
    $ask = Invoke-RestMethod -Uri "$ApiUrl/api/v1/research/ask" -Method Post `
        -ContentType "application/json" -Body $askBody -TimeoutSec 180
    if ($ask.answer -and $ask.answer.Length -gt 50) {
        Write-Ok "Ask answer ($($ask.answer.Length) chars)"
        $results.research = "pass"
    } else {
        Write-Warn "Ask returned short or empty answer"
        $results.research = "partial"
    }
    Write-Host "  UI: http://localhost:3000/research" -ForegroundColor DarkGray
}

Write-Step "Summary"
Write-Host "  Incident: $($results.incident)"
Write-Host "  Support:  $($results.support)"
Write-Host "  Research: $($results.research)"
Write-Host "`nManual UI checks:" -ForegroundColor Cyan
if ($incidentId) { Write-Host "  http://localhost:3000/incidents/$incidentId" }
Write-Host "  http://localhost:3000/support"
Write-Host "  http://localhost:3000/research"
Write-Host "  Temporal UI: http://localhost:8088`n"
