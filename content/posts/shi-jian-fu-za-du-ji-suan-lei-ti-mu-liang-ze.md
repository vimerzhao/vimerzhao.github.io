---
title: "时间复杂度计算类题目两则"
date: 2017-03-25
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 时间复杂度计算类题目两则
本文记录了两则具有代表性的算法复杂度计算题目。
## 题目1
分析以下代码的时间复杂度:
```
for (int i = 0; i < n; i++) {
    for (int j = 0; j < i; j++) {
        for (int k = 0; k < j; k++) {
            // operations
        }
    }
}
```
注：以上代码只作示意，未详细推敲边界。
可以先看一下两层嵌套:
```cpp
for (int i = 0; i < n; i++) {
    for (int j = 0; j < i; j++) {
        // operations
    }
}
```
显然复杂度为$O(n^2)$:
$$1+2+...+n = {\frac {n(n+1)} 2}$$
那么对于三层嵌套则有:
$$1^2 + 2^2 + ... + n^2 = {\frac {n(n+1)(2n+1)} 6}$$
所以时间复杂度为$O(n^3)$

## 题目2
分析以下代码时间复杂度:
```cpp
for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j += i) {
        // operations
    }
}
```
结合欧拉公式有（$C$为欧拉常数）:
$$n+{\frac n 2}+...+{\frac n n}=n(1+{\frac 1 2}+...+{\frac 1 n}) = n(ln(n) + C)$$
所以时间复杂度为$O(nln(n))$

## 总结
需要一定的**数学基础**，此外还需要对**算法分析**有足够掌握。贵在平时的积累！
