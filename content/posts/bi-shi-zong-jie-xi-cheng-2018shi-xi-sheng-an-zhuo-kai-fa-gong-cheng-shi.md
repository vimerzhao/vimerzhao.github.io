---
title: "笔试总结：携程2018实习生（安卓开发工程师）"
date: 2017-04-11
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 笔试总结：携程2018实习生（安卓开发工程师）
时间：2017-4-11，19：00～21：00。
## 选择题
10个数学智力题，10个Android题。数学智力题花了半个钟头，感觉还是有几题没把握，结果没想到编程题比较简单，做完还有将近一个钟头......另外10个选择题也比较奇葩，不像其他公司那么注重基础，数据库、操作系统、数据结构都没有，基本都是Android题，万万没想到，虽然投的Android，但基本没做专门准备。感觉选择比较衰，还是**基础**的问题。

## 编程题
第一题是最大子段和（要求$O(n)$），直接DP，正好下午还看了(但不知道有没有人$O(n^2)$也能过，毕竟测试数据可能没ACM那么精确)，5min就搞定，节省了很多时间！第二题，求数组里第一个仅出现一次的数，要求$O(n)$，遍历一次，用哈希表记录，再遍历一次用哈希表查找，不知道他们是不是这个意思，反正过了。
还有将近一个钟头，由于提交部分无法修改，只好做附加题。
![](http://ond7j4cnz.bkt.clouddn.com/blog%E6%90%BA%E7%A8%8B-%E7%AC%94%E8%AF%95.png)
自己的思路就是设置权重，但不知道为什么永远都是50%。

```java
import java.io.*;
import java.util.*;
public class Main {
    public static void main(String[] args) {
        String[] source = {"AB", "ABC", "ACB", "ABCD", "ADBCF", "ABDCF",
                "ABDC", "ABDFCG", "ABDFGC", "ABDEFG","GABCEFG"};
        Scanner sc = new Scanner(System.in);
        while (sc.hasNext()) {
            String s = sc.nextLine();
            TreeMap<Double, String> map = new TreeMap<>();
            map.clear();
            for (int i = 0; i < source.length; ++i) {
                double cnt = 1e10, sum = 0;
                int a = 0, b = 0;
                if (s.length() <= source[i].length()) {
                    for (a = 0, b = 0; a < s.length() && b < source[i].length(); b++) {
                        if (s.charAt(a) == source[i].charAt(b)) {
                            a++;
                            cnt /= 10;
                        } else {
                            sum += cnt;
                        }
                    }
                }
                if (a == s.length()) {
                    sum = sum + (source[i].length()-b)*cnt;
                    map.put(sum, source[i]);
                }
            }
            if (map.size() == 0) {
                System.out.println(-1);
            } else {
                for (Double l : map.keySet()) {
                    System.out.println(map.get(l));
                }
            }
        }
    }

}
```

## 总结
都是基础问题啊，根本没必要刻意刷题，该懂得都懂了，题目自然就做对了！
