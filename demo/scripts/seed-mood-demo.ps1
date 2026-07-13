# Seeds demo well-being data via the real learner check-in flow (POST /api/mood/checkin).
# No DB/Kudu access required — logs in as each demo student and records today's mood.
# Classes: CLS-7B=student2 | CLS-7A=student+student1 | CLS-8A=student3 | CLS-8B=student4,5 | CLS-7C=student6,7 | CLS-9A=student8
param(
  [string]$BaseUrl = 'https://app-teacher-console-learneu-demo.azurewebsites.net',
  [string]$Password = 'DemoPass2026!'
)

$checkins = @(
  @{ email = 'student2@learneu.demo'; mood = 'sad';    reason = 'classmate' }        # CLS-7B -> safeguarding flag
  @{ email = 'student@learneu.demo';  mood = 'sad';    reason = 'course_difficulty' } # CLS-7A cluster
  @{ email = 'student1@learneu.demo'; mood = 'sad';    reason = 'course_difficulty' } # CLS-7A cluster -> recommendation
  @{ email = 'student3@learneu.demo'; mood = 'medium'; reason = $null }               # CLS-8A
  @{ email = 'student4@learneu.demo'; mood = 'happy';  reason = $null }               # CLS-8B
  @{ email = 'student5@learneu.demo'; mood = 'sad';    reason = 'personal' }          # CLS-8B
  @{ email = 'student6@learneu.demo'; mood = 'happy';  reason = $null }               # CLS-7C
  @{ email = 'student7@learneu.demo'; mood = 'medium'; reason = $null }               # CLS-7C
  @{ email = 'student8@learneu.demo'; mood = 'sad';    reason = 'personal' }          # CLS-9A
)

foreach ($c in $checkins) {
  $loginBody = @{ email = $c.email; password = $Password } | ConvertTo-Json -Compress
  $login = Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType 'application/json' -SessionVariable sess -SkipHttpErrorCheck
  if ($login.StatusCode -ne 200) { Write-Host "LOGIN FAIL $($c.email): $($login.StatusCode)"; continue }

  $csrf = ($sess.Cookies.GetCookies($BaseUrl) | Where-Object Name -eq 'learneu_csrf').Value
  $headers = @{ 'Content-Type' = 'application/json' }
  if ($csrf) { $headers['x-csrf-token'] = $csrf }

  $payload = @{ mood = $c.mood }
  if ($c.reason) { $payload.reason = $c.reason }
  $body = $payload | ConvertTo-Json -Compress

  $r = Invoke-WebRequest "$BaseUrl/api/mood/checkin" -Method Post -Body $body -Headers $headers -WebSession $sess -SkipHttpErrorCheck
  Write-Host "CHECKIN $($c.email) [$($c.mood)/$($c.reason)] -> $($r.StatusCode) $($r.Content)"
}
