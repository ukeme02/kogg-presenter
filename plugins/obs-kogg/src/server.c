/* SPDX-License-Identifier: GPL-2.0-or-later
 * OBS-owned, loopback-only transport. No Node, LAN listener or cloud service.
 * One bounded request at a time; the render thread never waits on a socket.
 */
#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <windows.h>
#include <bcrypt.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <obs.h>
#include "server.h"
#define LIMIT (20 * 1024 * 1024)
static SOCKET listener = INVALID_SOCKET;
static HANDLE worker;
static SRWLOCK lock = SRWLOCK_INIT;
static volatile LONG running, readers;
static char root_path[2048], config_path[2048], writer_key[65], reader_key[65], pair_code[9];
static char owner[65], *snapshot;
static unsigned long revision;
static ULONGLONG owner_at, pair_until, attempt_at;
static unsigned attempts;
static FILE *open_utf8(const char *path,const wchar_t *mode) { wchar_t wide[4096];if(!MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,path,-1,wide,4096))return NULL;return _wfopen(wide,mode); }
static bool random_hex(char *out, unsigned bytes) {
 unsigned char b[32]; if(bytes>32 || BCryptGenRandom(NULL,b,bytes,BCRYPT_USE_SYSTEM_PREFERRED_RNG))return false;
 for(unsigned i=0;i<bytes;i++)sprintf(out+i*2,"%02x",b[i]);out[bytes*2]=0;return true;
}
static bool equal(const char *a,const char *b) { size_t n=strlen(a);if(n!=strlen(b))return false;unsigned d=0;for(size_t i=0;i<n;i++)d|=(unsigned char)a[i]^(unsigned char)b[i];return !d; }
static void save_key(void) { obs_data_t *d=obs_data_create();obs_data_set_string(d,"token",writer_key);obs_data_save_json_safe(d,config_path,"tmp","bak");obs_data_release(d); }
void kogg_new_code(void) { AcquireSRWLockExclusive(&lock);if(!random_hex(pair_code,4))pair_code[0]=0;pair_until=GetTickCount64()+600000;attempts=0;ReleaseSRWLockExclusive(&lock); }
void kogg_pair_code(char *out,unsigned size) { AcquireSRWLockShared(&lock);snprintf(out,size,"%s",GetTickCount64()<pair_until?pair_code:"Expired - click New pairing code");ReleaseSRWLockShared(&lock); }
void kogg_reader_key(char *out,unsigned size) { snprintf(out,size,"%s",reader_key); }
void kogg_reader_count(int delta) { InterlockedExchangeAdd(&readers,delta); }
void kogg_revoke(void) { AcquireSRWLockExclusive(&lock);if(!random_hex(writer_key,32))writer_key[0]=0;owner[0]=0;free(snapshot);snapshot=NULL;revision++;save_key();ReleaseSRWLockExclusive(&lock);kogg_new_code(); }
static bool send_all(SOCKET s,const char *p,size_t n) { while(n){int count=send(s,p,(int)n,0);if(count<=0)return false;p+=count;n-=count;}return true; }
static void reply(SOCKET s,int status,const char *type,const char *body,size_t size,const char *origin) {
 char h[1600];int n=snprintf(h,sizeof(h),"HTTP/1.1 %d Response\r\nContent-Type: %s\r\nContent-Length: %zu\r\nConnection: close\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\n%s%s%sAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization, X-Kogg-Client\r\nAccess-Control-Allow-Private-Network: true\r\nVary: Origin\r\n\r\n",status,type,size,origin[0]?"Access-Control-Allow-Origin: ":"",origin,origin[0]?"\r\n":"");
 send_all(s,h,n);send_all(s,body,size);
}
static void json(SOCKET s,int code,const char *body,const char *origin) { reply(s,code,"application/json",body,strlen(body),origin); }
static bool hex_id(const char *s,unsigned min,unsigned max) { unsigned n=(unsigned)strlen(s);if(n<min||n>max)return false;for(unsigned i=0;i<n;i++)if(!isxdigit((unsigned char)s[i]))return false;return true; }
static bool allowed_origin(const char *s) {
 if(!strcmp(s,"https://kogg-presenter.pages.dev"))return true;
 const char *p=NULL;if(!strncmp(s,"http://127.0.0.1:",17))p=s+17;else if(!strncmp(s,"http://localhost:",17))p=s+17;
 if(!p||!*p)return false;for(;*p;p++)if(!isdigit((unsigned char)*p))return false;return true;
}
static bool header(const char *h,const char *key,char *out,size_t cap) {
 size_t keylen=strlen(key);out[0]=0;const char *p=strstr(h,"\r\n");bool found=false;
 while(p && (p+=2)[0] && strncmp(p,"\r\n",2)){const char *e=strstr(p,"\r\n");if(!e)return false;
  if(!_strnicmp(p,key,keylen)&&p[keylen]==':'){if(found)return false;found=true;const char *v=p+keylen+1;while(v<e&&(*v==' '||*v=='\t'))v++;size_t n=e-v;if(n>=cap)return false;memcpy(out,v,n);out[n]=0;}
  p=e;
 }return true;
}
static void static_file(SOCKET s,const char *path,const char *origin) {
 // Manifest is generated from the exact bundled files, not caller-controlled paths.
 char manifest[2200];snprintf(manifest,sizeof(manifest),"%s/files.txt",root_path);FILE *f=open_utf8(manifest,L"rb");bool allowed=false;char line[512];
 if(f){while(fgets(line,sizeof(line),f)){line[strcspn(line,"\r\n")]=0;if(!strcmp(line,path+1)){allowed=true;break;}}fclose(f);}
 if(!allowed){json(s,404,"{}",origin);return;}
 char full[2600];snprintf(full,sizeof(full),"%s%s",root_path,path);f=open_utf8(full,L"rb");if(!f){json(s,404,"{}",origin);return;}fseek(f,0,SEEK_END);long size=ftell(f);rewind(f);
 if(size<0||size>LIMIT){fclose(f);json(s,413,"{}",origin);return;}char *data=malloc(size?size:1);if(!data){fclose(f);json(s,503,"{}",origin);return;}size_t got=fread(data,1,size,f);fclose(f);
 const char *ext=strrchr(path,'.'),*type="application/octet-stream";if(ext){if(!strcmp(ext,".html"))type="text/html; charset=utf-8";else if(!strcmp(ext,".js"))type="text/javascript";else if(!strcmp(ext,".css"))type="text/css";else if(!strcmp(ext,".svg"))type="image/svg+xml";else if(!strcmp(ext,".woff2"))type="font/woff2";}
 reply(s,200,type,data,got,origin);free(data);
}
static void handle(SOCKET s) {
 char head[16385]={0},method[12],path[512],proto[16],host[128],origin[256],auth[128],client[80],length[32],transfer[80];size_t used=0;char *end=NULL;
 while(used<16384&&!end){int n=recv(s,head+used,1,0);if(n<=0)return;used+=n;head[used]=0;if(used>=4&&!memcmp(head+used-4,"\r\n\r\n",4))end=head+used;}
 if(!end||sscanf(head,"%11s %511s %15s",method,path,proto)!=3){json(s,400,"{}","");return;}
 if(!header(head,"Host",host,sizeof(host))||!header(head,"Origin",origin,sizeof(origin))||!header(head,"Authorization",auth,sizeof(auth))||!header(head,"X-Kogg-Client",client,sizeof(client))||!header(head,"Content-Length",length,sizeof(length))||!header(head,"Transfer-Encoding",transfer,sizeof(transfer))){json(s,400,"{}","");return;}
 if(strcmp(host,"127.0.0.1:8767")&&strcmp(host,"localhost:8767")){json(s,403,"{}","");return;}
 if(origin[0]&&!allowed_origin(origin)){json(s,403,"{}","");return;}
 if(transfer[0]){json(s,400,"{}",origin);return;}
 if(!strcmp(method,"OPTIONS")){if(!origin[0])json(s,403,"{}","");else json(s,200,"{}",origin);return;}
 size_t count=0;for(char *p=length;*p;p++){if(!isdigit((unsigned char)*p)||count>LIMIT){json(s,413,"{}",origin);return;}count=count*10+(*p-'0');}if(count>LIMIT){json(s,413,"{}",origin);return;}
 char *body=calloc(count+1,1);if(!body){json(s,503,"{}",origin);return;}size_t got=0;while(got<count){int n=recv(s,body+got,(int)(count-got),0);if(n<=0){free(body);return;}got+=n;}
 bool get=!strcmp(method,"GET"),post=!strcmp(method,"POST");char *query=strchr(path,'?');if(query)*query=0;
 AcquireSRWLockExclusive(&lock);
 bool writer=writer_key[0]&&!strncmp(auth,"Bearer ",7)&&equal(auth+7,writer_key),reader=!strncmp(auth,"Bearer ",7)&&equal(auth+7,reader_key);
 if(get&&!strcmp(path,"/v1/status")){char b[200];snprintf(b,sizeof(b),"{\"plugin\":\"kogg-connect\",\"version\":1,\"sources\":%ld,\"hasState\":%s,\"connected\":%s}",readers,snapshot?"true":"false",owner[0]&&GetTickCount64()-owner_at<10000?"true":"false");json(s,200,b,origin);}
 else if(post&&!strcmp(path,"/v1/pair")){
  obs_data_t *d=obs_data_create_from_json(body);const char *code=obs_data_get_string(d,"code");ULONGLONG now=GetTickCount64();
  if(now-attempt_at>60000){attempt_at=now;attempts=0;}
  if(!origin[0]||++attempts>8||now>pair_until||!pair_code[0]||!equal(code,pair_code))json(s,403,"{\"message\":\"Pairing code expired or incorrect. Create a new code in OBS.\"}",origin);
  else {char b[128];snprintf(b,sizeof(b),"{\"token\":\"%s\"}",writer_key);pair_code[0]=0;json(s,200,b,origin);}obs_data_release(d);
 }
 else if(get&&!strcmp(path,"/v1/state")&&reader){char revision_text[32];snprintf(revision_text,sizeof(revision_text),"since=%lu",revision);if(query&&!strcmp(query+1,revision_text))json(s,200,"{\"unchanged\":true}",origin);else{char *packet=malloc((snapshot?strlen(snapshot):2)+80);if(packet){sprintf(packet,"{\"revision\":%lu,\"snapshot\":%s}",revision,snapshot?snapshot:"{}");json(s,200,packet,origin);free(packet);}else json(s,503,"{}",origin);}}
 else if(post&&writer&&hex_id(client,32,64)&&(!strcmp(path,"/v1/state")||!strcmp(path,"/v1/claim")||!strcmp(path,"/v1/disconnect"))){
  ULONGLONG now=GetTickCount64();if(owner[0]&&strcmp(owner,client)&&now-owner_at<10000)json(s,409,"{\"message\":\"Another KOGG tab is connected. Disconnect it first.\"}",origin);
  else if(!strcmp(path,"/v1/disconnect")){owner[0]=0;free(snapshot);snapshot=NULL;revision++;json(s,200,"{}",origin);}
  else if(!strcmp(path,"/v1/claim")){snprintf(owner,sizeof(owner),"%s",client);owner_at=now;json(s,200,"{}",origin);}
  else {obs_data_t *data=obs_data_create_from_json(body),*live=obs_data_get_obj(data,"live");obs_data_array_t *themes=obs_data_get_array(data,"themes");
   if(!data||!live||!themes||obs_data_array_count(themes)<1)json(s,400,"{\"message\":\"Invalid presentation.\"}",origin);
   else {free(snapshot);snapshot=body;body=NULL;revision++;snprintf(owner,sizeof(owner),"%s",client);owner_at=now;json(s,200,"{}",origin);}
   obs_data_release(live);obs_data_array_release(themes);obs_data_release(data);
  }
 }
 else if(!strncmp(path,"/v1/",4))json(s,401,"{\"message\":\"Pair KOGG with OBS first.\"}",origin);
 else if(get)static_file(s,path,origin);else json(s,405,"{}",origin);
 ReleaseSRWLockExclusive(&lock);free(body);
}
static DWORD WINAPI serve(void *unused) {
 (void)unused;while(InterlockedCompareExchange(&running,1,1)){SOCKET s=accept(listener,NULL,NULL);if(s==INVALID_SOCKET)break;DWORD timeout=2000;setsockopt(s,SOL_SOCKET,SO_RCVTIMEO,(char*)&timeout,sizeof(timeout));setsockopt(s,SOL_SOCKET,SO_SNDTIMEO,(char*)&timeout,sizeof(timeout));handle(s);closesocket(s);}return 0;
}
bool kogg_server_start(const char *root,const char *config) {
 snprintf(root_path,sizeof(root_path),"%s",root);snprintf(config_path,sizeof(config_path),"%s",config);
 obs_data_t *d=obs_data_create_from_json_file(config);const char *stored=obs_data_get_string(d,"token");if(hex_id(stored,64,64))snprintf(writer_key,sizeof(writer_key),"%s",stored);else if(!random_hex(writer_key,32)){obs_data_release(d);return false;}obs_data_release(d);save_key();
 if(!random_hex(reader_key,32))return false;kogg_new_code();WSADATA w;if(WSAStartup(MAKEWORD(2,2),&w))return false;
 listener=socket(AF_INET,SOCK_STREAM,IPPROTO_TCP);BOOL exclusive=TRUE;setsockopt(listener,SOL_SOCKET,SO_EXCLUSIVEADDRUSE,(char*)&exclusive,sizeof(exclusive));
 struct sockaddr_in addr={0};addr.sin_family=AF_INET;addr.sin_addr.s_addr=htonl(INADDR_LOOPBACK);addr.sin_port=htons(KOGG_PORT);
 if(bind(listener,(struct sockaddr*)&addr,sizeof(addr))||listen(listener,12)){closesocket(listener);listener=INVALID_SOCKET;WSACleanup();return false;}
 InterlockedExchange(&running,1);worker=CreateThread(NULL,0,serve,NULL,0,NULL);if(!worker){closesocket(listener);WSACleanup();return false;}return true;
}
void kogg_server_stop(void) { InterlockedExchange(&running,0);if(listener!=INVALID_SOCKET){closesocket(listener);listener=INVALID_SOCKET;}if(worker){WaitForSingleObject(worker,INFINITE);CloseHandle(worker);worker=NULL;}free(snapshot);snapshot=NULL;WSACleanup(); }
