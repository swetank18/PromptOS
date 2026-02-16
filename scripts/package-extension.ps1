param(
    [string]$ApiUrl = "",
    [string]$OutputZip = "extension-release.zip"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$extensionDir = Join-Path $root "extension"
$constantsFile = Join-Path $extensionDir "utils\\constants.js"
$tempDir = Join-Path $root ".tmp_extension_release"
$zipPath = Join-Path $root $OutputZip

if ($ApiUrl -ne "") {
    Write-Host "Setting extension API URL to $ApiUrl"
    $content = Get-Content $constantsFile -Raw
    $content = [Regex]::Replace(
        $content,
        "export const DEFAULT_API_URL = '.*?';",
        "export const DEFAULT_API_URL = '$ApiUrl';"
    )
    Set-Content $constantsFile $content
}

if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

Copy-Item -Path (Join-Path $extensionDir "*") -Destination $tempDir -Recurse

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath

Remove-Item -Recurse -Force $tempDir
Write-Host "Created $zipPath"

