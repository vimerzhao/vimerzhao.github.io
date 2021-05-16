---
title: "每日一题：100 doors"
date: 2018-02-07
type: post
isCJKLanguage: true
---

# 每日一题：100 doors
选自[100 doors - Rosetta Code](https://rosettacode.org/wiki/100_doors)


## Task
There are 100 doors in a row that are all initially closed.You make 100 passes by the doors.The first time through, visit every door and toggle the door (if the door is closed,  open it;if it is open,  close it).The second time, only visit every 2nd door(door #2, #4, #6, ...),and toggle it.The third time, visit every 3rd door(door #3, #6, #9, ...), etc,until you only visit the 100th door.
Answer the question:   what state are the doors in after the last pass?   Which are open, which are closed?

## Solution
最先想到的办法就是两层循环仿真一遍，时间复杂度是O(nlogn)，推导如下：
>   n + n/2 + n/3 + n/4 + ... + n/n
= n(1+1/2+1/3+1/4+...+1/n)
= n(ln(n+1)+r)

欧拉近似地计算了r的值，约为0.577218，这个数字后来称作欧拉常数。
但换个角度，第m扇门，如果有`a,b < m且a*b=m`，那么一开一关互相抵消，以6为例，会在1、2、3，6发生翻转，显然`6=1*6=2*3`，但对于可以开方的数，比如`9=1*9=3*3`，会在1、3、9发生翻转，由于3重复了，所以相当于执行了一次翻转。因此如果m可以开方，则开着；不可以开方，则关着。

## Implementation
