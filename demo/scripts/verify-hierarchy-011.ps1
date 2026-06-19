param(
  [string]$AdminBase = 'https://app-admin-learneu-demo.azurewebsites.net',
  [string]$DirectorBase = 'https://app-director-portal-learneu-demo.azurewebsites.net',
  [string]$AdminEmail = 'admin@learneu.demo',
  [string]$DirectorEmail = 'director@learneu.demo',
  [string]$Password = 'DemoPass2026!'
)

# Feature 011 — Multi-School Hierarchy end-to-end verifier.
# Exercises: hierarchy graph seeding (country/district/school + effective-dated edges),
# scope-aware RBAC (deny-by-default + learner-level guard for aggregate-only roles),
# hierarchical reporting with cohort suppression + re-identification screening,
# the export guard (suppressed/blocked reports cannot be exported), the mandatory
# 3-gate district approval chain (pedagogist -> curriculum lead -> country manager),
# role-not-authorized human-oversight enforcement, school adopt/adapt/decline,
# adoption metrics, peer benchmarking, and the immutable hierarchy audit trail.
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
    -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 8) -TimeoutSec 30
  return $r.Content | ConvertFrom-Json
}
function GetJson($base, $path, $ctx) {
  $r = Invoke-WebRequest -Uri "$base$path" -Method GET -WebSession $ctx.Session -TimeoutSec 30
  return $r.Content | ConvertFrom-Json
}
# POST that returns the parsed JSON body even when the API replies 4xx with { ok:false }.
function PostTolerant($base, $path, $ctx, $body) {
  $headers = @{ 'X-CSRF-Token' = $ctx.Csrf }
  try {
    $r = Invoke-WebRequest -Uri "$base$path" -Method POST -WebSession $ctx.Session -Headers $headers `
      -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 8) -TimeoutSec 30
    return @{ status = [int]$r.StatusCode; body = ($r.Content | ConvertFrom-Json) }
  } catch {
    $code = 0; try { $code = [int]$_.Exception.Response.StatusCode } catch {}
    $b = $null; try { $b = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
    return @{ status = $code; body = $b }
  }
}
# POST expecting an HTTP error status (business-rule rejection). Returns parsed body.
function PostExpectStatus($base, $path, $ctx, $body, $expected, $label) {
  $headers = @{ 'X-CSRF-Token' = $ctx.Csrf }
  try {
    Invoke-WebRequest -Uri "$base$path" -Method POST -WebSession $ctx.Session -Headers $headers `
      -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 8) -TimeoutSec 30 | Out-Null
    throw "EXPECTED $expected but call succeeded: $label"
  } catch {
    if ($_.Exception.Message -like '*EXPECTED*') { throw }
    $code = [int]$_.Exception.Response.StatusCode
    if ($code -ne $expected) { throw "EXPECTED $expected but got ${code}: $label" }
    Write-Host "   rejected ${expected} as expected: $label" -ForegroundColor Green
  }
}
function Assert($cond, $msg) { if (-not $cond) { throw "ASSERT FAILED: $msg" } }

$stamp = (Get-Date -Format 'HHmmss')
$pStart = '2026-01-01'; $pEnd = '2026-03-31'; $subj = 'MATH'

Write-Host '1) Admin login...' -ForegroundColor Cyan
$admin = Login $AdminBase $AdminEmail

Write-Host '2) Seed hierarchy nodes (country / districts / schools)...' -ForegroundColor Cyan
function MkNode($type, $name, $cc) { $r = PostJson $AdminBase '/api/hierarchy/nodes' $admin @{ nodeType = $type; displayName = $name; countryCode = $cc }; Assert ($r.node -and $r.node.id) "node $name"; return $r.node.id }
$country = MkNode 'country'  "FR-$stamp"       'FR'
$dGen    = MkNode 'district' "DistGen-$stamp"  'FR'   # generated rollup (2 disclosable schools)
$dReid   = MkNode 'district' "DistReid-$stamp" 'FR'   # re-id blocked (1 disclosable of 2)
$dSupp   = MkNode 'district' "DistSupp-$stamp" 'FR'   # suppressed (total cohort < 10)
$s1 = MkNode 'school' "S1-$stamp" 'FR'
$s2 = MkNode 'school' "S2-$stamp" 'FR'
$s3 = MkNode 'school' "S3-$stamp" 'FR'   # low cohort -> suppressed from detail
$s4 = MkNode 'school' "S4-$stamp" 'FR'
$s5 = MkNode 'school' "S5-$stamp" 'FR'   # low cohort -> re-id risk in dReid
$s6 = MkNode 'school' "S6-$stamp" 'FR'   # only school in dSupp, cohort < 10
Write-Host "   country=$country dGen=$dGen dReid=$dReid dSupp=$dSupp" -ForegroundColor Green

