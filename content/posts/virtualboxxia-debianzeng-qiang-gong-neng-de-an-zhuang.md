---
title: "VirtualBox下Debian增强功能的安装"
date: 2017-06-14
type: post
isCJKLanguage: true
---

# VirtualBox下Debian增强功能的安装
本文记录了如何为VirtualBox里面的Debian虚拟机安装增强功能。

## 问题记录
之前写过一篇博客记录了VirtualBox下安装增强功能的问题，是在Ubuntu上，当时主要是VirtualBox的问题，这次客户机是Debian，情况稍有不同，因为Ubuntu操作比较傻瓜式，基本自动安装，Debian就需要手动配置，还可能是因为我下载的安装版本比较精简（比Ubuntu少了几百兆），所以缺失了一些依赖。故此 ，花了些时间才得以解决。
一开始尝试运行`autorun.sh`脚本，发现毫无效果，查阅一些资料发现并不是这个。这个脚本在Ubuntu这样的系统上应该可以运行成功，是比较通用的安装脚本(猜测)。
![](http://ond7j4cnz.bkt.clouddn.com/blogvirtualbox-debian01.png)
接下来查阅了一些资料，发现需要安装编译依赖和内核头文件（虽然具体也不知道干嘛的）
```
## 打开一个root终端：
apt-get install build-essential
apt-get install linux-headers-$(uname -r)
sh /media/cdrom0/VBoxLinuxAdditions.run
```
安装`build-essential`:
![](http://ond7j4cnz.bkt.clouddn.com/blogvirtualbox-debian02.png)

直接执行脚本失败:
![](http://ond7j4cnz.bkt.clouddn.com/blogvirtualbox-debian03.png)

根据错误信息安装内核头文件:
![](http://ond7j4cnz.bkt.clouddn.com/blogvirtualbox-debian04.png)

再次执行成功:
![](http://ond7j4cnz.bkt.clouddn.com/blogvirtualbox-debian05.png)

重启:
![](http://ond7j4cnz.bkt.clouddn.com/blogvirtualbox-debian06.png)

## 总结
关键是分析问题、分析报错信息，把错误信息贴出来检索。直接搜索`Debian VirtualBox 安装增强功能`效果也不错。

## 参考
- [[Solved] Guest Additions' autorun.sh does not work](https://forums.virtualbox.org/viewtopic.php?f=3&t=46127)
- [VirtualBox在Debian系统上安装增强功能（记录）](http://blog.csdn.net/cqdjyy01234/article/details/53208505)
- [VirtualBox下Debian安装增强功能](http://blog.sina.com.cn/s/blog_4a0a8b5d0102v3u2.html)
