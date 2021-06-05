---
title: "Android音视频播放器开发（二）：MVP模式实践"
date: 2017-10-16
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# Android音视频播放器开发（二）：MVP模式实践
本文主要针对上一篇博客的代码进行重构，并简单阐述了使用MVP模式的好处。
以音乐播放部分为例，下图是未重构的代码结构：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_5.png)
虽然还算清晰，但是拓展性很差。经过一番重构，代码结构变成了下面这样：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_13.png)
是不是看起来变得复杂了？再来分析以下具体的代码改变：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_14.png)
这是一个接口，定义了`MVP`中`Presenter`的职责。接着定义一个类实现这个接口，而具体的实现代码其实是重构之前散布在`Activity`和`Service`中的功能代码，现在通过`Presenter`实例调用完成：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_15.png)
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_16.png)
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_17.png)
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_18.png)
以上代码其实就是把直接执行的语句封装起来再间接调用。这样有什么用呢？虽然看起来饶了弯路，但却实现了视图和逻辑的分离，接下来举例说明这种解耦的好处。
这里我们获取了本里的音乐列表，但一般音乐播放器都应该有在线播放的功能，所以我们现在需要加一个功能：搜索歌名，显示在线列表。这是最后的效果：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_20)
其实原理非常简单，向一个开放的API发送请求，解析返回的JSON数据就可以了，这里不细讲。我们的关注点是重构后代码如何更好的应对这种需求的变化。
仔细分析一下，无论本地音乐列表还是在线音乐列表，其实都是`MVP`中的`Model`层在变化，所以`View`和`Presenter`层受到的影响应该尽可能小。在回来看第二张图，可以看到在`music.model`包下的`IMusicDatabase`有两个不同实现，对应不同的列表获取源。如此，在`View`只需要简单地加几行代码：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_23.png)
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_24.png)
由于网络操作在子线程，界面刷新在UI线程，所以对比一下本地列表的显示：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_17.png)
发现虽然调用了相同的方法，但却有线程之分了，正是因为采用了MVP的架构，才得以将主要的变化转化为新建一个`MusicDatabaseOnlineImpl`类，而最大限度的减少对原工程的更改。如下图：
![](http://ouv3jwdep.bkt.clouddn.com/mvp_demo.png)
以上，就是我对MVP的一点理解，拖了半个月才补完这篇博客。
此外，对比一下MVC和MVP可以发现，MVP更加符合**正交设计**的原则（想像`Model`，`View`，`Presenter`垂直排列）：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_19)

比如`TCP/IP`的设计，`Android`的架构，都符合正交设计的原则：
![](http://ouv3jwdep.bkt.clouddn.com/music_demo_26.jpg)

这种设计的好处是某一层变动（本例是`Model`层）可以最大限度降低对整个架构的影响。

最后，项目github：[vimerzhao/MediaPlayer](https://github.com/vimerzhao/MediaPlayer)
