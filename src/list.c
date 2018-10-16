#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <stdio.h>
#include <stdbool.h>
#include "list.h"

int list_init(struct list *l) {
    l->length = 0;
    l->list = NULL;
    return 0;
}

int list_get_value(const struct list *l, char *data) {
    int value = -1;
    struct node *current = l->list;
    while (current != NULL) {
        if (strcmp(current->data, data) == 0) {
            value = current->value;
            break;
        }
        current = current->next;
    }
    return value;
}

struct node *list_node_at(const struct list *l, unsigned index) {
    /* if there's no data in the list, fail */
    if (l->list == NULL) { return NULL; }
    struct node * current = l->list;
    for (; index > 0; index--) {
        if (current->next == NULL) { return NULL; }
        current = current->next;
    }
    return current;
}


int list_swap_item(struct node *n1, struct node *n2) {
    if (n1 == n2)
        return 1;
        
    if (n1 == NULL || n2 == NULL)
        return 1;
        
    int value = n2->value;
    char *data = strdup(n2->data);
    
    n2->value = n1->value;
    n2->data = realloc(n2->data, strlen(n1->data) + 1);
    if (n2->data)
        strcpy(n2->data, n1->data);
    
    n1->value = value;
    n1->data = realloc(n1->data, strlen(data) + 1);
    if (n1->data)
        strcpy(n1->data, data);
    
    free(data);
    return 0;
}

int list_shuffle(struct list *l) {
    int pos;
    int n = 0;

    if (l->length < 2)
        return 1;

    srand((unsigned int)time(NULL));
    
    struct node *current = l->list;
    while (current != NULL) {
        pos = rand() / (RAND_MAX / (l->length - n + 1) + 1);
        list_swap_item(current, list_node_at(l, pos));
        n++;
        current = current->next;
    }
    return 0;
}

int list_order(struct list *l, bool order) {
    int swapped; 
    struct node *ptr1; 
    struct node *lptr = NULL; 
  
    if (l->list == NULL) 
        return 1; 
  
    do { 
        swapped = 0; 
        ptr1 = l->list;
  
        while (ptr1->next != lptr)  { 
            if (order == true && ptr1->value > ptr1->next->value) {  
                list_swap_item(ptr1, ptr1->next); 
                swapped = 1; 
            } 
            else if (order == false && ptr1->value < ptr1->next->value) {  
                list_swap_item(ptr1, ptr1->next); 
                swapped = 1; 
            } 
            ptr1 = ptr1->next; 
        } 
        lptr = ptr1; 
    } 
    while (swapped);
    return 0; 
}

int list_replace(struct list *l, int pos, char *data, int value) {
    int i = 0;
    struct node *current = l->list;
    while (current->next != NULL) {
        if (i == pos)
            break;
        current = current->next;
        i++;
    }
    
    current->value = value;
    current->data = realloc(current->data, strlen(data) + 1);
    if (current->data)
        strcpy(current->data, data);
    return 0;
}

int list_push(struct list *l, char *data, int value) {
    struct node *n = malloc(sizeof(struct node));
    n->value = value;
    n->data = strdup(data);
    n->next = NULL;

    struct node **next = &l->list;
    while (*next != NULL) {
        next = &(*next)->next;
    }
    *next = n;
    l->length++;
    return 0;
}

int list_free(struct list *l) {
    struct node *current = l->list, *tmp = NULL;
    while (current != NULL) {
        free(current->data);
        tmp = current;
        current = current->next;
        free(tmp);
    }
    list_init(l);
    return 0;
}
