---
title: "热补丁：Qzone方案在Dalvik虚拟机上的实现"
date: 2017-08-21
type: post
isCJKLanguage: true
categories:
    - "Android实践"
---

# 热补丁：Qzone方案在Dalvik虚拟机上的实现
详细分析了Qzone热修复方案在Dalvik平台的实现，包括插桩的由来及其实现。

## Qzone热修复原理分析
Qzone热修复方案基于的是android dex分包方案的，关于dex分包方案，网上有几篇解释了，所以这里就不再赘述。简单的概括一下，就是把多个dex文件塞入到app的classloader之中，但是android dex拆包方案中的类是没有重复的，如果classes.dex和classes1.dex中有重复的类，当用到这个重复的类的时候，系统会选择哪个类进行加载呢？
首先，分析一下类加载的代码(`./libcore/dalvik/src/main/java/dalvik/system/DexPathList.java`):

```java
    public Class findClass(String name, List<Throwable> suppressed) {
        for (Element element : dexElements) {
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

一个ClassLoader可以包含多个dex文件，每个dex文件是一个Element，多个dex文件排列成一个有序的数组dexElements，当找类的时候，会按顺序遍历dex文件，然后从当前遍历的dex文件中找类，如果找类则返回，如果找不到从下一个dex文件继续查找。理论上，如果在不同的dex中有相同的类存在，那么会优先选择排在前面的dex文件的类。在此基础上，Qzone团队构想了热补丁的方案，把有问题的类打包到一个dex（patch.dex）中去，然后把这个dex插入到Elements的最前面，如下图:
pic1

这就是Qzone的热补丁方案。

## 插桩的由来
然而按照这个思路实现之后在Dalvik平台上却失败了，报错如下:
pic2

下面来分析一下Dalvik虚拟机类加载部分的源码，在`./dalvik/vm/oo/Resolve.cpp`中有:

```java
/*
 * Find the class corresponding to "classIdx", which maps to a class name
 * string.  It might be in the same DEX file as "referrer", in a different
 * DEX file, generated by a class loader, or generated by the VM (e.g.
 * array classes).
 *
 * Because the DexTypeId is associated with the referring class' DEX file,
 * we may have to resolve the same class more than once if it's referred
 * to from classes in multiple DEX files.  This is a necessary property for
 * DEX files associated with different class loaders.
 *
 * We cache a copy of the lookup in the DexFile's "resolved class" table,
 * so future references to "classIdx" are faster.
 *
 * Note that "referrer" may be in the process of being linked.
 *
 * Traditional VMs might do access checks here, but in Dalvik the class
 * "constant pool" is shared between all classes in the DEX file.  We rely
 * on the verifier to do the checks for us.
 *
 * Does not initialize the class.
 *
 * "fromUnverifiedConstant" should only be set if this call is the direct
 * result of executing a "const-class" or "instance-of" instruction, which
 * use class constants not resolved by the bytecode verifier.
 *
 * Returns NULL with an exception raised on failure.
 */
