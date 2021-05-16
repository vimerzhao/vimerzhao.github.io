---
title: "Linux下配置JDK版本教程"
date: 2017-06-12
type: post
isCJKLanguage: true
---

# Linux下配置JDK版本教程
记录了Linux配置JDK版本的方法。
最近，在自己的Ubuntu虚拟及上发现一个奇怪的问题，Java源文件可以编译但不能运行，检查发现原来是编译出来的版本高于JRE的版本：

```
zhaoyu@zhaoyu-VirtualBox:~$ java -version
java version "1.6.0_41"
OpenJDK Runtime Environment (IcedTea6 1.13.13) (6b41-1.13.13-0ubuntu0.12.04.1)
OpenJDK Client VM (build 23.41-b41, mixed mode, sharing)
zhaoyu@zhaoyu-VirtualBox:~$ javac -version
javac 1.7.0_121
```
应该是最近在虚拟机上研究OpenJDK时弄错的。修改也比较容易（但应该不是最优方案）。
修改`/etc/profile`文件，在结尾加入：

```
## 路径依具体情况而定
export JAVA_HOME=/usr/lib/jvm/java-1.7.0-openjdk-i386/
export JRE_HOME=$JAVA_HOME/jre
export CLASSPATH=$JAVA_HOME/lib:$CLASSPATH
export PATH=$JAVA_HOME/bin:$JRE_HOME/bin:$PATH
```
需要注意的是，修改完成需要使用`source`命令：

```
zhaoyu@zhaoyu-VirtualBox:~$ source /etc/profile
```
再次检查版本：

```
zhaoyu@zhaoyu-VirtualBox:~$ java -version
java version "1.7.0_121"
OpenJDK Runtime Environment (IcedTea 2.6.8) (7u121-2.6.8-1ubuntu0.12.04.3)
OpenJDK Client VM (build 24.121-b00, mixed mode, sharing)
```
