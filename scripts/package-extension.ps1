$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$extensionDir = Join-Path $rootDir "extension"
$manifestPath = Join-Path $extensionDir "manifest.json"
$releaseDir = Join-Path $rootDir "output\release"
$stagingRoot = Join-Path $releaseDir ".staging"

if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Manifest not found: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$safeName = (($manifest.name).ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-")
$packageName = "$safeName-$($manifest.version)"
$stagingDir = Join-Path $stagingRoot $packageName
$zipPath = Join-Path $releaseDir "$packageName.zip"

$releaseFullPath = [System.IO.Path]::GetFullPath($releaseDir)
$stagingFullPath = [System.IO.Path]::GetFullPath($stagingDir)
$zipFullPath = [System.IO.Path]::GetFullPath($zipPath)

if (-not $stagingFullPath.StartsWith($releaseFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to stage outside release directory: $stagingFullPath"
}

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

if (Test-Path -LiteralPath $stagingDir) {
  Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

$files = @(
  "manifest.json",
  "background.js",
  "content.css",
  "content.js",
  "popup.css",
  "popup.html",
  "popup.js",
  "README.md"
)

foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $extensionDir $file) -Destination (Join-Path $stagingDir $file)
}

Copy-Item -LiteralPath (Join-Path $extensionDir "icons") -Destination (Join-Path $stagingDir "icons") -Recurse

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -CompressionLevel Optimal

Remove-Item -LiteralPath $stagingDir -Recurse -Force
if ((Test-Path -LiteralPath $stagingRoot) -and -not (Get-ChildItem -LiteralPath $stagingRoot -Force)) {
  Remove-Item -LiteralPath $stagingRoot -Force
}

Write-Output $zipFullPath
