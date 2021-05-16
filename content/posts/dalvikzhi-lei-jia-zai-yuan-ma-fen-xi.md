---
title: "Dalvik之类加载源码分析"
date: 2017-08-26
type: post
isCJKLanguage: true
---

# Dalvik之类加载源码分析
基于Kitkat源码粗线条地分析了Dalvik虚拟机类的加载过程。

## Java类加载

在Java的世界里，所有类的加载，都由`java.lang.ClassLoader`来负责。`ClassLoader`是一个抽象类，它有多个实现类，例如`BootClassLoader`,`SystemClassLoader`以及虚拟机的具体实现，例如在`Dalvik`虚拟机里的实现为`DexClassLoader`。需要注意的每个虚拟机对于类的加载的逻辑并不十分相同，例如`Hotspot`虚拟机和`Dalvik`虚拟机加载一个类的过程**基本上完全不同**，hotspot主要是从class文件从加载类，而`Dalvik`是从dex文件里去加载一个类。
这里不具体讨论dex文件对class文件的优化，也不讨论双亲委派模式，简单介绍一下`Dalvik`虚拟机类加载，以便更加深刻地理解Android热修复的实现原理。

## 分析`ClassLoader.java`源码

路径:
> ./libcore/libdvm/src/main/java/java/lang/ClassLoader.java

`ClassLoader`是一个抽象基类，定义了一个类加载器需要实现的具体方法，这些方法实际代表了类加载的过程:
> load🡲find🡲define🡲resolve

### `SystemClassLoader`

`SystemClassLoader`是`ClassLoader`的一个静态内部类:
```java
static private class SystemClassLoader {
    public static ClassLoader loader = ClassLoader.createSystemClassLoader();
}
```

并且是一个单例对象，分析`ClassLoader.createSystemClassLoader()`可知，其`parent`为`BootClassLoader`:
```java
private static ClassLoader createSystemClassLoader() {
    String classPath = System.getProperty("java.class.path", ".");
    return new PathClassLoader(classPath, BootClassLoader.getInstance());
}
```

其中，`PathClassLoader`的继承层次为:

```
ClassLoader
    🡳
BaseDexClassloader
    🡳
PathClassLoader
```

### `BootClassLoader`

`BootClassLoader`定义在`ClassLoader.java`内，但不在`ClassLoader`内，对包外的类不可见:
```java
class BootClassLoader extends ClassLoader {

    private static BootClassLoader instance;

    @FindBugsSuppressWarnings("DP_CREATE_CLASSLOADER_INSIDE_DO_PRIVILEGED")
    public static synchronized BootClassLoader getInstance() {
        if (instance == null) {
            instance = new BootClassLoader();
        }

        return instance;
    }

    public BootClassLoader() {
        super(null, true);
    }

    .....

}
```

`BootClassLoader`是唯一一个没有`parent`的`ClassLoader`。

## 分析`BaseDexClassloader.java`源码

路径:
> ./libcore/dalvik/src/main/java/dalvik/system/BaseDexClassLoader.java

其构造方法只有一个:
```java
/**
 * Constructs an instance.
 *
 * @param dexPath the list of jar/apk files containing classes and
 * resources, delimited by {@code File.pathSeparator}, which
 * defaults to {@code ":"} on Android
 * @param optimizedDirectory directory where optimized dex files
 * should be written; may be {@code null}
 * @param libraryPath the list of directories containing native
 * libraries, delimited by {@code File.pathSeparator}; may be
 * {@code null}
 * @param parent the parent class loader
 */
public BaseDexClassLoader(String dexPath, File optimizedDirectory,
        String libraryPath, ClassLoader parent) {
    super(parent);
    this.pathList = new DexPathList(this, dexPath, libraryPath, optimizedDirectory);
}
```

每个参数的含义注释讲的很清楚。可以猜测，`BaseDexClassloader`的大部分工作其实由`DexPathList`完成。
再分析一下`findClass`方法:
```java
@Override
protected Class<?> findClass(String name) throws ClassNotFoundException {
    List<Throwable> suppressedExceptions = new ArrayList<Throwable>();
    Class c = pathList.findClass(name, suppressedExceptions);
    if (c == null) {
        ClassNotFoundException cnfe = new ClassNotFoundException("Didn't find class \"" + name + "\" on path: " + pathList);
        for (Throwable t : suppressedExceptions) {
            cnfe.addSuppressed(t);
        }
        throw cnfe;
    }
    return c;
}
```
确实委托给了`DexPathList`这个类，下面就来分析一下这个类！

