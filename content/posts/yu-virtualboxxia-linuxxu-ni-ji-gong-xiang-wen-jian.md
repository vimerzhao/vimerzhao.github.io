---
title: "与VirtualBox下Linux虚拟机共享文件"
date: 2017-05-29
type: post
isCJKLanguage: true
categories:
    - "折腾工具"
---

# 与VirtualBox下Linux虚拟机共享文件
记录了如何与VirtualBox下的Linux虚拟机共享文件。
最近，需要在Ubuntu虚拟机里面调试HotSpot，截了些图需要在本机上处理一下，所以需要共享文件。其实经常有这种需求，之前一直是用百度云盘或者QQ邮箱的中转站来传输文件，觉得实在太麻烦了，所以决定今天把这个问题解决了。
前两天才发现，像共享粘贴板、文件夹之类的功能都需要安装增强功能，怪不得之前有时成功有时失败。此外，在Windows下比较容易，但在Linux下要手动挂载共享了的文件。
第一步，配置VirtualBox，记住共享文件夹名称：
![](http://ond7j4cnz.bkt.clouddn.com/blogshare-file-01.png)
第二步，在Linux虚拟机挂在文件：
![](http://ond7j4cnz.bkt.clouddn.com/blogshare-file-02.png)
关于挂载位置，`mnt`就是`mount`的缩写，放的就是一些挂载的设备文件，但挂载之后，如果想把自己用户目录下文件移到共享目录需要`root`才行，应该也可以直接挂载在用户目录下，下次可以试试。
第三步，在Linux虚拟机下把要转移的文件放在共享目录，在本机就可以得到了
![](http://ond7j4cnz.bkt.clouddn.com/blogshare-file-03.png)
