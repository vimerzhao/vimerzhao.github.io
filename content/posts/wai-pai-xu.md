---
title: "外排序"
date: 2017-03-20
type: post
isCJKLanguage: true
---

# 外排序
初探如何对大规模数据进行排序。

## 问题
问题描述很简单，如何对大规模数据进行排序，比如说一个30G的文件。
## 分析
解决这个问题主要要解决两件事。第一件就是大文件显然无法一次读入内存，所以只能一次读入一部分，排好序，输出存储，再对下一部分排序。原理如下图:
![](http://p1.bpimg.com/519918/1331c618becccb7f.png)
然后就可以利用已经排序好的文件，边排序边归并，称为K路归并。如下图:
![](http://p1.bqimg.com/519918/7fef4fc2cc980202.png)
![](http://p1.bpimg.com/519918/3dcc69a9b044c394.png)
需要说明的是图中数字不是弹出文件了，只是为了显示方便。实际就是不断向下读取。
为什么要用堆排序呢？主要是每次都是写出写入一个数据，如果每次都重新排序显然没有必要，要充分利用已有的信息，如上图，第二次排序时右边显然不需要重复比较。
## 代码
```cpp
/*
 * Function:    External Sort Demo
 * Environment: LinuxMint/g++5.4.0
 * Date:        2017-3-20
 * Author:      zhaoyu/DUT
 */
#include <bits/stdc++.h>
using namespace std;
typedef double ElemType;

#define HEAP_SIZE 10000000
#define K_WAYS 10
#define IN_FORMAT "%lf"
#define OUT_FORMAT "%.2lf\n"

struct MinHeapNode {
    ElemType element;
    int index;
};

void swap(MinHeapNode *x, MinHeapNode *y);

class MinHeap {
    MinHeapNode* harr;  // pointer to array of elements in heap
    int heap_size;      // size of min heap

public:
    MinHeap(MinHeapNode a[], int size);
    void MinHeapify(int);
    int left(int i) { return (2 * i + 1); }
    int right(int i) { return (2 * i + 2); }
    MinHeapNode getMin() { return harr[0]; }
    void replaceMin(MinHeapNode x) {
        harr[0] = x;
        MinHeapify(0);
    }
};

MinHeap::MinHeap(MinHeapNode a[], int size) {
    heap_size = size;
    harr = a;
    for (int i = (heap_size-1)/2; i >= 0; i--) {
        MinHeapify(i);
    }
}

void MinHeap::MinHeapify(int i) {
    int l = left(i);
    int r = right(i);
    int smallest = i;
    if (l < heap_size && harr[l].element < harr[i].element) {
        smallest = l;
    }
    if (r < heap_size && harr[r].element < harr[smallest].element) {
        smallest = r;
    }
    if (smallest != i) {
        swap(&harr[i], &harr[smallest]);
        MinHeapify(smallest);
    }
}

FILE *openFile(const char *fileName, const char *mode);
void closeFile(FILE *fp);
void sliceFile(const char *in_file);
void mergeFiles(const char *out_file);
void externalSort(const char *in_file, const char *out_file);
ElemType randNumber(void);

int main(int argc, char const* argv[]) {
    const char *in_file = "in.txt";
    const char *out_file = "out.txt";
    FILE *fin = openFile(in_file, "w");
    clock_t begin, end_rand, end_sort;
    begin = clock();
    srand((unsigned)time(NULL));
    for (int i = 0; i < K_WAYS*HEAP_SIZE; i++) {
        fprintf(fin, "%.2f\n", randNumber());
    }
    closeFile(fin);
    end_rand = clock();
    externalSort(in_file, out_file);
    end_sort = clock();
    printf("Generate Time:%.5lf\n", (end_rand - begin)*1.0/CLOCKS_PER_SEC);
    printf("Sort Time:%.5lf\n", (end_sort - end_rand)*1.0/CLOCKS_PER_SEC);
    return 0;
}

void swap(MinHeapNode *x, MinHeapNode *y) {
    MinHeapNode temp = *x;
    *x = *y;
    *y = temp;
}

FILE *openFile(const char *fileName, const char *mode) {
    FILE *fp = fopen(fileName, mode);
    if (fp == NULL) {
        fprintf(stderr, "Error while opening %s\n", fileName);
        exit(EXIT_FAILURE);
    }
    return fp;
}

void closeFile(FILE *fp) {
    if (fclose(fp) != 0) {
        fprintf(stderr, "CLOSE ERROR\n");
        exit(EXIT_FAILURE);
    }
}

ElemType randNumber(void) {
    return (ElemType) (rand()/10.0*9.0);
}

int comp(const void *p1, const void *p2) {
    return *((ElemType *)p1) - *((ElemType *)p2);
}

void sliceFile(const char *in_file) {
    FILE *fin = openFile(in_file, "r");
    FILE *fout[K_WAYS];
    char fileName[2];

    for (int i = 0; i < K_WAYS; i++) {
        // convert i to string
        snprintf(fileName, sizeof(fileName), "%d", i);
        fout[i] = openFile(fileName, "w");
    }

    ElemType *arr = (ElemType*) malloc(HEAP_SIZE * sizeof(ElemType));
    bool moreInput = true;
    int nextOutputFile = 0;

    while (moreInput) {
        int i;
        for (i = 0; i < HEAP_SIZE; i++) {
            if (fscanf(fin, "%lf", (arr+i)) != 1) {
                moreInput = false;  // end of input file.
                break;
            }
        }
        // Attention: last i may less than HEAP_SIZE.
        qsort(arr, i, sizeof(ElemType), comp);
        for (int j = 0; j < i; j++) {
            fprintf(fout[nextOutputFile], OUT_FORMAT, arr[j]);
        }
        nextOutputFile++;
    }

    free(arr);
    for (int i = 0; i < K_WAYS; i++) {
        closeFile(fout[i]);
    }
    closeFile(fin);
}

void mergeFiles(const char *out_file) {
    FILE *fin[K_WAYS];
    for (int i = 0; i < K_WAYS; i++) {
        char fileName[2];
        snprintf(fileName, sizeof(fileName), "%d", i);
        fin[i] = openFile(fileName, "r");
    }
    FILE *fout = openFile(out_file, "w");

    // Use MinHeap to Sort K files.
    MinHeapNode *harr = new MinHeapNode[K_WAYS];
    int i;
    for (i = 0; i < K_WAYS; i++) {
        if (fscanf(fin[i], IN_FORMAT, &harr[i].element) != 1) {
            break;
        }
        harr[i].index = i;
    }

    MinHeap hp(harr, i);
    int count = 0; // sorted files.
    while (count != i) {
        MinHeapNode root = hp.getMin();
        fprintf(fout, OUT_FORMAT, root.element);
        if (fscanf(fin[root.index], IN_FORMAT, &root.element) != 1) {
            root.element = INT_MAX*1.0;
            count++;
        }
        hp.replaceMin(root);
    }
    delete []harr;
    for (int i = 0; i < K_WAYS; i++) {
        closeFile(fin[i]);
    }
    closeFile(fout);
}

void externalSort(const char *in_file, const char *out_file) {
    sliceFile(in_file);

    mergeFiles(out_file);
}
```
## 验证
如何验证程序是否正确？肉眼比对显然不是程序员该做的！可以设定一个较小的数据集（节省时间），利用系统自带的`sort`进行排序，然后利用`diff`比较自己程序输出和`sort`的输出，如果一样说明程序正确！既方便又准确。
Perl语言的发明人Larry Wall说
> 好的程序员有3种美德: 懒惰、急躁和傲慢（Laziness, Impatience and hubris）。

放在这里也颇为贴切。
此外还可以用`time`以及在程序内设置代码，统计排序时间。如下，在我的电脑（固态硬盘）上产生1亿个`double`类型的数字花了68.9s，排序花了210.52s。文件大小为1.3G。如果想产生更多的数就需要使用`long long`了，因为我电脑上`INT_MAX`为`2147483647`。
```
zhaoyu@Dell ~/codelab/DiffLab $ time ./a.out
Generate Time:68.90660
Sort Time:210.52112

real    4m39.649s
user    4m36.556s
sys 0m2.876s

zhaoyu@Dell ~/codelab/DiffLab $ ls  -lht
total 3.8G
-rw-r--r-- 1 zhaoyu zhaoyu 5.0K 3月  20 19:04 Sort.cpp
-rw-r--r-- 1 zhaoyu zhaoyu 1.3G 3月  20 19:01 out.txt
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 0
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 1
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 2
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 3
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 4
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 5
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 6
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 7
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 8
-rw-r--r-- 1 zhaoyu zhaoyu 129M 3月  20 19:00 9
-rw-r--r-- 1 zhaoyu zhaoyu 1.3G 3月  20 18:58 in.txt
-rwxr-xr-x 1 zhaoyu zhaoyu  15K 3月  20 18:56 a.out
```
## 总结
堆排不熟练，库函数使用不熟练，但必须动手，不动手永远不会。

## 参考
1. [External Sorting](http://www.geeksforgeeks.org/external-sorting/)
2. [常见排序算法 - 堆排序 (Heap Sort)](http://bubkoo.com/2014/01/14/sort-algorithm/heap-sort/)
3. [堆排序](https://zh.wikipedia.org/wiki/%E5%A0%86%E6%8E%92%E5%BA%8F)
4. [懒惰、急躁和傲慢（Laziness, Impatience and hubris）](http://www.ruanyifeng.com/blog/2006/05/laziness_impatience_and_hubris.html)
