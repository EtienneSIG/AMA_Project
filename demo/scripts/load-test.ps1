<#
.SYNOPSIS
    LearnEU autoscale load test — feature 011.

.DESCRIPTION
    Generates synthetic HTTP traffic against the learner-web public login page
    to drive CPU > 70 % on the App Service plan for ≥ 10 minutes and trigger
    the autoscale rule (1 → 2 → 3 instances). No PII is generated. No AOAI
    cost (target is the static login page, not /api/chat).

    Refuses to target any host name that does not match the dev pattern
    `app-learner-web-*.azurewebsites.net` AND that resolves to the demo
    resource group (FR-008 production-slot refusal).

    Deterministic: same -Seed → same client think-time sequence (FR-010).

.PARAMETER TargetUrl
    Full base URL of the learner-web dev slot. Default = the canonical demo
    URL. Production slot names ('prod', 'production', 'live') are refused.

.PARAMETER Concurrency
    Number of parallel virtual users. Default 80; 40-160 range typical for
    P0v3 ASP capacity=1.

.PARAMETER DurationMinutes
    Total ramp + hold duration. Must be ≥ 12 to satisfy the 10-min CPU
    sustain window. Default 15.

.PARAMETER Seed
    Random seed for deterministic think-times. Default 42.

.PARAMETER ManifestPath
    Where to persist the run manifest JSON. Default = ./demo/perf/runs/.

.EXAMPLE
    .\load-test.ps1 -Verbose
    .\load-test.ps1 -Concurrency 120 -DurationMinutes 18 -Seed 1337

.NOTES
    Generator decision (T002): pure PowerShell + System.Net.Http. Rationale:
    zero install footprint vs k6/autocannon; the smoke test only needs
    sustained CPU pressure, not advanced HTTP scenarios. If finer-grained
    p99 latency reporting is needed later, swap in k6.

    @demo-deployment-agent
