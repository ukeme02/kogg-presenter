/* SPDX-License-Identifier: GPL-2.0-or-later */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <obs-module.h>
#include <stdio.h>
#include "server.h"
OBS_DECLARE_MODULE()
MODULE_EXPORT const char *obs_module_name(void) { return "KOGG Connect"; }
MODULE_EXPORT const char *obs_module_description(void) { return "Local offline presentation source for KOGG Presenter"; }
MODULE_EXPORT const char *obs_module_author(void) { return "KOGG MEDIA (Africa)"; }
typedef struct { obs_source_t *self,*browser; } kogg_source;
static bool ready;
static const char *name(void *unused) { (void)unused;return "KOGG Presenter"; }
static void update(void *data,obs_data_t *settings) {
 kogg_source *s=data;char token[65],url[512];kogg_reader_key(token,sizeof(token));const char *feed=obs_data_get_string(settings,"feed");
 const char *q=!strcmp(feed,"full")?"":!strcmp(feed,"alerts")?"&overlay=1&layers=overlays":!strcmp(feed,"broadcast")?"&overlay=1&feed=broadcast":"&overlay=1";
 snprintf(url,sizeof(url),"http://127.0.0.1:%d/display.html?obsconnect=1%s#%s",KOGG_PORT,q,token);
 obs_data_t *d=obs_data_create();obs_data_set_string(d,"url",url);obs_data_set_int(d,"width",1920);obs_data_set_int(d,"height",1080);obs_data_set_int(d,"fps",30);obs_data_set_bool(d,"shutdown",false);obs_data_set_bool(d,"restart_when_active",false);obs_data_set_bool(d,"reroute_audio",false);
 if(s->browser)obs_source_update(s->browser,d);else{s->browser=obs_source_create_private("browser_source","KOGG bundled display",d);if(s->browser)obs_source_add_active_child(s->self,s->browser);}obs_data_release(d);
}
static void *create(obs_data_t *settings,obs_source_t *source) { if(!ready)return NULL;kogg_source *s=bzalloc(sizeof(*s));s->self=source;update(s,settings);if(!s->browser){bfree(s);return NULL;}kogg_reader_count(1);return s; }
static void destroy(void *data) { kogg_source *s=data;if(!s)return;obs_source_remove_active_child(s->self,s->browser);obs_source_release(s->browser);kogg_reader_count(-1);bfree(s); }
static void render(void *data,gs_effect_t *effect) { (void)effect;kogg_source *s=data;if(s->browser)obs_source_video_render(s->browser); }
static uint32_t width(void *unused) { (void)unused;return 1920; }
static uint32_t height(void *unused) { (void)unused;return 1080; }
static void defaults(obs_data_t *s) { obs_data_set_default_string(s,"feed","transparent"); }
static bool new_code(obs_properties_t *props,obs_property_t *p,void *unused) { (void)p;(void)unused;kogg_new_code();char code[100];kogg_pair_code(code,sizeof(code));obs_property_set_description(obs_properties_get(props,"pair"),code);return true; }
static bool revoke(obs_properties_t *props,obs_property_t *p,void *unused) { kogg_revoke();return new_code(props,p,unused); }
static obs_properties_t *properties(void *data) {
 (void)data;obs_properties_t *p=obs_properties_create();obs_properties_add_text(p,"help","KOGG → Stream → Connect OBS. Enter this code (valid 10 minutes):",OBS_TEXT_INFO);char code[100];kogg_pair_code(code,sizeof(code));obs_properties_add_text(p,"pair",code,OBS_TEXT_INFO);
 obs_properties_add_button(p,"newcode","New pairing code",new_code);obs_properties_add_button(p,"revoke","Disconnect and forget all presenters",revoke);
 obs_property_t *feed=obs_properties_add_list(p,"feed","Output",OBS_COMBO_TYPE_LIST,OBS_COMBO_FORMAT_STRING);obs_property_list_add_string(feed,"Full presentation","full");obs_property_list_add_string(feed,"Transparent text and graphics","transparent");obs_property_list_add_string(feed,"Separate broadcast / lower thirds","broadcast");obs_property_list_add_string(feed,"Name tags and alerts only","alerts");
 obs_properties_add_text(p,"hint","Reuse this source in other scenes with Add existing. Choose the broadcast layout in KOGG Stream. Output is 1920 × 1080; fit to your OBS canvas.",OBS_TEXT_INFO);return p;
}
static struct obs_source_info source={.id="kogg_presenter",.type=OBS_SOURCE_TYPE_INPUT,.output_flags=OBS_SOURCE_VIDEO|OBS_SOURCE_CUSTOM_DRAW|OBS_SOURCE_DO_NOT_DUPLICATE,.get_name=name,.create=create,.destroy=destroy,.get_width=width,.get_height=height,.get_defaults=defaults,.get_properties=properties,.update=update,.video_render=render,.icon_type=OBS_ICON_TYPE_BROWSER};
bool obs_module_load(void) {
 char *root=obs_module_file("renderer"),*folder=obs_module_config_path(""),*config=obs_module_config_path("connection.json");
 if(folder){wchar_t wide[2048];MultiByteToWideChar(CP_UTF8,0,folder,-1,wide,2048);CreateDirectoryW(wide,NULL);}ready=root&&config&&kogg_server_start(root,config);bfree(root);bfree(folder);bfree(config);
 if(!ready){blog(LOG_ERROR,"[KOGG] Could not start local connection on port %d",KOGG_PORT);return false;}obs_register_source(&source);return true;
}
void obs_module_unload(void) { if(ready)kogg_server_stop();ready=false; }
