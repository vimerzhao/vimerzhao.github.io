---
title: "2017阿里实习生面试总结"
date: 2017-06-02
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 2017阿里实习生面试总结
阿里面试记录的整理以及一些自己的总结。

## 5-18
晚上突然接到短信，叫我去预约面试时间。真是一脸蒙蔽，真不知道自己那个笔试怎么过的。。。不过既然拿到面试机会了，就作为一次锻炼自己、了解阿里的机会利用起来！

## 5-20
这里不得不说一下阿里的远程面试，想想携程，我一个电话没接到就game over了。阿里提前通知预约时间，而且通过谷歌浏览器视频，而不是QQ，这样我就能在自己熟悉的Linux系统面试了。而且，阿里用自己的插件做了个桌面共享，感觉很有大公司风范啊！
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-05-19%2007-54-50%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE.png)
![](http://ond7j4cnz.bkt.clouddn.com/blog2017-05-19%2007-57-54%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE.png)

进入正题，首先是自我介绍，仍然没有特意准备随意说了两句。然后开始问我简历上第一个项目都干了什么，我简单介绍了一番。

> 发现简历项目的排列原理也有讲究，有的面试官可能会让你自己选一个（最难的、最喜欢的...）也可能就选第一个了，所以下次一定要注意简历项目的顺序。

阿里的面试进行了一个钟头，而且全程都是在抛出问题给我，压力真是特别大，上午面的晚上已经很多不记得了，只能粗线条的记录一下。

一开始谈了排序，各种排序算法的区别、性能比较，比如快排和堆排的区别（我当时说快排适合一次性排序，堆排适合维护一个求最值的数据结构，其实最近写的进程管理算法里面的SJF就同时用了这两种排序，但是当时节奏太快，没表述清楚）。还说了点外排序。面试官没有抛出一个明确的问题，就让我自己说，我没有太多应用的经验，真是说不出什么。
后来应该说到了Hash表，如何解决哈希冲突（自己知道，但没系统复习所以也没太说清楚）。其实一开始问得是Java里Hash容器（HashMap、HashSet）的实现，没读过源码真的说不出来啊！只好往数据结构上那种Hash表的实现上说。
此间，还问了一些JVM如何启动多线程、用没用过BitMap（后来知道是Android里面一个需要优化定制的类`Bitmap`）还有什么听都没听过，感觉这次面试说了好多次“不知道”、“没用过”....
后面必然说到的就是网络，要我说OSI的七层，憋了半天说出来了（会话层、表示层表示真不熟，习惯了TCP/IP的五层），面试官应该觉察到我说的顺序混乱，就问我网络层、传输层那个在上，我竟然说了网络层在上（脑子短路，当时大概40min了，力不从心了已经），后来面试官问我确不确定，我赶紧结合自己抓包程序里面是Mac帧包含IP报文，IP数据报包含TCP改正过来了，好惊险...然后，真是流水的面试，铁打的三次握手（真是每次都问啊！！），我当时说的应该比较清楚（虽然没我要求的那么清楚），然后还要说TCP连接的释放，这个就记得没那么清楚了，那本谢希仁的书还是要看啊！后来问TCP传输中的安全性，没听过....又只能这么说了-.-

其实既然共享桌面，肯定会有编程题，意料之中，但自己也没特意准备。题目是：

> 用两个栈实现一个队列。

这个有点印象，然后就开始打草稿了，面试官还问我懂没懂，又忘了：不管懂不懂，多沟通确认一下，给人一种稳重的印象总是好的。代码还留着：

```
import java.io.*;
import java.util.*;


public class Main {
    public static void main(String args[]) {
        Scanner scanner = new Scanner(System.in);
        MyQueue q = new MyQueue();
        while (scanner.hasNext()) {
            String s = scanner.next();
            q.push(s);
        }
        while (!q.isEmpty()) {
            System.out.println(q.pop());
        }
    }
}

class MyQueue {
    Stack<String> stack1;
    Stack<String> stack2;
    public MyQueue(){
        stack1 = new Stack<>();
        stack2 = new Stack<>();
    }
    public void push(String s) {
        stack1.push(s);
    }
    public String pop() {
        String ret = null;
        if (stack2.isEmpty()) {
            while (!stack1.isEmpty()) {
                stack2.push(stack1.pop());
            }
        }
        ret = stack2.pop();
        return ret;
    }
    public boolean isEmpty() {
        return stack1.isEmpty() && stack2.isEmpty();
    }
}

```

写完测试了一下（其实应该多检查下的）就给面试官看了，然后他要我讲一下怎么实现的，我讲了。感觉这一部分还是表现比较好，虽然没计算时间，但是一次编译通过（Vim有一定的语法排错功能）测试通过。而且，用Vim写的，没有IDE那么强大的提示，虽然因为有压力了老是敲错字符，但还是比较顺利，如果面试官一直通过共享屏幕在看的话应该比较满意。

接下来是一个二叉树的题目，给了中序、后序要求画这棵二叉树：

> 中序输出: G D H B E A K C I J F 后序输出: G H D E B K J I F C A

比较简单，但当时思维已经慢下来了（有点压力面的意思），感觉自己做的有点慢，后来是通过LibreOffice Draw画给面试官看的，边画边讲思路，应该没什么大问题。虽然可以把纸上的给面试官看，但效果肯定没通过共享桌面好！

期间还问了B+树，说实话，这东西没具体用过，所以也只好说自己不知道，但知道在数据库里面有很重要的应用，然后说自己最近准备研究sqlite的源码，然后问我读过哪些源码，我其实没具体研究过哪个源码，只好给他看看自己电脑里存的源码（包括C标准库、xv6源码等）说说自己参考，会偶尔查阅什么的，心里没底，说的也断断续续。

还有一个问题：自己遇到过最难的问题。这个也是自己没积累，没认真思考过。说的也不好，说的是自己AI贪吃蛇可能的更优的解法，说的真不怎么样。

大概主要这些，问得比较多，给我感觉：1.要想敲开阿里大门，最好对Java底层、JVM有足够了解，不说直接作用，就凭这些完全可以和面试官谈笑风生；2.网络很重要，尤其是TCP/IP。3.最好认真研究过几份源码以防万一。4.视野，还是要多接触，感觉今天很多次，自己只能说不知道...这样真的很被动。

## 5-25

昨天接到面试预约通知，记得一面预约的时候有4天可供选择，而这次只剩一天了，说明一面的淘汰率大概在75%左右。
面试之前没有特别准备，大概能猜到问得东西也不是临时看看就能会的。
面试官上来就报了在阿里的花名：酒丐。面试完一查，是闲鱼的技术负责人，大Boss级别的了。
第一项是选一个自己最满意的项目讲讲，不过讲编译器好像没对面试官的胃口，讲完没有继续追问。
接下来十几分钟真是惨绝人寰。问我虚拟机，不知；问我是不是做过Android相关的，我说做过一点，问我View的事件分发过程；要我不讲应用层面，就讲一些底层的（因为我说之前在学校学的都比较基础、理论）。反正，真是答不上来，基本就是我说会点哪个技术，就问我这个技术的源码级原理。
期间问我Android间进程通信的方式，这个知道却也忘了。（没准备）
真是戳中痛点，上次腾讯有些运气成分，这次阿里真是刀刀见红，把我问得毫无招架之力。
后面又讨论了TCP/UDP，先要我讲区别，这个讲的不好，接下来给我两个问题：如何在UDP上做到TCP的功能；如何提高TCP的效率。第一个下午和同学讨论，可能是从应用层来提高，第二个问题当时说可以更改TCP一些固有字段值，问我具体什么值，我又答不上来了。。。
前二十分钟，一直尴尬。
接下来做题。第一个：

> N个互不相同的数字，传送时丢失一个，找到这丢失的值。

很容易想到对两个求和取差，但是会溢出（陷阱），不过当时我也是比较机警，同时给出了两种方法，第二种利用异或。但面试官说主要是想看我写代码，好吧，就写，结果先用C（想着抑或自然就用了C），结果被打断，说这是Java研发面试，是不是对Java不自信，好吧，用Java写了求和的解法，其实Java抑或也挺简单的，但是出于谨慎还是放弃了，怕出错，还是基本功不扎实啊。后来又问如果丢失了两个呢，我说还可以用抑或。其实，LeetCode上有，自己当时没钻研透彻啊。
第二题，问如何确定淘宝的评论（就是一句话）里面有违禁词，我猜测了半天，期间各种解决方法，还要询问是否能放在内存中、是否要考虑中文的分词（问这些是有必要的，而且能让面试官认为你思考问题比较严谨）。最后给出用哈希表+字典树（关键是这个，哈希表容易想）才让面试官比较满意。感觉这就像是一个开放问题，看你能不能在面试官的引导下给出一个比较好的解法。
最最主要的就是这些，40分钟，还算正常，至少面试官没放弃我。但在真正的leader级人物面前，还是暴露了自己对技术理解深度不够的问题，全程被吊打。
还是要学习一个，继续提高姿势水平，感觉要跪了，但知道自己的不足和阿里的要求也就达到目的了。

## 6-2
今天查了一下，果然已经跪了。仔细想想，自己确实拿不到这份Offer。

1. 自我定位，我投Java研发，但其实我自己也不清楚这个岗位。以至于面试时还用C写代码。
2. 真是没学到家，当一个问题问到很底层的时候，我答不上来。
3. 缺乏适当的准备，虽然不是为了面试而学习，但确实需要为面试做出一些准备，否则，就算你有能力，面试官也看不到。

以上，一些总结。最近实在太乱，周期性的迷茫、心烦意乱。好久没有这种挫败感了，但更重要的是认清自己的不足，尽快突破现阶段的瓶颈，必须做出改变。
