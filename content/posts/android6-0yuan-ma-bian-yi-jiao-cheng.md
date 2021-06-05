---
title: "Android6.0源码编译教程"
date: 2018-01-17
type: post
isCJKLanguage: true
categories:
    - "源码剖析"
---

# Android6.0源码编译教程
第一次成功编译了Android的源码，记录一下。
## 回忆
这是我第二次尝试去编译Android的源码，第一次是半年前，当时刚刚拿到去腾讯实习的Offer，虽然当时会一些Android开发的皮毛知识，但想到将来可能长期从事这个领域，就一时踌躇满志，打算先研究一下Android源码。
当时是按照网上最常见的方法，通过`repo`工具来下载代码，结果下了30G左右，似乎下载了所有版本，而且网络似乎有中断，都不知道下载的代码是否完整，再加上120G固态硬盘实在不够用，所以不了了之。
寒假回来，感觉自己最近一段时间过于沉迷游戏，毕设进度不及预期，博客也多荒废了。明年打算去公司继续实习，所以还是早回正轨吧！

## 下载源码
这次看到一篇博客，给了我一些新的启发，博主将Android6.0的源码打包，然后切割成10个700M左右的文件放在百度网盘，所以我只需要下载之后再合并这些文件就行了：
```
➜  下载 ls
Android6_r1_aa
Android6_r1_ab
Android6_r1_ac
Android6_r1_ad
Android6_r1_ae
Android6_r1_af
Android6_r1_ag
Android6_r1_ah
Android6_r1_ai
Android6_r1_aj
```
通过：
```
➜  下载 cat Android6_r1_*>Android6_r1.tgz
```
便可以合并这些文件，值得一提的是：由于文件下载过程中可能损坏（确实存在，有一个文件用浏览器老是下载失败，我便用手机客户端下载之后拷贝过来，就发现合并之后解压失败，检查之后发现这个文件的md5值已经变了），所以需要通过md5检验。通过`md5sum`命令查看每个文件的md5值，并与随同下载的`hash.txt`对比：
```
➜  下载 cat hash.txt
a4129f5d2d6a8293ee3ee3ed4343f0fd  Android6_r1_aa
e601f1239c0f60895cc6b9199b1cd7d1  Android6_r1_ab
af2d9e653a51072031ce40b62791c2de  Android6_r1_ac
482866559a4d6a8533411e512436363c  Android6_r1_ad
cef15f072f6d52243d9dea126c22f794  Android6_r1_ae
457979779748dae9f5f4f3c99db04826  Android6_r1_af
7ca217b1fd60a41c7ff9b7e294864fe3  Android6_r1_ag
5b468da830ef51fdd5f35d5d8ac72bd1  Android6_r1_ah
ba80f4acf5f61b1b82d3c1ba6ba702c1  Android6_r1_ai
4350d1bb74589ad03735279421dced92  Android6_r1_aj

cat Android6_r1_*>M.tgz


23858108e95095dc8d0292505a0d28e4  M.tgz
➜  下载 
```

## 构建环境
这一步比较看运气，之前用Ubuntu12就是各种冲突，这次我用的是LinuxMint18 Xfce，而AOSP的官方说明只说了Ubuntu各版本的依赖安装，由于LinuxMint是Ubuntu的近亲，所以我就直接按照最新版本（>=Ubuntu15）来安装依赖，所幸一次通过：
```
sudo apt-get install git-core gnupg flex bison gperf build-essential zip curl zlib1g-dev gcc-multilib g++-multilib libc6-dev-i386 lib32ncurses5-dev x11proto-core-dev libx11-dev lib32z-dev ccache libgl1-mesa-dev libxml2-utils xsltproc unzip
```

