/* Loads the actual plugin into libobs without starting or altering the user's OBS. */
#include <obs.h>
#include <stdio.h>
#include <string.h>
static int fake;
static const char *fake_name(void *x){(void)x;return "Test browser";}
static void *fake_create(obs_data_t *d,obs_source_t *s){(void)d;(void)s;return &fake;}
static void fake_destroy(void *x){(void)x;}
static uint32_t fake_size(void *x){(void)x;return 100;}
static void fake_render(void *x,gs_effect_t *e){(void)x;(void)e;}
static void child_found(obs_source_t *parent,obs_source_t *child,void *data){(void)parent;*(obs_source_t**)data=child;}
static struct obs_source_info browser={.id="browser_source",.type=OBS_SOURCE_TYPE_INPUT,.output_flags=OBS_SOURCE_VIDEO|OBS_SOURCE_CUSTOM_DRAW,.get_name=fake_name,.create=fake_create,.destroy=fake_destroy,.get_width=fake_size,.get_height=fake_size,.video_render=fake_render};
int main(int argc,char **argv){
 if(argc!=4)return 2;for(int i=1;i<4;i++)for(char *p=argv[i];*p;p++)if(*p=='\\')*p='/';if(!obs_startup("en-US",argv[3],NULL))return 2;
 obs_register_source(&browser);
 obs_module_t *module=NULL;int result=obs_open_module(&module,argv[1],argv[2]);
 if(result||!obs_init_module(module)){fprintf(stderr,"Plugin load failed: %d\n",result);obs_shutdown();return 3;}
 obs_properties_t *props=obs_get_source_properties("kogg_presenter");
 obs_property_t *pair=obs_properties_get(props,"pair"),*feed=obs_properties_get(props,"feed");
 int ok=pair&&strlen(obs_property_description(pair))==8&&feed&&obs_property_list_item_count(feed)==4;
 printf("KOGG source registration and four output choices: %s\n",ok?"PASS":"FAIL");
 obs_source_t *source=obs_source_create("kogg_presenter","Isolated KOGG test",NULL,NULL),*child=NULL;
 obs_source_enum_active_sources(source,child_found,&child);ok=ok&&child;
 if(child){obs_source_inc_showing(source);ok=ok&&obs_source_showing(child);obs_source_dec_showing(source);ok=ok&&!obs_source_showing(child);}
 printf("Child browser visibility follows the source: %s\n",ok?"PASS":"FAIL");obs_source_release(source);
 obs_properties_destroy(props);obs_shutdown();return ok?0:4;
}
