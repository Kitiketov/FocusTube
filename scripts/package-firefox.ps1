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

$sourceManifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$packageName = "focustube-firefox-$($sourceManifest.version)"
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

$firefoxManifest = [ordered]@{
  manifest_version = 2
  name = $sourceManifest.name
  description = $sourceManifest.description
  version = $sourceManifest.version
  permissions = @(
    "storage",
    "tabs",
    "https://www.youtube.com/*",
    "https://yoomoney.ru/*"
  )
  icons = $sourceManifest.icons
  browser_action = [ordered]@{
    default_title = $sourceManifest.action.default_title
    default_popup = $sourceManifest.action.default_popup
    default_icon = $sourceManifest.action.default_icon
  }
  background = [ordered]@{
    scripts = @("background.js")
    persistent = $false
  }
  content_scripts = $sourceManifest.content_scripts
  browser_specific_settings = [ordered]@{
    gecko = [ordered]@{
      id = "focustube@kitiketov"
      data_collection_permissions = [ordered]@{
        required = @("none")
      }
      strict_min_version = "142.0"
    }
  }
}

$firefoxManifest |
  ConvertTo-Json -Depth 10 |
  Set-Content -LiteralPath (Join-Path $stagingDir "manifest.json") -Encoding UTF8

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $stagingDir -Recurse -File | ForEach-Object {
    $fileFullPath = [System.IO.Path]::GetFullPath($_.FullName)
    $relativePath = $fileFullPath.Substring($stagingFullPath.Length).TrimStart("\", "/").Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $_.FullName,
      $relativePath,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zip.Dispose()
}

Remove-Item -LiteralPath $stagingDir -Recurse -Force
if ((Test-Path -LiteralPath $stagingRoot) -and -not (Get-ChildItem -LiteralPath $stagingRoot -Force)) {
  Remove-Item -LiteralPath $stagingRoot -Force
}

Write-Output $zipFullPath