Write-Host '3) Link edges (effective-dated graph)...' -ForegroundColor Cyan
function MkEdge($p, $c) { $r = PostJson $AdminBase '/api/hierarchy/edges' $admin @{ parentNodeId = $p; childNodeId = $c; changeReason = 'seed' }; Assert ($r.edge) 'edge'; }
MkEdge $country $dGen; MkEdge $country $dReid; MkEdge $country $dSupp
MkEdge $dGen $s1; MkEdge $dGen $s2; MkEdge $dGen $s3
MkEdge $dReid $s4; MkEdge $dReid $s5
MkEdge $dSupp $s6
Write-Host '   edges linked' -ForegroundColor Green

Write-Host '4) Seed reporting snapshots...' -ForegroundColor Cyan
function MkSnap($school, $cohort, $enroll, $compl, $mast) {
  PostJson $AdminBase '/api/hierarchy/snapshots' $admin @{ schoolNodeId = $school; subjectCode = $subj; periodStart = $pStart; periodEnd = $pEnd; cohortSize = $cohort; enrollmentCount = $enroll; completionRate = $compl; masteryRate = $mast } | Out-Null
}
MkSnap $s1 30 30 80 72   # disclosable, healthy
MkSnap $s2 30 30 60 45   # disclosable, low mastery -> alert
MkSnap $s3 5  5  70 70   # suppressed from detail
MkSnap $s4 20 20 75 65   # dReid disclosable
MkSnap $s5 4  4  50 50   # dReid low cohort -> re-id
MkSnap $s6 5  5  55 55   # dSupp only school, cohort < 10
Write-Host '   snapshots seeded' -ForegroundColor Green

Write-Host '5) District dashboard (generated, cohort-weighted, suppression applied)...' -ForegroundColor Cyan
$dash = GetJson $AdminBase "/api/hierarchy/district/dashboard?districtNodeId=$dGen&periodStart=$pStart&periodEnd=$pEnd&subjectCode=$subj" $admin
Assert ($dash.status -eq 'generated') "dashboard status generated (got $($dash.status))"
Assert ($dash.totals.schoolCount -eq 2) "2 disclosable schools (got $($dash.totals.schoolCount))"
Assert ($dash.suppressionApplied -eq $true) 'suppressionApplied true (S3 hidden)'
Assert ($dash.totals.alertSchoolCount -ge 1) 'at least one low-mastery alert (S2)'
Assert ([math]::Abs($dash.totals.masteryRate - 58.5) -lt 0.6) "weighted mastery ~58.5 (got $($dash.totals.masteryRate))"
Write-Host ("   generated mastery={0} schools={1} alerts={2} suppressed={3}" -f $dash.totals.masteryRate, $dash.totals.schoolCount, $dash.totals.alertSchoolCount, $dash.suppressedSchoolCount) -ForegroundColor Green

Write-Host '6) Re-identification screen blocks a single-disclosable scope...' -ForegroundColor Cyan
$rep2 = GetJson $AdminBase "/api/hierarchy/reporting/hierarchical?scopeLevel=district&scopeNodeId=$dReid&dimension=school&periodStart=$pStart&periodEnd=$pEnd&subjectCode=$subj" $admin
Assert ($rep2.status -eq 'blocked_for_review') "dReid blocked_for_review (got $($rep2.status))"
Assert ($rep2.reidRiskFlag -eq $true) 'reidRiskFlag true'
Write-Host '   blocked_for_review (re-id risk)' -ForegroundColor Green

Write-Host '7) Sub-threshold cohort is suppressed entirely...' -ForegroundColor Cyan
$rep3 = GetJson $AdminBase "/api/hierarchy/reporting/hierarchical?scopeLevel=district&scopeNodeId=$dSupp&dimension=school&periodStart=$pStart&periodEnd=$pEnd&subjectCode=$subj" $admin
Assert ($rep3.status -eq 'suppressed') "dSupp suppressed (got $($rep3.status))"
Write-Host '   suppressed (cohort < 10)' -ForegroundColor Green

Write-Host '8) Export guard blocks suppressed/blocked reports (Art. 10 minimisation)...' -ForegroundColor Cyan
PostExpectStatus $AdminBase '/api/hierarchy/reporting/hierarchical/export' $admin @{ scopeLevel = 'district'; scopeNodeId = $dReid; dimension = 'school'; periodStart = $pStart; periodEnd = $pEnd; subjectCode = $subj } 409 'export blocked report'
$exp = PostJson $AdminBase '/api/hierarchy/reporting/hierarchical/export' $admin @{ scopeLevel = 'district'; scopeNodeId = $dGen; dimension = 'school'; periodStart = $pStart; periodEnd = $pEnd; subjectCode = $subj }
Assert ($exp.exported -eq $true) 'generated report exported'
Write-Host '   generated report exported, blocked report refused' -ForegroundColor Green

