---
title: "新手程序员的恶习：不了解自己调用的API"
date: 2018-08-20
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 新手程序员的恶习：不了解自己调用的API

记录了自己在第一个需求灰度后的一些感受。
在自己的第一个需求灰度后，发现Crash率严重超标，虽然排查之后发现主要是其他人合入的需求导致的，但也确实发现了两个自己导致的Bug，由于触发Bug的条件比较极端（见下文），所以测试并没有发现。
## 问题一：未Catch异常
第一个错误是在读取配置的时候如果没有配置会返回`null`，而自己的代码：
```
    ...Integer.valueOf(Settings.get(key))...
```
并没有处理这个`NumberFormatException`，导致出现了Crash。由于这个操作是在退出APP的时候执行的，而从后台拉取配置则是APP启动时执行，所以必须在启动之后（拉取到配置之前）立即退出APP，这种情况很难触发，但是客观存在。


## 问题二：胡乱设置参数
背景是需要通过Apk包名获取对应APP的名称和图标，当时参考了StackOverflow后通过如下代码实现：
```
        PackageManager pm = getPackageManager();
        try {
            PackageInfo packageInfo = pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
            if (packageInfo != null) {
                ...packageInfo.applicationInfo.loadIcon(pm)..
                ...packageInfo.applicationInfo.loadLabel(pm).toString()...
            }
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
```
测试的时候也没有发现问题，结果灰度后发现一个`TransactionTooLargeException`，经过排查以后发现是因为`PackageManager.GET_ACTIVITIES`这个参数会导致大量数据（包名对应APP的全部Activity信息）返回，超过Binder的限制（1M左右）。一般的APP都不会（但QQ这种Activity较多的就有可能），所以灰度了几万用户后也只发现了一例，但这里其实反映了两个问题：
1、测试人员有义务对这种极端情况（边界）测试，但实际没有。
2、自己作为开发，并没有取仔细阅读这部分的文档，没有弄清楚`getPackageInfo`第二个参数（`flag`）的含义。
其实自己只是需要APP的名称和图标，使用`pm.getApplicationInfo(packageName, 0)`即可，而上面的实现虽然也能达到目的，但是参杂了大量冗余，增大了出Bug的风险。

## 总结
第一个问题是非常低级的错误，第二错误是因为自己只追求结果而忽略了过程。以前大学有门生产实习课我觉得很水，但有一句话我一直记着：（上下文是老师的一个同事因为Copy开源代码导致一个复杂的Bug，进而影响项目进度，带来经济损失）就算是Copy也要知道自己Copy的每一行代码是什么意思。**学生时代，总是急于实现功能，一些极端情况往往没有场景来触发（因为没有大量用户），导致不够重视代码的鲁棒性；另一方面，浅尝辄止，没有全面深入了解自己使用的API、API背后的原理，导致一些奇怪的问题。**
希望自己引以为戒。

