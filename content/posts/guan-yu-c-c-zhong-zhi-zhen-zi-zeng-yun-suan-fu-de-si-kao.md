---
title: "关于C/C++中指针自增运算符的思考"
date: 2017-04-06
type: post
isCJKLanguage: true
---

# 关于C/C++中指针自增运算符的思考
本文记录了C/C++中指针自增运算的一些微妙特性。
## 问题引入
C代码：
```c
#include <stdio.h>
int main(int argc, char const* argv[]) {
    int a = 1, *p = &a;
    ++++p;
    ++p++;
    return 0;
}
```
C++代码：
```cpp
#include <bits/stdc++.h>
int main(int argc, char const* argv[]) {
    int a = 1, *p = &a;
    ++++p;
    ++p++;
    return 0;
}
```
编译以上代码：
```bash
zhaoyu@Dell ~/codelab/CStudy $ gcc main.c
main.c: In function ‘main’:
main.c:5:5: error: lvalue required as increment operand
     ++++p;
     ^
main.c:6:5: error: lvalue required as increment operand
     ++p++;
     ^
zhaoyu@Dell ~/codelab/CStudy $ g++ main.cpp 
main.cpp: In function ‘int main(int, const char**)’:
main.cpp:5:8: error: lvalue required as increment operand
     ++p++;
        ^
```
## 问题分析
首先，可以看到所有的错误都是因为`++`的操作符号不是左值。关于什么是左值（lvalue）在此不作赘述。
在K&R中对于类似问题有以下解释（P105）：
> The value of *t++ is the character that t point to before t was incremented;the postfix ++ doesn't change t until after this character has been fetched.

这样说似有不妥，比如`++p++`，如果套用上面的说法，是不是先执行`++p`再执行`p++`了呢?显然不是，因为编译器报错了！在查阅了*Committee Draft — May 6, 2005 ISO/IEC 9899:TC2*之后，发现对于后缀`++`有以下解释(P75)：

> 2 The result of the postfix ++ operator is the value of the operand. After the result is obtained, the value of the operand is incremented. (That is, the value 1 of the appropriate type is added to it.) See the discussions of additive operators and compound assignment for information on constraints, types, and conversions and the effects of operations on pointers. The side effect of updating the stored value of the operand shall occur between the previous and the next sequence point.

也就是说`p++`这个表达式返回了`p`的值，然后在执行完这个语句并开始下一语句前更新`p`（产生一个副作用）。这样就可以解释上面的问题了。首先，`*p++`（假如p的地址是0xae80），那么有
```
*(0xae80);
p=p+1;
```
而`++p++`则是
```
++(0xae80);
p=p+1;
```
而类似`++1`这样对常数进行自增显然不合逻辑，所以报错！`++++p`也是相同的道理。
但在C++中，稍有不同，比如类中对前缀`++`返回的是引用而后缀`++`返回的是值，所以在C++中`++++p`不会报错，因为`++p`返回的仍然是一个左值（引用），而`++p++`会报错，因为`p++`返回的是一个值。

## 问题总结
学而不思则罔，思而不学则殆。要**系统**看文档。

## 参考
- [p++ and ++p](https://cboard.cprogramming.com/c-programming/115136-pplusplus-plusplusp.html)
- [Where to get the latest ANSI C standard document [closed]](http://stackoverflow.com/questions/11504312/where-to-get-the-latest-ansi-c-standard-document)

