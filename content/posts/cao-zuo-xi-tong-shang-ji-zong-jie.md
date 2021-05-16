---
title: "操作系统上机总结"
date: 2017-05-22
type: post
isCJKLanguage: true
---

# 操作系统上机总结
记录了操作系统上机的内容以及一点小小的思考。

## 题目
如下图：
![总体要求](http://ond7j4cnz.bkt.clouddn.com/blog%E6%80%BB%E4%BD%93%E8%A6%81%E6%B1%82.png)
![实验一](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%B8%80.png)
![实验一](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%B8%80%E8%A6%81%E6%B1%82.png)
![实验二](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%BA%8C.png)
![实验三](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%B8%89.png)
![实验四](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E5%9B%9B.png)
![实验五](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%BA%94.png)

## 解答
所有的代码都放在[CodeBin/OS-Lab](https://github.com/zhaoyu1995/CodeBin/tree/master/OS-Lab)目录下。

### 实验一：进程管理
关于`fork`的概念理解之后代码不难写，CSAPP讲的很清楚，看完实验一不是问题。主要是shell，要尽可能的模拟Linux的shell，以下是我的代码效果：
![](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%B8%80%E6%95%88%E6%9E%9C%E6%BC%94%E7%A4%BA.gif)
看到一份非常烂的代码要批判。前面检查的同学就像没用过shell一样，我看了一眼就发现
```
//大概这样，具体记不太清
int a = argv[1];
int b = argv[2];
```
这样的代码，也就是说，输入了三个数你就处理不了，输入了小数你的程序就要崩溃。而按照标准的效果，应该能处理任意个数字，因为shell就是这么处理的。而且运行一次就退出，一个简单的REPL都没做出来。完全不是计算机系大三该有的水平。

### 实验二：处理器调度
无非是模拟算法，但是我也从别人的检查中发现了许多问题：

1. 数据输入，靠运行之后手工输入。低效而笨拙。
2. 随便打几个数据，运行输出。估计也就自己知道输出对不对。
3. 输出数据没有排版（即使在命令行也可以有排版）。
4. 可拓展性差，RR算法只支持时间片为1。

说说我的实现，数据当然放在文本里用`<`重定向。排版如下(支持不同时间片)：
![](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%BA%8C-%E6%BC%94%E7%A4%BA.gif)

一个简单的表格输出。测试用例`test1.txt`：
```
A 0 3
B 2 6
C 4 4
D 6 5
E 8 2
```
来自书上：
![](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%BA%8C-%E6%B5%8B%E8%AF%95.jpg)
通过和书上比较可以判断算法是否正确。

> 如果有优化意识会发现SJF如果用最小堆的话时间复杂度可以从$O(n)$降为$O(logn)$，貌似前面用python实现的同学也没用，我用C语言自己写个堆也不过30行代码，何况python两行可以搞定的事。毫无优化意识，不像学过数据结构的计算机系大三学生。


### 实验三：存储管理
实验二说的那几个问题，前面同学依然存在，输入还是手工输入，输出也没什么格式排版。我依然用的书上一个例子，类似实验二，不详述。具体测试用例在[CodeBin/OS-Lab](https://github.com/zhaoyu1995/CodeBin/tree/master/OS-Lab)都能找到。
![](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%B8%89-%E6%BC%94%E7%A4%BA.gif)


### 实验四：磁盘移臂调度
![](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E5%9B%9B-%E6%BC%94%E7%A4%BA.gif)

> 关于实验四，我写了一个小网页，用于显示比较各个算法的差别。此外，这个算法的实现有一个非常有意思的技巧，仔细分析一下可以发现，各个算法唯一不同的就是如何选择下一步移动的位置，所以可以复用其他代码，单独实现选择部分的代码，作为函数指针传入，这样不仅简短了代码，而且提高了拓展性（比如新加入一个算法，只需要实现函数，然后传入指针，而不需要修改其他代码）。最经典的函数指针例子就是qsort函数（如果你用过）。

函数头：
```
void run(const int queue[],
        int order[],
        int begin,
        int cnt,
        int (* next)(const int queue[], const int order[], int cur, int cnt)) {
```
通过不同函数指针调用（这样就复用了run函数的代码，`dir`表示优先移动方向）：
```
run(queue, order, begin, cnt, SSTFnext);
....
dir = 1;
printf("\nSCAN(in-->out):\n");
run(queue, order, begin, cnt, SCANnext);
...
dir = -1;
printf("\nSCAN(out-->in):\n");
run(queue, order, begin, cnt, SCANnext);
...
```

### 实验五：文件管理
主要是如何表示那些已经使用，这里用红色表示使用，绿色表示未使用。具体见[CodeBin/OS-Lab](https://github.com/zhaoyu1995/CodeBin/tree/master/OS-Lab)的实验报告。
![](http://ond7j4cnz.bkt.clouddn.com/blog%E5%AE%9E%E9%AA%8C%E4%BA%94-%E6%BC%94%E7%A4%BA.gif)

## 思考
平时一直没见过其他人的代码，今天真好第二个验收，于是认真听了第一个同学的报告。发现确实不少问题。
- 根本没有通过文本重定向输入的意识，难道运行100次要自己手动输入100次？
- 没有测试意识，我通过输入书本例子进行比对都算是比较基本的测试（没有测试边界），而大部分人就自己设计一组数据，输出一个差不多结果就算了。（一个极端例子是我发现一个同学由于算法思路问题积累了浮点数误差，而这本来可以避免，但就是因为没有严格的测试而疏漏了）
- 完全停留在入门水准，以实验一为例，完全没考虑到输入可能是小数，可能不止两个（虽然要求说是两个，但大三了这点追求没有？处理可变参数的意识都没有？）
- 优化意识就不说了。我没太认真做这个实验，因为:一提前于理论课完成了，二理论也还没掌握透彻，所以只是完成。但还是发现了SJF算法可以用最小堆（优先队列）降低复杂度，实验四可以抽象出函数指针减小代码量。完全出于本能，然而没看到前一位有这方面的意识（其实是一个要出国的学生，在整个专业成绩也是比较优秀的）。所以平均水平应该比这个还低。
- 输出完全没有表达足够的信息，没有站在使用者的角度考虑问题。(如果你的代码还要输出给别人看)

以上。想到的一些。
