/* KOGG Presenter desktop: a bounded loopback file host, using installed Edge.
 * No LAN listener, runtime download, Node process or user server setup. */
#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <winhttp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#define PORT 8768
#define TRAY (WM_APP+1)
static wchar_t root[4096],edge[4096],profile[4096];
static SOCKET listener=INVALID_SOCKET;
static volatile LONG clients;
static HWND window;
static DWORD browser_pid;
static BOOL CALLBACK focus_operator(HWND candidate,LPARAM found){DWORD pid=0;GetWindowThreadProcessId(candidate,&pid);wchar_t title[256];GetWindowTextW(candidate,title,256);if(pid==browser_pid&&IsWindowVisible(candidate)&&wcsstr(title,L"Operator")){if(IsIconic(candidate))ShowWindow(candidate,SW_RESTORE);SetForegroundWindow(candidate);*(BOOL*)found=TRUE;return FALSE;}return TRUE;}
static NOTIFYICONDATAW tray;
static int test_mode;
static BOOL send_all(SOCKET s,const char *p,size_t n){while(n){int k=send(s,p,(int)(n>65536?65536:n),0);if(k<=0)return FALSE;p+=k;n-=k;}return TRUE;}
static void response(SOCKET s,int status,const char *type,const char *body,size_t n,BOOL head){char h[1024];int k=snprintf(h,sizeof(h),"HTTP/1.1 %d Response\r\nContent-Type: %s\r\nContent-Length: %zu\r\nConnection: close\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\n\r\n",status,type,n);send_all(s,h,k);if(!head)send_all(s,body,n);}
static void error(SOCKET s,int code,const char *text){response(s,code,"text/plain; charset=utf-8",text,strlen(text),FALSE);}
static BOOL header(const char *h,const char *key,char *out,size_t cap){size_t len=strlen(key);out[0]=0;BOOL found=FALSE;const char *p=strstr(h,"\r\n");while(p&&(p+=2)[0]&&strncmp(p,"\r\n",2)){const char *e=strstr(p,"\r\n");if(!e)return FALSE;if(!_strnicmp(p,key,len)&&p[len]==':'){if(found)return FALSE;found=TRUE;const char *v=p+len+1;while(v<e&&(*v==' '||*v=='\t'))v++;size_t n=e-v;if(n>=cap)return FALSE;memcpy(out,v,n);out[n]=0;}p=e;}return TRUE;}
static const char *mime(const char *p){const char *e=strrchr(p,'.');if(!e)return "application/octet-stream";
 if(!strcmp(e,".html"))return "text/html; charset=utf-8";if(!strcmp(e,".js"))return "text/javascript; charset=utf-8";if(!strcmp(e,".css"))return "text/css; charset=utf-8";if(!strcmp(e,".json")||!strcmp(e,".webmanifest"))return "application/json";if(!strcmp(e,".svg"))return "image/svg+xml";if(!strcmp(e,".png"))return "image/png";if(!strcmp(e,".webp"))return "image/webp";if(!strcmp(e,".woff2"))return "font/woff2";return "text/plain; charset=utf-8";}
static BOOL allowed(const char *path){wchar_t name[4200];swprintf(name,4200,L"%ls\\www\\files.txt",root);FILE *f=_wfopen(name,L"rb");if(!f)return FALSE;char line[512];BOOL ok=FALSE;while(fgets(line,sizeof(line),f)){line[strcspn(line,"\r\n")]=0;if(!strcmp(line,path)){ok=TRUE;break;}}fclose(f);return ok;}
/* Only the public read-only lyrics endpoint and shipped optional packs may be fetched.
 * Credentials/cookies/Origin are never forwarded, and redirects are disabled. */
