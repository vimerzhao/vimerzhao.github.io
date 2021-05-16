---
title: "Andfix源码解析"
date: 2017-08-20
type: post
isCJKLanguage: true
---

# Andfix源码解析
本文介绍了Andfix热修复框架的原理及实现代码。
## Andfix概述
`Andfix`是阿里开源的一套热修复框架，效果如下

![](http://ond7j4cnz.bkt.clouddn.com/blogandfix-demo.gif)
（注意我一直在点击，下发补丁后发生了变化......）

## 反编译分析
关键就是下发的恶`out.apatch`文件，其实这个一个`jar`文件，解压后如下:
```
.
├── diff.dex
├── out.apatch
├── out.apatch_FILES    //解压out.apatch所得
│   ├── classes.dex
│   └── META-INF
│       ├── CERT.RSA
│       ├── CERT.SF
│       ├── MANIFEST.MF
│       └── PATCH.MF
└── smali
    └── vimerzhao
        └── fuckandfix
            └── MainActivity_CF.smali

5 directories, 8 files
```
利用`dex2jar`对`diff.dex`进行反编译:
![](http://ond7j4cnz.bkt.clouddn.com/blogandfix-decompile.png)
可以看到被修改的方法添加了一条注解！而`out.apatch`里面的`dex`就是这个`diff.dex`文件，还包含了签名等各种配置信息。


## apkPatch工具分析
```java
public static void main(String[] args) {
        
        /*解析命令行参数*/
        ......

        ApkPatch apkPatch = new ApkPatch(from, to, name, out, keystore, 
                password, alias, entry);
        apkPatch.doPatch();
    }
}
```
ApkPatch的doPatch方法
```java
public void doPatch() {
    try {
        // 生成smali文件
        File smaliDir = new File(this.out, "smali");
        if (!smaliDir.exists()) {
            smaliDir.mkdir();
        }
        try {
            FileUtils.cleanDirectory(smaliDir);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        // 新建diff.dex文件
        File dexFile = new File(this.out, "diff.dex");
        if ((dexFile.exists()) && (!dexFile.delete())) {
            throw new RuntimeException("diff.dex can't be removed.");
        }
        File outFile = new File(this.out, "diff.apatch");
        if ((outFile.exists()) && (!outFile.delete())) {
            throw new RuntimeException("diff.apatch can't be removed.");
        }
        // Step1:拿到两个apk文件做对比，对比信息写入DiffInfo
        DiffInfo info = new DexDiffer().diff(this.from, this.to);

        // Step2:将对比结果写入.smali文件，然后打包生成dex文件
        this.classes = buildCode(smaliDir, dexFile, info);

        // Step3:将生成的Dex文件写入Jar包，并根据签名信息进行签名，生成diff.apatch
        build(outFile, dexFile);

        // Step4:重命名.apatch文件
        release(this.out, dexFile, outFile);
    } catch (Exception e) {
        e.printStackTrace();
    }
}
```
### 对比apk文件
```java
public DiffInfo diff(File newFile, File oldFile) throws IOException {
    // 提取dex文件
    DexBackedDexFile newDexFile = DexFileFactory.loadDexFile(newFile, 19, 
            true);
    DexBackedDexFile oldDexFile = DexFileFactory.loadDexFile(oldFile, 19, 
            true);

    DiffInfo info = DiffInfo.getInstance();

    boolean contains = false;
    for (DexBackedClassDef newClazz : newDexFile.getClasses()) {
        Set<? extends DexBackedClassDef> oldclasses = oldDexFile
            .getClasses();
        for (DexBackedClassDef oldClazz : oldclasses) {
            // 对比签名相同的方法，检查是否修改过
            if (newClazz.equals(oldClazz)) {
                // 检查对应class文件是否有字段变化
                compareField(newClazz, oldClazz, info);
                // 如果一个类中没有相同方法，则判定为新增方法
                compareMethod(newClazz, oldClazz, info);
                contains = true;
                break;
            }
        }
        if (!contains) {
            // 否则是新增的类
            info.addAddedClasses(newClazz);
        }
    }
    // 返回包含diff信息的DiffInfo对象
    return info;
}
```

其原理就是根据 dex diff得到两个apk文件的差别信息。对比方法过程中对比两个dex文件中同时存在的方法，如果方法实现不同则存储为修改过的方法；如果方法名不同，存储为新增的方法，也就是说AndFix支持增加新的方法，这一点已经测试证明。另外，在比较Field的时候有如下代码
```java
public void addModifiedFields(DexBackedField field) {
    this.modifiedFields.add(field);
    throw new RuntimeException("can,t modified Field:" + 
            field.getName() + "(" + field.getType() + "), " + "in class :" + 
            field.getDefiningClass());
}

.....

public void addAddedMethods(DexBackedMethod method) {
    System.out.println("add new Method:" + method.getReturnType() + 
            "  " + method.getName() + "(" + 
            Formater.formatStringList(method.getParameterTypes()) + 
            ")  in Class:" + method.getDefiningClass());
    this.addedMethods.add(method);
    if (!this.modifiedClasses.contains(method.classDef)) {
        this.modifiedClasses.add(method.classDef);
    }
}

```
也就是说AndFix不支持增加成员变量，但是支持在新增方法中增加的局部变量。也不支持修改成员变量。
还有一个地方要注意，就是提取dex文件的地方，在DexFileFactory类中
```java
@Nonnull
public static DexBackedDexFile loadDexFile(File dexFile, int api, boolean experimental)
    throws IOException {
    return loadDexFile(dexFile, "classes.dex", new Opcodes(api, experimental));
}
```
可以看到，只提取出了classes.dex这个文件，所以源生工具并不支持multidex，如果使用了multidex方案，并且修复的类不在同一个dex文件中，那么补丁就不会生效。
### 将对比结果打包
这一步我们重点关注拿到DiffInfo后将其存入smali文件的过程，ApkPatch.buildCode()方法
```java
private static Set<String> buildCode(File smaliDir, File dexFile, DiffInfo info)
    throws IOException, RecognitionException, FileNotFoundException {
    Set<String> classes = new HashSet();
    Set<DexBackedClassDef> list = new HashSet();
    list.addAll(info.getAddedClasses());
    list.addAll(info.getModifiedClasses());

    baksmaliOptions options = new baksmaliOptions();

    options.deodex = false;
    options.noParameterRegisters = false;
    options.useLocalsDirective = true;
    options.useSequentialLabels = true;
    options.outputDebugInfo = true;
    options.addCodeOffsets = false;
    options.jobs = -1;
    options.noAccessorComments = false;
    options.registerInfo = 0;
    options.ignoreErrors = false;
    options.inlineResolver = null;
    options.checkPackagePrivateAccess = false;
    if (!options.noAccessorComments) {
        options.syntheticAccessorResolver = new SyntheticAccessorResolver(
                list);
    }
    ClassFileNameHandler outFileNameHandler = new ClassFileNameHandler(
            smaliDir, ".smali");
    ClassFileNameHandler inFileNameHandler = new ClassFileNameHandler(
            smaliDir, ".smali");
    DexBuilder dexBuilder = DexBuilder.makeDexBuilder();
    for (DexBackedClassDef classDef : list)
    {
        String className = classDef.getType();
        baksmali.disassembleClass(classDef, outFileNameHandler, options);
        File smaliFile = inFileNameHandler.getUniqueFilenameForClass(
                TypeGenUtil.newType(className));
        classes.add(TypeGenUtil.newType(className)
                .substring(1, TypeGenUtil.newType(className).length() - 1)
                .replace('/', '.'));
        SmaliMod.assembleSmaliFile(smaliFile, dexBuilder, true, true);
    }
    dexBuilder.writeTo(new FileDataStore(dexFile));

    return classes;
}
```
将上一步得到的diff信息写入smali文件，并且生成diff.dex文件。smali文件的命名以`_CF.smali`结尾，并且在修改的地方用自定义的Annotation(MethodReplace)标注，用于在替换之前查找修复的变量或方法，如下。
```
.....
    .annotation runtime Lcom/alipay/euler/andfix/annotation/MethodReplace;
        method = "bugMethod"
        clazz = "vimerzhao.fuckandfix.MainActivity"
    .end annotation
.....
```
在打包生成的diff.dex文件中，反编译出来可以看到这段代码
```java
```
@MethodReplace(clazz="vimerzhao.fuckandfix.MainActivity", method="bugMethod")
private void bugMethod(TextView paramTextView)
{
    paramTextView.setText("After Hotfix");
    paramTextView.setBackgroundColor(-16711936);
}
```
然后就是签名，打包，加密的流程，就不具体分析了。注意，apkPatch在生成.apatch补丁文件的时候会加入签名信息，并且会进行加密操作，在应用补丁的时候会验证签名信息是否正确。

## Java层源码分析
通常，自定义`Application`如下:
```java
public class MainApplication extends Application {
    private static final String TAG = "euler";

    private static final String APATCH_PATH = "/out.apatch";
    /**
     * patch manager
     */
    private PatchManager mPatchManager;

    @Override
        public void onCreate() {
            super.onCreate();
            // initialize
            mPatchManager = new PatchManager(this);
            mPatchManager.init("1.0");
            Log.d(TAG, "inited.");

            // load patch
            mPatchManager.loadPatch();
            Log.d(TAG, "apatch loaded.");

            // add patch at runtime
            try {
                // .apatch file path
                String patchFileString = Environment.getExternalStorageDirectory()
                    .getAbsolutePath() + APATCH_PATH;
                mPatchManager.addPatch(patchFileString);
                Log.d(TAG, "apatch:" + patchFileString + " added.");
            } catch (IOException e) {
                Log.e(TAG, "", e);
            }

        }
}
```
`PatchManager.init()`方法:
```java
public void init(String appVersion) {
    if (!mPatchDir.exists() && !mPatchDir.mkdirs()) {// make directory fail
        Log.e(TAG, "patch dir create error.");
        return;
    } else if (!mPatchDir.isDirectory()) {// not directory
        mPatchDir.delete();
        return;
    }
    SharedPreferences sp = mContext.getSharedPreferences(SP_NAME,
            Context.MODE_PRIVATE);
    String ver = sp.getString(SP_VERSION, null);
    // 根据版本号加载补丁，版本号不同则清空缓存目录
    if (ver == null || !ver.equalsIgnoreCase(appVersion)) {
        cleanPatch();
        sp.edit().putString(SP_VERSION, appVersion).commit();
    } else {
        initPatchs();
    }
}

// 缓存目录data/data/package/file/apatch/会缓存补丁文件
// 即使原目录被删除也可以打补丁
private void initPatchs() {
    File[] files = mPatchDir.listFiles();
    for (File file : files) {
        addPatch(file);
    }
}
```
`addPatch()`和`loadPatch()`方法:
```java
public void loadPatch() {
    mLoaders.put("*", mContext.getClassLoader());// wildcard
    Set<String> patchNames;
    List<String> classes;
    for (Patch patch : mPatchs) {
        patchNames = patch.getPatchNames();
        for (String patchName : patchNames) {
            classes = patch.getClasses(patchName);
            mAndFixManager.fix(patch.getFile(), mContext.getClassLoader(),
                    classes);
        }
    }
}

private Patch addPatch(File file) {
    Patch patch = null;
    if (file.getName().endsWith(SUFFIX)) {
        try {
            patch = new Patch(file);
            mPatchs.add(patch);
        } catch (IOException e) {
            Log.e(TAG, "addPatch", e);
        }
    }
    return patch;
}
```
再看下`AndFixManager`的`fix()`方法:
```java
private void fixClass(Class<?> clazz, ClassLoader classLoader) {
    Method[] methods = clazz.getDeclaredMethods();
    MethodReplace methodReplace;
    String clz;
    String meth;
    for (Method method : methods) {
        /*
         * 这里是通过注解找到需要替换的方法，需要结合apkPatch工具的源码理解
         */
        methodReplace = method.getAnnotation(MethodReplace.class);
        if (methodReplace == null)
            continue;
        clz = methodReplace.clazz();
        meth = methodReplace.method();
        if (!isEmpty(clz) && !isEmpty(meth)) {
            /*
             * 真正的替换过程发生在这里，调用native层方法
             * 总结：Java层找到补丁，做防御检查，通过注解找到需要替换的方法，
             * 在native层进行真正的替换。
             */
            replaceMethod(classLoader, clz, meth, method);
        }
    }
}
```
后面就是调用native层的方法，写在jni中，打包为.so文件供java层调用。

总结一下，java层的功能就是找到补丁文件，根据补丁中的注解找到将要替换的方法然后交给jni层去处理替换方法的操作。好了，继续往下看。
## Native层源码分析
在jni的代码中支持Dalvik与ART，那么这是怎么区分的呢?在`AndFixManager`的构造方法中有这么一句:
```java
public static synchronized boolean isSupport() {
    if (isChecked)
        return isSupport;

    isChecked = true;
    // not support alibaba's YunOs
    if (!isYunOS() && AndFix.setup() && isSupportSDKVersion()) {
        isSupport = true;
    }

    if (inBlackList()) {
        isSupport = false;
    }

    return isSupport;
}
```
AndFix的`setUp()``方法:
```java
public static boolean setup() {
    try {
        /*
         * 批注/vimerzhao/2017-8-20
         * 如果Art虚拟机版本更新为3.0.0+将导致Bug
         */
        final String vmVersion = System.getProperty("java.vm.version");
        boolean isArt = vmVersion != null && vmVersion.startsWith("2");
        int apilevel = Build.VERSION.SDK_INT;
        return setup(isArt, apilevel);
    } catch (Exception e) {
        Log.e(TAG, "setup", e);
        return false;
    }
}
```
最后调用`setup(isArt, apilevel)`的native方法，在`andfix.cpp`中注册jni方法
```cpp
/*
 * JNI registration.
 */
static JNINativeMethod gMethods[] = {
    /* name, signature, funcPtr */
    { "setup", "(ZI)Z", (void*) setup }, { "replaceMethod",
                                             "(Ljava/lang/reflect/Method;Ljava/lang/reflect/Method;)V",
                                             (void*) replaceMethod }, { "setFieldFlag",
                                                 "(Ljava/lang/reflect/Field;)V", (void*) setFieldFlag }, };

```
`Native`实现:
```cpp
static jboolean setup(JNIEnv* env, jclass clazz, jboolean isart,
        jint apilevel) {
    isArt = isart;
    LOGD("vm is: %s , apilevel is: %i", (isArt ? "art" : "dalvik"),
            (int )apilevel);
    if (isArt) {
        return art_setup(env, (int) apilevel);
    } else {
        return dalvik_setup(env, (int) apilevel);
    }
}

static void replaceMethod(JNIEnv* env, jclass clazz, jobject src,
        jobject dest) {
    if (isArt) {
        art_replaceMethod(env, src, dest);
    } else {
        dalvik_replaceMethod(env, src, dest);
    }
}
```
根据上层传过来的`isArt`判断调用`Dalvik`还是`Art`的方法。以`Dalvik`为例,继续往下分析,代码在`dalvik_method_replace.cpp`中`dalvik_setup`方法
```cpp
extern jboolean __attribute__ ((visibility ("hidden"))) dalvik_setup(
        JNIEnv* env, int apilevel) {
    /*
     * 批注/vimerzhao/2017-8-20
     * 通过打开系统libdvm.so文件，获取到指定的两个函数，
     * 因为这两个函数在后面可以通过类对象获取其对应的
     * ClassObject结构题信息
     */
    void* dvm_hand = dlopen("libdvm.so", RTLD_NOW);
    if (dvm_hand) {
        dvmDecodeIndirectRef_fnPtr = dvm_dlsym(dvm_hand,
                apilevel > 10 ?
                "_Z20dvmDecodeIndirectRefP6ThreadP8_jobject" :
                "dvmDecodeIndirectRef");
        if (!dvmDecodeIndirectRef_fnPtr) {
            return JNI_FALSE;
        }
        dvmThreadSelf_fnPtr = dvm_dlsym(dvm_hand,
                apilevel > 10 ? "_Z13dvmThreadSelfv" : "dvmThreadSelf");
        if (!dvmThreadSelf_fnPtr) {
            return JNI_FALSE;
        }
        jclass clazz = env->FindClass("java/lang/reflect/Method");
        jClassMethod = env->GetMethodID(clazz, "getDeclaringClass",
                "()Ljava/lang/Class;");

        return JNI_TRUE;
    } else {
        return JNI_FALSE;
    }
}

```
替换方法的关键在于`native`层怎么影响内存里的java代码，我们知道java代码里将一个方法声明为`native`方法时,对此函数的调用就会到`native`世界里找，`AndFix`原理就是将一个不是`native`的方法修改成`native`方法，然后在`native`层进行替换，通过`dvmCallMethod_fnPtr`函数指针来调用`libdvm.so`中的`dvmCallMethod()`来加载替换后的新方法，达到替换方法的目的。Jni反射调用java方法时要用到一个`jmethodID`指针,这个指针在`Dalvik`里其实就是`Method`类,通过修改这个类的一些属性就可以实现在运行时将一个方法修改成`native`方法。
```cpp
extern void __attribute__ ((visibility ("hidden"))) dalvik_replaceMethod(
        JNIEnv* env, jobject src, jobject dest) {
    jobject clazz = env->CallObjectMethod(dest, jClassMethod);
    ClassObject* clz = (ClassObject*) dvmDecodeIndirectRef_fnPtr(
            dvmThreadSelf_fnPtr(), clazz);
    // 初始化完毕
    clz->status = CLASS_INITIALIZED;

    // meth是将被替换的方法
    Method* meth = (Method*) env->FromReflectedMethod(src);
    // target是新的方法
    Method* target = (Method*) env->FromReflectedMethod(dest);
    LOGD("dalvikMethod: %s", meth->name);

    //	meth->clazz = target->clazz;
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

看下dalvik_replaceMethod(env, src, dest);
## 总结
AndFix热补丁原理就是在native动态替换方法java层的代码，通过native层hook java层的代码。
### 优点
- 因为是动态的，所以不需要重启应用就可以生效
- 支持ART与Dalvik
- 与multidex方案相比，性能会有所提升(Multi Dex需要修改所有class的class_ispreverified标志位，导致运行时性能有所损失)
- 支持新增加方法
- 支持在新增方法中新增局部变量
- 足够轻量，生成补丁文件简单
- 安全性够高，验证签名

### 缺点
- 因为是动态的，跳过了类的初始化，设置为初始化完毕，所以对于静态方法、静态成员变量、构造方法或者class.forname()的处理可能会有问题
- 不支持新增成员变量和修改成员变量
- 官方apkPatch工具不支持multidex,但是可以通过修改工具来达到支持multidex的目的
- 由于是在native层替换方法，某些缺心眼厂商可能会修改源生关键部分的native层实现，导致可能在某些特定ROM支持不够好

## 参考
- [Android热补丁之AndFix原理解析 | w4lle's Notes](http://w4lle.com/2016/03/03/Android%E7%83%AD%E8%A1%A5%E4%B8%81%E4%B9%8BAndFix%E5%8E%9F%E7%90%86%E8%A7%A3%E6%9E%90/)