## 开始编译
`make`之后，日常报错，第一次错误很好解决：
```
You are attempting to build with the incorrect version
of java.
 
 Your version is: openjdk version "1.8.0_151" OpenJDK Runtime Environment (build 1.8.0_151-8u151-b12-0ubuntu0.16.04.2-b12) OpenJDK 64-Bit Server VM (build 25.151-b12, mixed mode).
 The required version is: "1.7.x"
  
  Please follow the machine setup instructions at
      https://source.android.com/source/initializing.html

```
由于最新版本已经不能下载openjdk7，所以需要重新设置一下源，下载之后重写一下当前终端的环境变量（一次使用无污染）：
```
➜  Android_r1 export JAVA_HOME=/usr/lib/jvm/java-7-openjdk-amd64 
➜  Android_r1 export PATH=$JAVA_HOME/bin:$PATH 
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
➜  Android_r1 java -version
java version "1.7.0_95"
OpenJDK Runtime Environment (IcedTea 2.6.4) (7u95-2.6.4-3)
OpenJDK 64-Bit Server VM (build 24.95-b01, mixed mode)

```
最新版本的LinuxMint可能无法直接安装jdk1.7，需要手动设置源：
```
sudo add-apt-repository ppa:openjdk-r/ppa  
sudo apt-get update   
sudo apt-get install openjdk-7-jdk
```

注意不要用
```
sudo update-alternatives --config java
sudo update-alternatives --config javac
```
来指定版本，否则可能出现
```
Lock.ReentrantReadWriteLock.ReadLock(ReentrantReadWriteLock)
prebuilts/sdk/api/23.txt:53035: error 9: Removed public constructor java.util.concurrent.locks.ReentrantReadWriteLock.WriteLock.ReentrantReadWriteLock.WriteLock(ReentrantReadWriteLock)
prebuilts/sdk/api/23.txt:53074: error 9: Removed public constructor java.util.jar.Attributes.Name.Attributes.Name(String)
prebuilts/sdk/api/23.txt:54404: error 9: Removed public constructor javax.crypto.spec.PSource.PSpecified.PSource.PSpecified(byte)

******************************
You have tried to change the API from what has been previously released in
an SDK.  Please fix the errors listed above.
******************************


build/core/tasks/apicheck.mk:46: recipe for target 'out/target/common/obj/PACKAGING/checkpublicapi-last-timestamp' failed
make: *** [out/target/common/obj/PACKAGING/checkpublicapi-last-timestamp] Error 38

##### make failed to build some targets (05:10 (mm:ss)) ####
```

第二个问题比较棘手：
```
clang: error: linker command failed with exit code 1 (use -v to see invocation)
build/core/host_shared_library_internal.mk:44: recipe for target 'out/host/linux-x86/obj32/lib/libnativehelper.so' failed
make: *** [out/host/linux-x86/obj32/lib/libnativehelper.so] Error 1
```
但StackOverflow上也能找到答案（具体参见链接），但是直接按照答案还是失败了，再参考其他博客后，我覆盖了`ld`文件，原来的保留为`ld.old`，并修改`/art/build/Android.common_build.mk`为：
```
## Host.
ART_HOST_CLANG := false
ifneq ($(WITHOUT_HOST_CLANG),true)
    ## By default, host builds use clang for better warnings.
    ART_HOST_CLANG := false
endif
```
（原答案是将判断语句中的`true`修改为`false`）
最终，这份10G左右的源码在我的老电脑（500G机械硬盘，4G内存，i5处理器）上编译了大概4个小时终于成功了。

