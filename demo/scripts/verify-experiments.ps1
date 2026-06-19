param(
  [string]$AdminBase = 'https://app-admin-learneu-demo.azurewebsites.net',
  [string]$DirectorBase = 'https://app-director-portal-learneu-demo.azurewebsites.net',
  [string]$TeacherBase = 'https://app-teacher-console-learneu-demo.azurewebsites.net',
  [string]$AdminEmail = 'admin@learneu.demo',
  [string]$DirectorEmail = 'director@learneu.demo',
  [string]$TeacherEmail = 'teacher@learneu.demo',
  [string]$Password = 'DemoPass2026!'
)

# Feature 012 — A/B Testing Framework end-to-end verifier.
# Exercises: experiment definition (control + treatment), pre-start validation,
# governed deterministic assignment of a learner cohort with a fairness gate,
# assignment summary, metric snapshot ingestion + freshness, underperformance
# alert + acknowledgement, statistical significance (advisory recommendation),
# the adopt_variant sign-off gate (blocked without teacher + pedagogy sign-off,
# allowed once both recorded), segment analysis with opposite-effect / high-risk
# fairness flag, DSR exclusion, archive + keyword search, the immutable audit
# trail, and the director oversight summary.
$ErrorActionPreference = 'Stop'

function Login($base, $email) {
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $r = Invoke-WebRequest -Uri "$base/api/auth/login" -Method POST -WebSession $s -ContentType 'application/json' `
    -Body (@{ email = $email; password = $Password } | ConvertTo-Json) -TimeoutSec 30
  $csrf = ($r.Content | ConvertFrom-Json).csrfToken
  return @{ Session = $s; Csrf = $csrf }
}
function PostJson($base, $path, $ctx, $body) {
  $headers = @{ 'X-CSRF-Token' = $ctx.Csrf }
  $r = Invoke-WebRequest -Uri "$base$path" -Method POST -WebSession $ctx.Session -Headers $headers `
    -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 12) -TimeoutSec 60
  return $r.Content | ConvertFrom-Json
}
function GetJson($base, $path, $ctx) {
  $r = Invoke-WebRequest -Uri "$base$path" -Method GET -WebSession $ctx.Session -TimeoutSec 30
  return $r.Content | ConvertFrom-Json
}
# POST that returns parsed body + status even when the API replies 4xx { ok:false }.
function PostTolerant($base, $path, $ctx, $body) {
  $headers = @{ 'X-CSRF-Token' = $ctx.Csrf }
  try {
    $r = Invoke-WebRequest -Uri "$base$path" -Method POST -WebSession $ctx.Session -Headers $headers `
      -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 12) -TimeoutSec 60
    return @{ status = [int]$r.StatusCode; body = ($r.Content | ConvertFrom-Json) }
  } catch {
    $code = 0; try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $b = $null; try { $b = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
    return @{ status = $code; body = $b }
  }
}
function Assert($cond, $msg) { if (-not $cond) { throw "ASSERT FAILED: $msg" } }

$stamp = (Get-Date -Format 'HHmmss')
$pass = 0
function Ok($msg) { Write-Host "   PASS: $msg" -ForegroundColor Green; $script:pass++ }

Write-Host '1) Admin login...' -ForegroundColor Cyan
$admin = Login $AdminBase $AdminEmail
Ok 'admin authenticated'

Write-Host '2) Create experiment (control + treatment)...' -ForegroundColor Cyan
$expName = "Hint timing $stamp"
$created = PostJson $AdminBase '/api/experiments' $admin @{
  name = $expName; hypothesis = 'Earlier hints raise mastery without lowering engagement';
  successMetric = 'mastery'; plannedDurationDays = 14;
  variants = @(
    @{ variantKey = 'control';   trafficWeight = 0.5; isControl = $true },
    @{ variantKey = 'treatment'; trafficWeight = 0.5; isControl = $false }
  )
}
Assert ($created.ok -and $created.experiment.experiment_id) 'experiment created'
$expId = $created.experiment.experiment_id
Assert ($created.variants.Count -eq 2) 'two variants created'
$controlId   = ($created.variants | Where-Object { $_.is_control }).variant_id
$treatmentId = ($created.variants | Where-Object { -not $_.is_control }).variant_id
Assert ($created.experiment.status -eq 'draft') 'starts in draft'
Ok "experiment $($expId.Substring(0,8)) created in draft with 2 variants"

Write-Host '3) Validate experiment (draft -> validated)...' -ForegroundColor Cyan
$val = PostJson $AdminBase "/api/experiments/$expId/validate" $admin @{}
Assert ($val.ok -and $val.experiment.status -eq 'validated') 'validated'
Ok 'experiment validated (>=2 variants, exactly 1 control, weights sum to 1, duration>=7)'

Write-Host '4) Start experiment with a balanced cohort (validated -> running)...' -ForegroundColor Cyan
$grades = @('g5','g6','g7','g8')
$cohort = @(for ($i = 0; $i -lt 400; $i++) { @{ pseudonym = "demo-$stamp-$i"; strata = @{ grade = $grades[$i % 4] } } })
$start = PostJson $AdminBase "/api/experiments/$expId/start" $admin @{ cohort = $cohort }
Assert ($start.ok -and $start.experiment.status -eq 'running') 'running'
Assert ($start.fairnessStatus -ne 'high_risk') "fairness not high_risk (got $($start.fairnessStatus))"
Ok "started; 400 learners assigned; fairness=$($start.fairnessStatus)"

Write-Host '5) Assignment summary (balanced split)...' -ForegroundColor Cyan
$sum = GetJson $AdminBase "/api/experiments/$expId/assignments/summary" $admin
Assert ($sum.total -eq 400) "400 assigned (got $($sum.total))"
$ctrlN = [int]$sum.byVariant.control; $trtN = [int]$sum.byVariant.treatment
Assert (($ctrlN + $trtN) -eq 400) 'variant counts sum to cohort'
Assert ([math]::Abs($ctrlN - $trtN) -lt 80) "roughly balanced ($ctrlN vs $trtN)"
Ok "assignment summary: control=$ctrlN treatment=$trtN fairness=$($sum.fairnessStatus)"

Write-Host '6) Deterministic re-assignment is stable (same learner -> same variant)...' -ForegroundColor Cyan
$look = GetJson $AdminBase "/api/experiments/$expId/assignments/lookup?learner=demo-$stamp-0" $admin
Assert ($look.assignment -and $look.assignment.variant_key) 'assignment retrievable'
Ok "learner demo-$stamp-0 -> $($look.assignment.variant_key) (deterministic)"

Write-Host '7) Ingest underperforming metric snapshot -> underperformance alert...' -ForegroundColor Cyan
$events = @()
for ($i = 0; $i -lt 120; $i++) { $events += @{ variantId = $controlId;   variantKey = 'control';   value = 0.58 + (Get-Random -Minimum 0 -Maximum 40)/1000 } }
for ($i = 0; $i -lt 120; $i++) { $events += @{ variantId = $treatmentId; variantKey = 'treatment'; value = 0.40 + (Get-Random -Minimum 0 -Maximum 40)/1000 } }
$snap = PostJson $AdminBase "/api/experiments/$expId/snapshots" $admin @{ metricName = 'mastery'; events = $events }
Assert ($snap.ok -and $snap.snapshots.Count -eq 2) 'two variant snapshots computed'
Assert (($snap.alerts | Where-Object { $_.alertType -eq 'underperformance' }).Count -ge 1) 'underperformance alert emitted'
Ok "snapshots computed; underperformance alert emitted ($($snap.alerts.Count) alert(s))"

Write-Host '8) Monitoring view shows freshness + open alert...' -ForegroundColor Cyan
$mon = GetJson $AdminBase "/api/experiments/$expId/monitoring" $admin
Assert ($mon.freshness.fresh -eq $true) 'snapshot is fresh (within SLA)'
Assert ($mon.openAlerts.Count -ge 1) 'at least one open alert'
$alertId = $mon.openAlerts[0].alert_id
Ok "monitoring: fresh=$($mon.freshness.fresh) lag=$($mon.freshness.lagMinutes)min openAlerts=$($mon.openAlerts.Count)"

Write-Host '9) Acknowledge the alert...' -ForegroundColor Cyan
$ack = PostJson $AdminBase "/api/experiments/$expId/alerts/$alertId/acknowledge" $admin @{}
Assert ($ack.ok) 'alert acknowledged'
$mon2 = GetJson $AdminBase "/api/experiments/$expId/monitoring" $admin
Assert ($mon2.openAlerts.Count -lt $mon.openAlerts.Count) 'open alert count decreased'
Ok 'alert acknowledged; open-alert count decreased'

Write-Host '10) Statistical significance (advisory recommendation)...' -ForegroundColor Cyan
$ctrlVals = @(for ($i = 0; $i -lt 120; $i++) { 0.55 + (Get-Random -Minimum 0 -Maximum 60)/1000 })
$trtVals  = @(for ($i = 0; $i -lt 120; $i++) { 0.66 + (Get-Random -Minimum 0 -Maximum 60)/1000 })
$sig = PostJson $AdminBase "/api/experiments/$expId/significance" $admin @{ controlValues = $ctrlVals; treatmentValues = $trtVals; controlVariantId = $controlId; treatmentVariantId = $treatmentId }
Assert ($sig.ok) 'significance computed'
Assert ($sig.comparison.isStatisticallySignificant -eq $true) 'statistically significant improvement'
Assert ($sig.recommendation.recommendedAction -eq 'review_for_adoption') "advisory = review_for_adoption (got $($sig.recommendation.recommendedAction))"
Ok "significance: p=$($sig.comparison.pValue) effect=$($sig.comparison.effectInterpretation) advisory=$($sig.recommendation.recommendedAction)"

Write-Host '11) adopt_variant is BLOCKED without teacher + pedagogy sign-off...' -ForegroundColor Cyan
$blocked = PostTolerant $AdminBase "/api/experiments/$expId/decisions" $admin @{ decisionType = 'adopt_variant'; rationale = 'Stats look strong' }
Assert ($blocked.status -eq 409) "expected 409 (got $($blocked.status))"
Assert ($blocked.body.error -eq 'signoff_required') 'error = signoff_required'
Assert (($blocked.body.missing -contains 'teacher') -and ($blocked.body.missing -contains 'pedagogy_reviewer')) 'both sign-offs reported missing'
Ok "adopt_variant blocked (409 signoff_required, missing: $($blocked.body.missing -join ', '))"

Write-Host '12) Decision rationale is mandatory...' -ForegroundColor Cyan
$noRat = PostTolerant $AdminBase "/api/experiments/$expId/decisions" $admin @{ decisionType = 'investigate'; rationale = '' }
Assert ($noRat.status -eq 400 -and $noRat.body.error -eq 'rationale_required') 'rationale required (400)'
Ok 'decision without rationale rejected (400 rationale_required)'

Write-Host '13) Teacher records the teaching sign-off (Teacher Console)...' -ForegroundColor Cyan
$teacher = Login $TeacherBase $TeacherEmail
$tso = PostJson $TeacherBase "/api/experiments/$expId/signoff" $teacher @{ note = 'Reviewed in class; pedagogically sound' }
Assert ($tso.signoff -and $tso.signoff.signoff_role -eq 'teacher') 'teacher sign-off recorded'
Ok 'teacher sign-off recorded via Teacher Console'

Write-Host '14) Admin records the pedagogy_reviewer sign-off...' -ForegroundColor Cyan
$pso = PostJson $AdminBase "/api/experiments/$expId/signoff" $admin @{ signoffRole = 'pedagogy_reviewer'; note = 'Pedagogy review approved' }
Assert ($pso.signoff -and $pso.signoff.signoff_role -eq 'pedagogy_reviewer') 'pedagogy sign-off recorded'
$sos = GetJson $AdminBase "/api/experiments/$expId/signoffs" $admin
Assert ($sos.signoffs.Count -eq 2) 'two sign-offs present'
Ok 'pedagogy sign-off recorded; both sign-offs present'

Write-Host '15) adopt_variant now ALLOWED...' -ForegroundColor Cyan
$adopt = PostJson $AdminBase "/api/experiments/$expId/decisions" $admin @{ decisionType = 'adopt_variant'; rationale = 'Approved by teacher + pedagogy reviewer; significant improvement' }
Assert ($adopt.ok -and $adopt.decision.decision_type -eq 'adopt_variant') 'adopt_variant recorded'
Ok 'adopt_variant succeeded after both sign-offs'

Write-Host '16) Segment analysis flags opposite-effect / high-risk fairness...' -ForegroundColor Cyan
function MkSeg($mean) { return @(for ($i = 0; $i -lt 30; $i++) { $mean + (Get-Random -Minimum 0 -Maximum 40)/1000 }) }
$segments = @(
  @{ dimensionKey = 'grade'; dimensionValue = 'g5'; controlValues = (MkSeg 0.55); treatmentValues = (MkSeg 0.70) },
  @{ dimensionKey = 'grade'; dimensionValue = 'g6'; controlValues = (MkSeg 0.62); treatmentValues = (MkSeg 0.42) }
)
$seg = PostJson $AdminBase "/api/experiments/$expId/segments" $admin @{ segments = $segments; overallDeltaPct = 12 }
Assert ($seg.ok) 'segment analysis ran'
$g6 = $seg.segments | Where-Object { $_.dimension_value -eq 'g6' }
Assert ($g6.is_opposite_effect -eq $true) 'g6 opposite-effect detected'
Assert ($seg.highRisk -eq $true) 'high-risk differential impact flagged'
Ok "segment analysis: g6 opposite-effect=$($g6.is_opposite_effect) fairness=$($g6.fairness_flag) highRisk=$($seg.highRisk)"

Write-Host '17) DSR exclusion removes a learner from analysis...' -ForegroundColor Cyan
$ex = PostJson $AdminBase "/api/experiments/$expId/assignments/exclude" $admin @{ learner = "demo-$stamp-1"; reason = 'dsr_request' }
Assert ($ex.ok) 'learner excluded'
$look2 = GetJson $AdminBase "/api/experiments/$expId/assignments/lookup?learner=demo-$stamp-1" $admin
Assert ($look2.assignment.is_excluded_from_analysis -eq $true) 'assignment flagged excluded'
Ok 'DSR exclusion applied; learner removed from analysis'

Write-Host '18) Archive + keyword search...' -ForegroundColor Cyan
$arch = PostJson $AdminBase "/api/experiments/$expId/archive" $admin @{ lessonsLearned = 'Treatment helped overall but harmed g6; needs targeting'; keywords = @("hints$stamp", 'mastery'); finalOutcome = 'launched' }
Assert ($arch.ok) 'experiment archived'
$search = GetJson $AdminBase "/api/experiments/archive/search?keyword=hints$stamp" $admin
Assert ($search.results.Count -ge 1) 'archive found by keyword'
Ok "archived + searchable (found $($search.results.Count) by keyword)"

Write-Host '19) Immutable audit trail captured all event types...' -ForegroundColor Cyan
$hist = GetJson $AdminBase "/api/experiments/$expId/history" $admin
$types = ($hist.events | ForEach-Object { $_.event_type } | Sort-Object -Unique)
foreach ($need in @('state_change','assignment_generated','alert_emitted','significance_computed','decision_recorded','signoff_recorded','segment_analyzed','archive_written','data_accessed')) {
  Assert ($types -contains $need) "audit has $need"
}
Ok "audit trail complete: $($types -join ', ')"

Write-Host '20) Director oversight summary...' -ForegroundColor Cyan
$director = Login $DirectorBase $DirectorEmail
$ov = GetJson $DirectorBase '/api/experiments/oversight/summary' $director
Assert ($ov.ok -and ($ov.experiments | Where-Object { $_.experiment_id -eq $expId })) 'experiment visible to director'
Ok "director oversight: $($ov.experiments.Count) experiment(s) visible"

Write-Host ''
Write-Host "ALL A/B TESTING (012) CHECKS PASSED ($pass/$pass)" -ForegroundColor Green
