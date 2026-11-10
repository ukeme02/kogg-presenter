#ifndef PackageDir
  #error PackageDir is required
#endif
[Setup]
AppId={{B53D511A-126B-4F4A-91B3-570379846E86}
AppName=KOGG Presenter
AppVersion=0.1.0-preview
AppPublisher=KOGG MEDIA (Africa)
AppPublisherURL=https://kogg-presenter.pages.dev/landing
AppSupportURL=https://github.com/ukeme02/kogg-presenter/issues
DefaultDirName={localappdata}\Programs\KOGG Presenter
DefaultGroupName=KOGG Presenter
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#PackageDir}\..\release
OutputBaseFilename=kogg-presenter-0.1.0-preview-windows-x64-setup
SetupIconFile={#PackageDir}\kogg.ico
UninstallDisplayIcon={app}\KOGG Presenter.exe
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
AppMutex=KOGGPresenterDesktop8768
CloseApplications=no
RestartApplications=no
InfoBeforeFile=README.txt
[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; Flags: unchecked
[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\KOGG Presenter"; Filename: "{app}\KOGG Presenter.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\KOGG Presenter"; Filename: "{app}\KOGG Presenter.exe"; WorkingDir: "{app}"; Tasks: desktopicon
[Run]
Filename: "{app}\KOGG Presenter.exe"; Description: "Open KOGG Presenter"; Flags: nowait postinstall skipifsilent
[Code]
function EdgeInstalled: Boolean;
begin
  Result := FileExists(ExpandConstant('{commonpf32}\Microsoft\Edge\Application\msedge.exe')) or
    FileExists(ExpandConstant('{commonpf64}\Microsoft\Edge\Application\msedge.exe')) or
    FileExists(ExpandConstant('{localappdata}\Microsoft\Edge\Application\msedge.exe'));
end;
function InitializeSetup: Boolean;
begin
  Result := EdgeInstalled;
  if not Result then MsgBox('This lightweight edition uses Microsoft Edge, normally included with Windows 10 and 11. Install Edge first, then run this installer again. No browser is downloaded automatically.', mbInformation, MB_OK);
end;
