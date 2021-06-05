---
title: "LinuxMint修改程序图标分类"
date: 2017-11-10
type: post
isCJKLanguage: true
categories:
    - "折腾工具"
---

# LinuxMint修改程序图标分类
本文记录了如何修改开始菜单中图标的分类。
## 问题
平时一般用lantern翻墙，但是每次安装之后在开始菜单这个程序都没被归类，而是单独分类到`其他`这个目录,如下：
![](http://ond7j4cnz.bkt.clouddn.com/2017-11-10-lantern-others.png)

十分别扭。

## 修改
其实关键是找到这些图标的配置文件，在我的LinuxMint Cinnamon中，这个目录是：
```
/usr/share/applications
```

找到`lantern`这个图标，用编辑器打开：
```
[Desktop Entry]
Type=Application
Name=lantern
Exec=lantern
Icon=lantern
```
我们向把lantern分类到`互联网`这个目录下，这样比较合理，打开chrome的图标，发现配置非常长，有200多行，主要是为了兼容不同语言，但我比较关心的是一句：
```
Categories=Network;WebBrowser;
```
这一句指明了分类目录，复制到lantern的配置文件中，保存退出即可：
![](http://ond7j4cnz.bkt.clouddn.com/2017-11-10-lantern-internet.png)

## 其他
其实这些文件都是一类特殊的文本文件：`.desktop`文件。找个文档学习一下语法应该可以更加定制自己的系统！
