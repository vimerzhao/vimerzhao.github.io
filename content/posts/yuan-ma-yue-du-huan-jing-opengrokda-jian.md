---
title: "源码阅读环境OpenGrok搭建"
date: 2018-09-23
type: post
isCJKLanguage: true
---

# 源码阅读环境OpenGrok搭建
工欲善其事，必先利其器。

## 导语
阅读源码最常见操作的就是在函数/方法的调用与定义之间跳转，对于只有大部分源码来说，都可以通过ctags+vim获得比较好的体验，但对于Android源码这样10G多的大型项目，这种方法就捉襟见肘了，更不必说对高度定制化的搜索需求（如查找某个文件的某个方法）的支持。
OpenGrok其实就是一个搜索引擎，只不过不同于Google、Baidu面向的是网页，OpenGrok面向的是源码，通过建立索引，OpenGrok可以帮助我们更好地在浩如烟海的源码里找到自己需要的那部分。

## 环境搭建
环境搭建的繁琐程度和最终的便利性成反比，把源码解压出来，随便装一个文本编辑器就可以开始阅读源码了，但是如果你真的这样做就会发现即使查找某个函数/方法的声明都极其耗时，所以希望读者接下来可以保持耐心，因为环境搭建对于源码阅读来说是一件一劳永逸的事情。
对于自学能力强者，建议直接看官方文档：[How to setup OpenGrok · oracle/opengrok Wiki](https://github.com/oracle/opengrok/wiki/How-to-setup-OpenGrok)

### 网页浏览器+Servlet
什么要网页浏览器？因为OpenGrok本质是一个建立和处理索引的工具，就像ctags一样，我们一般用的编辑器Vim其实充当了一个显示代码的前端的作用，这个里的网页浏览器其实功能就和Vim类似，用来显示代码。Vim能够直接解析ctags工具生成的tags文件，但网页浏览器却不能，所以需要一个Servlet（服务器端），用来处理查找方法、跳转到方法声明之类的操作所产生的请求，这里我们选择tomcat，版本要求8+。安装过程如下：
```
sudo apt-get install tomcat8 
sudo /etc/init.d/tomcat8 restart 
```

打开[http://localhost:8080/](http://localhost:8080/)看到类似下面的网页说明成功了：
![](http://p2pe8gnn5.bkt.clouddn.com/tomcat-works.png)


最后下载[OpenGrok](https://github.com/oracle/opengrok/releases)，并把`source.war`这个文件放在Tomcat的webapp目录下：
```
sudo cp ~/下载/opengrok-1.1-rc41/lib/source.war /var/lib/tomcat8/webapps
```
此时[http://localhost:8080/source/](http://localhost:8080/source/)应该就能访问了，但是可能会报一些错误，只要不是404就不要慌，继续配置。

### JDK1.8+
官方明确要求JDK1.8及以上版本，如果版本低会报
```
An error occurred at line: 55 in the jsp file: /menu.jspf
'<>' operator is not allowed for source level below 1.7
```
之类的错误，如何安装JDK的教程很多，不做赘述。
通过`java -version`和`javac -version`可以查看版本。

### ctags
必须是`universal-ctags`，否则后面建立索引的时候会报错：
```
严重: Exception running indexer
    org.opengrok.indexer.index.IndexerException: Didn't find Universal Ctags
    at org.opengrok.indexer.index.Indexer.prepareIndexer(Indexer.java:888)
    at org.opengrok.indexer.index.Indexer.main(Indexer.java:298)
```

一般通过`apt-get`安装的都是`exuberant-ctags`，要注意：
```
sudo apt-get install tags[TAB]
exuberant-ctags               geany-plugin-ctags            libparse-exuberantctags-perl
```
可以直接下载`universal-ctags`的源码来编译安装：
```
## prepare
sudo apt-get remove ctags
sudo apt-get autoremove
sudo apt-get install autoconf
sudo apt-get install automake

git clone https://github.com/universal-ctags/ctags.git
cd ctags
./autogen.sh 
./configure
make
sudo make install
```

### 其他
足够的硬盘空间。

## 导入源码

### 管理源码
OpenGrok会通过一个目录存放所有需要被索引的工程，通过一个目录存放索引，对于需要建立索引的源码，为了不影响其他操作，我们可以建立一个目录`opengrok-workspace`（名字自定义，下同）,将源码放在`project`目录下，索引放在`data`目录下。但这样直接移动源码实在不够优雅，其实`project`目录存在的意义是让OpenGrok知道哪些工程需要被索引，所以我们只需建立一个软链接（Windows下的快捷方式）就行了，这里我为Android源码、Vim源码和Git源码建立了软链接，表示我需要索引这三个工程：
```
cd ~/opengrok-workspace/project
ln -s ~/SourceCode/Android_6.0/mydroid/ Android6.0
ln -s ~/SourceCode/git/ git
ln -s ~/SourceCode/vim/ vim
```

效果如下：
```
~/opengrok-workspace/project $ ls
Android6.0  git  vim
```
这样我们不想索引某个项目只需要移除他的软链接（几kb）就行了，而不必移动项目本身（动辄几G）。

### 参数配置
强烈建议通过`java -jar ~/Install/opengrok-1.1-rc41/lib/opengrok.jar -h`查看每一个参数的意义，比如我最终的命令是下面这样（在 `bash` 且管理员权限下运行，`zsh` 会报错，更新完成需要重启服务器 `sudo /etc/init.d/tomcat8 restart`）：
```
java -jar ~/Install/opengrok-1.1-rc41/lib/opengrok.jar -P -S -v -s ~/opengrok-workspace/project -d ~/opengrok-workspace/data -I *.java -I *.c -I *.h -I *.cpp -W ~/opengrok-workspace/configuration.xml
```
其中`-s`表明项目地址，`-d`表明索引输出地址，`-W`表明配置输出地址，都是必须的。对于Git和Vim不要`-I`参数可能都没有问题，但对于Android源码，如果不要这个参数产生的索引就会不可用，因为`.jar`、`.so`等文件都无法建立索引，所以这里我指定了只对Java和C、C++相关的文件建立索引，不仅建立速度更快，占用空间也更小。

### Tomcat配置
最后，去`/var/lib/tomcat8/webapps/source/WEB-INF`目录配置`CONFIGURATION`参数，让服务器端知道索引在哪：
```
......
    <context-param>
        <description>Full path to the configuration file where OpenGrok can read its configuration</description>
        <param-name>CONFIGURATION</param-name>
        <param-value>/home/zhaoyu/opengrok-workspace/configuration.xml</param-value>
    </context-param>
......
```
按照上面的命令重启Tomcat服务器端使新的配置生效，打开[http://localhost:8080/source/](http://localhost:8080/source/)，最后大功告成：
![](http://p2pe8gnn5.bkt.clouddn.com/opengrok-demo.gif)

## 总结
本文只是介绍了环境的基本搭建流程，OpenGrok支持高度定制，这里只使用了最基本的参数。此外，前端和服务器端也可以根据自己的喜好定制，例如[asenac/vim-opengrok](https://github.com/asenac/vim-opengrok)和[jdevera/vim-opengrok-search](https://github.com/jdevera/vim-opengrok-search)都在尝试把Vim作为浏览代码的前端，当然在Chrome里面装个`vimium`也能获得类似的体验。