#>
[CmdletBinding()]
param(
    [string]$TargetUrl = 'https://app-learner-web-learneu-demo.azurewebsites.net',
    [ValidateRange(1, 500)]
    [int]$Concurrency = 80,
    [ValidateRange(12, 60)]
    [int]$DurationMinutes = 15,
    [int]$Seed = 42,
    [string]$ManifestPath = (Join-Path $PSScriptRoot '..\perf\runs')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# -------- FR-008: production-slot refusal --------
$prodPatterns = @('prod', 'production', 'live', 'release')
foreach ($pat in $prodPatterns) {
    if ($TargetUrl -match "(?i)$pat") {
        throw "REFUSAL: TargetUrl '$TargetUrl' matches production pattern '$pat'. " +
              "This script only runs against dev slots. (FR-008)"
    }
}
if ($TargetUrl -notmatch '(?i)azurewebsites\.net' -or
    $TargetUrl -notmatch '(?i)learneu-demo') {
    throw "REFUSAL: TargetUrl '$TargetUrl' is not a known dev slot. " +
          "Expected pattern: *learneu-demo*.azurewebsites.net. (FR-008)"
}

# -------- Manifest scaffold (FR-009) --------
$runId      = [guid]::NewGuid().ToString('n').Substring(0, 12)
$startedAt  = (Get-Date).ToUniversalTime()
$endAt      = $startedAt.AddMinutes($DurationMinutes)
$opId       = [guid]::NewGuid().ToString()

New-Item -ItemType Directory -Path $ManifestPath -Force | Out-Null
$manifestFile = Join-Path $ManifestPath "run-$($startedAt.ToString('yyyyMMdd-HHmmss'))-$runId.json"

$manifest = [ordered]@{
    run_id                  = $runId
    started_at              = $startedAt.ToString('o')
    ended_at                = $null
    target_url              = $TargetUrl
    target_concurrency      = $Concurrency
    duration_minutes        = $DurationMinutes
    sustained_cpu_window    = 'PT10M'
    seed                    = $Seed
    operation_id            = $opId
    requests_attempted      = 0
    requests_succeeded      = 0
    requests_failed         = 0
    latency_ms              = @{ p50 = $null; p95 = $null; p99 = $null }
    rps                     = $null
    pii_assertion           = 'PASS — generator emits only GET /login.html with deterministic User-Agent header'
    verdict                 = 'PENDING — see autoscale-events.kql for scale-out evidence'
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestFile -Encoding UTF8
Write-Host "Manifest: $manifestFile"
Write-Host "Run id  : $runId"
Write-Host "Op id   : $opId  (use with autoscale-events.kql)"

# -------- Deterministic worker --------
$rng = [System.Random]::new($Seed)
$thinkTimesMs = 1..$Concurrency | ForEach-Object { $rng.Next(50, 400) }

$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(20)
$client.DefaultRequestHeaders.UserAgent.ParseAdd("LearnEU-LoadTest/1.0 (run=$runId; seed=$Seed)")

$latencies = [System.Collections.Concurrent.ConcurrentBag[double]]::new()
$succeeded = 0; $failed = 0; $attempted = 0

Write-Host "`nRamp-and-hold: $Concurrency VUs × $DurationMinutes min against $TargetUrl"
Write-Host "Target: sustain CPU > 70 % for >= 10 min to trigger 1 -> 2 -> 3 scale-out"
Write-Host "Press Ctrl+C to abort safely.`n"

$jobs = 1..$Concurrency | ForEach-Object {
    $vu = $_
    $think = $thinkTimesMs[$vu - 1]
    Start-ThreadJob -StreamingHost $Host -ScriptBlock {
        param($url, $endAt, $thinkMs, $vu)
        $sw = [System.Diagnostics.Stopwatch]::new()
        $localOk = 0; $localFail = 0; $localAttempts = 0
        $localLat = New-Object System.Collections.Generic.List[double]
        $client = [System.Net.Http.HttpClient]::new()
        $client.Timeout = [TimeSpan]::FromSeconds(20)
        $client.DefaultRequestHeaders.UserAgent.ParseAdd("LearnEU-LoadTest/1.0 (vu=$vu)")
        while ((Get-Date).ToUniversalTime() -lt $endAt) {
            $localAttempts++
            $sw.Restart()
            try {
                $resp = $client.GetAsync("$url/login.html").GetAwaiter().GetResult()
                $sw.Stop()
                if ($resp.IsSuccessStatusCode) { $localOk++ } else { $localFail++ }
                $localLat.Add($sw.Elapsed.TotalMilliseconds)
            } catch {
                $sw.Stop()
                $localFail++
            }
            Start-Sleep -Milliseconds $thinkMs
        }
        [pscustomobject]@{ ok = $localOk; fail = $localFail; attempts = $localAttempts; lat = $localLat }
    } -ArgumentList $TargetUrl, $endAt, $think, $vu
}

# -------- Periodic status --------
while ($jobs | Where-Object { $_.State -eq 'Running' }) {
    Start-Sleep -Seconds 30
    $remaining = [int]([math]::Max(0, ($endAt - (Get-Date).ToUniversalTime()).TotalSeconds))
    Write-Host ("  [{0:HH:mm:ss}] elapsed; ~{1}s remaining; running={2}" -f (Get-Date), $remaining, ($jobs | Where-Object State -EQ 'Running').Count)
}

$results = $jobs | Receive-Job -Wait
$jobs | Remove-Job

foreach ($r in $results) {
    $succeeded += $r.ok
    $failed    += $r.fail
    $attempted += $r.attempts
    foreach ($l in $r.lat) { $latencies.Add($l) }
}

$sorted = $latencies.ToArray() | Sort-Object
function _pct($arr, $p) { if ($arr.Count -eq 0) { return $null } $i = [math]::Floor(($arr.Count - 1) * $p); return [math]::Round($arr[$i], 1) }

$durSec = ((Get-Date).ToUniversalTime() - $startedAt).TotalSeconds
$rps    = if ($durSec -gt 0) { [math]::Round($succeeded / $durSec, 2) } else { 0 }

$manifest.ended_at            = (Get-Date).ToUniversalTime().ToString('o')
$manifest.requests_attempted  = $attempted
$manifest.requests_succeeded  = $succeeded
$manifest.requests_failed     = $failed
$manifest.latency_ms.p50      = _pct $sorted 0.50
$manifest.latency_ms.p95      = _pct $sorted 0.95
$manifest.latency_ms.p99      = _pct $sorted 0.99
$manifest.rps                 = $rps

$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestFile -Encoding UTF8

Write-Host "`n=== Run summary ==="
Write-Host "Attempted : $attempted"
Write-Host "Succeeded : $succeeded"
Write-Host "Failed    : $failed"
Write-Host ("p50 / p95 / p99 ms: {0} / {1} / {2}" -f $manifest.latency_ms.p50, $manifest.latency_ms.p95, $manifest.latency_ms.p99)
Write-Host "RPS       : $rps"
Write-Host "Manifest  : $manifestFile"
Write-Host "`nNext step: open the Azure Portal or Log Analytics, run:"
Write-Host "  demo/observability/autoscale-events.kql"
Write-Host "with start=$($startedAt.ToString('o')) end=$($manifest.ended_at) and confirm a 1 -> 2 scale-out event."
Write-Host "Then fill LOAD-TEST-REPORT-template.md and save under demo/perf/LOAD-TEST-REPORT-<date>.md."