ClassObject* dvmResolveClass(const ClassObject* referrer, u4 classIdx,
    bool fromUnverifiedConstant)
{
    DvmDex* pDvmDex = referrer->pDvmDex;
    ClassObject* resClass;
    const char* className;

    /*
     * Check the table first -- this gets called from the other "resolve"
     * methods.
     */
    resClass = dvmDexGetResolvedClass(pDvmDex, classIdx);
    if (resClass != NULL)
        return resClass;

    LOGVV("--- resolving class %u (referrer=%s cl=%p)",
        classIdx, referrer->descriptor, referrer->classLoader);

    /*
     * Class hasn't been loaded yet, or is in the process of being loaded
     * and initialized now.  Try to get a copy.  If we find one, put the
     * pointer in the DexTypeId.  There isn't a race condition here --
     * 32-bit writes are guaranteed atomic on all target platforms.  Worst
     * case we have two threads storing the same value.
     *
     * If this is an array class, we'll generate it here.
     */
    className = dexStringByTypeIdx(pDvmDex->pDexFile, classIdx);
    if (className[0] != '\0' && className[1] == '\0') {
        /* primitive type */
        resClass = dvmFindPrimitiveClass(className[0]);
    } else {
        resClass = dvmFindClassNoInit(className, referrer->classLoader);
    }

    if (resClass != NULL) {
        /*
         * If the referrer was pre-verified, the resolved class must come
         * from the same DEX or from a bootstrap class.  The pre-verifier
         * makes assumptions that could be invalidated by a wacky class
         * loader.  (See the notes at the top of oo/Class.c.)
         *
         * The verifier does *not* fail a class for using a const-class
         * or instance-of instruction referring to an unresolveable class,
         * because the result of the instruction is simply a Class object
         * or boolean -- there's no need to resolve the class object during
         * verification.  Instance field and virtual method accesses can
         * break dangerously if we get the wrong class, but const-class and
         * instance-of are only interesting at execution time.  So, if we
         * we got here as part of executing one of the "unverified class"
         * instructions, we skip the additional check.
         *
         * Ditto for class references from annotations and exception
         * handler lists.
         */
        if (!fromUnverifiedConstant &&
            IS_CLASS_FLAG_SET(referrer, CLASS_ISPREVERIFIED))
        {
            ClassObject* resClassCheck = resClass;
            if (dvmIsArrayClass(resClassCheck))
                resClassCheck = resClassCheck->elementClass;

            if (referrer->pDvmDex != resClassCheck->pDvmDex &&
                resClassCheck->classLoader != NULL)
            {
                ALOGW("Class resolved by unexpected DEX:"
                     " %s(%p):%p ref [%s] %s(%p):%p",
                    referrer->descriptor, referrer->classLoader,
                    referrer->pDvmDex,
                    resClass->descriptor, resClassCheck->descriptor,
                    resClassCheck->classLoader, resClassCheck->pDvmDex);
                ALOGW("(%s had used a different %s during pre-verification)",
                    referrer->descriptor, resClass->descriptor);
                dvmThrowIllegalAccessError(
                    "Class ref in pre-verified class resolved to unexpected "
                    "implementation");
                return NULL;
            }
        }

        LOGVV("###### +ResolveClass(%s): referrer=%s dex=%p ldr=%p ref=%d",
            resClass->descriptor, referrer->descriptor, referrer->pDvmDex,
            referrer->classLoader, classIdx);

        /*
         * Add what we found to the list so we can skip the class search
         * next time through.
         *
         * TODO: should we be doing this when fromUnverifiedConstant==true?
         * (see comments at top of oo/Class.c)
         */
        dvmDexSetResolvedClass(pDvmDex, classIdx, resClass);
    } else {
        /* not found, exception should be raised */
        LOGVV("Class not found: %s",
            dexStringByTypeIdx(pDvmDex->pDexFile, classIdx));
        assert(dvmCheckException(dvmThreadSelf()));
    }

    return resClass;
}
```

`./dalvik/vm/analysis/DexPrepare.cpp`

```java
/*
 * Verify and/or optimize a specific class.
 */