## 分析`DexPathList.java`源码

路径:
> ./libcore/dalvik/src/main/java/dalvik/system/DexPathList.java

这个类代码较多，首先分析一下`makeDexElements`:
```java
/**
 * Makes an array of dex/resource path elements, one per element of
 * the given array.
 */
private static Element[] makeDexElements(ArrayList<File> files, File optimizedDirectory,
        ArrayList<IOException> suppressedExceptions) {
    ArrayList<Element> elements = new ArrayList<Element>();
    /*
     * Open all files and load the (direct or contained) dex files
     * up front.
     */
    for (File file : files) {
        File zip = null;
        DexFile dex = null;
        String name = file.getName();

        if (name.endsWith(DEX_SUFFIX)) {
            // Raw dex file (not inside a zip/jar).
            try {
                dex = loadDexFile(file, optimizedDirectory);
            } catch (IOException ex) {
                System.logE("Unable to load dex file: " + file, ex);
            }
        } else if (name.endsWith(APK_SUFFIX) || name.endsWith(JAR_SUFFIX)
                || name.endsWith(ZIP_SUFFIX)) {
            zip = file;

            try {
                dex = loadDexFile(file, optimizedDirectory);
            } catch (IOException suppressed) {
                /*
                 * IOException might get thrown "legitimately" by the DexFile constructor if the
                 * zip file turns out to be resource-only (that is, no classes.dex file in it).
                 * Let dex == null and hang on to the exception to add to the tea-leaves for
                 * when findClass returns null.
                 */
                suppressedExceptions.add(suppressed);
            }
        } else if (file.isDirectory()) {
            // We support directories for looking up resources.
            // This is only useful for running libcore tests.
            elements.add(new Element(file, true, null, null));
        } else {
            System.logW("Unknown file type for: " + file);
        }

        if ((zip != null) || (dex != null)) {
            elements.add(new Element(file, false, zip, dex));
        }
    }

    return elements.toArray(new Element[elements.size()]);
}
```

这个方法是用来处理`dexPath`中的文件，对于dex文件，会调用`loadDexFile`:
```java
/**
 * Constructs a {@code DexFile} instance, as appropriate depending
 * on whether {@code optimizedDirectory} is {@code null}.
 */
private static DexFile loadDexFile(File file, File optimizedDirectory)
    throws IOException {
        if (optimizedDirectory == null) {
            return new DexFile(file);
        } else {
            String optimizedPath = optimizedPathFor(file, optimizedDirectory);
            return DexFile.loadDex(file.getPath(), optimizedPath, 0);
        }
}
```

这样就得到一个`DexFile`对象，他们组成了字段`dexElements`，具体加载类的时候，就是遍历这个`DexFile`数组:
```java
/**
 * Finds the named class in one of the dex files pointed at by
 * this instance. This will find the one in the earliest listed
 * path element. If the class is found but has not yet been
 * defined, then this method will define it in the defining
 * context that this instance was constructed with.
 *
 * @param name of class to find
 * @param suppressed exceptions encountered whilst finding the class
 * @return the named class or {@code null} if the class is not
 * found in any of the dex files
 */
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

除了dex文件，`DexPathList`还负责管理native库，由字段`nativeLibraryDirectories`持有。在此不做详细解释。

## 分析`DexFile.java`源码
路径:
> ./libcore/dalvik/src/main/java/dalvik/system/DexFile.java

前面调用了`loadClassBinaryName`，在`DexFile`实现如下:
```java
public Class loadClassBinaryName(String name, ClassLoader loader, List<Throwable> suppressed) {
    return defineClass(name, loader, mCookie, suppressed);
}
```
跳转到`defineClass`:
```java
private static Class defineClass(String name, ClassLoader loader, int cookie,
        List<Throwable> suppressed) {
    Class result = null;
    try {
        result = defineClassNative(name, loader, cookie);
    } catch (NoClassDefFoundError e) {
        if (suppressed != null) {
            suppressed.add(e);
        }
    } catch (ClassNotFoundException e) {
        if (suppressed != null) {
            suppressed.add(e);
        }
    }
    return result;
}
```
核心是`defineClassNative`，这是一个native方法，下面进入native层分析。

## 分析`dalvik_system_DexFile.cpp`源码
路径:
> ./dalvik/vm/native/dalvik_system_DexFile.cpp

前面`defineClassNative`对应的实现为(注释也很有用啊!):
```java
/*
 * private static Class defineClassNative(String name, ClassLoader loader,
 *      int cookie)
 *
 * Load a class from a DEX file.  This is roughly equivalent to defineClass()
 * in a regular VM -- it's invoked by the class loader to cause the
 * creation of a specific class.  The difference is that the search for and
 * reading of the bytes is done within the VM.
 *
 * The class name is a "binary name", e.g. "java.lang.String".
 *
 * Returns a null pointer with no exception if the class was not found.
 * Throws an exception on other failures.
 */