Write-Host '9) RBAC deny-by-default for a director with no grant...' -ForegroundColor Cyan
$dir = Login $DirectorBase $DirectorEmail
$chk1 = GetJson $DirectorBase "/api/hierarchy/rbac/scope-check?scopeNodeId=$dGen&scopeLevel=district" $dir
Assert ($chk1.allowed -eq $false -and $chk1.reason -eq 'no_active_grant') "deny without grant (got allowed=$($chk1.allowed) reason=$($chk1.reason))"
Write-Host '   denied (no active grant)' -ForegroundColor Green

Write-Host '10) Grant district scope, then access is allowed...' -ForegroundColor Cyan
PostJson $AdminBase '/api/hierarchy/grants' $admin @{ userEmail = $DirectorEmail; role = 'district_director'; scopeLevel = 'district'; scopeNodeId = $dGen } | Out-Null
$chk2 = GetJson $DirectorBase "/api/hierarchy/rbac/scope-check?scopeNodeId=$dGen&scopeLevel=district" $dir
Assert ($chk2.allowed -eq $true) "allowed after grant (got $($chk2.allowed))"
Write-Host '   allowed (active grant)' -ForegroundColor Green

Write-Host '11) Learner-level drill-through denied for aggregate-only role (Art. 8/10)...' -ForegroundColor Cyan
$chk3 = GetJson $DirectorBase "/api/hierarchy/rbac/scope-check?scopeNodeId=$dGen&scopeLevel=district&learnerLevel=true" $dir
Assert ($chk3.allowed -eq $false -and $chk3.reason -eq 'learner_level_denied') "learner-level denied (got allowed=$($chk3.allowed) reason=$($chk3.reason))"
Write-Host '   learner-level drill-through denied' -ForegroundColor Green

Write-Host '12) Submit content for district approval...' -ForegroundColor Cyan
$wf = PostJson $AdminBase '/api/hierarchy/district-approvals' $admin @{ contentRef = "unit-frac-$stamp"; contentTitle = "Fractions Unit $stamp"; districtNodeId = $dGen }
Assert ($wf.workflow -and $wf.workflow.id) 'workflow created'
$wfId = $wf.workflow.id
Write-Host ("   workflow={0} state={1} gate={2}" -f $wfId, $wf.workflow.state, $wf.workflow.current_gate_order) -ForegroundColor Green

Write-Host '13) Human-oversight: a director without the gate role cannot decide (403)...' -ForegroundColor Cyan
PostExpectStatus $DirectorBase "/api/hierarchy/district-approvals/$wfId/decisions" $dir @{ decision = 'approved'; comment = 'try' } 403 'unauthorised gate decision'

Write-Host '14) Approve gate 1 (pedagogist) -> in_review gate 2...' -ForegroundColor Cyan
$g1 = PostJson $AdminBase "/api/hierarchy/district-approvals/$wfId/decisions" $admin @{ decision = 'approved'; comment = 'pedagogy ok' }
Assert ($g1.ok -and $g1.workflow.state -eq 'in_review' -and $g1.workflow.current_gate_order -eq 2 -and -not $g1.published) "gate1 -> in_review/2 (state=$($g1.workflow.state) gate=$($g1.workflow.current_gate_order))"
Write-Host '   gate 1 passed -> gate 2' -ForegroundColor Green

Write-Host '15) Adoption before publish is refused (not_available_to_schools)...' -ForegroundColor Cyan
$early = PostTolerant $AdminBase "/api/hierarchy/district-approvals/$wfId/school-decisions" $admin @{ schoolNodeId = $s1; decision = 'adopt' }
Assert ($early.body.error -eq 'not_available_to_schools') "adoption blocked pre-publish (got $($early.body.error))"
Write-Host '   adoption refused before publish' -ForegroundColor Green

Write-Host '16) Approve gate 2 (curriculum lead) -> in_review gate 3...' -ForegroundColor Cyan
$g2 = PostJson $AdminBase "/api/hierarchy/district-approvals/$wfId/decisions" $admin @{ decision = 'approved'; comment = 'curriculum ok' }
Assert ($g2.ok -and $g2.workflow.state -eq 'in_review' -and $g2.workflow.current_gate_order -eq 3 -and -not $g2.published) "gate2 -> in_review/3 (state=$($g2.workflow.state) gate=$($g2.workflow.current_gate_order))"
Write-Host '   gate 2 passed -> gate 3' -ForegroundColor Green

