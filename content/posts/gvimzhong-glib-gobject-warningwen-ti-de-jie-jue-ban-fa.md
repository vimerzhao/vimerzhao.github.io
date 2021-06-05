---
title: "GVim中GLib-GObject-WARNING问题的解决办法"
date: 2017-04-29
type: post
isCJKLanguage: true
categories:
    - "折腾工具"
---

# GVim中GLib-GObject-WARNING问题的解决办法
本文记录了一个在命令行启动GVim时遇到的问题及其解决办法。
## 问题
今天发现在命令行模式下启动GVim会出现一个小问题：
```
zhaoyu@Dell ~ $ vim .vim
(gvim:12853): GLib-GObject-WARNING **: cannot retrieve class for invalid (unclassed) type '<invalid>'
^C
```
每次编辑完退出时都会收到警告，虽然不影响编辑，但每次都要多按Ctrl-C退出也着实麻烦。

## 解决
## 方法一
方法一亲测有效，输入以下两行命令即可：
```
sudo apt-get remove vim-gnome
sudo apt-get install vim-gtk
```

## 方法二
方法二没有测试，应该也可以，在`.bashrc`中加入：
```
alias gvim="gvim 2>/dev/null"
```

## 思考
由方法一可知，是由于`vim-gnome`导致了警告，换成`vim-gtk`就可以了，那么他们有何区别？但查了一些资料后我也还是没完全清楚，只能说`vim-gnome`功能更强，需要的依赖也多一些，所以出现问题的可能性也就大一些。所以，一般安装`vim-gtk`就行了。

## 参考
- [Gvim GLib-GObject-WARNING in ubuntu 13.10](https://askubuntu.com/questions/361180/gvim-glib-gobject-warning-in-ubuntu-13-10)
- [gvim produces error when hitting the close window](https://askubuntu.com/questions/334219/gvim-produces-error-when-hitting-the-close-window)
- [Difference between vim-gtk and vim-gnome](https://askubuntu.com/questions/33260/difference-between-vim-gtk-and-vim-gnome)
- [GLib-GObject-WARNING when closing gvim](https://askubuntu.com/questions/760486/glib-gobject-warning-when-closing-gvim)
- [Difference between GTK theme and GNOME shell theme?](https://askubuntu.com/questions/98343/difference-between-gtk-theme-and-gnome-shell-theme)
