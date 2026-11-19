#Requires -Version 5.1
<#
.SYNOPSIS
  Build the Firefox (AMO-ready) package from the Chrome MV3 source tree.
.DESCRIPTION
  Copies the extension into packaging/dist-firefox, swaps in the Firefox-only
  stubs (sidebarAction, no-op audio capture), drops Chrome-only files and
  permissions, writes the derived manifest.json and zips the result.
  Run from the extension root:  powershell -ExecutionPolicy Bypass -File packaging/build-firefox.ps1
#>
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot   # extension root
$Dist = Join-Path $PSScriptRoot 'dist-firefox'

function Read-ManifestVersion {
  $m = Get-Content -LiteralPath (Join-Path $Root 'manifest.json') -Raw | ConvertFrom-Json
  return $m.version
}

# Quality gate (same rule as packaging/build.mjs): the unit suite must pass.
$unit = Get-ChildItem -LiteralPath (Join-Path $Root 'tests/unit') -Filter '*.test.mjs' -File | ForEach-Object { $_.FullName }
& node --test @unit
if ($LASTEXITCODE -ne 0) { throw 'unit tests failed: nothing packaged' }

# Fresh output dir
if (Test-Path -LiteralPath $Dist) { Remove-Item -LiteralPath $Dist -Recurse -Force }
New-Item -ItemType Directory -Path $Dist | Out-Null

# Copy tree, minus build tooling and unused files
$excludeDirs = @('packaging', 'docs', 'tests', 'tools', 'archive', '.git', '.gitignore', '.DS_Store', 'package.json', 'README.md', 'CHANGELOG.md')
$excludeFiles = @('offscreen.html', 'offscreen-audio.js', 'spotify.local.js')
Get-ChildItem -LiteralPath $Root -Force | ForEach-Object {
  $name = $_.Name
  if ($excludeDirs -contains $name) { return }
  if ($_.PSIsContainer) {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Dist $name) -Recurse -Force
  } elseif ($excludeFiles -notcontains $name) {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Dist $name) -Force
  }
}
# Drop the deprecated unused Spotify stub wherever it landed
Get-ChildItem -LiteralPath $Dist -Recurse -Filter 'spotify.local.js' -File |
  Remove-Item -Force -ErrorAction SilentlyContinue

# Never ship credentials: anyone can unzip an extension.
$secret = Get-ChildItem -LiteralPath $Dist -Recurse -File -Include '*.js', '*.mjs' |
  Select-String -Pattern 'export\s+const\s+(SPOTIFY_CLIENT_SECRET|SPOTIFY_REFRESH_TOKEN)\s*=\s*[''"`][^''"`]+[''"`]'
if ($secret) { throw ("credential in package: {0} (empty it before building)" -f $secret[0].Path) }
Get-ChildItem -LiteralPath $Dist -Recurse -Force -Filter '.DS_Store' -File | Remove-Item -Force -ErrorAction SilentlyContinue

# Firefox-only stubs (same module interface as the Chrome files)
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'firefox\stubs\panel-open.js') `
  -Destination (Join-Path $Dist 'lib\panel-open.js') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'firefox\stubs\tab-audio-capture.js') `
  -Destination (Join-Path $Dist 'lib\tab-audio-capture.js') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'firefox\background-firefox-loader.js') `
  -Destination (Join-Path $Dist 'background-firefox-loader.js') -Force

# Derived manifest
$manifestOut = Join-Path $Dist 'manifest.json'
& node (Join-Path $PSScriptRoot 'make-firefox-manifest.mjs') $manifestOut
if ($LASTEXITCODE -ne 0) { throw 'make-firefox-manifest.mjs failed' }

# Sanity: no Chrome-only API calls may ship to AMO (code patterns, not comments)
$forbidden = @('sidePanel\.', 'setPanelBehavior', 'tabCapture\.', 'getMediaStreamId', 'offscreen\.', 'createDocument', 'getContexts')
$hits = Get-ChildItem -LiteralPath $Dist -Recurse -File -Filter '*.js' |
  Select-String -Pattern ($forbidden -join '|') -CaseSensitive
if ($hits) {
  $hits | ForEach-Object { Write-Warning ("FORBIDDEN API REF: {0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim()) }
  throw 'Chrome-only API references found in Firefox package'
}

# Validate JSON + syntax
node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" $manifestOut
if ($LASTEXITCODE -ne 0) { throw 'manifest.json is not valid JSON' }
Get-ChildItem -LiteralPath $Dist -Recurse -File -Filter '*.js' | ForEach-Object {
  & node --check $_.FullName > $null 2>&1
  if ($LASTEXITCODE -ne 0) { throw "syntax error in $($_.FullName)" }
}

# Zip (AMO upload artifact)
$version = Read-ManifestVersion
$zip = Join-Path $PSScriptRoot ("auscultrix-{0}-firefox.zip" -f $version)
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $Dist '*') -DestinationPath $zip -Force

Write-Output ("Firefox package ready: {0}  (dir: dist-firefox)" -f $zip)
Write-Output 'Next: docs/pubblicare-firefox.md  (web-ext lint, then AMO submission)'
