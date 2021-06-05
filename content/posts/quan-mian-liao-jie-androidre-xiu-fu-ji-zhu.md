---
title: "全面了解Android热修复技术"
date: 2017-09-10
type: post
isCJKLanguage: true
categories:
    - "Android实践"
tags:
    - "技术精选"
---

# 全面了解Android热修复技术
引言:本文全面地探讨了Android热修复技术的发展脉络，现状及其未来。

## 热修复技术概述
热修复技术在近年来飞速发展，尤其是在InstantRun方案推出之后，各种热修复技术竞相涌现。国内大部分成熟的主流APP都拥有自己的热修复技术，像手淘、支付宝、QQ、饿了么、美团等等。
目前能搜集到的资料，大多简单罗列每个方案的特点并进行横向比较，而其中技术发展的脉络往往被掩盖了。热修复技术从何而来，又将往何处去？在这些资料中都找不到答案。
我认为，走马观花地看一遍各家的热修复方案并不能找到答案，所以写下本文，希望从一个不同的角度来了解热修复技术，权当抛砖引玉，如有不足，欢迎指正。

## 代码热修复
代码热修复是最常见，也是热修复中最重要的部分，因为程序错误往往都是代码逻辑的错误。最初的热修复方案也仅支持代码热修复。代码热修复分两个流派，即腾讯系的类加载方案和阿里系的底层替换方案，前者需要重启应用但却能修复大部分错误，后者及时生效却只能作方法内的修改。下面详细介绍。

