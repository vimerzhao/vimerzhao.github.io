---
title: "bat批处理简介：Windows自动化之道"
date: 2018-09-09
type: post
isCJKLanguage: true
categories:
    - "折腾工具"
---

# bat批处理简介：Windows自动化之道
重复的工作交给代码。

## 导语
最近在工作中遇到一些纯粹重复的工作，最终都通过脚本方式达到了自动化，大大提高效率。比如之前每次发布zip包都需要手动编译lua文件、替换lua引用为二进制文件的引用，选择对应文件打zip包，每次都需要几分钟，还容易出错、遗漏，很不geek，通过脚本后实现了完全自动化：

![](http://p2pe8gnn5.bkt.clouddn.com/archive_demo.gif)

再比如Android项目中用到了插件，由于正式打包和本地编译的gradle脚本不同，以及Android Studio对模块的编译支持不够，导致每次都需要手动修改文件名（如本地开发时`build.gradle`修改为`build.gradle.tmp`、`build.gradle.local`修改为`build.gradle`，正式编包时再修改回去），再copy插件目录出去单独开发调试，最后在把改动合入工程，终端也需要一个按钮来启动插件，十分繁琐且容易造成代码不同步，通过脚本可以实现工程内一键编译运行：

![](http://p2pe8gnn5.bkt.clouddn.com/plugin_run_demo.gif)

由于之前没有用过bat脚本，所以做自动化时速度不是很快，因此花了一天时间整理一下bat脚本的使用要点，只是一个纲领，没有深入讲解，因为我觉得需要的时候去学习细节才是最高效的，但必须了解整体框架才能快速定位到需求对应的命令，因此整理了这篇文章。
此外，Windows7已经支持了powershell，其语法更接近bash，比bat不知道灵活到哪里去了，我为什么不用powershell呢？主要是目前powershell速度远没有cmd快，正好我的自动化任务都比较简单，如果用powershell可能启动时间比运行时间还长。
为什么不用python、perl等脚本语言？这些脚本需要环境配置，考虑到这些脚本工具可能被其他人使用，所以希望开箱即用，而且bat足够简单，足够满足需求。

## PART 1：运行环境
类似于编程语言库，这些命令是Windows内置的，可以作为脚本的基本元素，可以在cmd运行，也可以写入cmd运行。首先介绍最重要的两个命令：`help`,`/?`，利用`help`可以查看当前内置的命令：
```
F:\BatchFileProgramming>help
有关某个命令的详细信息，请键入 HELP 命令名
ASSOC          显示或修改文件扩展名关联。
ATTRIB         显示或更改文件属性。
BREAK          设置或清除扩展式 CTRL+C 检查。
BCDEDIT        设置启动数据库中的属性以控制启动加载。
CACLS          显示或修改文件的访问控制列表(ACL)。
CALL           从另一个批处理程序调用这一个。
CD             显示当前目录的名称或将其更改。
CHCP           显示或设置活动代码页数。
CHDIR          显示当前目录的名称或将其更改。
CHKDSK         检查磁盘并显示状态报告。
CHKNTFS        显示或修改启动时间磁盘检查。
CLS            清除屏幕。
CMD            打开另一个 Windows 命令解释程序窗口。
COLOR          设置默认控制台前景和背景颜色。
......
```

利用`/?`可以详细的了解某个命令：
```
F:\BatchFileProgramming>call /?
从批处理程序调用另一个批处理程序。

CALL [drive:][path]filename [batch-parameters]

  batch-parameters   指定批处理程序所需的命令行信息。

如果命令扩展被启用，CALL 会如下改变:

CALL 命令现在将卷标当作 CALL 的目标接受。语法是:

    CALL:label arguments

一个新的批文件上下文由指定的参数所创建，控制在卷标被指定
后传递到语句。您必须通过达到批脚本文件末两次来 "exit" 两次。
第一次读到文件末时，控制会回到 CALL 语句的紧后面。第二次
会退出批脚本。键入 GOTO /?，参看 GOTO :EOF 扩展的描述，
此描述允许您从一个批脚本返回。

另外，批脚本文本参数参照(%0、%1、等等)已如下改变:
......
```

有了这两个命令，我也就不需要像网上那些文章一样详细解释每个命令了，查阅文档即可。这里列一些常用的，建议优先掌握，较为生僻的在需要时详细学习即可。
常用命令：
```
REM,echo,color,title,prompt,cls,date,time,start,exit,call,tree,type,pause,shutdown,at
```

常用环境变量（Environment variables are special variables that contain its values set by the operating system itself, other applications or by manual）：
```
%CD%,%PATH%,%RANDOM%
```

文件和文件夹相关的命令：
```
dir,mkdir,rmdir,chdir,ren,replace,copy,xcopy,del,pushd,popd,move
```

网络：
```
net,ping,telnet,tlntadmn,tracert,ipconfig,hostname,ftp,netstat,nbtstat,arp
```

如果遇到需要但自己又不知道的，google即可。

## PART 2：语法
如果只有这些命令，那么运行bat和在命令行执行没什么区别，最多把命令保存下来了方便以后运行。bat也支持一些编程语言的特性，虽然简陋且不够优雅，但应付简单的自动化任务基本够用。我觉得Dennis Ritchie和Brian Kernighan的*The C Programming Language*，是介绍一门语言的模板，所以这里也按照该书的结构安排。

### 类型、变量、操作符
bat没有类型。`set`命令很重要，用于赋值，通过`%name%`引用变量，且变量赋值的`=`两边不能有空格：
```
C:\Users\vimerzhao\Desktop>set a=1
C:\Users\vimerzhao\Desktop>echo a
a
C:\Users\vimerzhao\Desktop>echo %a%
1
```
bat对运算符的支持和其他语言大同小异：

|operators                          |description|
|-|-|
|()                               | grouping|
|!、~、-                            | unary operators|
|*、/、%、+、-                        | arithmetic operators|
|<<、>>、<、>                        | logical shift and re directional operators|
|&                                | bitwise and|
|^                                | bitwise exclusive or|
|&vert;                                | bitwise or|
|=、*=、/=、%=、+=、-=、&=、^=、&vert;=、<<=、>>=| assignment operators|
|,                                | separator|
|&&                               | for using multiple commands|
|&vert;&vert;                               | for executing one from many commands|

### 流程控制
bat可以通过for和goto实现循环，通过if实现条件语句。bat通过switch的概念支持不同类型的遍历，switch和Linux命令的option很像，就是选项，常见的有四个：

|switch|description|
|-|-|
|`for /d`| the '/d' switch along with the ‘for’ command is used for looping through several directories|
|`for /r`| the '/r' switch along with the ‘for’ command is used for looping through directories and sub directories|
|`for /l`| the '/l' switch along with the ‘for’ command is used for looping through a range of specified numbers|
|`for /f`| the ‘/f’ switch along with the ‘for’ command is used for looping through a wide variety of files, command and strings|

for循环最常见的应用就是遍历文件夹：
```
C:\Users\vimerzhao\Desktop>@echo off
C:\Users\vimerzhao\Desktop>echo 显示全部文件
C:\Users\vimerzhao\Desktop>for %a in (*) do echo %a
001.PNG
002.PNG
...
```
在bat脚本中由于%与变量引用冲突，要写成
```
for %%a in (*) do echo %%a
```

此外，可以通过内置的语法对文件做处理（如显示完整路径、文件名、后缀名等）：

|command|description|
|-|-|
|%~I | expands %I removing any surrounding quotes (")|
|%~fI | expands %I to a fully qualified path name|
|%~dI | expands %I to a drive letter only|
|%~pI | expands %I to a path only|
|%~nI | expands %I to a file name only|
|%~xI | expands %I to a file extension only|
|%~sI | expanded path contains short names only|
|%~aI | expands %I to file attributes of file|
|%~tI | expands %I to date/time of file|
|%~zI | expands %I to size of file|
|%~$PATH:I | searches the directories listed in the PATH environment variable and expands %I to the fully qualified name of the first one found. If the environment variable name is not defined or the file is not found by the search, then this modifier expands to the empty string.|
|%~dpI | expands %I to a drive letter and path only|
|%~nxI | expands %I to a file name and extension only|
|%~fsI | expands %I to a full path name with short names only|
|%~dp$PATH:I | searches the directories listed in the PATH environment variable for %I and expands to thedrive letter and path of the first one found|
|%~ftzaI | expands %I to a DIR like output line|

if语句除了支持操作符还支持几个自定义的关键字：

|operators| meaning|
|-|-|
|equ| equal|
|neq| not equal|
|lss| less than|
|leq| less than or equal|
|gtr| greater than|
|geq| greater than or equal|

### 子程序
最后，bat也支持简单的子程序调用，和汇编很像，通过%n可以获取参数，从1开始，如以下代码：
```
REM filename: test.bat
@echo off
call :procedure "argument 1"

goto:eof
:procedure
    echo repeat part or modular code
    echo %1
goto:eof
```

输出为：
```
F:\BatchFileProgramming>test.bat
repeat part or modular code
"argument 1"
```


## 总结
以上基本都是一些提纲挈领的概述，自己也不算精通每个细节，相信只要心中有整体框架，再加上一点自动化的意识，久而久之自会得心应手。

## 参考
- [批处理之家](http://www.bathome.net/index.php)
- [DOS_BAT-脚本之家](https://www.jb51.net/list/list_106_1.htm)
- *Batch File Programming*，Premkumar.S