## 启动模拟器
这个部分原博主说的不是很清楚，这里详细说一下。在编译完成后，所有的结果文件都在`out`文件夹，有26G：
```
➜  Android_r1 du . -h --max-depth=1
16M     ./build
29M     ./bionic
28M     ./art
108K    ./abi
880K    ./pdk
900K    ./platform_testing
26G     ./out
108M    ./hardware
5.7M    ./bootable
89M     ./device
28M     ./docs
2.6G    ./external
30M     ./system
493M    ./cts
196K    ./libnativehelper
83M     ./ndk
276M    ./developers
11M     ./dalvik
31M     ./sdk
6.5G    ./prebuilts
52M     ./libcore
307M    ./development
1.5G    ./frameworks
686M    ./tools
401M    ./packages
40G.
```
打开一个新终端，首先要设置运行环境，然后选择平台：
```
➜  Android_r1 source build/envsetup.sh 
build/envsetup.sh:573: command not found: complete
WARNING: Only bash is supported, use of other shell would lead to erroneous results
including device/asus/deb/vendorsetup.sh
including device/asus/flo/vendorsetup.sh
including device/asus/fugu/vendorsetup.sh
including device/generic/mini-emulator-arm64/vendorsetup.sh
including device/generic/mini-emulator-armv7-a-neon/vendorsetup.sh
including device/generic/mini-emulator-mips/vendorsetup.sh
including device/generic/mini-emulator-x86_64/vendorsetup.sh
including device/generic/mini-emulator-x86/vendorsetup.sh
including device/htc/flounder/vendorsetup.sh
including device/lge/hammerhead/vendorsetup.sh
➜  Android_r1 lunch

You're building on Linux

Lunch menu... pick a combo:
1. aosp_arm-eng
2. aosp_arm64-eng
3. aosp_mips-eng
4. aosp_mips64-eng
5. aosp_x86-eng
6. aosp_x86_64-eng
7. aosp_deb-userdebug
8. aosp_flo-userdebug
9. full_fugu-userdebug
10. aosp_fugu-userdebug
11. mini_emulator_arm64-userdebug
12. m_e_arm-userdebug
13. mini_emulator_mips-userdebug
14. mini_emulator_x86_64-userdebug
15. mini_emulator_x86-userdebug
16. aosp_flounder-userdebug
17. aosp_hammerhead-userdebug
18. aosp_hammerhead_fp-userdebug
19. aosp_shamu-userdebug

Which would you like? [aosp_arm-eng] 

============================================
PLATFORM_VERSION_CODENAME=REL
PLATFORM_VERSION=6.0
TARGET_PRODUCT=aosp_arm
TARGET_BUILD_VARIANT=eng
TARGET_BUILD_TYPE=release
TARGET_BUILD_APPS=
TARGET_ARCH=arm
TARGET_ARCH_VARIANT=armv7-a
TARGET_CPU_VARIANT=generic
TARGET_2ND_ARCH=
TARGET_2ND_ARCH_VARIANT=
TARGET_2ND_CPU_VARIANT=
HOST_ARCH=x86_64
HOST_OS=linux
HOST_OS_EXTRA=Linux-4.4.0-21-generic-x86_64-with-LinuxMint-18-sarah
HOST_BUILD_TYPE=release
BUILD_ID=MRA58K
OUT_DIR=out
============================================

➜  Android_r1 which emulator
/home/vimerzhao/SourceCode/Android_r1/prebuilts/android-emulator/linux-x86_64/emulator
➜  Android_r1 which android
/home/vimerzhao/SourceCode/Android_r1/prebuilts/devtools/tools/android
➜  Android_r1 echo $ANDROID_PRODUCT_OUT
/home/vimerzhao/SourceCode/Android_r1/out/target/product/generic
```
这时候输入`emulator`就可以看到效果了：
![](http://p2pe8gnn5.bkt.clouddn.com/build_android.png)

## 两点遗憾
第一点，觉得编译期间输出的log对于理解源码还是很有帮助的，可惜没保存下来。第二点，打算烧录到真机的时候才发现编译之前要配置相应的驱动，这次也只好到此为止。

## 参考
- [[Android 编译(一)] Ubuntu 16.04 LTS 成功编译 Android 6.0 源码教程](http://blog.csdn.net/fuchaosz/article/details/51487585)
- [打造自己的Android源码学习环境之六：运行Android模拟器](http://blog.csdn.net/u013553529/article/details/54869298)
- [Building Android from sources: unsupported reloc 43](https://stackoverflow.com/questions/36048358/building-android-from-sources-unsupported-reloc-43)
- [搭建编译环境](https://source.android.com/source/initializing?hl=zh-cn)
- [How do I install openjdk 7 on Ubuntu 16.04 or higher?](https://askubuntu.com/questions/761127/how-do-i-install-openjdk-7-on-ubuntu-16-04-or-higher)
