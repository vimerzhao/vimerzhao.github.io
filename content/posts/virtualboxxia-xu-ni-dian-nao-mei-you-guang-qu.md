---
title: "VirtualBox下虚拟电脑没有光驱"
date: 2017-05-28
type: post
isCJKLanguage: true
---

# VirtualBox下虚拟电脑没有光驱
记录了VirtualBox虚拟电脑安装增强功能时提示没有光驱的问题。
由于编译openjdk的需要，安装了Ubuntu12.04，但是在安装增强功能时候却遇到了以下问题:
![](http://ond7j4cnz.bkt.clouddn.com/blogVirtualBox-1.png)
按照提示，发现要在设置界面添加驱动（其实为什么要这样做还不是太明白）
![](http://ond7j4cnz.bkt.clouddn.com/blogVirtualBox-2.png)
添加驱动之后就可以安装了：
![](http://ond7j4cnz.bkt.clouddn.com/blogVirtualBox-3.png)
正在安装：
![](http://ond7j4cnz.bkt.clouddn.com/blogVirtualBox-4.png)
安装成功：
![](http://ond7j4cnz.bkt.clouddn.com/blogVirtualBox-5.png)
安装增强功能的作用：
> （1）实现客户机和主机间的鼠标平滑移动
（2）与主机实现文件共享
（3）安装虚拟显卡驱动，实现2D和3D视频图形加速，自动调整客户机分辨率
（4）支持无缝模式
（5）通用主机/客户机通信通道（别扭），用于主机与客户机交换数据、监控客户机，也可以启动客户机中的程序
（6）与主机实现时间同步
（7）与主机共享剪贴板的内容，也就是说直接可以在主机、客户机之间复制、粘贴（不支持搜索文件）
（8）自动登录客户机系统