static void Dalvik_dalvik_system_DexFile_defineClassNative(const u4* args,
    JValue* pResult)
{
    StringObject* nameObj = (StringObject*) args[0];
    Object* loader = (Object*) args[1];
    int cookie = args[2];
    ClassObject* clazz = NULL;
    DexOrJar* pDexOrJar = (DexOrJar*) cookie;
    DvmDex* pDvmDex;
    char* name;
    char* descriptor;

    name = dvmCreateCstrFromString(nameObj);
    descriptor = dvmDotToDescriptor(name);
    ALOGV("--- Explicit class load '%s' l=%p c=0x%08x",
        descriptor, loader, cookie);
    free(name);

    if (!validateCookie(cookie))
        RETURN_VOID();

    if (pDexOrJar->isDex)
        pDvmDex = dvmGetRawDexFileDex(pDexOrJar->pRawDexFile);
    else
        pDvmDex = dvmGetJarFileDex(pDexOrJar->pJarFile);

    /* once we load something, we can't unmap the storage */
    pDexOrJar->okayToFree = false;

    clazz = dvmDefineClass(pDvmDex, descriptor, loader);
    Thread* self = dvmThreadSelf();
    if (dvmCheckException(self)) {
        /*
         * If we threw a "class not found" exception, stifle it, since the
         * contract in the higher method says we simply return null if
         * the class is not found.
         */
        Object* excep = dvmGetException(self);
        if (strcmp(excep->clazz->descriptor,
                   "Ljava/lang/ClassNotFoundException;") == 0 ||
            strcmp(excep->clazz->descriptor,
                   "Ljava/lang/NoClassDefFoundError;") == 0)
        {
            dvmClearException(self);
        }
        clazz = NULL;
    }

    free(descriptor);
    RETURN_PTR(clazz);
}
```

分析可知关键在于`dvmDefineClass`这个函数:
```java
/*
 * Load the named class (by descriptor) from the specified DEX file.
 * Used by class loaders to instantiate a class object from a
 * VM-managed DEX.
 */
ClassObject* dvmDefineClass(DvmDex* pDvmDex, const char* descriptor,
    Object* classLoader)
{
    assert(pDvmDex != NULL);

    return findClassNoInit(descriptor, classLoader, pDvmDex);
}
```

下面分析`findClassNoInit`。目前流程:
> load🡲find

## 分析`Class.cpp`源码

路径:
> ./dalvik/vm/oo/Class.cpp

`findClassNoInit`逻辑较为复杂，下面分步分析:
```java
/*
 * Find the named class (by descriptor). If it's not already loaded,
 * we load it and link it, but don't execute <clinit>. (The VM has
 * specific limitations on which events can cause initialization.)
 *
 * If "pDexFile" is NULL, we will search the bootclasspath for an entry.
 *
 * On failure, this returns NULL with an exception raised.
 *
 * TODO: we need to return an indication of whether we loaded the class or
 * used an existing definition.  If somebody deliberately tries to load a
 * class twice in the same class loader, they should get a LinkageError,
 * but inadvertent simultaneous class references should "just work".
 */
