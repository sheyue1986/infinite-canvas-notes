#ifndef Payload
  #define Payload "..\..\desktop-build\payload"
#endif
#ifndef Dependencies
  #define Dependencies "..\..\desktop-build\dependencies"
#endif
[Setup]
AppId={{074018B0-19C3-40DE-AE67-30AF534D4F8F}
AppName=Infinite Canvas Notes
AppVersion=0.2.1
AppPublisher=Infinite Canvas Notes
DefaultDirName={localappdata}\Programs\Infinite Canvas Notes
DefaultGroupName=Infinite Canvas Notes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.19041
OutputDir=..\..\desktop-build\release
OutputBaseFilename=Infinite-Canvas-Notes-0.2.1-Windows-x64-Setup
SetupIconFile=app-icon.ico
UninstallDisplayIcon={app}\Infinite Canvas Notes Desktop.exe
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
AppMutex=InfiniteCanvasNotesDesktop
InfoBeforeFile=INSTALL-NOTES.txt

[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; Flags: checkedonce

[Files]
Source: "{#Payload}\*"; DestDir: "{app}"; Excludes: "sources\*"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#Payload}\sources\*"; DestDir: "{app}\sources"; Flags: ignoreversion nocompression
Source: "{#Dependencies}\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"; Flags: dontcopy nocompression

[Icons]
Name: "{group}\Infinite Canvas Notes"; Filename: "{app}\Infinite Canvas Notes Desktop.exe"; AppUserModelID: "InfiniteCanvasNotes.Desktop"
Name: "{autodesktop}\Infinite Canvas Notes"; Filename: "{app}\Infinite Canvas Notes Desktop.exe"; Tasks: desktopicon; AppUserModelID: "InfiniteCanvasNotes.Desktop"
Name: "{group}\Uninstall Infinite Canvas Notes"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\Infinite Canvas Notes Desktop.exe"; Description: "Open Infinite Canvas Notes"; Flags: nowait postinstall skipifsilent

[Code]
function HasWebView2: Boolean;
var Version: String;
begin
  Result := (RegQueryStringValue(HKLM32, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0')) or
            (RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0'));
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var ExitCode: Integer;
begin
  Result := '';
  if HasWebView2 then exit;
  ExtractTemporaryFile('MicrosoftEdgeWebView2RuntimeInstallerX64.exe');
  if not Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebView2RuntimeInstallerX64.exe'), '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, ExitCode) then
    Result := 'Could not start WebView2 installation. Please retry.'
  else if not HasWebView2 then
    Result := 'WebView2 installation did not complete. Restart Windows and run this installer again. Exit code: ' + IntToStr(ExitCode);
end;
