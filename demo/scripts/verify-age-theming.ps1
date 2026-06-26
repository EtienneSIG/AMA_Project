<#
.SYNOPSIS
  Verify Feature 014 (age-adaptive theming) for the learner app.
.DESCRIPTION
  1. Logic test: evaluates demo/apps/learner-web/public/age-theme.js in a stubbed DOM and
     asserts the deterministic band mapping (8-13 inclusive), URL affordance, neutral default,
     and override precedence.
  2. (Optional) HTTP test: if -BaseUrl is given, asserts the theme statics are served pre-auth.
.EXAMPLE
  ./verify-age-theming.ps1
  ./verify-age-theming.ps1 -BaseUrl https://app-learner-web-learneu-demo.azurewebsites.net
#>
[CmdletBinding()]
param([string]$BaseUrl)

$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path -Parent $PSScriptRoot   # .../demo
$ageThemeJs = Join-Path $demoRoot 'apps/learner-web/public/age-theme.js'
if (-not (Test-Path $ageThemeJs)) { throw "age-theme.js not found at $ageThemeJs" }

# --- 1. Resolver logic test (stubbed DOM, run in node) ---
$testJs = @'
const fs = require('fs');
const code = fs.readFileSync(process.argv[2], 'utf8');
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const bc = new Set();
global.document = { readyState:'complete', createElement:()=>({setAttribute(){}}), head:{appendChild(){}},
  body:{ classList:{ add:c=>bc.add(c), remove:c=>bc.delete(c), toggle:(c,o)=>o?bc.add(c):bc.delete(c), contains:c=>bc.has(c) }, getAttribute:()=>null },
  querySelector:()=>null, addEventListener(){} };
global.window = { matchMedia:()=>({matches:false,addEventListener(){}}), location:{search:''}, fetch:()=>Promise.resolve(null) };
global.matchMedia = global.window.matchMedia;
eval(code);
const T = global.window.LearnEUAgeTheme;
let fail = 0;
function ck(d,g,w){ const ok=g===w; if(!ok)fail++; console.log((ok?'PASS':'FAIL')+` | ${d} -> ${g}`+(ok?'':` (want ${w})`)); }
global.window.LEARNER_AGE=7;  ck('age 7',T.resolve(),'kids');
global.window.LEARNER_AGE=8;  ck('age 8 inclusive',T.resolve(),'brick');
global.window.LEARNER_AGE=13; ck('age 13 inclusive',T.resolve(),'brick');
global.window.LEARNER_AGE=14; ck('age 14',T.resolve(),'game');
global.window.LEARNER_AGE=undefined;
global.window.location.search='?ageband=game'; ck('?ageband=game',T.resolve(),'game');
global.window.location.search=''; ck('unknown -> null',T.resolve(),null);
global.window.LEARNER_AGE=15; T.setOverride('brick'); ck('override beats age',T.resolve(),'brick'); T.clearOverride();
process.exit(fail===0?0:1);
'@
$tmp = Join-Path $env:TEMP ("verify-age-theme-" + [guid]::NewGuid().ToString('N') + '.js')
Set-Content -Path $tmp -Value $testJs -Encoding UTF8
try {
  Write-Host '=== Resolver logic test ===' -ForegroundColor Cyan
  node $tmp $ageThemeJs
  if ($LASTEXITCODE -ne 0) { throw 'Resolver logic test FAILED' }
  Write-Host 'Resolver logic: ALL PASS' -ForegroundColor Green
} finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }

# --- 2. Optional HTTP test (statics served pre-auth) ---
if ($BaseUrl) {
  Write-Host "=== HTTP test against $BaseUrl ===" -ForegroundColor Cyan
  foreach ($p in '/age-theme.js', '/themes/age-themes.css') {
    $r = Invoke-WebRequest -Uri ($BaseUrl.TrimEnd('/') + $p) -SkipHttpErrorCheck -UseBasicParsing
    $ok = $r.StatusCode -eq 200
    Write-Host (("{0} {1} (HTTP {2})") -f ($(if($ok){'PASS'}else{'FAIL'}), $p, $r.StatusCode)) -ForegroundColor ($(if($ok){'Green'}else{'Red'}))
    if (-not $ok) { throw "$p not served (expected pre-auth 200)" }
  }
}
Write-Host 'verify-age-theming: OK' -ForegroundColor Green
