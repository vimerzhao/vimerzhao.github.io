---
title: "Build Your Own Lisp中的闲言碎语"
date: 2017-04-08
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# Build Your Own Lisp中的闲言碎语
Build Your Own Lisp中的一些摘录。
前不久，读完了[Build Your Own Lisp](http://www.buildyourownlisp.com/contents)。作者用C语言写了一个简单的Lisp解释器，代码之精妙、设计之优雅确实让我受益匪浅！
不过，除了跟着作者写代码，书中的一些“题外话”也非常有意思，在此整理一二。

## Bug的分类
平时，我们也说代码出了bug，但有没有想过bug其实也分很多种！比如，一个`int i = 2/0;`的bug总是会给你反馈相同的错误，但有多线程编程经验的人都知道，同一个bug可能有时出现有时不出现（一个决定因素是线程的执行速度）。
在这里，我们可以称前一种bug为玻尔bug(bohrbug)，就像[玻尔模型](https://zh.wikipedia.org/wiki/%E7%8E%BB%E5%B0%94%E6%A8%A1%E5%9E%8B)(如果你对量子物理有所了解)一样稳定。而后一种bug则可以称为薛定谔bug(Schroedinbug)，如果你知道“薛定谔的猫”的话一定就能理解这个称呼了。
此外还有用分形之父命名的曼德博bug以及海森堡bug（指有个bug让程序崩溃了，但当程序重启后，这个bug消失了，影射其提出的“测不准原理”）。
这或许就是程序员的幽默！

## C程序员的分类
学过C的人都知道，C语言的精髓就在于指针，指针灵活而强大、危险而诡异，以至于指针成了区分C程序员的标准：
```
int *p;//熟练使用-->一星程序员
int **p;//熟练使用-->二星程序员
int ***p;//熟练使用-->三星程序员
int ****p;//熟练使用-->四星程序员
```

## Lisp中的注释
在`Lisp`中注释使用`{注释内容}`，据说是为了鄙视下C语言，Lisp和C可谓编程语言的两个极端，以至于人们戏称SICP和CSAPP最大的不同就是一个用Lisp一个用C。
在今天看来，C语言因为其对硬件的良好支持和极高的性能，毫无疑问风头盖过了Lisp。就连Java里面也尽是C语法的影子，Lisp在普通程序员眼中已经是古董一样的存在了。Lisp和C最大的不同就是Lisp是从数学的角度来设计的，而C更多地考虑了硬件，当今天C++11和Java8都已经把Lambda表达式(Lisp中一个经典的概念)纳入其语法，不禁让人遐想，到底谁才是编程语言世界的[拉夫德鲁](http://baike.baidu.com/item/%E6%8B%89%E5%A4%AB%E5%BE%B7%E9%B2%81)呢！

## 参考与拓展
- [读《Lisp的本质》(The nature of Lisp)——悼Schönfinkel](http://blog.sciencenet.cn/blog-2349385-1039514.html)
- [回到未来：永恒的lisp](http://www.zenlife.tk/lisp-forever.md)
- [Bug的类型](http://www.vaikan.com/types-of-bugs/)

