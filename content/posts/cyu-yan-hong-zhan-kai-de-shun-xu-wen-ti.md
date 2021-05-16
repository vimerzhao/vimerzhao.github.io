---
title: "C语言宏展开的顺序问题"
date: 2017-03-14
type: post
isCJKLanguage: true
---

# C语言宏展开的顺序问题
本文记录了作者遇到的一个关于C语言宏展开顺序的问题及其解释。
## 问题
这是我在阅读*The C Puzzle Book*一书中遇到的一个问题，为了简化问题，我写了以下一段代码
```c
#include <stdio.h>
#define TEST(x) x*5
#define PR(x) printf(#x " = %d", x)
#define PRINT1(x) PR(x);printf("\n")
#define PRINT2(x) printf(#x " = %d\n", x)
int main(int argc, char const* argv[]) {
    PRINT1(TEST(2));
    PRINT2(TEST(2));
    return 0;
}
```
输出为:
```
2*5 = 10
TEST(2) = 10
```
**问题：**如果先替换外面的，则第一行展开顺序为:
```
PRINT1(TEST(2));
PR(TEST(2)); printf("\n");
printf(#TEST(2) " = %d", TEST(2)); printf("\n");
printf("TEST(2)" " = %d", 2*5); printf("\n");
TEST(2) = 10
```
但显然不是；同理，如果先替换里面的:
```
PRINT2(TEST(2));
PRINT2(2*5);
printf(#2*5 " = %d", 2*5);
printf("2*5" " = %d", 2*5);
2*5 = 10
```
这样又与第二行输出矛盾了!
## 解释
在翻阅了*C Primer Plus*以及*K&R C*之后并没有找到解释，但Google但StackOverflow上一个[类似问题](http://stackoverflow.com/questions/8754593/macro-evaluation-order)。顺藤摸瓜找到对应的文档，终于发现原因！首先我就先入为主，做了一个错误的假设：把带参数的宏当函数一样理解！其实不然，预处理器是按`token`进行处理的，也就是说`PR(x)`对于预处理器来说就是一些符号,和`x*x`这种没有本质区别。
再参考文档中这段描述:
> Macro arguments are completely macro-expanded before they are substituted into a macro body, unless they are stringized or pasted with other tokens. After substitution, the entire macro body, including the substituted arguments, is scanned again for macros to be expanded. The result is that the arguments are scanned twice to expand macro calls in them.

可以知道只有对于`#`和`##`处理的参数不做替换，其他的预处理器根本不知道是什么，只是会再扫描一遍，如果又发现了宏则继续替换！所以以上代码的替换过程应该大致如下:
```
PRINT1(TEST(2));
PR(2*5); printf("\n");
printf(#2*5 " = %d"); printf("\n");
printf("2*5" " = %d"); printf("\n");
2*5 = 10        // 第一行
PRINT2(TEST(2))；
printf(#TEST(2) " = %d\n", 2*5);
printf("TEST(2)" " = %d\n", 2*5);
TEST(2) = 10    // 第二行
```
其实，仔细想想，本质就是:
```
#define PR(x) printf(#x " = %d\n", x)
```
只不过多了一次带参数宏调用，不知道是不是自己走火入魔了，如果不是的话感觉这个代码也可以当谜题收录到*The C Puzzle Book*里面去了！
还有就是Google+StackOverflow比baidu+CSDN强大得真不是一点点！**遇到问题最可靠的还是看文档而不是琢磨别人的解释，而有时候要找到对的文档就需要从StackOverflow这样的高质量社区顺藤摸瓜。**
## 参考
1. [c++ - Macro evaluation order - Stack Overflow](http://stackoverflow.com/questions/8754593/macro-evaluation-order)
2. [The C Preprocessor: Argument Prescan](https://gcc.gnu.org/onlinedocs/cpp/Argument-Prescan.html#Argument-Prescan)
