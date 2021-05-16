---
title: "Vim键盘布局的起源"
date: 2017-06-25
type: post
isCJKLanguage: true
---

# Vim键盘布局的起源
谈了一些关于键盘布局的东西。
## Vim的键盘布局
用过Vim编辑器的人都知道，要从插入模式转到正常模式需要用`Esc`键，并且两种模式的切换在编辑文本时大量存在。但奇怪的是，`Esc`的位置在键盘的左上角：一个手指很难够到的地方。
不免要问，一个号称`编辑器之神`的东西为何有如此不科学的设计。
追本溯源，还要归结到`vim`最初的作者Bill Joy使用的机器`ADM-3A`终端机的键盘。下图是`ADM-3A`：
![](http://ond7j4cnz.bkt.clouddn.com/blogadm-3a.png)

再放大看看它的键盘：
![](http://ond7j4cnz.bkt.clouddn.com/blogadm-3a-01.jpg)
![](http://ond7j4cnz.bkt.clouddn.com/blogadm-3a-2.jpg)
放大：
![](http://ond7j4cnz.bkt.clouddn.com/blogadm-3a-detail.png)

可以看到`Esc`和`Ctrl`的位置都合现在的键盘有所不同。而且，`h`、`j`、`k`、`l`上都有箭头。所以，现在看来这种诡异的按键设计其实在当时是非常合理的。但键盘生产厂商面向的不可能只是程序员（更准确的说是使用Vim的程序员），为了标准统一，现在的键盘生产基本使用如下的按键布局。
![](http://p2pe8gnn5.bkt.clouddn.com/keyboard.png)
从程序员的角度来说，这个设计就很不合理。比如`CapsLock`，占据了一个非常好的位置，但基本不会被使用。现在Vim程序员普遍的做法就是修改键盘映射，比如我，就会把`CapsLock`映射成`Ctrl`，`Ctrl`映射成`Esc`，`Esc`映射成最少使用的`CapsLock`。其实这种修改也符合*哈夫曼编码*的原则：最常使用的离手指最近，最少使用的离手指最远。
Windows修改脚本:
```
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Keyboard Layout]
"Scancode Map"=hex:00,00,00,00,00,00,00,00,04,00,00,00,3a,00,01,00,1D,00,3a,00,01,00,1D,00,00,00,00,00
```

Linux修改脚本:
```
remove Lock = Caps_Lock
remove Control = Control_L
keycode 9 = Caps_Lock NoSymbol Caps_Lock
keycode 66 = Control_L NoSymbol Control_L
keycode  37 = Escape NoSymbol Escape
add Lock = Caps_Lock
add Control = Control_L
```

## Emacs的键盘
关于Emacs有一个有趣的梗：Emacs程序员敲代码都需要一个脚踏板。因为Emacs里面有大量三键组合，一般是`Ctrl`+`Alt`+`X`组合，因为同时按三个按键很不方便，所以只好加个脚踏板了。而且，键盘上空格键特别占地方，导致`Alt`键不容易被手指够到。但是曾经看到过一款键盘，空格键很短，感觉很适合Emacs啊：
![](http://ond7j4cnz.bkt.clouddn.com/blogkana.jpg)

## 键盘的历史遗留问题
一个广为人知的事实：早期打字机的速度比打字员的速度还慢，为了匹配二者速度，打字机设计者将那些经常使用的按键安排在一些手指不容易够到的地方以降低打字员的输入速度。几十年后，这反而成了累赘，就算是普通键盘也能承受很高的击键频率，但那种不合理的按键布局却再也改不会来了。更有意思的是，人们只是知道盲打很难掌握，却丝毫没发现不合理的按键布局大大降低了他们的输入速度。

## 插曲：谷歌搜图VS百度搜图
写这篇博客的起源是电脑上存留的一张图片：
![](http://ond7j4cnz.bkt.clouddn.com/blogkeyboard.png)

我很想知道这张图片的来源（因为我已经忘了从哪里获得的），于是先用了百度搜图：
![](http://ond7j4cnz.bkt.clouddn.com/blogbaidu-search.png)

发现只是出现了一些键盘，而且只是很普通的键盘，说明百度大概只识别出这是一张键盘的图片吧。
我再用谷歌搜了一下，竟然直接搜出了键盘型号：
![](http://ond7j4cnz.bkt.clouddn.com/bloggoogle-search-1.png)

还搜出了包含这张图的文章，我正是从其中一篇文章里面保存下来的。
![](http://ond7j4cnz.bkt.clouddn.com/bloggoogle-search-2.png)

不得不承认，洋人的技术比我们不知道高到哪里去了，我们还有很长的路要走啊！
