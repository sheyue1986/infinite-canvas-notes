param(
    [Parameter(Mandatory=$true)][string]$BlenderFolder,
    [Parameter(Mandatory=$true)][string]$BlenderSource,
    [Parameter(Mandatory=$true)][string]$WebViewInstaller,
    [Parameter(Mandatory=$true)][string]$Compiler,
    [string]$CadToolsFolder = (Join-Path $PSScriptRoot '../Infinite Canvas Notes Desktop r14/cad-tools'),
    [string]$OutputRoot = (Join-Path $PSScriptRoot '../../desktop-build')
)
$ErrorActionPreference = 'Stop'
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
foreach ($file in @((Join-Path $BlenderFolder 'blender.exe'), $BlenderSource, $WebViewInstaller, $Compiler)) {
    if (!(Test-Path -LiteralPath $file -PathType Leaf)) { throw "Required packaging file missing: $file" }
}
if ((Get-AuthenticodeSignature $WebViewInstaller).Status -ne 'Valid') { throw 'WebView2 installer signature is invalid' }
if (!(Test-Path -LiteralPath (Join-Path $CadToolsFolder 'dxf2dwg.exe'))) { throw 'CAD conversion components missing' }
$payload = Join-Path $OutputRoot 'payload'
$dependencies = Join-Path $OutputRoot 'dependencies'
New-Item -ItemType Directory -Force $payload,$dependencies,(Join-Path $payload 'sources') | Out-Null
Push-Location (Join-Path $PSScriptRoot '..')
try {
    npm.cmd run build -- --outDir (Join-Path $payload 'site')
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
    dotnet publish windows-desktop/InfiniteCanvasDesktop.csproj -c Release -o $payload --nologo
    if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed' }
    robocopy $BlenderFolder (Join-Path $payload 'runtime/blender') /E /XF *.pdb *.msi /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) { throw 'Blender packaging failed' }
    robocopy $CadToolsFolder (Join-Path $payload 'cad-tools') /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) { throw 'CAD tools packaging failed' }
    Copy-Item -LiteralPath $BlenderSource -Destination (Join-Path $payload 'sources') -Force
    $webviewTarget = Join-Path $dependencies 'MicrosoftEdgeWebView2RuntimeInstallerX64.exe'
    if ([IO.Path]::GetFullPath($WebViewInstaller) -ne $webviewTarget) { Copy-Item -LiteralPath $WebViewInstaller -Destination $webviewTarget -Force }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'INSTALL-NOTES.txt') -Destination $payload -Force
    node windows-desktop/licenses.mjs $payload
    if ($LASTEXITCODE -ne 0) { throw 'License collection failed' }
    & $Compiler ("/DPayload=" + $payload) ("/DDependencies=" + $dependencies) (Join-Path $PSScriptRoot 'installer.iss')
    if ($LASTEXITCODE -ne 0) { throw 'Installer build failed' }
} finally { Pop-Location }