static ClassObject* findClassNoInit(const char* descriptor, Object* loader,
    DvmDex* pDvmDex)
{
    ......
```

### 检查是否加载

```cpp
    ......
    clazz = dvmLookupClass(descriptor, loader, true);
    if (clazz == NULL) {
        const DexClassDef* pClassDef;

        dvmMethodTraceClassPrepBegin();
        profilerNotified = true;

#if LOG_CLASS_LOADING
        u8 startTime = dvmGetThreadCpuTimeNsec();
#endif

    ......
```
首先，查找已经加载过的类，所有加载过的类都会将其`classDescriptor`（类的描述，类似于"Ljava.lang.Object;"这种字符串）即将这个类的描述符进行hash，并作为加载的`ClassObject`的键丢到一个`hash table`里面去，每次加载一个类之前，都会先去这个`hash table`里面去找一下，看之前有没有加载过该类，如果加载过则不重复加载，直接从这个`hash table`里面返回`ClassObject`对象。否则才会去加载该类。

### 寻找

如果这个类从来没有加载过，则从Dex文件中去寻找Class的定义，这个过程是交给`DexFile.cpp`源码里的`dexFindClass `函数去完成的:
```cpp
    ......
        if (pDvmDex == NULL) {
            assert(loader == NULL);     /* shouldn't be here otherwise */
            pDvmDex = searchBootPathForClass(descriptor, &pClassDef);
        } else {
            pClassDef = dexFindClass(pDvmDex->pDexFile, descriptor);
        }

        if (pDvmDex == NULL || pClassDef == NULL) {
            if (gDvm.noClassDefFoundErrorObj != NULL) {
                /* usual case -- use prefabricated object */
                dvmSetException(self, gDvm.noClassDefFoundErrorObj);
            } else {
                /* dexopt case -- can't guarantee prefab (core.jar) */
                dvmThrowNoClassDefFoundError(descriptor);
            }
            goto bail;
        }
    ......
```

`defineClass`实现如下:
```java
/*
 * Look up a class definition entry by descriptor.
 *
 * "descriptor" should look like "Landroid/debug/Stuff;".
 */
const DexClassDef* dexFindClass(const DexFile* pDexFile,
    const char* descriptor)
{
    const DexClassLookup* pLookup = pDexFile->pClassLookup;
    u4 hash;
    int idx, mask;

    hash = classDescriptorHash(descriptor);
    mask = pLookup->numEntries - 1;
    idx = hash & mask;

    /*
     * Search until we find a matching entry or an empty slot.
     */
    while (true) {
        int offset;

        offset = pLookup->table[idx].classDescriptorOffset;
        if (offset == 0)
            return NULL;

        if (pLookup->table[idx].classDescriptorHash == hash) {
            const char* str;

            str = (const char*) (pDexFile->baseAddr + offset);
            if (strcmp(str, descriptor) == 0) {
                return (const DexClassDef*)
                    (pDexFile->baseAddr + pLookup->table[idx].classDefOffset);
            }
        }

        idx = (idx + 1) & mask;
    }
}
```

即从dex文件中寻找一个类。流程目前:
> find🡲define

### 加载类

```cpp
    ......
        /* found a match, try to load it */
        clazz = loadClassFromDex(pDvmDex, pClassDef, loader);
        if (dvmCheckException(self)) {
            /* class was found but had issues */
            if (clazz != NULL) {
                dvmFreeClassInnards(clazz);
                dvmReleaseTrackedAlloc((Object*) clazz, NULL);
            }
            goto bail;
        }
    ......
```

关键方法是`loadClassFromDex`:
```cpp
/*
 * Try to load the indicated class from the specified DEX file.
 *
 * This is effectively loadClass()+defineClass() for a DexClassDef.  The
 * loading was largely done when we crunched through the DEX.
 *
 * Returns NULL on failure.  If we locate the class but encounter an error
 * while processing it, an appropriate exception is thrown.
 */
static ClassObject* loadClassFromDex(DvmDex* pDvmDex,
    const DexClassDef* pClassDef, Object* classLoader)
{
    ClassObject* result;
    DexClassDataHeader header;
    const u1* pEncodedData;
    const DexFile* pDexFile;

    assert((pDvmDex != NULL) && (pClassDef != NULL));
    pDexFile = pDvmDex->pDexFile;

    if (gDvm.verboseClass) {
        ALOGV("CLASS: loading '%s'...",
            dexGetClassDescriptor(pDexFile, pClassDef));
    }

    pEncodedData = dexGetClassData(pDexFile, pClassDef);

    if (pEncodedData != NULL) {
        dexReadClassDataHeader(&pEncodedData, &header);
    } else {
        // Provide an all-zeroes header for the rest of the loading.
        memset(&header, 0, sizeof(header));
    }

    result = loadClassFromDex0(pDvmDex, pClassDef, &header, pEncodedData,
            classLoader);

    if (gDvm.verboseClass && (result != NULL)) {
        ALOGI("[Loaded %s from DEX %p (cl=%p)]",
            result->descriptor, pDvmDex, classLoader);
    }

    return result;
}
```

这里加载一个类需要解析dex文件，这个过程比较复杂，由`loadClassFromDex0`这个函数实现:
```cpp
/*
 * Helper for loadClassFromDex, which takes a DexClassDataHeader and
 * encoded data pointer in addition to the other arguments.
 */
static ClassObject* loadClassFromDex0(DvmDex* pDvmDex,
    const DexClassDef* pClassDef, const DexClassDataHeader* pHeader,
    const u1* pEncodedData, Object* classLoader)
{
    ......
}
```

涉及dex文件格式细节较多，这里不做详细分析。

### 链接

```cpp
    .....
        /*
         * Lock the class while we link it so other threads must wait for us
         * to finish.  Set the "initThreadId" so we can identify recursive
         * invocation.  (Note all accesses to initThreadId here are
         * guarded by the class object's lock.)
         */
        dvmLockObject(self, (Object*) clazz);
        clazz->initThreadId = self->threadId;

        /*
         * Add to hash table so lookups succeed.
         *
         * [Are circular references possible when linking a class?]
         */
        assert(clazz->classLoader == loader);
        if (!dvmAddClassToHash(clazz)) {
            /*
             * Another thread must have loaded the class after we
             * started but before we finished.  Discard what we've
             * done and leave some hints for the GC.
             *
             * (Yes, this happens.)
             */
            //ALOGW("WOW: somebody loaded %s simultaneously", descriptor);
            clazz->initThreadId = 0;
            dvmUnlockObject(self, (Object*) clazz);

            /* Let the GC free the class.
             */
            dvmFreeClassInnards(clazz);
            dvmReleaseTrackedAlloc((Object*) clazz, NULL);

            /* Grab the winning class.
             */
            clazz = dvmLookupClass(descriptor, loader, true);
            assert(clazz != NULL);
            goto got_class;
        }
        dvmReleaseTrackedAlloc((Object*) clazz, NULL);

#if LOG_CLASS_LOADING
        logClassLoadWithTime('>', clazz, startTime);
#endif
        /*
         * Prepare and resolve.
         */
        if (!dvmLinkClass(clazz)) {
            assert(dvmCheckException(self));

            /* Make note of the error and clean up the class.
             */
            removeClassFromHash(clazz);
            clazz->status = CLASS_ERROR;
            dvmFreeClassInnards(clazz);

            /* Let any waiters know.
             */
            clazz->initThreadId = 0;
            dvmObjectNotifyAll(self, (Object*) clazz);
            dvmUnlockObject(self, (Object*) clazz);

#if LOG_CLASS_LOADING
            ALOG(LOG_INFO, "DVMLINK FAILED FOR CLASS ", "%s in %s",
                clazz->descriptor, get_process_name());

            /*
             * TODO: It would probably be better to use a new type code here (instead of '<') to
             * indicate the failure.  This change would require a matching change in the parser
             * and analysis code in frameworks/base/tools/preload.
             */
            logClassLoad('<', clazz);
#endif
            clazz = NULL;
            if (gDvm.optimizing) {
                /* happens with "external" libs */
                ALOGV("Link of class '%s' failed", descriptor);
            } else {
                ALOGW("Link of class '%s' failed", descriptor);
            }
            goto bail;
        }
        dvmObjectNotifyAll(self, (Object*) clazz);
        dvmUnlockObject(self, (Object*) clazz);
    .....
```

加锁什么的就不分析了，核心函数是`dvmLinkClass`。
链接的过程又分为：
- 加载 LOADED，父类和接口都为NULL
- 链接 RESOLVED，将父类和接口的dex idx链接替换成真正的引用
- 验证 VERIFIED，检查一个类的，例如：
    - 如果该类是 java.lang.Object，则不能再有父类
    - 如果不是java.lang.Object, 则必须有父类
    - 不能继承final类
    - 不能继承interface
    - 只能继承public的类或同一个包下的类
    - 等等

所有这些逻辑都在`java_lang_Class.cpp`（路径`./dalvik/vm/native/java_lang_Class.cpp`）里的。

### 初始化
在`dvmInitClass(CLassObject* clazz)`初始化之前，必须确保该类已经被验证过（`VERIFIED`）如果没有，则立即先验证它。如果没有优化过类，则先优化类（optimize),然后做一些验证工作，和线程安全的操作（因为可能多个线程同时引发初始化某个类,所以会使用当前类锁对初始化过程加锁）。接下来就开始初始化过程：
- 先递归的初始化父类`super class`，它的父类的父类，直到它们都先被初始化了。
- 初始化静态常量`static final`，它会从dex里面将静态变量的值拿出去（根据偏移量），赋值到类的静态变量上。
- 执行静态区的代码`static {}`，所有写在静态区的代码都会合并到静态方法里面，该方法的名字为`<clinit>`,签名为`()V`。它被当做一个正常的静态方法被调用。

到此，如果没有遇到异常，则该类被视为初始化完毕，可以正常使用，状态也变为`CLASS_INITIALIZED`。

