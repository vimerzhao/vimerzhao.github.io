---
title: "大端（Big Endian）与小端（Little Endian）"
date: 2017-04-27
type: post
isCJKLanguage: true
---

# 大端（Big Endian）与小端（Little Endian）
本文记录了计算机中存在的两种数据存储模式及其对网络编程的影响。
## 内存抽象
在较高层次上，可以把内存抽象成一个很大的数组。唯一不同的是，一个元素(element)在数组中位置我们一般称为索引(index)，而在内存中则称为地址(address)，他们的本质是相同的。

## 什么是端
考虑这样一个问题，一个整形数`0x90AB12CD`在内存中占据四个字节（注意内存的元素是字节），那么假设它的第一个字节的地址为`1000`，那么它就有两种存储方式，如下图：
![](http://ond7j4cnz.bkt.clouddn.com/blogbig%20and%20little%20endian.png)
由图可知，所谓大端就是地址从低到高依次从左到右存储序列；小端正好相反。

## 为什么要重视端
在一台计算机上，无论采用大端还是小端，都可以正确表示数据。但几乎没有计算机不是连在网络中的，考虑如果两台设备采用不同的机制，那么他们就会对`0x90AB12CD`做出完全不同的解释，这是灾难性的！

## 检测本机端的类型
实际上，可以通过上面的例子设计一段代码检测本机端的类型：
```c
#include <stdio.h>
int main(int argc, char const* argv[]) {
    unsigned short int x = 0x1122;
    if (*((unsigned short int*)&x) == 0x11) {
        printf("Big Endian\n");
    } else {
        printf("Little Endian\n");
    }
    return 0;
}

```

## 一个端冲突的例子
之所以写这篇博客，就是在最近写的一个抓包程序中遇到了此类问题。在网络传输中，通常默认采用大端序或者说网络序(network byte order)。以我抓到的一个IPv6包为例
```
