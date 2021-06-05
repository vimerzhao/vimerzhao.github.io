---
title: "如何关闭网页悬浮窗"
date: 2017-07-31
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 如何关闭网页悬浮窗
如何巧妙关闭网页的悬浮窗。
最近在查找资料时发现一个网页，需要注册才能查看，我记得豆瓣也有类似的悬浮窗，但是可以点击右上角的小叉号关闭，但这个竟然不能关闭！！
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-07-31-15-37-29-pic1.png)
作为一个程序员此时当然应该开启Chrome的F12，通过元素选择器找到这个悬浮窗，然后右键选择`Hide element`或者`Delete element`：
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-07-31-15-45-21pic2.png)
除掉之后发现还有一层半透明效果，选中元素再来一次：
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-07-31-15-38-57-pic3.png)
最后实战演示一下：
![](http://ond7j4cnz.bkt.clouddn.com/blogPeek%202017-07-31%2015-40.gif)
