/* Native transport integration harness; not shipped in the installer. */
#include <stdio.h>
#include "server.h"
int main(int argc,char **argv){if(argc!=3||!kogg_server_start(argv[1],argv[2]))return 2;char code[100],key[65];kogg_pair_code(code,sizeof(code));kogg_reader_key(key,sizeof(key));printf("{\"code\":\"%s\",\"reader\":\"%s\"}\n",code,key);fflush(stdout);char input[20];while(fgets(input,sizeof(input),stdin)){if(input[0]=='q')break;if(input[0]=='r')kogg_revoke();if(input[0]=='n')kogg_new_code();kogg_pair_code(code,sizeof(code));printf("{\"code\":\"%s\"}\n",code);fflush(stdout);}kogg_server_stop();return 0;}
