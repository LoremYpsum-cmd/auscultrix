#Requires -Version 5.1
<#
.SYNOPSIS
  Build the Chrome Web Store upload zip from the source tree.
.DESCRIPTION
  Copies the extension into packaging/dist-chrome (excluding build tooling
  and the unused deprecated stub), validates JSON + JS syntax and zips it.
  Run from the extension root:  powershell -ExecutionPolicy Bypass -File packaging/build-chrome.ps1
#>
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $PSScriptRoot 'dist-chrome'

function Read-ManifestVersion {
  $m = Get-Content -LiteralPath (Join-Path $Root 'manifest.json') -Raw | ConvertFrom-Json
  return $m.version
}

# Quality gate (same rule as packaging/build.mjs): the unit suite must pass.
$unit = Get-ChildItem -LiteralPath (Join-Path $Root 'tests/unit') -Filter '*.test.mjs' -File | ForEach-Object { $_.FullName }
& node --test @unit
if ($LASTEXITCODE -ne 0) { throw 'unit tests failed: nothing packaged' }

if (Test-Path -LiteralPath $Dist) { Remove-Item -LiteralPath $Dist -Recurse -Force }
New-Item -ItemType Directory -Path $Dist | Out-Null

$excludeDirs = @('packaging', 'docs', 'tests', 'tools', 'archive', '.git', '.gitignore', '.DS_Store', 'package.json', 'README.md', 'CHANGELOG.md')
Get-ChildItem -LiteralPath $Root -Force | ForEach-Object {
  $name = $_.Name
  if ($excludeDirs -contains $name) { return }
  if ($_.PSIsContainer) {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Dist $name) -Recurse -Force
  } else {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Dist $name) -Force
  }
}
Get-ChildItem -LiteralPath $Dist -Recurse -Filter 'spotify.local.js' -File |
  Remove-Item -Force -ErrorAction SilentlyContinue

# Never ship credentials: anyone can unzip an extension.
$secret = Get-ChildItem -LiteralPath $Dist -Recurse -File -Include '*.js', '*.mjs' |
  Select-String -Pattern 'export\s+const\s+(SPOTIFY_CLIENT_SECRET|SPOTIFY_REFRESH_TOKEN)\s*=\s*[''"`][^''"`]+[''"`]'
if ($secret) { throw ("credential in package: {0} (empty it before building)" -f $secret[0].Path) }
Get-ChildItem -LiteralPath $Dist -Recurse -Force -Filter '.DS_Store' -File | Remove-Item -Force -ErrorAction SilentlyContinue

node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" (Join-Path $Dist 'manifest.json')
if ($LASTEXITCODE -ne 0) { throw 'manifest.json is not valid JSON' }
Get-ChildItem -LiteralPath $Dist -Recurse -File -Filter '*.js' | ForEach-Object {
  & node --check $_.FullName > $null 2>&1
  if ($LASTEXITCODE -ne 0) { throw "syntax error in $($_.FullName)" }
}

$version = Read-ManifestVersion
$zip = Join-Path $PSScriptRoot ("auscultrix-{0}-chrome.zip" -f $version)
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $Dist '*') -DestinationPath $zip -Force

Write-Output ("Chrome package ready: {0}  (dir: dist-chrome)" -f $zip)
Write-Output 'Next: docs/pubblicare-chrome.md (Developer Dashboard upload)'
