---
title: "Java URL类踩坑指南"
date: 2017-11-26
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# Java URL类踩坑指南
`java.net.URL`类的几个细节问题。

## 背景介绍
最近再做一个RSS阅读工具给自己用，其中一个环节是从服务器端获取一个包含了RSS源列表的json文件，再根据这个json文件下载、解析RSS内容。核心代码如下：
```kotlin
class PresenterImpl(val context: Context, val activity: MainActivity) : IPresenter {
    private val URL_API = "https://vimerzhao.github.io/others/rssreader/RSS.json"

    override fun getRssResource(): RssSource {
        val gson = GsonBuilder().create()
        return gson.fromJson(getFromNet(URL_API), RssSource::class.java)
    }

    private fun getFromNet(url: String): String {
        val result = URL(url).readText()
        return result
    }

    ......
}
```
之前一直执行地很好，直到前两天我购买了一个`vimerzhao.top`的域名，并将原来的域名`vimerzhao.github.io`重定向到了`vimerzhao.top`。这个工具就无法使用了，但在浏览器输入`URL_API`却能得到数据：
![](http://ond7j4cnz.bkt.clouddn.com/2017-11-26java_url_01.gif)

那为什么`URL.readText()`没有拿到数据呢？

## 不支持重定向
可以通过下面代码测试：
```java
import java.net.*;
import java.io.*;

public class TestRedirect {
    public static void main(String args[]) {
        try {
            URL url1 = new URL("https://vimerzhao.github.io/others/rssreader/RSS.json");
            URL url2 = new URL("http://vimerzhao.top/others/rssreader/RSS.json");
            read(url1);
            System.out.println("=--------------------------------=");
            read(url2);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    public static void read(URL url) {
        try {
            BufferedReader in = new BufferedReader(
                    new InputStreamReader(url.openStream()));

            String inputLine;
            while ((inputLine = in.readLine()) != null) {
                System.out.println(inputLine);
            }
            in.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

```
得到结果如下：
```
<html>
<head><title>301 Moved Permanently</title></head>
<body bgcolor="white">
<center><h1>301 Moved Permanently</h1></center>
<hr><center>nginx</center>
</body>
</html>
=--------------------------------=
{"theme":"tech","author":"zhaoyu","email":"dutzhaoyu@gmail.com","version":"0.01","contents":[{"category":"综合版块","websites":[{"tag":"门户网站","url":["http://geek.csdn.net/admin/news_service/rss","http://blog.jobbole.com/feed/","http://feed.cnblogs.com/blog/sitehome/rss","https://segmentfault.com/feeds","http://www.codeceo.com/article/category/pick/feed"]},{"tag":"知名社区","url":["https://stackoverflow.com/feeds","https://www.v2ex.com/index.xml"]},{"tag":"官方博客","url":["https://www.blog.google/rss/","https://blog.jetbrains.com/feed/"]},{"tag":"个人博客-行业","url":["http://feed.williamlong.info/","https://www.liaoxuefeng.com/feed/articles"]},{"tag":"个人博客-学术","url":["http://www.norvig.com/rss-feed.xml"]}]},{"category":"编程语言","websites":[{"tag":"Kotlin","url":["https://kotliner.cn/api/rss/latest"]},{"tag":"Python","url":["https://www.python.org/dev/peps/peps.rss/"]},{"tag":"Java","url":["http://www.codeceo.com/article/category/develop/java/feed"]}]},{"category":"行业动态","websites":[{"tag":"Android","url":["http://www.codeceo.com/article/category/develop/android/feed"]}]},{"category":"乱七八遭","websites":[{"tag":"Linux-综合","url":["https://linux.cn/rss.xml","http://www.linuxidc.com/rssFeed.aspx","http://www.codeceo.com/article/tag/linux/feed"]},{"tag":"Linux-发行版","url":["https://blog.linuxmint.com/?feed=rss2","https://manjaro.github.io/feed.xml"]}]}]}
```

HTTP返回码301，即发生了重定向。可在浏览器上这个过程太快以至于我们看不到这个301界面的出现。这里需要说明的是`URL.readText()`是Kotlin中一个`扩展函数`，本质还是调用了`URL`类的`openStream`方法，部分源码如下：
```kotlin
.....
/**
 * Reads the entire content of this URL as a String using UTF-8 or the specified [charset].
 *
 * This method is not recommended on huge files.
 *
 * @param charset a character set to use.
 * @return a string with this URL entire content.
 */
@kotlin.internal.InlineOnly
public inline fun URL.readText(charset: Charset = Charsets.UTF_8): String = readBytes().toString(charset)

/**
 * Reads the entire content of the URL as byte array.
 *
 * This method is not recommended on huge files.
 *
 * @return a byte array with this URL entire content.
 */
public fun URL.readBytes(): ByteArray = openStream().use { it.readBytes() }

```
所以上面的测试代码即说明了`URL.readText()`失败的原因。
不过`URL`不支持重定向是否合理？为什么不支持？还有待探究。

## 不稳定的`equals`方法
首先看下`equals`的说明([URL (Java Platform SE 7 )](https://docs.oracle.com/javase/7/docs/api/))：

>Compares this URL for equality with another object.
If the given object is not a URL then this method immediately returns false.
Two URL objects are equal if they have the same protocol, reference equivalent hosts, have the same port number on the host, and the same file and fragment of the file.
Two hosts are considered equivalent if both host names can be resolved into the same IP addresses; else if either host name can't be resolved, the host names must be equal without regard to case; or both host names equal to null.
Since hosts comparison requires name resolution, this operation is a blocking operation.
Note: The defined behavior for equals is known to be inconsistent with virtual hosting in HTTP.

接下来再看一段代码：
```java
import java.net.*;
public class TestEquals {
    public static void main(String args[]) {
        try {
            // vimerzhao的博客主页
            URL url1 = new URL("https://vimerzhao.github.io/");
            // zhanglanqing的博客主页
            URL url2 = new URL("https://zhanglanqing.github.io/");
            // vimerzhao博客主页重定向后的域名
            URL url3 = new URL("http://vimerzhao.top/");
            System.out.println(url1.equals(url2));
            System.out.println(url1.equals(url3));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

```
根据定义输出结果是什么呢？运行之后是这样：
```
true
false
```
你可能猜对了，但如果我把电脑**断网**之后再次执行，结果却是：
```
false
false
```

但其实3个域名的IP地址都是相同的，可以`ping`一下：
```
zhaoyu@Inspiron ~/Project $ ping vimerzhao.github.io
PING sni.github.map.fastly.net (151.101.77.147) 56(84) bytes of data.
64 bytes from 151.101.77.147: icmp_seq=1 ttl=44 time=396 ms
^C
2 packets transmitted, 1 received, 50% packet loss, time 1000ms
rtt min/avg/max/mdev = 396.009/396.009/396.009/0.000 ms
zhaoyu@Inspiron ~/Project $ ping vimerzhao.top
ping: unknown host vimerzhao.top
zhaoyu@Inspiron ~/Project $ ping vimerzhao.top
PING sni.github.map.fastly.net (151.101.77.147) 56(84) bytes of data.
64 bytes from 151.101.77.147: icmp_seq=1 ttl=44 time=409 ms
^C
null
/
vimerzhao.github.io
null

vimerzhao.github.io
