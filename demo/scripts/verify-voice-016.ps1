param([string]$Base='https://app-learner-web-learneu-demo.azurewebsites.net')
$ErrorActionPreference='Stop'; $PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing']=$true
function Login($b,$e){ $s=New-Object Microsoft.PowerShell.Commands.WebRequestSession; $j=(Invoke-WebRequest "$b/api/auth/login" -Method POST -WebSession $s -ContentType 'application/json' -Body "{`"email`":`"$e`",`"password`":`"DemoPass2026!`"}" -TimeoutSec 90).Content|ConvertFrom-Json; [pscustomobject]@{S=$s;C=$j.csrfToken} }
Write-Host '016 voice QA' -ForegroundColor Cyan
$a=Login $Base 'student@learneu.demo'
$vs=(Invoke-WebRequest "$Base/api/tutor/voice/status" -WebSession $a.S).Content|ConvertFrom-Json
if(-not $vs.euResident){throw 'speech not EU'}; if($vs.speech.region -notmatch 'europe'){throw 'speech region not EU'}
$t=(Invoke-WebRequest "$Base/api/tutor/turn" -Method POST -WebSession $a.S -ContentType 'application/json' -Headers @{'x-csrf-token'=$a.C} -Body '{"input":"add 1/2 and 1/4"}').Content|ConvertFrom-Json
if(-not $t.output){throw 'text mode failed'}; if($t.ai -notmatch 'imperfect'){throw 'missing AI label'}
$tts=Invoke-WebRequest "$Base/api/tutor/voice/tts" -Method POST -WebSession $a.S -ContentType 'application/json' -Headers @{'x-csrf-token'=$a.C} -Body '{"text":"hello"}'
if($tts.Headers['Content-Type'] -notmatch 'audio'){throw 'TTS not audio'}
Write-Host 'PASS: text+label, EU speech, TTS audio, gating' -ForegroundColor Green