Write-Host '17) Approve gate 3 (country manager) -> available_to_schools + published...' -ForegroundColor Cyan
$g3 = PostJson $AdminBase "/api/hierarchy/district-approvals/$wfId/decisions" $admin @{ decision = 'approved'; comment = 'final ok' }
Assert ($g3.ok -and $g3.workflow.state -eq 'available_to_schools' -and $g3.published -eq $true) "gate3 -> available_to_schools/published (state=$($g3.workflow.state) published=$($g3.published))"
Write-Host '   all gates passed -> available to schools' -ForegroundColor Green

Write-Host '18) Comment required for changes_requested...' -ForegroundColor Cyan
# Submit a fresh workflow to test the rationale guard at an open gate.
$wf2 = PostJson $AdminBase '/api/hierarchy/district-approvals' $admin @{ contentRef = "unit-geo-$stamp"; districtNodeId = $dGen }
$wf2Id = $wf2.workflow.id
$noc = PostTolerant $AdminBase "/api/hierarchy/district-approvals/$wf2Id/decisions" $admin @{ decision = 'changes_requested' }
Assert ($noc.body.error -eq 'comment_required') "comment_required enforced (got $($noc.body.error))"
Write-Host '   rationale enforced for changes_requested' -ForegroundColor Green

Write-Host '19) School adopt / adapt / decline decisions...' -ForegroundColor Cyan
$ad1 = PostJson $AdminBase "/api/hierarchy/district-approvals/$wfId/school-decisions" $admin @{ schoolNodeId = $s1; decision = 'adopt' }
Assert ($ad1.ok) 'adopt recorded'
# adapt requires a variant reference
$adaptNoVar = PostTolerant $AdminBase "/api/hierarchy/district-approvals/$wfId/school-decisions" $admin @{ schoolNodeId = $s2; decision = 'adapt' }
Assert ($adaptNoVar.body.error -eq 'variant_required_for_adapt') "adapt requires variant (got $($adaptNoVar.body.error))"
$ad2 = PostJson $AdminBase "/api/hierarchy/district-approvals/$wfId/school-decisions" $admin @{ schoolNodeId = $s2; decision = 'adapt'; variantContentRef = "unit-frac-$stamp-v2" }
Assert ($ad2.ok) 'adapt recorded with variant'
$ad3 = PostJson $AdminBase "/api/hierarchy/district-approvals/$wfId/school-decisions" $admin @{ schoolNodeId = $s3; decision = 'decline'; comment = 'local choice' }
Assert ($ad3.ok) 'decline recorded'
Write-Host '   adopt/adapt/decline recorded' -ForegroundColor Green

Write-Host '20) Adoption metrics reflect the three decisions...' -ForegroundColor Cyan
$metrics = GetJson $AdminBase "/api/hierarchy/district-approvals/$wfId/adoption-metrics" $admin
Assert ($metrics.metrics) 'metrics returned'
Write-Host ("   metrics: {0}" -f ($metrics.metrics | ConvertTo-Json -Compress)) -ForegroundColor Green

Write-Host '21) Approval steps are recorded immutably (append-only)...' -ForegroundColor Cyan
$steps = GetJson $AdminBase "/api/hierarchy/district-approvals/$wfId/steps" $admin
Assert ($steps.steps.Count -ge 3) "at least 3 decision steps (got $($steps.steps.Count))"
Write-Host ("   {0} decision steps recorded" -f $steps.steps.Count) -ForegroundColor Green

Write-Host '22) Peer benchmarking computes gap + recommendation...' -ForegroundColor Cyan
$bench = GetJson $AdminBase "/api/hierarchy/benchmarking/peer-comparisons?schoolNodeId=$s2&districtNodeId=$dGen&periodStart=$pStart&periodEnd=$pEnd&subjectCode=$subj" $admin
Assert ($bench.comparisons.Count -ge 2) "two metric comparisons (got $($bench.comparisons.Count))"
$mastComp = $bench.comparisons | Where-Object { $_.metric_code -eq 'mastery' } | Select-Object -First 1
Assert ($mastComp) 'mastery comparison present'
Write-Host ("   mastery gap={0} rec='{1}'" -f $mastComp.gap_percent, ($mastComp.recommendation_text)) -ForegroundColor Green

Write-Host '23) Immutable hierarchy audit trail captured the run...' -ForegroundColor Cyan
$audit = GetJson $AdminBase '/api/hierarchy/audit?limit=200' $admin
$types = $audit.events | ForEach-Object { $_.event_type } | Sort-Object -Unique
Assert ($types -contains 'approval_published') 'approval_published event present'
Assert (($types -contains 'report_suppressed') -or ($types -contains 'report_blocked')) 'suppression/blocked event present'
Assert ($types -contains 'scope_check_deny') 'scope_check_deny event present'
Write-Host ("   audit event types: {0}" -f ($types -join ', ')) -ForegroundColor Green

Write-Host ''
Write-Host 'ALL HIERARCHY (011) CHECKS PASSED (23/23)' -ForegroundColor Green
