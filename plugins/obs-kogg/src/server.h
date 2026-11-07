#pragma once
#include <stdbool.h>
bool kogg_server_start(const char *root, const char *config);
void kogg_server_stop(void);
void kogg_pair_code(char *out, unsigned size);
void kogg_new_code(void);
void kogg_revoke(void);
void kogg_reader_key(char *out, unsigned size);
void kogg_reader_count(int delta);
#define KOGG_PORT 8767
