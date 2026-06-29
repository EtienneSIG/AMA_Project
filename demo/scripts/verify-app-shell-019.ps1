param()
$ErrorActionPreference='Stop'; $PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing']=$true
# 019 app-shell: verify the three-column shell assets serve on every app (client-side render, no broken deep links).
$apps=@(
  'https://app-learner-web-learneu-demo.azurewebsites.net',
  'https://app-parent-portal-learneu-demo.azurewebsites.net',
  'https://app-teacher-console-learneu-demo.azurewebsites.net',
  'https://app-admin-learneu-demo.azurewebsites.net',
  'https://app-director-portal-learneu-demo.azurewebsites.net')
foreach($b in $apps){
  $js=Invoke-WebRequest "$b/shell/shell.js" -TimeoutSec 60; $css=Invoke-WebRequest "$b/shell/shell.css" -TimeoutSec 60
  if($js.StatusCode -ne 200 -or $css.StatusCode -ne 200){throw "shell assets missing on $b"}
  Write-Host "PASS shell on $b" -ForegroundColor Green
}
Write-Host '019 app-shell render assets OK on all five apps' -ForegroundColor Green
