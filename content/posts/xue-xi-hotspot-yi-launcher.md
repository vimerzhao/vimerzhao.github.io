---
title: "学习HotSpot（一）：Launcher"
date: 2017-05-29
type: post
isCJKLanguage: true
---

# 学习HotSpot（一）：Launcher
《Java虚拟机精讲》学习笔记：剖析HotSpot的Launcher。

## HotSpot源码目录
可以用`tree`命令查看源码层次，对源码层次有一定印象有助于学习每个功能模块的实现。以下是一个参考：

```
hotspot
├─agent                            Serviceability Agent的客户端实现
├─make                             用来build出HotSpot的各种配置文件
├─src                              HotSpot VM的源代码
│  ├─cpu                            CPU相关代码（汇编器、模板解释器、ad文件、部分runtime函数在这里实现）
│  ├─os                             操作系相关代码
│  ├─os_cpu                         操作系统+CPU的组合相关的代码
│  └─share                          平台无关的共通代码
│      ├─tools                        工具
│      │  ├─hsdis                      反汇编插件
│      │  ├─IdealGraphVisualizer       将server编译器的中间代码可视化的工具
│      │  ├─launcher                   启动程序“java”
│      │  ├─LogCompilation             将-XX:+LogCompilation输出的日志（hotspot.log）整理成更容易阅读的格式的工具
│      │  └─ProjectCreator             生成Visual Studio的project文件的工具
│      └─vm                           HotSpot VM的核心代码
│          ├─adlc                       平台描述文件（上面的cpu或os_cpu里的*.ad文件）的编译器
│          ├─asm                        汇编器接口
│          ├─c1                         client编译器（又称“C1”）
│          ├─ci                         动态编译器的公共服务/从动态编译器到VM的接口
│          ├─classfile                  类文件的处理（包括类加载和系统符号表等）
│          ├─code                       动态生成的代码的管理
│          ├─compiler                   从VM调用动态编译器的接口
│          ├─gc_implementation          GC的实现
│          │  ├─concurrentMarkSweep      Concurrent Mark Sweep GC的实现
│          │  ├─g1                       Garbage-First GC的实现（不使用老的分代式GC框架）
│          │  ├─parallelScavenge         ParallelScavenge GC的实现（server VM默认，不使用老的分代式GC框架）
│          │  ├─parNew                   ParNew GC的实现
│          │  └─shared                   GC的共通实现
│          ├─gc_interface               GC的接口
│          ├─interpreter                解释器，包括“模板解释器”（官方版在用）和“C++解释器”（官方版不在用）
│          ├─libadt                     一些抽象数据结构
│          ├─memory                     内存管理相关（老的分代式GC框架也在这里）
│          ├─oops                       HotSpot VM的对象系统的实现
│          ├─opto                       server编译器（又称“C2”或“Opto”）
│          ├─prims                      HotSpot VM的对外接口，包括部分标准库的native部分和JVMTI实现
│          ├─runtime                    运行时支持库（包括线程管理、编译器调度、锁、反射等）
│          ├─services                   主要是用来支持JMX之类的管理功能的接口
│          ├─shark                      基于LLVM的JIT编译器（官方版里没有使用）
│          └─utilities                  一些基本的工具类
└─test                             单元测试
```

## Launcher简介
Launcher是一种用于启动JVM进程的启动器，包括正式版的`java`（OracleJDK，/jdk/src/share/bin/main.c）和OpenJDK的`gamma`（/hotspot/src/share/tools/launcher/java.c），这里我们用`gamma`，两者其实没什么区别。
Launcher并不是HotSpot的核心，但Launcher负责维护HotSpot的整个生命周期，包括初始化环境以及销毁虚拟机等。所以，这里对Launcher的学习就是从整体上了解HotSpot，**不要纠结与某个变量的意义，只需要清楚每个函数的功能，明确程序的执行流程就可以了**。与此对应，在下面的调试中，基本都是`next`而不是`step`，因为我们不需要进入每个函数知道实现细节。

## Launcher执行过程概述
这里给出Launcher的执行过程，要加深理解还是要自己自己调试一遍HotSpot中这部分的源码。
![](http://ond7j4cnz.bkt.clouddn.com/bloghotspot-launcher.png)

## 跟踪Launcher的执行
这里我使用的是vim+gdb，可能有些人觉得IDE（网上能找到一些用NetBeans调试的教程）更方便，这个因人而异，只要自己觉得顺手就行了。
首先，我们需要设置自己需要的断点，修改`hotspot`脚本即可：
![](http://ond7j4cnz.bkt.clouddn.com/blog01-launcher-debug.png)

我们可以写一个简单的Java程序编译成字节码，再来用hotspot虚拟机加载。如：
```
public class Main {
    public static void main(String args[]) {
        System.out.println("Hello World");
    }
}
```

### 启动函数`main()`
执行脚本`./hotspot -gdb Main`
![](http://ond7j4cnz.bkt.clouddn.com/blog02-launcher-debug.png)
`main()`函数要做的第一件事就是创建运行环境：
![](http://ond7j4cnz.bkt.clouddn.com/blog04-launcher-debug.png)
然后调用`JavaMain()`执行接下来的工作：
![](http://ond7j4cnz.bkt.clouddn.com/blog05-launcher-debug.png)

### 在主线程中执行`JavaMain()`函数
`JavaMain()`首先调用`InitializeJVM()`初始化：
![](http://ond7j4cnz.bkt.clouddn.com/blog07-launcher-debug.png)

### 调用`JNI_CreateJavaVM()`函数初始化HotSpot
`InitializeJVM()`实际调用`JNI_CreateJavaVM()`完成初始化工作：
![](http://ond7j4cnz.bkt.clouddn.com/blog08-launcher-debug.png)
初始化过程中还创建了一些线程，现在不需要知道干嘛的：
![](http://ond7j4cnz.bkt.clouddn.com/blog09-launcher-debug.png)
初始化结束，返回`JavaMain()`
![](http://ond7j4cnz.bkt.clouddn.com/blog10-launcher-debug.png)

### 调用`LoadClass()`函数获取Java启动类
如下图：
![](http://ond7j4cnz.bkt.clouddn.com/blog11-launcher-debug.png)

### 调用`GetStaticMethodId()`函数获取Java启动方法
如下图：
![](http://ond7j4cnz.bkt.clouddn.com/blog12-launcher-debug.png)

### 调用`CallStaticVoidMethod()`函数执行启动方法
如下图：
![](http://ond7j4cnz.bkt.clouddn.com/blog13-launcher-debug.png)
执行结果：
![](http://ond7j4cnz.bkt.clouddn.com/blog14-launcher-debug.png)

### 调用`JNI_DestroyJavaVM()`函数销毁HotSpot
如下图：
![](http://ond7j4cnz.bkt.clouddn.com/blog15-launcher-debug.png)
销毁线程：
![](http://ond7j4cnz.bkt.clouddn.com/blog16-launcher-debug.png)

## 总结
直接执行如下：
![](http://ond7j4cnz.bkt.clouddn.com/blog17-launcher-debug.png)
因为我们在单步执行，所以获取了更丰富的输出信息。
可见，我们平时用`java`执行一个Java程序的背后有着非常复杂的流程，对于一个初级开发者不要关心，但随着学习的深入，必须了解底层的机制才能写出更好的代码，这是一个程序员的自我修养。