### 类加载方案
#### Qzone
Qzone的超级热修复方案是业界最早的热修复方案之一，原理简单而巧妙，影响深刻而久远。关于详细原理，可以参考:[安卓App热补丁动态修复技术介绍](https://mp.weixin.qq.com/s?__biz=MzI1MTA1MzM2Nw==&mid=400118620&idx=1&sn=b4fdd5055731290eef12ad0d17f39d4a&scene=0)，在此简单介绍。Android类加载的源码如下:
```java
// ./libcore/dalvik/src/main/java/dalvik/system/DexPathList.java
public Class findClass(String name, List<Throwable> suppressed) {
    for (Element element : dexElements) {// 每个Element就是一个dex文件
        DexFile dex = element.dexFile;
        if (dex != null) {
            Class clazz = dex.loadClassBinaryName(name, definingContext, suppressed);
            if (clazz != null) {
                return clazz;
            }
        }
    }
    if (dexElementsSuppressedExceptions != null) {
        suppressed.addAll(Arrays.asList(dexElementsSuppressedExceptions));
    }
    return null;
}
```
可以看出当有多个dex文件时，他们会组成一个有序数组，按顺序加载，而对于一个已经加载的Class是不会再次加载的，由此得出热修复方案：把需要修复的类打包成一个dex文件下发，并在APP启动时通过反射，将这个dex文件放在`dexElements`的最前面，这样修复了的Class就会比有Bug的Class优先加载了。如下图所示：
![](http://ond7j4cnz.bkt.clouddn.com/2017-9-102017-09-10%2015-30-05%20%E5%88%9B%E5%BB%BA%E7%9A%84%E6%88%AA%E5%9B%BE.png)

但在实现过程中，会遇到`unexpected DEX problem`异常，Qzone方案为了解决这个问题采用了插桩的策略来规避这个异常。实际上，Android系统的检查和优化都是有其意义的，因此这种方法在Dalvik和Art上都会遇到问题。
- 在Dalvik虚拟机，APP在安装的时候会被执行`dexopt`操作，同一个dex文件内的Class会被打上`CLASS_ISPREVERIFIED`标志，而补丁包中的类并没有打上此标志，因此抛出异常。解决方法就是在第一次打包APK时让所有类都引用另一个dex文件中的类，这样所有的类始终不会打上`CLASS_ISPREVERIFIED`标志，因此补丁包可以顺利加载，但是Dalvik虚拟机在检测到一个类未打上`CLASS_ISPREVERIFIED`之后会再次在类加载的时候进行`dexopt`相关的操作，如果一次性加载很多类，速度将明显变慢。
- 在Art虚拟机，dex文件最终会编译成本地机器码，在`dex2oat`时`fast *`已经将各个类的地址写死，若补丁包中的类出现字段或者方法的修改，会出现内存地址错乱，解决办法是将这个类的父类和调用这个类的类都加入补丁包。但这样会导致补丁包急剧增大。(实际上要理解清楚这个问题需要熟悉Dalvik和Art的完整流程，并非三言两语能解释清楚)

这两个问题都可以解决，但都要付出一些代价：类加载速度或者补丁包大小。

#### Tinker
如果Qzone没有上面两个缺陷，或许就不会有Tinker了。对于微信这样一个对性能有极高要求的产品来说，Qzone的缺点会被无限放大。在参考Instant Run的冷插拔与buck的exopackage后，Tinker采用了全量替换的策略。全量替换可以避免插桩和地址写死问题，但是补丁包会很大，因此可以在新旧两个Dex的差异放在补丁包中，下发到移动端后再在本地合成完整的dex文件。
实际上，Tinker保留了Qzone最核心的东西：反射修改`dexElements`。无论是插入还是替换，本质都是利用了类加载的特点。由于需要下发的全量补丁包体积过大，Tinker采用了后台求diff，下发diff文件，移动端合成全量包的策略。
如果仅此而已，只要有diff/patch算法，就可以开发Tinker了。实际上，确实如此，可以参考：[热补丁：Tinker方案实现](https://vimerzhao.github.io/2017/08/03/%E7%83%AD%E8%A1%A5%E4%B8%81%EF%BC%9ATinker%E6%96%B9%E6%A1%88%E5%AE%9E%E7%8E%B0/)。而Tinker第二个创新之处就是采用了自研的DexDiff算法，大大优化了下发差异包的大小，具体可参考：[Tinker Dexdiff算法解析](https://www.zybuluo.com/dodola/note/554061)。

### 底层替换方案
阿里的Andfix热修复方案是底层替换方案的代表，与Qzone和Tinker的思想完全不同，Andfix通过修改一个方法的入口地址来达到修复。以Dalvik虚拟机为例，Andfix的核心代码如下：

```cpp
extern void __attribute__ ((visibility ("hidden"))) dalvik_replaceMethod(
        JNIEnv* env, jobject src, jobject dest) {
    jobject clazz = env->CallObjectMethod(dest, jClassMethod);
    ClassObject* clz = (ClassObject*) dvmDecodeIndirectRef_fnPtr(
            dvmThreadSelf_fnPtr(), clazz);
    clz->status = CLASS_INITIALIZED;

    Method* meth = (Method*) env->FromReflectedMethod(src);
    Method* target = (Method*) env->FromReflectedMethod(dest);
    LOGD("dalvikMethod: %s", meth->name);

    // meth->clazz = target->clazz;
    meth->accessFlags |= ACC_PUBLIC;
    meth->methodIndex = target->methodIndex;
    meth->jniArgInfo = target->jniArgInfo;
    meth->registersSize = target->registersSize;
    meth->outsSize = target->outsSize;
    meth->insSize = target->insSize;

    meth->prototype = target->prototype;
    meth->insns = target->insns;
    meth->nativeFunc = target->nativeFunc;
}
```

其实就是修改了方法包括入口地址在内的每一项数据的地址，使之指向一个新的方法。在后台，使用Andfix提供的apkpatch工具，可以得到补丁文件out.apatch，这个文件记录了哪些方法需要修改，以及修改后的方法。关于Andfix的原理，具体可以参考：[Andfix源码解析](https://vimerzhao.github.io/2017/08/20/Andfix%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90/)。Andfix效果：

![](http://ond7j4cnz.bkt.clouddn.com/blogandfix-demo.gif)
（注意我一直在点击，下发补丁后发生了变化……）

## 资源修复
除了代码热修复，资源热修复也很常见。各大主流方案在资源修复的实现上大多参考了InstantRun的实现方式，因此本章节先讨论了InstantRun，再分析了基于InstantRun所实现的热修复。

### InstantRun
InstantRun在AndroidStudio2.0.0中引入，源码地址[点这里](https://android.googlesource.com/platform/tools/base/+/gradle_2.0.0/instant-run)，InstantRun原理介绍参考：[Instant Run: How Does it Work?!](https://medium.com/google-developers/instant-run-how-does-it-work-294a1633367f)和[InstantRun原理浅析](https://vimerzhao.github.io/2017/08/17/InstantRun%E5%8E%9F%E7%90%86%E6%B5%85%E6%9E%90/)。
InstantRun包括代码修复和在资源修复，资源修复的核心代码:
```java
    public static void monkeypatchexistingresources(@nullable context context,
                                                    @nullable string externalresourcefile,
                                                    @nullable collection<activity> activities) {
        if (externalResourceFile == null) {
            return;
        }

        try {
            AssetManager newAssetManager = AssetManager.class.getConstructor().newInstance();
            Method mAddAssetPath = AssetManager.class.getDeclaredMethod("addAssetPath", String.class);
            mAddAssetPath.setAccessible(true);
            if (((Integer) mAddAssetPath.invoke(newAssetManager, externalResourceFile)) == 0) {
                throw new IllegalStateException("Could not create new AssetManager");
            }

            // Kitkat needs this method call, Lollipop doesn't. However, it doesn't seem to cause any harm
            // in L, so we do it unconditionally.
            Method mEnsureStringBlocks = AssetManager.class.getDeclaredMethod("ensureStringBlocks");
            mEnsureStringBlocks.setAccessible(true);
            mEnsureStringBlocks.invoke(newAssetManager);

            if (activities != null) {
                for (Activity activity : activities) {
                    Resources resources = activity.getResources();

                    try {
                        Field mAssets = Resources.class.getDeclaredField("mAssets");
                        mAssets.setAccessible(true);
                        mAssets.set(resources, newAssetManager);
                    } catch (Throwable ignore) {
                        Field mResourcesImpl = Resources.class.getDeclaredField("mResourcesImpl");
                        mResourcesImpl.setAccessible(true);
                        Object resourceImpl = mResourcesImpl.get(resources);
                        Field implAssets = resourceImpl.getClass().getDeclaredField("mAssets");
                        implAssets.setAccessible(true);
                        implAssets.set(resourceImpl, newAssetManager);
                    }

                    Resources.Theme theme = activity.getTheme();
                    try {
                        try {
                            Field ma = Resources.Theme.class.getDeclaredField("mAssets");
                            ma.setAccessible(true);
                            ma.set(theme, newAssetManager);
                        } catch (NoSuchFieldException ignore) {
                            Field themeField = Resources.Theme.class.getDeclaredField("mThemeImpl");
                            themeField.setAccessible(true);
                            Object impl = themeField.get(theme);
                            Field ma = impl.getClass().getDeclaredField("mAssets");
                            ma.setAccessible(true);
                            ma.set(impl, newAssetManager);
                        }

                        Field mt = ContextThemeWrapper.class.getDeclaredField("mTheme");
                        mt.setAccessible(true);
                        mt.set(activity, null);
                        Method mtm = ContextThemeWrapper.class.getDeclaredMethod("initializeTheme");
                        mtm.setAccessible(true);
                        mtm.invoke(activity);

                        Method mCreateTheme = AssetManager.class.getDeclaredMethod("createTheme");
                        mCreateTheme.setAccessible(true);
                        Object internalTheme = mCreateTheme.invoke(newAssetManager);
                        Field mTheme = Resources.Theme.class.getDeclaredField("mTheme");
                        mTheme.setAccessible(true);
                        mTheme.set(theme, internalTheme);
                    } catch (Throwable e) {
                        Log.e(LOG_TAG, "Failed to update existing theme for activity " + activity,
                                e);
                    }

                    pruneResourceCaches(resources);
                }
            }

            // Iterate over all known Resources objects
            Collection<WeakReference<Resources>> references;
            if (SDK_INT >= KITKAT) {
                // Find the singleton instance of ResourcesManager
                Class<?> resourcesManagerClass = Class.forName("android.app.ResourcesManager");
                Method mGetInstance = resourcesManagerClass.getDeclaredMethod("getInstance");
                mGetInstance.setAccessible(true);
                Object resourcesManager = mGetInstance.invoke(null);
                try {
                    Field fMActiveResources = resourcesManagerClass.getDeclaredField("mActiveResources");
                    fMActiveResources.setAccessible(true);
                    @SuppressWarnings("unchecked")
                    ArrayMap<?, WeakReference<Resources>> arrayMap =
                            (ArrayMap<?, WeakReference<Resources>>) fMActiveResources.get(resourcesManager);
                    references = arrayMap.values();
                } catch (NoSuchFieldException ignore) {
                    Field mResourceReferences = resourcesManagerClass.getDeclaredField("mResourceReferences");
                    mResourceReferences.setAccessible(true);
                    //noinspection unchecked
                    references = (Collection<WeakReference<Resources>>) mResourceReferences.get(resourcesManager);
                }
            } else {
                Class<?> activityThread = Class.forName("android.app.ActivityThread");
                Field fMActiveResources = activityThread.getDeclaredField("mActiveResources");
                fMActiveResources.setAccessible(true);
                Object thread = getActivityThread(context, activityThread);
                @SuppressWarnings("unchecked")
                HashMap<?, WeakReference<Resources>> map =
                        (HashMap<?, WeakReference<Resources>>) fMActiveResources.get(thread);
                references = map.values();
            }
            for (WeakReference<Resources> wr : references) {
                Resources resources = wr.get();
                if (resources != null) {
                    // Set the AssetManager of the Resources instance to our brand new one
                    try {
                        Field mAssets = Resources.class.getDeclaredField("mAssets");
                        mAssets.setAccessible(true);
                        mAssets.set(resources, newAssetManager);
                    } catch (Throwable ignore) {
                        Field mResourcesImpl = Resources.class.getDeclaredField("mResourcesImpl");
                        mResourcesImpl.setAccessible(true);
                        Object resourceImpl = mResourcesImpl.get(resources);
                        Field implAssets = resourceImpl.getClass().getDeclaredField("mAssets");
                        implAssets.setAccessible(true);
                        implAssets.set(resourceImpl, newAssetManager);
                    }

                    resources.updateConfiguration(resources.getConfiguration(), resources.getDisplayMetrics());
                }
            }
        } catch (Throwable e) {
            throw new IllegalStateException(e);
        }
    }
```
其实做了两件事：
1. 通过反射替换掉原有的`AssetManager`
2. 找到引用了原`AssetManager`对象的字段并替换为新的引用。

关键是要熟悉Android相关源码，才能确定哪些字段是需要更新引用的。通过以上两步即可实现资源替换。

### 资源热修复实现
将InstantRun的`monkeyPatchExistingResource`方法引入我们的代码就可以实现资源热修复，效果如下:
![](http://ond7j4cnz.bkt.clouddn.com/bloghotfix-resouce.gif)

## SO库热修复
so库的修复本质是对native方法的修复和替换，和类加载方案类似，可以把补丁so库的路径插入到`nativeLibraryDirectories`数组的最前面，使得优先加载补丁库而不是原来的库来达到修复目的。在此不做赘述。

## 热修复的稳定性
### 兼容的困境
最初Qzone就需要在Dalvik平台进行插桩，Tinker同样也是分平台合成（在Dalvik平台合成全量Dex，在Art平台合成需要的小Dex），而阿里的Andfix作为底层热修复方案，不仅要面对两种虚拟机平台，甚至要为不同Android版本编写一套替换逻辑，如下：
```cpp
// Art虚拟机平台，根据不同版本替换
extern void __attribute__ ((visibility ("hidden"))) art_replaceMethod(
        JNIEnv* env, jobject src, jobject dest) {
    if (apilevel > 23) {
        replace_7_0(env, src, dest);
    } else if (apilevel > 22) {
        replace_6_0(env, src, dest);
    } else if (apilevel > 21) {
        replace_5_1(env, src, dest);
    } else if (apilevel > 19) {
        replace_5_0(env, src, dest);
    }else{
        replace_4_4(env, src, dest);
    }
}
......

// 方法替换入口，根据不同虚拟机平台替换
static void replaceMethod(JNIEnv* env, jclass clazz, jobject src,
        jobject dest) {
    if (isArt) {
        art_replaceMethod(env, src, dest);
    } else {
        dalvik_replaceMethod(env, src, dest);
    }
}
```


### 不安全的代码
加载了补丁包的程序本质还是未编译的程序，只是两个已编译程序的结合体，由于Java的编译过程对于我们是透明，所以我们一不小心就会引入错误，而且这种错误十分隐蔽。在使用类加载方案时由于还是在Java层，可能不那么容易犯错，但使用Andfix等底层热修复方案时却总是防不胜防。
比如，Java在编译匿名内部类时会编译成顶级类，命名方式为`ClassName$n`，其中n为匿名内部类出现的顺序，所以在第i个匿名内部类前面添加匿名内部类就会导致`ClassName$i#methodName`变成`ClassName$i+1#methodName`，即一个方法的地址发生改变。详细可见：[匿名内部类导致热补丁Crash](https://vimerzhao.github.io/2017/08/20/%E5%8C%BF%E5%90%8D%E5%86%85%E9%83%A8%E7%B1%BB%E5%AF%BC%E8%87%B4%E7%83%AD%E8%A1%A5%E4%B8%81Crash/#more)。再比如，Java的泛型编译可能会在编译期引入新的方法，也会导致Andfix的异常。
因为编译过程是透明的，所以热修复后的程序不能代替修复问题后重新编译出来的程序，即热修复后程序的安全性是得不到保证的。

## 热修复技术展望
Qzone时期插桩影响了类加载的速度，Tinker的DexDiff算法粒度过细、实现复杂，导致性能消耗严重，Andfix使用场景有限、兼容性差，此外美团的Robust、饿了么的Amigo等也都各有限制。Android热修复技术虽然百花齐放，但却并没有哪种方案能够解决所有问题，统一当前的局面。而最近阿里又推出了Sophix，针对各种类型的修复又做了深度的优化，虽然没有开源代码，但是发布了《深入探索Android热修复技术原理》，引起Android社区的关注，其统一各种热修复方案的意图也十分明显。
从Qzone到Tinker，从Andfix到Sophix都可以看出来，热修复技术还在不断上升发展，每一次新方案的推出都是对原有方案的超越。但目前来看，阿里并未打算开源Sophix，而Tinker2.0仍然在路上，热修复技术在性能、兼容、开发透明方面仍然有很多不足，所以不能仅仅满足于了解已有方案，还要深入源码去理解原理，更要对业界最新进展保持关注。

## 参考

- [安卓App热补丁动态修复技术介绍](https://mp.weixin.qq.com/s?__biz=MzI1MTA1MzM2Nw==&mid=400118620&idx=1&sn=b4fdd5055731290eef12ad0d17f39d4a&scene=0)
- [微信Tinker的一切都在这里，包括源码(一)](https://mp.weixin.qq.com/s?__biz=MzAwNDY1ODY2OQ==&mid=2649286384&idx=1&sn=f1aff31d6a567674759be476bcd12549&scene=4#wechat_redirect)
- [alibaba/AndFix: AndFix is a library that offer hot-fix for Android App.](https://github.com/alibaba/AndFix)
- [Instant Run: How Does it Work?!](https://medium.com/google-developers/instant-run-how-does-it-work-294a1633367f)
- [微信Android热补丁实践演进之路](http://dev.qq.com/topic/58feada400f8060c3140ab75)
- [Tencent/tinker: Tinker is a hot-fix solution library for Android, it ......](https://github.com/Tencent/tinker)
