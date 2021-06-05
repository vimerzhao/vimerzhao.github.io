---
title: "踩坑记：LinuxMint18字体变为楷体的修复"
date: 2017-03-25
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 踩坑记：LinuxMint18字体变为楷体的修复
本文记录了一次修复系统字体的经历。
## 起因
起因很奇怪，本来打算今天把动态规划算法好好研究一番，结果一大早起来发现中文输入法消失了！因为之前有次发生这种情况是因为**一部分软件包未安装更新**，所以先尝试了更新软件包。结果仍然不行。只好放弃搜狗输入法（因为这个有deb包，安装比较方便，因此之前一直用这个），使用设置里面的IBus,结果安装完发现网页和开始菜单的字体全部变成了楷体：
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-03-25%2009-26-47%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE.png)

excuse me?
## 解决
上午花了大概两个钟头，大概一个钟头解决了输入法，又花了一个钟头修复字体。但是`系统设置-字体`只能修改桌面、文件夹之类的字体，网页和开始菜单的字体始终无法修改，于是放弃。
唯一的发现是修改选择主题包下的`cinnamon.css`文件可以修改大小，但是字体仍然无法修改！
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-03-25%2009-33-02%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE.png)

下午回来，还是觉得实在受不了，楷体既发虚又难看，于是下定决心要解决这个问题，终于在贴吧里（万万没想到）发现了一点线索，原来这是一个Bug!顺着摸索，找到了这个Bug页面。主要信息如下:
> After completing language support installation, fonts-arphic-ukai and fonts-arphic-uming are pulled into user's system and then fontconfig chooses Ukai over Droid Sans Fallback for the default sans-serif font. This is not the desired behavior as Ukai doesn't fit well into the category of screen fonts comparing to Droid Sans.

大概就是默认字体被强制覆盖了（其实也不太懂，还是道行不够！），所以就算我修改了设置也仍然没有效果？

按照贴吧里面这一段描述修改下就行了，原来就是一行命令的事情:
> 此页面是关于此楷体无法更换问题的 https://bugs.launchpad.net/ubuntukylin/+bug/1227034
终端使用命令fc-match 'sans-serif'
和fc-match 'serif'
和fc-match 'monospace'
均输出类似于
ukai.ttc: "AR PL UKai CN" "Book" 如果删除了ukai即楷体则输出uming.ttc: "AR PL UMing CN" "Light"。
种种迹象表面是/etc/font/conf.d中的某文件改写错误造成.
新安装的linuxMint应该均会出现这样的楷体错误。
一个简单的解决办法是终端输入命令
sudo apt-get install language-selector-*
安装完成后字体会改变为
~ $ fc-match 'sans-serif'
NotoSansCJK-Regular.ttc: "Noto Sans CJK SC" "Regular"
~ $ fc-match 'serif'
uming.ttc: "AR PL UMing CN" "Light"
~ $ fc-match 'monospace'
DejaVuSansMono.ttf: "DejaVu Sans Mono" "Book"
<!--##==================
end -->
###############################
另外建议新安装的Mint18全中文系统
sudo kate /var/lib/locales/supported.d/local
或者sudo kate /var/lib/locales/supported.d/zh-hans
编辑其中的一个文件即可。添加如下内容，以配置更完全详细的中文本地支持.
en_US.UTF-8 UTF-8
zh_CN.UTF-8 UTF-8
zh_CN.GBK GBK
.....
执行结果如下
Generating locales (this might take a while)...
en_AG.UTF-8... done
en_AU.UTF-8... done
.......
h_TW.EUC-TW... done
zh_TW.UTF-8... done
/etc/locale.gen使用文本编辑器比如kate打开，可以看到所有的locale语言列表

还真是要到病除:
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-03-25%2016-25-16%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE.png)
网页也好了:
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-03-25%2016-35-23%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE.png)

看来自己还是要多学习一个！
## 参考
- [请问下18下为什么字体这么不统一啊？](http://tieba.baidu.com/p/4845852278)
- [Default Chinese font changed to fonts-arphic-ukai after completing language support installation for zh-* locales](https://bugs.launchpad.net/ubuntukylin/+bug/1227034)
