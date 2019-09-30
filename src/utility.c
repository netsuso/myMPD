/* myMPD
   (c) 2018-2019 Juergen Mang <mail@jcgames.de>
   This project's homepage is: https://github.com/jcorporation/mympd
   
   myMPD ist fork of:
   
   ympd
   (c) 2013-2014 Andrew Karpow <andy@ndyk.de>
   This project's homepage is: http://www.ympd.org
   
   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; version 2 of the License.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License along
   with this program; if not, write to the Free Software Foundation, Inc.,
   Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

#include <string.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <dirent.h>
#include <pthread.h>
#include <sys/stat.h>

#include "../dist/src/sds/sds.h"
#include "log.h"
#include "utility.h"

sds jsonrpc_start_notify(sds buffer, const char *method) {
    buffer = sdscatprintf(sdsempty(), "{\"jsonrpc\":\"2.0\",\"method\":");
    buffer = sdscatrepr(buffer, method, strlen(method));
    buffer = sdscat(buffer, ",params:{");
    return buffer;
}

sds jsonrpc_end_notify(sds buffer) {
    buffer = sdscatprintf(buffer, "}}");
    return buffer;
}

sds jsonrpc_start_result(sds buffer, const char *method, int id) {
    buffer = sdscatprintf(sdsempty(), "{\"jsonrpc\":\"2.0\",\"id\":%d,\"result\":{\"method\":", id);
    buffer = sdscatrepr(buffer, method, strlen(method));
    buffer = sdscat(buffer, ",data:");
    return buffer;
}

sds jsonrpc_end_result(sds buffer) {
    buffer = sdscatprintf(buffer, "}}");
    return buffer;
}

sds jsonrpc_respond_ok(sds buffer, const char *method, int id) {
    buffer = sdscatprintf(sdsempty(), "{\"jsonrpc\":\"2.0\",\"id\":%d,\"result\":{\"method\":", id);
    buffer = sdscatrepr(buffer, method, strlen(method));
    buffer = sdscat(buffer, ",\"data\":\"ok\"}}");
    return buffer;
}

sds jsonrpc_respond_message(sds buffer, const char *method, int id, const char *message, bool error) {
    buffer = sdscatprintf(sdsempty(), "{\"jsonrpc\":\"2.0\",\"id\":%d,\"%s\":{\"method\":", 
        id, (error == true ? "error" : "result"));
    buffer = sdscatrepr(buffer, method, strlen(method));
    buffer = sdscat(buffer, ",\"data\":");
    buffer = sdscatrepr(buffer, message, strlen(message));
    buffer = sdscatprintf(buffer, "}}");
    return buffer;
}

sds jsonrpc_respond_message_notify(sds buffer, const char *message, bool error) {
    buffer = sdscatprintf(sdsempty(), "{\"jsonrpc\":\"2.0\",\"%s\":{", 
        id, (error == true ? "error" : "result"));
    buffer = sdscat(buffer, "\"data\":");
    buffer = sdscatrepr(buffer, message, strlen(message));
    buffer = sdscatprintf(buffer, "}}");
    return buffer;
}

sds jsonrpc_start_phrase(sds buffer, const char *method, int id, const char *message, bool error) {
    buffer = sdscatprintf(sdsempty(), "{\"jsonrpc\":\"2.0\",\"id\":%d,\"%s\":{\"method\":", 
        id, (error == true ? "error" : "result"));
    buffer = sdscatrepr(buffer, method, strlen(method));
    buffer = sdscat(buffer, ",\"data\":");
    buffer = sdscatrepr(buffer, message, strlen(message));
    buffer = sdscat(buffer, ",\"values\":{");
    return buffer;
}

sds jsonrpc_end_phrase(sds buffer, int id, const char *error) {
    buffer = sdscat(buffer, "}}}");
    return buffer;
}

sds jsonrpc_start_phrase_notify(sds buffer, const char *message, bool error) {
    buffer = sdscatprintf(sdsempty(), "{\"jsonrpc\":\"2.0\",\"%s\":{", 
        id, (error == true ? "error" : "result"));
    buffer = sdscat(buffer, ",\"data\":");
    buffer = sdscatrepr(buffer, message, strlen(message));
    buffer = sdscat(buffer, ",\"values\":{");
    return buffer;
}

sds tojson_char(sds buffer, const char *key, const char *value, bool comma) {
    buffer = sdscatprintf(buffer, "\"%s\":", key);
    buffer = sdscatrepr(buffer, value, strlen(value));
    if (comma) {
        buffer = sdscat(buffer, ",");
    }
    return buffer;
}

sds tojson_char_len(sds buffer, const char *key, const char *value, size_t len bool comma) {
    buffer = sdscatprintf(buffer, "\"%s\":", key);
    buffer = sdscatrepr(buffer, value, len);
    if (comma) {
        buffer = sdscat(buffer, ",");
    }
    return buffer;
}

sds tojson_bool(sds buffer, const char *key, bool value, bool comma) {
    buffer = sdscatprintf(buffer, "\"%s\":%s", key, value == true ? "true" : "false");
    if (comma) {
        buffer = sdscat(buffer, ",");
    }
    return buffer;
}

sds tojson_long(sds buffer, const char *key, long value, bool comma) {
    buffer = sdscatprintf(buffer, "\"%s\":%ld", key, value);
    if (comma) {
        buffer = sdscat(buffer, ",");
    }
    return buffer;
}

int testdir(const char *name, const char *dirname, bool create) {
    DIR* dir = opendir(dirname);
    if (dir) {
        closedir(dir);
        LOG_INFO("%s: \"%s\"", name, dirname);
        //directory exists
        return 0;
    }
    else {
        if (create == true) {
            if (mkdir(dirname, 0700) != 0) {
                LOG_ERROR("%s: creating \"%s\" failed", name, dirname);
                //directory not exists and creating it failed
                return 2;
            }
            else {
                LOG_INFO("%s: \"%s\" created", name, dirname);
                //directory successfully created
                return 1;
            }
        }
        else {
            LOG_ERROR("%s: \"%s\" don't exists", name, dirname);
            //directory not exists
            return 3;
        }
    }
}

int randrange(int n) {
    return rand() / (RAND_MAX / (n + 1) + 1);
}

bool validate_string(const char *data) {
    if (strchr(data, '/') != NULL || strchr(data, '\n') != NULL || strchr(data, '\r') != NULL ||
        strchr(data, '"') != NULL || strchr(data, '\'') != NULL || strchr(data, '\\') != NULL) {
        return false;
    }
    return true;
}

int replacechar(char *str, const char orig, const char rep) {
    char *ix = str;
    int n = 0;
    while ((ix = strchr(ix, orig)) != NULL) {
        *ix++ = rep;
        n++;
    }
    return n;
}
