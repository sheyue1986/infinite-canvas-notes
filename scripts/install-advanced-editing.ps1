$ErrorActionPreference = 'Stop'
$installRoot = 'C:/Users/admin/AppData/Local/Programs/Infinite Canvas Notes'
$siteRoot = Join-Path $installRoot 'site'
$backupRoot = Join-Path $installRoot ('advanced-editing-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$sourceRoot = Join-Path $PSScriptRoot '../published-site/assets'
$files = @('advanced-editing.js', 'erase-geometry.js', 'cutout-styles.js', 'copic-picker.js', 'object-property-ring.js', 'selection-properties.js', 'index-icn-selection-r15.js')
New-Item -ItemType Directory -Path $backupRoot | Out-Null
foreach ($name in $files) {
    $target = Join-Path $siteRoot ('assets/' + $name)
    if (Test-Path -LiteralPath $target) { Copy-Item -LiteralPath $target -Destination (Join-Path $backupRoot $name) }
    Copy-Item -LiteralPath (Join-Path $sourceRoot $name) -Destination $target
    if ((Get-FileHash -LiteralPath $target).Hash -ne (Get-FileHash -LiteralPath (Join-Path $sourceRoot $name)).Hash) { throw "Verification failed for $name" }
}
Write-Output "Backup: $backupRoot"
# The verification uses PowerShell 7's -NoProxy switch.
$verifyScript = Join-Path $PSScriptRoot '../node_modules/.brush-test/verify-github-r15.ps1'
& pwsh -NoProfile -File $verifyScript -Restart
if ($LASTEXITCODE -ne 0) { throw 'Desktop startup verification failed.' }