static void online_get(SOCKET s,const char *path,BOOL head){
 if(test_mode){error(s,503,"Online services are disabled in offline acceptance mode.");return;}
 wchar_t url[2300];if(!MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,path,-1,url,2300)){error(s,400,"Invalid URL");return;}
 HINTERNET session=WinHttpOpen(L"KOGGPresenter/0.1.0",WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,NULL,NULL,0),conn=NULL,request=NULL;
 char *data=NULL;DWORD total=0,status=502;BOOL ok=FALSE;
 if(session){WinHttpSetTimeouts(session,4000,4000,10000,10000);conn=WinHttpConnect(session,L"kogg-presenter.pages.dev",INTERNET_DEFAULT_HTTPS_PORT,0);}
 if(conn)request=WinHttpOpenRequest(conn,L"GET",url,NULL,WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,WINHTTP_FLAG_SECURE);
 if(request){DWORD disable=WINHTTP_DISABLE_REDIRECTS|WINHTTP_DISABLE_COOKIES;WinHttpSetOption(request,WINHTTP_OPTION_DISABLE_FEATURE,&disable,sizeof(disable));
 if(WinHttpSendRequest(request,WINHTTP_NO_ADDITIONAL_HEADERS,0,WINHTTP_NO_REQUEST_DATA,0,0,0)&&WinHttpReceiveResponse(request,NULL)){DWORD size=sizeof(status);WinHttpQueryHeaders(request,WINHTTP_QUERY_STATUS_CODE|WINHTTP_QUERY_FLAG_NUMBER,NULL,&status,&size,NULL);data=malloc(10*1024*1024);if(data){ok=TRUE;while(total<10*1024*1024){DWORD got=0;if(!WinHttpReadData(request,data+total,10*1024*1024-total,&got)){ok=FALSE;break;}if(!got)break;total+=got;}if(total==10*1024*1024)ok=FALSE;}}}
 if(ok)response(s,status,"application/json; charset=utf-8",data,total,head);else error(s,503,"Online source unavailable. Core Bibles and hymns are ready offline.");
 free(data);if(request)WinHttpCloseHandle(request);if(conn)WinHttpCloseHandle(conn);if(session)WinHttpCloseHandle(session);
}
static DWORD WINAPI client(void *param){SOCKET s=(SOCKET)(UINT_PTR)param;char h[8193]={0},method[12],path[2048],proto[16],host[128],origin[128],length[32],transfer[32];size_t used=0;BOOL complete=FALSE;
 while(used<8192){int n=recv(s,h+used,1,0);if(n<=0)goto done;used+=n;if(used>=4&&!memcmp(h+used-4,"\r\n\r\n",4)){complete=TRUE;break;}}
 if(!complete||sscanf(h,"%11s %2047s %15s",method,path,proto)!=3){error(s,400,"Invalid request");goto done;}
 if(!header(h,"Host",host,sizeof(host))||!header(h,"Origin",origin,sizeof(origin))||!header(h,"Content-Length",length,sizeof(length))||!header(h,"Transfer-Encoding",transfer,sizeof(transfer))){error(s,400,"Invalid headers");goto done;}
 if(strcmp(host,"127.0.0.1:8768")&&strcmp(host,"localhost:8768")){error(s,403,"Invalid host");goto done;}
 if(origin[0]&&strcmp(origin,"http://127.0.0.1:8768")&&strcmp(origin,"http://localhost:8768")){error(s,403,"Invalid origin");goto done;}
 if(transfer[0]||(length[0]&&strcmp(length,"0"))){error(s,400,"Request bodies are not supported");goto done;}
 BOOL head=!strcmp(method,"HEAD");if(strcmp(method,"GET")&&!head){error(s,405,"Read-only host");goto done;}
 if(path[0]!='/'||strchr(path,'\\')||strstr(path,"..")||strchr(path,'#')){error(s,403,"Invalid path");goto done;}
 if(!strncmp(path,"/api/lyrics?",12)){online_get(s,path,head);goto done;}
 char *query=strchr(path,'?');if(query)*query=0;
 if(!strcmp(path,"/desktop-status")){const char *body="{\"app\":\"KOGG Presenter\",\"version\":\"0.1.0-preview\",\"bundled\":true}";response(s,200,"application/json",body,strlen(body),head);goto done;}
 if(!strcmp(path,"/"))strcpy(path,"/index.html");else if(!strcmp(path,"/display"))strcpy(path,"/display.html");else if(!strcmp(path,"/landing"))strcpy(path,"/landing.html");
 if(!allowed(path+1)){error(s,404,"File not included");goto done;}
 wchar_t rel[2300],full[6500];if(!MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,path+1,-1,rel,2300)){error(s,400,"Invalid path");goto done;}swprintf(full,6500,L"%ls\\www\\%ls",root,rel);
 FILE *f=_wfopen(full,L"rb");if(!f){if(!strncmp(path,"/data/",6))online_get(s,path,head);else error(s,404,"File missing");goto done;}
 fseek(f,0,SEEK_END);long size=ftell(f);rewind(f);if(size<0||size>20*1024*1024){fclose(f);error(s,413,"File too large");goto done;}char *body=malloc(size?size:1);if(!body){fclose(f);error(s,503,"Out of memory");goto done;}size_t read=fread(body,1,size,f);fclose(f);response(s,200,mime(path),body,read,head);free(body);
 done:closesocket(s);InterlockedDecrement(&clients);return 0;
}
static DWORD WINAPI serve(void *unused){(void)unused;for(;;){SOCKET s=accept(listener,NULL,NULL);if(s==INVALID_SOCKET)break;if(InterlockedIncrement(&clients)>24){InterlockedDecrement(&clients);closesocket(s);continue;}DWORD timeout=3000;setsockopt(s,SOL_SOCKET,SO_RCVTIMEO,(char*)&timeout,sizeof(timeout));setsockopt(s,SOL_SOCKET,SO_SNDTIMEO,(char*)&timeout,sizeof(timeout));HANDLE t=CreateThread(NULL,0,client,(void*)(UINT_PTR)s,0,NULL);if(t)CloseHandle(t);else{closesocket(s);InterlockedDecrement(&clients);}}return 0;}
static BOOL locate_edge(void){const wchar_t *vars[]={L"ProgramFiles(x86)",L"ProgramFiles",L"LOCALAPPDATA"};for(unsigned i=0;i<3;i++){wchar_t base[3500];if(GetEnvironmentVariableW(vars[i],base,3500)){swprintf(edge,4096,L"%ls\\Microsoft\\Edge\\Application\\msedge.exe",base);if(GetFileAttributesW(edge)!=INVALID_FILE_ATTRIBUTES)return TRUE;}}return FALSE;}
static void open_app(void){if(test_mode)return;BOOL focused=FALSE;if(browser_pid)EnumWindows(focus_operator,(LPARAM)&focused);if(focused)return;wchar_t args[9000];swprintf(args,9000,L"\"%ls\" --user-data-dir=\"%ls\" --start-maximized --no-first-run --disable-first-run-ui --disable-sync --no-default-browser-check --app=http://127.0.0.1:8768/index.html",edge,profile);STARTUPINFOW si={.cb=sizeof(si)};PROCESS_INFORMATION pi;if(CreateProcessW(edge,args,NULL,NULL,FALSE,0,NULL,root,&si,&pi)){browser_pid=pi.dwProcessId;CloseHandle(pi.hThread);CloseHandle(pi.hProcess);}else MessageBoxW(NULL,L"Could not open Microsoft Edge. Check that Edge is installed and try again.",L"KOGG Presenter",MB_OK|MB_ICONERROR);}
static LRESULT CALLBACK proc(HWND w,UINT msg,WPARAM wp,LPARAM lp){if(msg==WM_APP+2){open_app();return 0;}if(msg==TRAY){if(lp==WM_LBUTTONDBLCLK)open_app();if(lp==WM_RBUTTONUP||lp==WM_CONTEXTMENU){POINT p;GetCursorPos(&p);HMENU menu=CreatePopupMenu();AppendMenuW(menu,MF_STRING,1,L"Open KOGG Presenter");AppendMenuW(menu,MF_STRING,2,L"Quit KOGG Presenter");SetForegroundWindow(w);int item=TrackPopupMenu(menu,TPM_RETURNCMD|TPM_RIGHTBUTTON,p.x,p.y,0,w,NULL);DestroyMenu(menu);if(item==1)open_app();if(item==2&&MessageBoxW(w,L"Quit KOGG Presenter?\n\nClose your presentation and output windows first. Saved Local and Sync work stays on this device.",L"KOGG Presenter",MB_YESNO|MB_ICONQUESTION)==IDYES)DestroyWindow(w);}return 0;}if(msg==WM_DESTROY){Shell_NotifyIconW(NIM_DELETE,&tray);closesocket(listener);PostQuitMessage(0);return 0;}return DefWindowProcW(w,msg,wp,lp);}
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE prev,PWSTR args,int show){(void)prev;(void)show;test_mode=wcsstr(args,L"--test-host")!=NULL;
 HANDLE mutex=CreateMutexW(NULL,TRUE,L"Local\\KOGGPresenterDesktop8768");if(GetLastError()==ERROR_ALREADY_EXISTS){HWND other=FindWindowW(L"KOGGPresenterDesktop",NULL);if(other)PostMessageW(other,WM_APP+2,0,0);CloseHandle(mutex);return 0;}
 GetModuleFileNameW(NULL,root,4096);wchar_t *end=wcsrchr(root,L'\\');if(!end)return 1;*end=0;wchar_t local[3500];GetEnvironmentVariableW(L"LOCALAPPDATA",local,3500);swprintf(profile,4096,L"%ls\\KOGG Presenter\\Browser",local);
 if(!test_mode&&!locate_edge()){MessageBoxW(NULL,L"This lightweight edition uses Microsoft Edge, normally included with Windows 10 and 11. Install Edge before using KOGG on this computer. KOGG does not download a browser automatically.",L"Microsoft Edge required",MB_OK|MB_ICONINFORMATION);return 2;}
 WSADATA data;if(WSAStartup(MAKEWORD(2,2),&data))return 3;listener=socket(AF_INET,SOCK_STREAM,IPPROTO_TCP);BOOL exclusive=TRUE;setsockopt(listener,SOL_SOCKET,SO_EXCLUSIVEADDRUSE,(char*)&exclusive,sizeof(exclusive));struct sockaddr_in addr={0};addr.sin_family=AF_INET;addr.sin_addr.s_addr=htonl(INADDR_LOOPBACK);addr.sin_port=htons(PORT);
 if(bind(listener,(struct sockaddr*)&addr,sizeof(addr))||listen(listener,24)){if(!test_mode)MessageBoxW(NULL,L"KOGG could not open its private local address (port 8768). Close another KOGG desktop session and retry. Your saved library has not changed.",L"KOGG Presenter",MB_OK|MB_ICONERROR);return 4;}
 WNDCLASSW wc={0};wc.lpfnWndProc=proc;wc.hInstance=instance;wc.lpszClassName=L"KOGGPresenterDesktop";RegisterClassW(&wc);window=CreateWindowW(wc.lpszClassName,L"KOGG Presenter",0,0,0,0,0,NULL,NULL,instance,NULL);if(!window)return 5;
 tray.cbSize=sizeof(tray);tray.hWnd=window;tray.uID=1;tray.uFlags=NIF_ICON|NIF_MESSAGE|NIF_TIP;tray.uCallbackMessage=TRAY;tray.hIcon=LoadIconW(instance,MAKEINTRESOURCEW(1));wcscpy(tray.szTip,L"KOGG Presenter - double-click to open; right-click to quit");if(!test_mode)Shell_NotifyIconW(NIM_ADD,&tray);
 HANDLE thread=CreateThread(NULL,0,serve,NULL,0,NULL);if(!thread)return 6;CloseHandle(thread);open_app();MSG msg;while(GetMessageW(&msg,NULL,0,0)>0){TranslateMessage(&msg);DispatchMessageW(&msg);}CloseHandle(mutex);return 0;
}
