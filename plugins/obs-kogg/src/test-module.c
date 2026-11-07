/* Loads the actual plugin into libobs without starting or altering the user's OBS. */
#include <obs.h>
#include <stdio.h>
#include <string.h>
int main(int argc,char **argv){
 if(argc!=4)return 2;for(int i=1;i<4;i++)for(char *p=argv[i];*p;p++)if(*p=='\\')*p='/';if(!obs_startup("en-US",argv[3],NULL))return 2;
 obs_module_t *module=NULL;int result=obs_open_module(&module,argv[1],argv[2]);
 if(result||!obs_init_module(module)){fprintf(stderr,"Plugin load failed: %d\n",result);obs_shutdown();return 3;}
 obs_properties_t *props=obs_get_source_properties("kogg_presenter");
 obs_property_t *pair=obs_properties_get(props,"pair"),*feed=obs_properties_get(props,"feed");
 int ok=pair&&strlen(obs_property_description(pair))==8&&feed&&obs_property_list_item_count(feed)==4;
 printf("KOGG source registration and four output choices: %s\n",ok?"PASS":"FAIL");
 obs_properties_destroy(props);obs_shutdown();return ok?0:4;
}
