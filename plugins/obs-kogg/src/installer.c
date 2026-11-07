/* SPDX-License-Identifier: GPL-2.0-or-later. Small preview installer, no runtime. */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shlobj.h>
#include <tlhelp32.h>
#include <stdio.h>
#include "payload.h"
static int bool_obs_running(void) { HANDLE snap=CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0);if(snap==INVALID_HANDLE_VALUE)return 1;PROCESSENTRY32W p={.dwSize=sizeof(p)};int found=0;if(Process32FirstW(snap,&p))do{if(!_wcsicmp(p.szExeFile,L"obs64.exe")){found=1;break;}}while(Process32NextW(snap,&p));CloseHandle(snap);return found; }
static int fail(const wchar_t *message) { MessageBoxW(NULL,message,L"KOGG Connect",MB_OK|MB_ICONERROR);return 1; }
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE prev,PWSTR args,int show) {
 (void)instance;(void)prev;(void)show;if(bool_obs_running())return fail(L"Close OBS before installing or removing KOGG Connect.");
 if(wcsstr(args,L"/uninstall"))return fail(L"To remove this preview, close OBS and delete only C:\\ProgramData\\obs-studio\\plugins\\kogg-connect. Your KOGG libraries are unaffected.");
 if(MessageBoxW(NULL,L"Install KOGG Connect preview for OBS 32 on Windows?\n\nThis adds the KOGG Presenter source and its offline display files. No Node or terminal is required.\n\nAfter restarting OBS, add KOGG Presenter in Sources and pair it from KOGG's Stream Deck.",L"KOGG Connect setup",MB_YESNO|MB_ICONINFORMATION)!=IDYES)return 0;
 PWSTR program=NULL;if(FAILED(SHGetKnownFolderPath(&FOLDERID_ProgramData,0,NULL,&program)))return fail(L"Could not locate the Windows plugin folder.");
 wchar_t root[2048];swprintf(root,2048,L"%ls\\obs-studio\\plugins\\kogg-connect",program);CoTaskMemFree(program);
 for(size_t i=0;i<sizeof(files)/sizeof(files[0]);i++){
  wchar_t path[2400];swprintf(path,2400,L"%ls\\%ls",root,files[i].name);
  for(wchar_t *p=path+3;*p;p++)if(*p==L'\\'){*p=0;CreateDirectoryW(path,NULL);*p=L'\\';}
  wchar_t temp[2450];swprintf(temp,2450,L"%ls.installing",path);HANDLE f=CreateFileW(temp,GENERIC_WRITE,0,NULL,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,NULL);if(f==INVALID_HANDLE_VALUE)return fail(L"Could not write plugin files. Check folder permissions and retry.");DWORD written=0;BOOL ok=WriteFile(f,files[i].data,(DWORD)files[i].size,&written,NULL);CloseHandle(f);if(!ok||written!=files[i].size||!MoveFileExW(temp,path,MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH))return fail(L"Installation was interrupted. Close OBS and run setup again.");
 }
 MessageBoxW(NULL,L"KOGG Connect preview installed.\n\n1. Restart OBS.\n2. Sources > + > KOGG Presenter.\n3. Enter its pairing code in KOGG > Stream > KOGG Connect.\n\nAllow local-network access if your browser asks. Check the OBS preview before using it in a service.",L"KOGG Connect",MB_OK|MB_ICONINFORMATION);return 0;
}
