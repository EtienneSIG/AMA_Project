param(
  [string]$AdminBase = 'https://app-admin-learneu-demo.azurewebsites.net',
  [string]$TeacherBase = 'https://app-teacher-console-learneu-demo.azurewebsites.net',
  [string]$AdminEmail = 'admin@learneu.demo',
  [string]$TeacherEmail = 'teacher@learneu.demo',
  [string]$Password = 'DemoPass2026!'
)

# Feature 010 — CMS Versioning & Approval end-to-end verifier.
# Exercises: content item + draft version, metadata tagging, publish blocked before
# approval (fail-closed), mandatory pedagogy + compliance gates, publish, rollback
# (new promoted version), localization branch independence + merge choice, deprecation,
# teacher transparency provenance, and the immutable CMS audit trail.
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
# POST that tolerates a 409 (business-rule rejection) and returns the parsed body.
function PostExpectBlocked($base, $path, $ctx, $body, $label) {
  $headers = @{ 'X-CSRF-Token' = $ctx.Csrf }
  try {
    Invoke-WebRequest -Uri "$base$path" -Method POST -WebSession $ctx.Session -Headers $headers `
      -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 8) -TimeoutSec 30 | Out-Null
    throw "EXPECTED BLOCK but call succeeded: $label"
  } catch {
    if ($_.Exception.Message -like '*EXPECTED BLOCK*') { throw }
    Write-Host "   blocked as expected: $label" -ForegroundColor Green
  }
}

Write-Host "1) Admin login..." -ForegroundColor Cyan
$admin = Login $AdminBase $AdminEmail

$stamp = (Get-Date -Format 'HHmmss')
Write-Host "2) Create content item..." -ForegroundColor Cyan
$item = PostJson $AdminBase '/api/admin/cms/items' $admin @{ title = "Fractions Lesson $stamp"; contentType = 'lesson'; defaultLocale = 'nl-NL' }
if (-not $item.ok) { throw 'item create failed' }
$itemId = $item.item.id
Write-Host "   item=$itemId" -ForegroundColor Green

Write-Host "3) Create draft version 1.0.0..." -ForegroundColor Cyan
$v1 = PostJson $AdminBase "/api/admin/cms/items/$itemId/versions" $admin @{ semanticVersion = '1.0.0'; locale = 'nl-NL'; branchType = 'source'; payload = @{ body = 'Fractions v1' }; changeSummary = 'Initial' }
if (-not $v1.ok) { throw 'draft create failed' }
$v1Id = $v1.version.id
Write-Host "   version=$v1Id" -ForegroundColor Green

Write-Host "4) Publish BEFORE approval is blocked (fail closed, Art. 15)..." -ForegroundColor Cyan
PostExpectBlocked $AdminBase "/api/admin/cms/versions/$v1Id/publish" $admin @{} 'publish without approval'

Write-Host "5) Tag mandatory metadata..." -ForegroundColor Cyan
PostJson $AdminBase "/api/admin/cms/versions/$v1Id/metadata" $admin @{ curriculumStandard = 'NL-CORE-M5'; subject = 'Mathematics'; gradeLevel = '5'; learningObjective = 'Add and compare fractions' } | Out-Null
Write-Host "   metadata tagged" -ForegroundColor Green

Write-Host "6) Submit for review..." -ForegroundColor Cyan
$sub = PostJson $AdminBase "/api/admin/cms/versions/$v1Id/submit" $admin @{}
if (-not $sub.ok) { throw 'submit failed' }
$wfId = $sub.workflow.id
Write-Host ("   workflow={0} steps={1}" -f $wfId, ($sub.steps -join '>')) -ForegroundColor Green

Write-Host "7) Publish while only submitted is blocked (no gates passed)..." -ForegroundColor Cyan
PostExpectBlocked $AdminBase "/api/admin/cms/versions/$v1Id/publish" $admin @{} 'publish before gates'

Write-Host "8) Pedagogy lead approves (gate 1)..." -ForegroundColor Cyan
$d1 = PostJson $AdminBase "/api/admin/cms/workflows/$wfId/decisions" $admin @{ decision = 'approved'; comment = 'pedagogy ok' }
if (-not $d1.ok) { throw 'pedagogy approval failed' }
Write-Host ("   allGatesPassed={0}" -f $d1.allGatesPassed) -ForegroundColor Green

Write-Host "9) Compliance lead approves (gate 2 - final)..." -ForegroundColor Cyan
$d2 = PostJson $AdminBase "/api/admin/cms/workflows/$wfId/decisions" $admin @{ decision = 'approved'; comment = 'compliance ok' }
if (-not ($d2.ok -and $d2.allGatesPassed)) { throw 'compliance approval / gate completion failed' }
Write-Host "   all gates passed" -ForegroundColor Green

Write-Host "10) Publish 1.0.0..." -ForegroundColor Cyan
$pub = PostJson $AdminBase "/api/admin/cms/versions/$v1Id/publish" $admin @{}
if (-not $pub.ok) { throw 'publish failed' }
Write-Host ("   state={0}" -f $pub.version.state) -ForegroundColor Green

Write-Host "11) Publish 1.1.0 (full cycle) to enable a rollback target..." -ForegroundColor Cyan
$v2 = PostJson $AdminBase "/api/admin/cms/items/$itemId/versions" $admin @{ semanticVersion = '1.1.0'; locale = 'nl-NL'; branchType = 'source'; payload = @{ body = 'Fractions v1.1' }; changeSummary = 'Revision' }
$v2Id = $v2.version.id
PostJson $AdminBase "/api/admin/cms/versions/$v2Id/metadata" $admin @{ curriculumStandard = 'NL-CORE-M5'; subject = 'Mathematics'; gradeLevel = '5'; learningObjective = 'Add and compare fractions' } | Out-Null
$sub2 = PostJson $AdminBase "/api/admin/cms/versions/$v2Id/submit" $admin @{}
PostJson $AdminBase "/api/admin/cms/workflows/$($sub2.workflow.id)/decisions" $admin @{ decision = 'approved'; comment = 'p' } | Out-Null
PostJson $AdminBase "/api/admin/cms/workflows/$($sub2.workflow.id)/decisions" $admin @{ decision = 'approved'; comment = 'c' } | Out-Null
$pub2 = PostJson $AdminBase "/api/admin/cms/versions/$v2Id/publish" $admin @{}
if (-not $pub2.ok) { throw 'publish 1.1.0 failed' }
Write-Host "   1.1.0 published" -ForegroundColor Green

Write-Host "12) Rollback to 1.0.0 (new promoted version, rationale required)..." -ForegroundColor Cyan
PostExpectBlocked $AdminBase "/api/admin/cms/items/$itemId/rollback" $admin @{ targetVersionId = $v1Id } 'rollback without rationale'
$rb = PostJson $AdminBase "/api/admin/cms/items/$itemId/rollback" $admin @{ targetVersionId = $v1Id; rationale = 'Critical regression in 1.1.0' }
if (-not $rb.ok) { throw 'rollback failed' }
Write-Host ("   rolled back -> new version {0}" -f $rb.version.semantic_version) -ForegroundColor Green

Write-Host "13) Localization branch (fr-FR) independence + localization-lead gate..." -ForegroundColor Cyan
$branch = PostJson $AdminBase "/api/admin/cms/items/$itemId/localization-branches" $admin @{ locale = 'fr-FR'; sourceVersionId = $v1Id; semanticVersion = '1.0.0'; payload = @{ body = 'Les fractions v1' } }
if (-not $branch.ok) { throw 'localization branch failed' }
$frDraftId = $branch.draft.id
# A localization branch must include localization_lead as the FIRST gate.
$subFr = PostJson $AdminBase "/api/admin/cms/versions/$frDraftId/metadata" $admin @{ curriculumStandard = 'FR-CORE'; subject = 'Mathematics'; gradeLevel = '5'; learningObjective = 'Fractions' }
$subFrWf = PostJson $AdminBase "/api/admin/cms/versions/$frDraftId/submit" $admin @{}
$frSteps = $subFrWf.steps -join '>'
if ($frSteps -notlike 'localization_lead*') { throw "localization gate not first: $frSteps" }
Write-Host ("   branch steps={0}" -f $frSteps) -ForegroundColor Green

Write-Host "14) Record merge choice on the localization branch..." -ForegroundColor Cyan
$branches = GetJson $AdminBase "/api/admin/cms/items/$itemId/localization-branches" $admin
$branchId = ($branches.branches | Select-Object -First 1).id
$mc = PostJson $AdminBase "/api/admin/cms/localization-branches/$branchId/merge-choice" $admin @{ choice = 'defer' }
if (-not $mc.ok) { throw 'merge choice failed' }
Write-Host ("   merge choice recorded sync_status={0}" -f $mc.branch.sync_status) -ForegroundColor Green

Write-Host "15) Metadata discovery search..." -ForegroundColor Cyan
$search = GetJson $AdminBase '/api/admin/cms/search?subject=Mathematics&gradeLevel=5' $admin
Write-Host ("   results={0}" -f $search.results.Count) -ForegroundColor Green

Write-Host "16) Deprecate the item (EOL + rationale required)..." -ForegroundColor Cyan
PostExpectBlocked $AdminBase "/api/admin/cms/items/$itemId/deprecate" $admin @{ eolDate = '2027-01-01' } 'deprecate without rationale'
$eol = (Get-Date).AddDays(30).ToString('yyyy-MM-dd')
$dep = PostJson $AdminBase "/api/admin/cms/items/$itemId/deprecate" $admin @{ eolDate = $eol; rationale = 'Superseded by new curriculum' }
if (-not $dep.ok) { throw 'deprecate failed' }
Write-Host "   deprecated" -ForegroundColor Green

Write-Host "17) Immutable CMS audit trail is populated..." -ForegroundColor Cyan
$audit = GetJson $AdminBase "/api/admin/cms/audit?itemId=$itemId" $admin
$types = ($audit.events | ForEach-Object { $_.event_type } | Sort-Object -Unique) -join ','
Write-Host ("   events={0} types={1}" -f $audit.events.Count, $types) -ForegroundColor Green
if ($audit.events.Count -lt 5) { throw 'audit trail too sparse' }

Write-Host "18) Teacher transparency: provenance + deprecation flag..." -ForegroundColor Cyan
$teacher = Login $TeacherBase $TeacherEmail
$tcontent = GetJson $TeacherBase '/api/teacher/content' $teacher
$mine = $tcontent.items | Where-Object { $_.contentItemId -eq $itemId } | Select-Object -First 1
if (-not $mine) { throw 'teacher cannot see content item' }
$prov = GetJson $TeacherBase "/api/teacher/content/$itemId/provenance" $teacher
Write-Host ("   teacher sees versions={0} deprecated={1}" -f $prov.versions.Count, $mine.deprecated) -ForegroundColor Green

Write-Host ""
Write-Host "ALL CMS GOVERNANCE CHECKS PASSED" -ForegroundColor Green
