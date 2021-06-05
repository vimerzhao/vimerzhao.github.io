---
title: "OpenJDK7u40编译与调试实战"
date: 2017-05-28
type: post
isCJKLanguage: true
categories:
    - "源码剖析"
---

# OpenJDK7u40编译与调试实战
记录了第一次编译调试OpenJDK的经过。

## JDK与OpenJDK的关系
简单来说，OpenJDK是OracleJDK（也就是我们平时用的Java JDK，由Oracle公司管理，所以又称为OracleJDK）的一个开源版本，OpenJDK的内容基本和OracleJDK基本一样，但OracleJDK有部分商业代码，不能公开，所以OpenJDK对这部分代码进行了重写（只占很少一部分）。所以，可以认为OpenJDK和OracleJDK没有本质区别。
要更详细了解两者关系，可查查阅相关文档。

## 学习OpenJDK的意义
说一个最直接的例子，我在参加阿里面试的时候，一面、二面面试官均问了一些关于JVM虚拟机的问题，我一个也没答上来，虽然说了解虚拟机的本科生本来就凤毛麟角，但并不能以此为借口。
从技术的角度来说，研究OpenJDK有助于了解Java底层的机制，就算用Java写过几万行代码，只要没了解虚拟机也就算不上高手，只要遇到如虚拟机内存耗尽的问题照样无从下手。
OpenJDK中最核心的技术就是虚拟机，Java语言可能会被淘汰、被超越，但虚拟机不会。下面是一张JVM生态圈的截图：
![](http://ond7j4cnz.bkt.clouddn.com/blogjvm-lang.png)
可以看到，很多有前景的语言都是基于JVM的，比如前不久取代Java成为Android官方开发语言的Kotlin，以及Scala等已经取得成功的语言，所以，研究JVM对于将来学习其他语言也很有帮助。


## 编译OpenJDK的步骤
在《Java虚拟机精讲》有这么一段：
![](http://ond7j4cnz.bkt.clouddn.com/blogopenjdk-2017-5-28.png)
我第一次花了两天时间搞定了所有问题，虽然花了不少时间，但带来的**收获和成就感**绝对不是所花的时间能衡量的。纸上得来终觉浅，只有在实践中才能发现问题，我在下面的每一个环节中都遇到了问题，而且书上都没提到。最关键的一点就是，不要放弃：
![](http://ond7j4cnz.bkt.clouddn.com/blogopenjdk-weibo.png)
我的操作系统Ubuntu12.04-i386

### 下载源码
关于下载源码的一些问题：书上给的下载链接已经不可用了，更准确说是官方网站已经不提供下载了，但可以在Oracle的网站上找到相关源码，也可在网上搜到别人以前下载并分享出来的，比如我用的就是别人分享到百度云的（见参考链接）。
此外，有些源码包可能不完整。

### 构建编译环境
一般现在能找到的教程都是用Ubuntu14.04或者Ubuntu12.04构建编译环境的，我一开始在LinuxMint18.1（也就是我实际的机器上）构建环境，发现各种依赖问题无法解决，而且因为版本太新没有前人经验可以参考，所以一直失败，建议在虚拟机里面装一个Ubuntu来构建编译环境。

> 提示：一些教程中 X11proto-print-dev 应该为 x11proto-print-dev，真是坑死人不偿命。

> 提示：在root(输入sudo su)下执行各种配置，否则会出现奇怪问题。

一个可供参考的依赖构建（因为每个人环境不同，可能有人的能一次成功，有的人不能，自己摸索）

```
sudo apt-get build-dep openjdk-7
sudo apt-get install openjdk-7-jdk

sudo apt-get install build-essential gawk m4 libasound2-dev libcups2-dev libxrender-dev xorg-dev xutils-dev x11proto-print-dev ant
```

LinuxMint18.1下的依赖问题：
![](http://ond7j4cnz.bkt.clouddn.com/blogopenjdk-dependency.png)

### make配置检查
编译之前需要配置编译参数，以下是一个参考，路径需要做修改

```
#!/bin/bash
#设定语言选项
export LANG=C
## 定义Bootstrap JDK路径
export ALT_BOOTDIR=/usr/lib/jvm/jdk1.6.0_45
## 允许编译过程中下载相关依赖
export ALLOW_DOWNLOADS=true

export HOST_BUILD_JOBS=4
## 加速编译
export USE_PRECOMPILED_HEADER=true

## 编译内容
export BUILD_LANGTOOLS=true
export BUILD_JAXP=true
export BUILD_JAXWS=true
export BUILD_CORBA=true
export BUILD_HOTSPOT=true
export BUILD_JDK=true

## 不导出安装包
export BUILD_INSTALL=false
## 编译后存储路径
export ALT_OUTPUTDIR=/home/zhaoyu/Documents/build

unset JAVA_HOME
unset CLASSPATH

export WARNINGS_ARE_ERRORS=false
export SKIP_DEBUG_BUILD=false
export SKIP_FASTDEBUG_BUILD=true
export DEBUG_NAME=debug
```
设定成功后执行`make sanity`，编译通过如下：
![](http://ond7j4cnz.bkt.clouddn.com/blogopenjdk-001.png)
如果依赖构建成功，一般都会通过，如果失败了**应该根据错误信息寻找原因**。此外，编译通过依然不代表能编译成功。

### 编译OpenJDK
编译通过执行`make`：
![](http://ond7j4cnz.bkt.clouddn.com/blogopenjdk-make.gif)
这里可能会有一个问题：
![](http://ond7j4cnz.bkt.clouddn.com/blogopenjdk-10years.png)
是因为某个文件(见参考链接)的时间配置问题（说明我编译的JDK太老了），只需要手动修改时间配置：
![](http://ond7j4cnz.bkt.clouddn.com/blogopenjdk-modify-date.png)
具体如何修改见参考链接或者自己搜索。
清理下失败的编译`make clean`。如果遇到：
```
This OS is not supported:" `uname -a`; exit 1;"
```

是因为OpenJDK7u40版本已经比较老了，而最新的Linux一般都是4.4+的内核，所以需要修改`hotspot/make/linux/Makefile`：
```
SUPPORTED_OS_VERSION = 2.4% 2.5% 2.6% 2.7% 3% 4.4% #添加本机内核版本
```

再次编译`make`，成功了最后会输出：

```
#-- Build times ----------
Target debug_build
Start 2017-05-27 22:27:39
End   2017-05-27 22:52:31
00:00:43 corba
00:13:24 hotspot
00:00:10 jaxp
00:00:13 jaxws
00:10:02 jdk
00:00:20 langtools
00:24:52 TOTAL