static void verifyAndOptimizeClass(DexFile* pDexFile, ClassObject* clazz,
    const DexClassDef* pClassDef, bool doVerify, bool doOpt)
{
    const char* classDescriptor;
    bool verified = false;

    if (clazz->pDvmDex->pDexFile != pDexFile) {
        /*
         * The current DEX file defined a class that is also present in the
         * bootstrap class path.  The class loader favored the bootstrap
         * version, which means that we have a pointer to a class that is
         * (a) not the one we want to examine, and (b) mapped read-only,
         * so we will seg fault if we try to rewrite instructions inside it.
         */
        ALOGD("DexOpt: not verifying/optimizing '%s': multiple definitions",
            clazz->descriptor);
        return;
    }

    classDescriptor = dexStringByTypeIdx(pDexFile, pClassDef->classIdx);

    /*
     * First, try to verify it.
     */
    if (doVerify) {
        if (dvmVerifyClass(clazz)) {
            /*
             * Set the "is preverified" flag in the DexClassDef.  We
             * do it here, rather than in the ClassObject structure,
             * because the DexClassDef is part of the odex file.
             */
            assert((clazz->accessFlags & JAVA_FLAGS_MASK) ==
                pClassDef->accessFlags);
            ((DexClassDef*)pClassDef)->accessFlags |= CLASS_ISPREVERIFIED;
            verified = true;
        } else {
            // TODO: log when in verbose mode
            ALOGV("DexOpt: '%s' failed verification", classDescriptor);
        }
    }

    if (doOpt) {
        bool needVerify = (gDvm.dexOptMode == OPTIMIZE_MODE_VERIFIED ||
                           gDvm.dexOptMode == OPTIMIZE_MODE_FULL);
        if (!verified && needVerify) {
            ALOGV("DexOpt: not optimizing '%s': not verified",
                classDescriptor);
        } else {
            dvmOptimizeClass(clazz, false);

            /* set the flag whether or not we actually changed anything */
            ((DexClassDef*)pClassDef)->accessFlags |= CLASS_ISOPTIMIZED;
        }
    }
}
```

这段代码是dex转化成odex(dexopt)的代码中的一段，我们知道当一个apk在安装的时候，apk中的classes.dex会被虚拟机(dexopt)优化成odex文件，然后才会拿去执行。
虚拟机在启动的时候，会有许多的启动参数，其中一项就是verify选项，当verify选项被打开的时候，上面doVerify变量为true，那么就会执行dvmVerifyClass进行类的校验，如果dvmVerifyClass校验类成功，那么这个类会被打上CLASS_ISPREVERIFIED的标志，那么具体的校验过程是什么样子的呢？
此代码在`./dalvik/vm/analysis/DexVerify.cpp`中，如下：

```java
/*
 * Verify a class.
 *
 * By the time we get here, the value of gDvm.classVerifyMode should already
 * have been factored in.  If you want to call into the verifier even
 * though verification is disabled, that's your business.
 *
 * Returns "true" on success.
 */
bool dvmVerifyClass(ClassObject* clazz)
{
    int i;

    if (dvmIsClassVerified(clazz)) {
        ALOGD("Ignoring duplicate verify attempt on %s", clazz->descriptor);
        return true;
    }

    for (i = 0; i < clazz->directMethodCount; i++) {
        if (!verifyMethod(&clazz->directMethods[i])) {
            LOG_VFY("Verifier rejected class %s", clazz->descriptor);
            return false;
        }
    }
    for (i = 0; i < clazz->virtualMethodCount; i++) {
        if (!verifyMethod(&clazz->virtualMethods[i])) {
            LOG_VFY("Verifier rejected class %s", clazz->descriptor);
            return false;
        }
    }

    return true;
}
```

1. 验证clazz->directMethods方法，directMethods包含了以下方法：
1. static方法
2. private方法
3. 构造函数
2. clazz->virtualMethods
1. 虚函数=override方法?
概括一下就是如果以上方法中直接引用到的类（第一层级关系，不会进行递归搜索）和clazz都在同一个dex中的话，那么这个类就会被打上CLASS_ISPREVERIFIED：
pic3

所以为了实现补丁方案，所以必须从这些方法中入手，防止类被打上CLASS_ISPREVERIFIED标志。
最终空间的方案是往所有类的构造函数里面插入了一段代码，代码如下：
if (ClassVerifier.PREVENT_VERIFY) {
System.out.println(AntilazyLoad.class);
}
puc4

所以为了实现补丁方案，所以必须从这些方法中入手，防止类被打上CLASS_ISPREVERIFIED标志。
最终空间的方案是往所有类的构造函数里面插入了一段代码，代码如下：
if (ClassVerifier.PREVENT_VERIFY) {
System.out.println(AntilazyLoad.class);
}
之所以选择构造函数是因为他不增加方法数，一个类即使没有显式的构造函数，也会有一个隐式的默认构造函数。
空间使用的是在字节码插入代码,而不是源代码插入，使用的是javaassist库来进行字节码插入的。

## 插桩的实现
前面提到是在**字节吗**中插入代码，因为手工为每个类添加一行代码是非常繁琐和低效的。
### 
##
##


## 插桩的副作用
### Dalvik类加载过程
虚拟机在安装期间为类打上`CLASS_ISPREVERIFIED`标志是为了提高性能的，微信在开发Tinker过程中曾做过一个测试.....
### 类加载性能影响

## 总结

## 参考
