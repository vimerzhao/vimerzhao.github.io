---
title: "踩坑记：从C++变量到Java引用"
date: 2017-03-24
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 踩坑记：从C++变量到Java引用
本文介绍了Java和C++中变量名（对象类型）的细微差别。
## 问题引入
问题的产生自另一个题目:
> 请实现一种数据结构SetOfStacks，由多个栈组成，其中每个栈的大小为size，当前一个栈填满时，新建一个栈。该数据结构应支持与普通栈相同的push和pop操作。给定一个操作序列int[][2] ope(C++为vector<vector<int>>)，每个操作的第一个数代表操作类型，若为1，则为push操作，后一个数为应push的数字；若为2，则为pop操作，后一个数无意义。请返回一个int[][](C++为vector<vector<int>>)，为完成所有操作后的SetOfStacks，顺序应为从下到上，默认初始的SetOfStacks为空。保证数据合法。

在参考C++代码写出来之后发现输出总是异常。代码如下
```java
import java.util.*;
public class SetOfStacks {
	public ArrayList<ArrayList<Integer>> setOfStacks(int[][] ope, int size) {
        ArrayList<ArrayList<Integer>> res = new ArrayList<ArrayList<Integer>>();
        ArrayList<Integer> temp = new ArrayList<Integer>();
        for (int i = 0; i < ope.length; i++) {
            if (ope[i][0] == 1) {
                if (temp.size() == size) {
                    res.add(temp);
//                  temp = new ArrayList<Integer>();
                    temp.clear();
                    temp.add(ope[i][1]);
                } else {
                    temp.add(ope[i][1]);
                }
            } else {
                if (temp.size() != 0) {
                    temp.remove(temp.size()-1);
                } else if (res.size() != 0) {
                    temp = res.get(res.size()-1);
                    temp.remove(temp.size()-1);
                    res.remove(res.size()-1);
                }
            }
        }
        if (temp.size() != 0) {
            res.add(temp);
        }
        return res;
    }
}
```
被注释行必须加上，否则输出结果异常！

## 问题分析
为突出以上代码存在的问题，简化以下两份代码：
C++:
```cpp
#include  <bits/stdc++.h>
using namespace std;
int main(int argc, char const* argv[]) {
    vector< vector<string> > list;
    vector<string> temp;
    string str= "abc";
    temp.push_back(str);
    list.push_back(temp);
    temp.clear();
    str = "def";
    temp.push_back(str);
    list.push_back(temp);
    for (vector<string> strArr : list) {
        for (string s : strArr) {
            cout<<s<<endl;
        }
    }
    return 0;
}
```
Java:
```java
import java.util.*;
public class Main {
   public static void main(String[] args) {
        ArrayList<ArrayList<String>> list = new ArrayList<>();
        ArrayList<String> temp = new ArrayList<>();
        String str = "abc";
        temp.add(str);
        list.add(temp);
        temp.clear();
        str = "def";
        temp.add(str);
        list.add(temp);
        for (ArrayList<String> strArr : list) {
            for (String s : strArr) {
                System.out.println(s);
            }
        }
    }
}
```

输出结果如下:
```
zhaoyu@Dell ~/codelab/acmcoder $ g++ -std=c++11 exam.cpp 
zhaoyu@Dell ~/codelab/acmcoder $ ./a.out 
abc
def
zhaoyu@Dell ~/codelab/acmcoder $ javac Main.java 
zhaoyu@Dell ~/codelab/acmcoder $ java Main 
def
def
```
可以看到，java代码把原来的数据也改变了。这是因为Java的变量名（基本类型除外）是基于引用，其实就是指针。而C++中必须显示声明为指针，否则变量名存储的就是一份副本。
以下代码意在说明相同问题，更加简短:
C++:
```cpp
#include  <bits/stdc++.h>
using namespace std;
int main(int argc, char const* argv[]) {
    string sb1 = "abc";
    string sb2 = sb1;
    cout<<sb2<<endl;
    sb1 += "eee";
    cout<<sb2<<endl;
    return 0;
}
```
Java:
```java
import java.util.*;
public class Main {
   public static void main(String[] args) {
        StringBuilder sb1 = new StringBuilder("abc");
        StringBuilder sb2 = sb1;
        System.out.println(sb2.toString());
        sb1.append("eee");
        System.out.println(sb2.toString());
    }
}
```
输出如下：
```
zhaoyu@Dell ~/codelab/acmcoder $ g++ -std=c++11 exam.cpp 
zhaoyu@Dell ~/codelab/acmcoder $ ./a.out 
abc
abc
zhaoyu@Dell ~/codelab/acmcoder $ javac Main.java 
zhaoyu@Dell ~/codelab/acmcoder $ java Main 
abc
abceee
```
其实C++中这种赋值会调用**复制构造函数**,创建一个新的副本，而Java就是将两个引用（指针）指向了相同位置，通过其中一个改变指向内容，另一个引用获得的结果也会改变！
具体参考以下代码:
C++:
```cpp
#include  <bits/stdc++.h>
using namespace std;
class A {
    int val;
public:
    A() {val = 1;cout<<"default"<<endl;}
    A(A& copy) {val = 1;cout<<"copy"<<endl;}
    void add(void) {val++; cout<<val<<endl;}
};
int main(int argc, char const* argv[]) {
    A a;
    A b = a;
    a.add();
    b.add();
    return 0;
}
```
Java:
```java
import java.util.*;
import java.io.*;
public class Main {
    public static void main(String[] args) {
        A a = new A();
        A b = a;
        a.add();
        b.add();
    }
}
class A {
    private int val;
    public A(){
        System.out.println("create");
        val = 1;
    }
    public void add() {
        val++;
        System.out.println(val);
    }
}
```
输出为:
```
zhaoyu@Dell ~/codelab/acmcoder $ ./a.out 
default
copy
2
2
zhaoyu@Dell ~/codelab/acmcoder $ java Main 
create
2
3
```
## 一点总结

- 这本来是一个每本教材都会指出的差别，但是光教材看确实效果有限。考试考到这样的问题其实很容易推断出考察的知识点，但是编程时注意点往往在算法等上面，往往容易忽视细节（其实就是基础还不够扎实）。还是要多写，才能加深理解、积累经验。
- Java没形成新体系，C++没形成体系。所以对Java和C++之间的差别的掌握和理解（从语法到设计理念）很肤浅。
- 遇到问题，**单步调试，对比实际输出和期望输出**可能比冥思苦想效果好。
- 对于自己的猜想，**查阅权威资料**（而不是百度）和**设计程序验证**是最好的两种验证办法。
