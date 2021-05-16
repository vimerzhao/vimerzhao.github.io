---
title: "区块链招聘信息爬取与分析"
date: 2018-04-18
type: post
isCJKLanguage: true
---

# 区块链招聘信息爬取与分析
最近在研究区块链，闲来无事抓取了拉勾网上450条区块链相关的招聘信息。过程及结果如下。
## 拉勾网爬取
首先是从拉勾网爬取数据，用的`requests`库。拉勾网的反爬虫做的还是比较好的，毕竟自己也知道这种做招聘信息聚合的网站很容易被爬，而且比起妹子图这种网站，开发的技术水平应该高不少。
一开始爬取几个数据后就会跳转到登陆页面，当时采用的应对策略是：当跳转到登陆页面的时候，就挂起20s，再重新请求一次，发现一般挂起一段时间之后就又可以访问了。这样的问题是比较慢，450条信息花了几十分钟。
![](http://p2pe8gnn5.bkt.clouddn.com/lagou_login.png)

后来，我天真地认为：只要登陆了就可以不用挂起等待这么久。于是，添加了模拟登陆地逻辑，主要参考地这篇文章：[python -- 拉勾网爬虫模拟登录 - CSDN博客](https://blog.csdn.net/Laichilueng/article/details/77868012)。拉勾网对密码做了两次md5加密，并会下发动态地Token口令，防止低级地伪造请求，需要仔细分析登陆界面加载的JS文件才能成功登陆，拿到Cookie。想起当年模拟登陆教务处，学号密码都是明文传输，我直接用F12工具能看到。。。成功拿到Cookie后发现，访问过快时又会跳转到首页，并弹出一个“切换城市”的悬浮窗，更准确地说是我的请求被重定向了。
![](http://p2pe8gnn5.bkt.clouddn.com/lagou_select_city.png)

为什么重定向，因为后台能够通过访问频率很容易发现我的请求是爬虫，所以重定向，普通用户可以点击取消悬浮窗，由于`requests`不支持JS运行，所以我就GG了，只能像前面那样挂起一段时间再请求。这样一来，模拟登陆就没有意义了。
针对这种情况，我认为有两种解决办法，一种是使用IP池和多线程，不断变换请求的IP就不会被发现了。另外一种就是用无头浏览器。个人感觉两种都是可行的，下次有需求了再实践一下。

## 爬取结果分析
将爬取的网页提取信息，本着可视化原则，用`mathplotlib`做些图。其中遇到的主要问题是`mathplotlib`的中文支持，试了网上很多方法都失败了，这里要把自己亲测可行的方法记录下来：
```
from matplotlib import rcParams
import matplotlib.font_manager as fm

zhfont = matplotlib.font_manager.FontProperties(fname='../test.ttf')
font_list = fm.createFontList(fm.findSystemFonts(['/home/zhaoyu/Project/BlockChainAnalysis/font', ]))
fm.fontManager.ttflist.extend(font_list)
matplotlib.rcParams['font.family'] = 'WenQuanYi Micro Hei'
```
主要结果如下：
公司规模，小公司居多：
![](http://p2pe8gnn5.bkt.clouddn.com/blockchain_analysis_scale.png)

城市分布，北上深最多：
![](http://p2pe8gnn5.bkt.clouddn.com/blockchain_analysis_city.png)

发展阶段：
![](http://p2pe8gnn5.bkt.clouddn.com/blockchain_analysis_trend.png)

薪资分布：
![](http://p2pe8gnn5.bkt.clouddn.com/blockchain_analysis_salary.png)

（感觉这样表示不是很直观，自己划定几个区间，做一个柱状图可能更好）

最后还用`jieba`和`textrank4zh`做了关键词提取，但由于手法粗糙加上噪音严重（产品经理、技术开发等等的招聘需求应该分类处理），效果好像不是很理想：
```
Building prefix dict from the default dictionary ...
Loading model from cache /tmp/jieba.cache
Loading model cost 0.854 seconds.
Prefix dict has been built succesfully.
关键词：
技术 0.010791270870042516
区块 0.008745674154277546
相关 0.00844148459795554
工作 0.008368189087078589
开发 0.007315529659791802
熟悉 0.006915993478846666
产品 0.0066154024633222315
能力 0.00606941754659388
项目 0.005688665635431383
经验 0.005609155675707272
公司 0.005484150951833748
优先 0.005273082641983991
团队 0.004833977171492051
行业 0.004666562221685026
设计 0.004646942513692475
系统 0.004561171667742128
进行 0.004504888034867325
研究 0.004431023464429216
业务 0.00431705965334352
负责 0.004180396829264431
```

## 发现的不足
1. 按照之前的计划，个人能力的构建应该分为两部分，一部分是工具库的积累，一部分是底层原理的掌握。目前来看，两方面做的都不是很好。`beautifulsoup`和`mathplotlib`都很不熟练，遇到反爬虫不能快速解决，拿到数据也不能很好的可视化出来。
2. 平时没有意识去建立个人知识体系，比如常见的反爬虫与绕过方法，数据挖掘（拿到了爬取的数据该怎么办），数据可视化（怎么直观地表示数据）。
3. 写代码不能得心应手，比如对容器地某个操作怎么最优雅，自己目前的水平就是遇到问题百度一下，找个可行地方案就套用上去，离自己理想的状态差太远了。
