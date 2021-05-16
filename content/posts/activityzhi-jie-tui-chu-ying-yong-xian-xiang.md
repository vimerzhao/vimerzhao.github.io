---
title: "Activity直接退出应用现象"
date: 2017-07-14
type: post
isCJKLanguage: true
---

# Activity直接退出应用现象
Activity的退出顺序应该类似一个栈，但最近一次开发中却发现Activity直接退出了应用，这是为什么呢？
开发Android应用时，系统一般会维护一个回退栈，比如从A Activity点击进入了B Activity，从B退出时应该退回到A，但最近在做一个Demo时却发现Activity直接退出了：
![](http://ond7j4cnz.bkt.clouddn.com/blogmeizu-crash.gif)
Logcat报出如下异常
![](http://ond7j4cnz.bkt.clouddn.com/blogbackproblem1.png)
经过排查，发现是使用的Android Support v4包版本太旧，而这个异常退出就是老版本的Bug，只需要替换一个新一点的jar包，此外需把Gradle中的过期依赖删除：
![](http://ond7j4cnz.bkt.clouddn.com/blogbackproblem3.png)
运行，问题解决：
![](http://ond7j4cnz.bkt.clouddn.com/blogmeizu-fine.gif)
感觉Android就是不断踩坑啊；
Google+StackOverflow能解决99%的问题。
