function Login($app,$email){
  $sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $body = @{ email=$email; password='DemoPass2026!' } | ConvertTo-Json
  try { $r = Invoke-WebRequest -Uri "https://$app.azurewebsites.net/api/auth/login" -Method POST -ContentType 'application/json' -Body $body -WebSession $sess -UseBasicParsing -TimeoutSec 60 } catch { return $null }
  if($r.StatusCode -ne 200){ return $null }
  return $sess
}
function GetJ($app,$sess,$path){
  try { return Invoke-RestMethod -Uri "https://$app.azurewebsites.net$path" -WebSession $sess -TimeoutSec 60 } catch { return $null }
}
$LW='app-learner-web-learneu-demo'; $TC='app-teacher-console-learneu-demo'; $PP='app-parent-portal-learneu-demo'

"== STUDENTS =="
foreach($e in 'student1@learneu.demo','student2@learneu.demo','student3@learneu.demo','student5@learneu.demo','student7@learneu.demo','student8@learneu.demo'){
  $s = Login $LW $e
  if(-not $s){ "[$e] LOGIN FAIL"; continue }
  $m = GetJ $LW $s '/api/learner/mastery'
  $st = GetJ $LW $s '/api/learner/streak'
  $sh = GetJ $LW $s '/api/sheets'
  $mc = if($m -and $m.rows){ @($m.rows).Count } else { 0 }
  $shc = if($sh -and $sh.sheets){ @($sh.sheets).Count } else { 0 }
  "[$e] mastery_rows=$mc streak=$($st.streak) attempts=$($st.attempts) sheets=$shc store=$($sh.store)"
}

"== TEACHERS =="
foreach($e in 'teacher@learneu.demo','teacher1@learneu.demo','teacher2@learneu.demo'){
  $s = Login $TC $e
  if(-not $s){ "[$e] LOGIN FAIL"; continue }
  $hm = GetJ $TC $s '/api/teacher/class/heatmap'
  $ib = GetJ $TC $s '/api/teacher-questions/inbox'
  $hc = if($hm -and $hm.learners){ @($hm.learners).Count } else { 0 }
  $tot = if($ib -and $ib.rows){ @($ib.rows).Count } else { 0 }
  $pend = if($ib -and $ib.rows){ @($ib.rows | Where-Object { $_.status -ne 'answered' }).Count } else { 0 }
  "[$e] heatmap.learners=$hc inbox=$tot pending=$pend"
}

"== PARENTS =="
foreach($e in 'parent@learneu.demo','parent1@learneu.demo','parent3@learneu.demo','parent4@learneu.demo'){
  $s = Login $PP $e
  if(-not $s){ "[$e] LOGIN FAIL"; continue }
  $ch = GetJ $PP $s '/api/parent/children'
  $kids = if($ch -and $ch.children){ @($ch.children) } else { @() }
  $cc = $kids.Count
  $names = ($kids | ForEach-Object { $_.childEmail }) -join ','
  "[$e] children=$cc [$names]"
}
