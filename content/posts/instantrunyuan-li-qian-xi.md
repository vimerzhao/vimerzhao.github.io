---
title: "InstantRun原理浅析"
date: 2017-08-17
type: post
isCJKLanguage: true
categories:
    - "Android实践"
---

# InstantRun原理浅析
本文从宏观上简要介绍了InstantRun的实现原理。

## InstantRun概述
InstantRun是Android Studio2.0推出的新功能，旨在加快构建编译速度，提升开发体验，详细可参见[构建和运行您的应用 | Android Studio](https://developer.android.com/studio/run/index.html#instant-run)。
从流程角度来看，这是我们正常的开发流程：

![](http://ouv3jwdep.bkt.clouddn.com/2017-8-19instantrun-001.png)

即修改-编译-部署-重启。但是InstantRun的核心思想在于只编译修改了的部分

![](http://ouv3jwdep.bkt.clouddn.com/2017-8-19instantrun-002.png)

即修改-编译修改部分-部署修改部分-部署....关于`Cold Swap`、`Warm Swap`和`Hot Swap`参考：
- [Instant Run: How Does it Work?! – Google Developers – Medium](https://medium.com/google-developers/instant-run-how-does-it-work-294a1633367f)
- [Android Developer Tools - Instant Run](https://android.googlesource.com/platform/tools/base/+/studio-master-dev/instant-run/README.md)


## 程序员的品味
（本段是个人感悟）
一开始我用Android Studio的时候觉得修改代码之后重新编译、运行是再自然不过的事情了。可顶尖的程序员就是不一样，一个庞大的Android项目可能需要编译几分钟、几小时，仅仅是因为修改了几行代码！我个人感觉优秀的程序员有一个与生俱来的特质：追求极致的效率。所以InstantRun应运而生。但是仔细想想，这东西其实早就有了：make。make就是只会编译修改了的代码从而提高了开发效率。只是Android开发开发的特点导致其在实现上稍有不同。且不论编程语言不同，Android开发的一大特点就是开发环境与运行环境是分开的，所以InstantRun的实现也采用了C/S模式，以下是源码的第一层结构：
```
.
├── BUILD
├── instant-run-annotations
├── instant-run-client
├── instant-run-common
├── instant-run.iml
├── instant-run-runtime
├── instant-run-server
└── README.md
```
这里的Server端就是我们的设备而Client端才是电脑，通过USB通信。所以在我看来，InstantRun就是Android开发中对make增量编译的实现。

## 逆向分析
需要说明的是，本文用于演示的Android Studio版本是2.0，InstantRun的版本是gradle2.0.0的，实际上已经和最新版本的使用有些出入，源码也有所改动，但研究其最初版本更有助于理解InstantRun的实现思路，以后会详细分析gradle2.0.0中InstantRun到gradle2.3.0中InstantRun实现的变更，以及相关细节。
首先新建一个工程，自定义一个`Application`，运行后在`output/apk`目录下拿到安装包，解压后发现目录结构如下：

![](http://ouv3jwdep.bkt.clouddn.com/2017-8-19instant-run-001.PNG)

反编译`AndroidManifest.xml`发现我们自己`Application`已经被替换:

![](http://ouv3jwdep.bkt.clouddn.com/2017-8-19instant-run-003.png)

并且我们自己代码的dex文件已经被打包进了`instant-run.zip`文件:

![](http://ouv3jwdep.bkt.clouddn.com/2017-8-19instant-run-006.png)

而`classes.dex`和`classes2.dex`反编译出来的代码则对应InstantRun的代理`Application`:

![](http://ouv3jwdep.bkt.clouddn.com/2017-8-19instant-run-002.PNG)

具体来说对应的是`imtermidiates`目录下的`instant-run.jar`和`instant-run-bootstrap.jar`文件

![](http://ouv3jwdep.bkt.clouddn.com/2017-8-19instant-run-007.png)

通过以上分析可知，突破口是`BootstrapApplication`。

## 源码分析
这一部分需要对Android的底层机制，尤其是**应用如何启动（`Application`的执行流程）、资源如何加载**等问题比较熟悉，最好读过源码，否则看起来会比较晦涩。此外，既然是浅析，就要把关注点放在逻辑流程上，对于安全性检查、兼容低版本等代码适当忽略以求抓住重点。

### `attachBaseContext`分析

`BootstrapApplication`的`attachBaseContext`是分析的入口：
```java
    @Override
    protected void attachBaseContext(Context context) {
        // As of Marshmallow, we use APK splits and don't need to rely on
        // reflection to inject classes and resources for coldswap
        //noinspection PointlessBooleanExpression
        if (!AppInfo.usingApkSplits) {
            String apkFile = context.getApplicationInfo().sourceDir;
            long apkModified = apkFile != null ? new File(apkFile).lastModified() : 0L;
            createResources(apkModified);
            setupClassLoaders(context, context.getCacheDir().getPath(), apkModified);
        }

        createRealApplication();

        // This is called from ActivityThread#handleBindApplication() -> LoadedApk#makeApplication().
        // Application#mApplication is changed right after this call, so we cannot do the monkey
        // patching here. So just forward this method to the real Application instance.
        super.attachBaseContext(context);

        if (realApplication != null) {
            try {
                Method attachBaseContext =
                        ContextWrapper.class.getDeclaredMethod("attachBaseContext", Context.class);
                attachBaseContext.setAccessible(true);
                attachBaseContext.invoke(realApplication, context);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        }
    }
```
流程如下：`createResources`-->`setupClassLoaders`-->`createRealApplication`在此过程即完成了资源和代码的更新。

#### `createResources`分析
代码
```java
    private void createResources(long apkModified) {
        // Look for changes stashed in the inbox folder while the server was not running
        FileManager.checkInbox();

        File file = FileManager.getExternalResourceFile();
        externalResourcePath = file != null ? file.getPath() : null;

        if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
            Log.v(LOG_TAG, "Resource override is " + externalResourcePath);
        }

        if (file != null) {
            try {
                long resourceModified = file.lastModified();
                if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                    Log.v(LOG_TAG, "Resource patch last modified: " + resourceModified);
                    Log.v(LOG_TAG, "APK last modified: " + apkModified + " " +
                            (apkModified > resourceModified ? ">" : "<") + " resource patch");
                }

                if (apkModified == 0L || resourceModified <= apkModified) {
                    if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                        Log.v(LOG_TAG, "Ignoring resource file, older than APK");
                    }
                    externalResourcePath = null;
                }
            } catch (Throwable t) {
                Log.e(LOG_TAG, "Failed to check patch timestamps", t);
            }
        }
    }
```
很多语句在打日志，主要是分析`resource.ap_`是否该改变，即资源是否由增减或修改。

#### `setupClassLoaders`分析
代码
```java
    private static void setupClassLoaders(Context context, String codeCacheDir, long apkModified) {
        List<String> dexList = FileManager.getDexList(context, apkModified);

        // Make sure class loader finds these
        @SuppressWarnings("unused") Class<Server> server = Server.class;
        @SuppressWarnings("unused") Class<MonkeyPatcher> patcher = MonkeyPatcher.class;

        if (!dexList.isEmpty()) {
            if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                Log.v(LOG_TAG, "Bootstrapping class loader with dex list " + join('\n', dexList));
            }

            ClassLoader classLoader = BootstrapApplication.class.getClassLoader();
            String nativeLibraryPath;
            try {
                nativeLibraryPath = (String) classLoader.getClass().getMethod("getLdLibraryPath")
                                .invoke(classLoader);
                if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                    Log.v(LOG_TAG, "Native library path: " + nativeLibraryPath);
                }
            } catch (Throwable t) {
                Log.e(LOG_TAG, "Failed to determine native library path " + t.getMessage());
                nativeLibraryPath = FileManager.getNativeLibraryFolder().getPath();
            }
            IncrementalClassLoader.inject(
                    classLoader,
                    nativeLibraryPath,
                    codeCacheDir,
                    dexList);
        }
    }
```
继续看`IncrementalClassLoader.inject`
```java
    public static ClassLoader inject(
            ClassLoader classLoader, String nativeLibraryPath, String codeCacheDir,
            List<String> dexes) {
        IncrementalClassLoader incrementalClassLoader =
                new IncrementalClassLoader(classLoader, nativeLibraryPath, codeCacheDir, dexes);
        setParent(classLoader, incrementalClassLoader);

        // This works as follows:
        // We're given the current class loader that's used to load the bootstrap application.
        // We have a new class loader which reads patches/overrides from the data directory
        // instead. We want *that* class loader to have the bootstrap class loader's parent
        // as its parent, and then we make the bootstrap class loader parented by our
        // class loader.
        //
        // In other words, we have this:
        //      BootstrapApplication.classLoader = ClassLoader1, parent=ClassLoader2
        // We create ClassLoader3 from the .dex files in the data directory, and arrange for
        // the hierarchy to be like this:
        //      BootstrapApplication.classLoader = ClassLoader1, parent=ClassLoader3, parent=ClassLoader2
        // With this approach, a class find (which should always look at the parents first) should
        // find anything from ClassLoader3 before they get them from ClassLoader1.
        // (Note that ClassLoader2 in the above is generally the BootClassLoader, not containing
        // any classes we care about.)

        return incrementalClassLoader;
    }
```
由注释可以更加确定，其实就是利用**双亲委托模式**在中间安插一个加载器，从而控制对dex的加载。

#### `createRealApplication`分析
代码
```java
    private void createRealApplication() {
        if (AppInfo.applicationClass != null) {
            if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                Log.v(LOG_TAG, "About to create real application of class name = " +
                        AppInfo.applicationClass);
            }

            try {
                @SuppressWarnings("unchecked")
                Class<? extends Application> realClass =
                        (Class<? extends Application>) Class.forName(AppInfo.applicationClass);
                if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                    Log.v(LOG_TAG, "Created delegate app class successfully : " + realClass +
                            " with class loader " + realClass.getClassLoader());
                }
                Constructor<? extends Application> constructor = realClass.getConstructor();
                realApplication = constructor.newInstance();
                if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                    Log.v(LOG_TAG, "Created real app instance successfully :" + realApplication);
                }
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        } else {
            realApplication = new Application();
        }
    }

```

其实就是利用`AppInfo`中的信息得到真正的`Application`并反射出来。

### `onCreate`分析
```java
    @Override
    public void onCreate() {
        // As of Marshmallow, we use APK splits and don't need to rely on
        // reflection to inject classes and resources for coldswap
        //noinspection PointlessBooleanExpression
        if (!AppInfo.usingApkSplits) {
            MonkeyPatcher.monkeyPatchApplication(
                    BootstrapApplication.this, BootstrapApplication.this,
                    realApplication, externalResourcePath);
            MonkeyPatcher.monkeyPatchExistingResources(BootstrapApplication.this,
                    externalResourcePath, null);
        } else {
            // We still need to set the application instance in the LoadedApk etc
            // such that getApplication() returns the new application
            MonkeyPatcher.monkeyPatchApplication(
                    BootstrapApplication.this, BootstrapApplication.this,
                    realApplication, null);
        }
        super.onCreate();

        // Start server, unless we're in a multiprocess scenario and this isn't the
        // primary process
        if (AppInfo.applicationId != null) {
            try {
                boolean foundPackage = false;
                int pid = Process.myPid();
                ActivityManager manager = (ActivityManager) getSystemService(
                        Context.ACTIVITY_SERVICE);
                List<RunningAppProcessInfo> processes = manager.getRunningAppProcesses();

                boolean startServer;
                if (processes != null && processes.size() > 1) {
                    // Multiple processes: look at each, and if the process name matches
                    // the package name (for the current pid), it's the main process.
                    startServer = false;
                    for (RunningAppProcessInfo processInfo : processes) {
                        if (AppInfo.applicationId.equals(processInfo.processName)) {
                            foundPackage = true;
                            if (processInfo.pid == pid) {
                                startServer = true;
                                break;
                            }
                        }
                    }
                    if (!startServer && !foundPackage) {
                        // Safety check: If for some reason we didn't even find the main package,
                        // start the server anyway. This safeguards against apps doing strange
                        // things with the process name.
                        startServer = true;
                        if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                            Log.v(LOG_TAG, "Multiprocess but didn't find process with package: "
                                    + "starting server anyway");
                        }
                    }
                } else {
                    // If there is only one process, start the server.
                    startServer = true;
                }

                if (startServer) {
                    Server.create(AppInfo.applicationId, BootstrapApplication.this);
                }
            } catch (Throwable t) {
                if (Log.isLoggable(LOG_TAG, Log.VERBOSE)) {
                    Log.v(LOG_TAG, "Failed during multi process check", t);
                }
                Server.create(AppInfo.applicationId, BootstrapApplication.this);
            }
        }

        if (realApplication != null) {
            realApplication.onCreate();
        }
    }
```

执行流程`monkeyPatchApplication`-->`monkeyPatchExistingResources`-->`startServer`-->`realApplication.onCreate`。可以发现`realApplication`的启动流程都被`BootstrapApplication`代理了。

#### `monkeyPatchApplication`分析
代码
```java
    public static void monkeyPatchApplication(@Nullable Context context,
                                              @Nullable Application bootstrap,
                                              @Nullable Application realApplication,
                                              @Nullable String externalResourceFile) {
        /*
        The code seems to perform this:
        Application realApplication = the newly instantiated (in attachBaseContext) user app

        currentActivityThread = ActivityThread.currentActivityThread;
        Application initialApplication = currentActivityThread.mInitialApplication;
        if (initialApplication == BootstrapApplication.this) {
            currentActivityThread.mInitialApplication = realApplication;

        // Replace all instance of the stub application in ActivityThread#mAllApplications with the
        // real one
        List<Application> allApplications = currentActivityThread.mAllApplications;
        for (int i = 0; i < allApplications.size(); i++) {
            if (allApplications.get(i) == BootstrapApplication.this) {
                allApplications.set(i, realApplication);
            }
        }

        // Enumerate all LoadedApk (or PackageInfo) fields in ActivityThread#mPackages and
        // ActivityThread#mResourcePackages and do two things:
        //   - Replace the Application instance in its mApplication field with the real one
        //   - Replace mResDir to point to the external resource file instead of the .apk. This is
        //     used as the asset path for new Resources objects.
        //   - Set Application#mLoadedApk to the found LoadedApk instance

        ArrayMap<String, WeakReference<LoadedApk>> map1 = currentActivityThread.mPackages;
        for (Map.Entry<String, WeakReference<?>> entry : map1.entrySet()) {
            Object loadedApk = entry.getValue().get();
            if (loadedApk == null) {
                continue;
            }

            if (loadedApk.mApplication == BootstrapApplication.this) {
                loadedApk.mApplication = realApplication;
                if (externalResourceFile != null) {
                    loadedApk.mResDir = externalResourceFile;
                }
                realApplication.mLoadedApk = loadedApk;
            }
        }

        // Exactly the same as above, except done for mResourcePackages instead of mPackages
        ArrayMap<String, WeakReference<LoadedApk>> map2 = currentActivityThread.mResourcePackages;
        for (Map.Entry<String, WeakReference<?>> entry : map2.entrySet()) {
            Object loadedApk = entry.getValue().get();
            if (loadedApk == null) {
                continue;
            }

            if (loadedApk.mApplication == BootstrapApplication.this) {
                loadedApk.mApplication = realApplication;
                if (externalResourceFile != null) {
                    loadedApk.mResDir = externalResourceFile;
                }
                realApplication.mLoadedApk = loadedApk;
            }
        }
        */

        // BootstrapApplication is created by reflection in Application#handleBindApplication() ->
        // LoadedApk#makeApplication(), and its return value is used to set the Application field in all
        // sorts of Android internals.
        //
        // Fortunately, Application#onCreate() is called quite soon after, so what we do is monkey
        // patch in the real Application instance in BootstrapApplication#onCreate().
        //
        // A few places directly use the created Application instance (as opposed to the fields it is
        // eventually stored in). Fortunately, it's easy to forward those to the actual real
        // Application class.
        try {
            // Find the ActivityThread instance for the current thread
            Class<?> activityThread = Class.forName("android.app.ActivityThread");
            Object currentActivityThread = getActivityThread(context, activityThread);

            // Find the mInitialApplication field of the ActivityThread to the real application
            Field mInitialApplication = activityThread.getDeclaredField("mInitialApplication");
            mInitialApplication.setAccessible(true);
            Application initialApplication = (Application) mInitialApplication.get(currentActivityThread);
            if (realApplication != null && initialApplication == bootstrap) {
                mInitialApplication.set(currentActivityThread, realApplication);
            }

            // Replace all instance of the stub application in ActivityThread#mAllApplications with the
            // real one
            if (realApplication != null) {
                Field mAllApplications = activityThread.getDeclaredField("mAllApplications");
                mAllApplications.setAccessible(true);
                List<Application> allApplications = (List<Application>) mAllApplications
                        .get(currentActivityThread);
                for (int i = 0; i < allApplications.size(); i++) {
                    if (allApplications.get(i) == bootstrap) {
                        allApplications.set(i, realApplication);
                    }
                }
            }

            // Figure out how loaded APKs are stored.

            // API version 8 has PackageInfo, 10 has LoadedApk. 9, I don't know.
            Class<?> loadedApkClass;
            try {
                loadedApkClass = Class.forName("android.app.LoadedApk");
            } catch (ClassNotFoundException e) {
                loadedApkClass = Class.forName("android.app.ActivityThread$PackageInfo");
            }
            Field mApplication = loadedApkClass.getDeclaredField("mApplication");
            mApplication.setAccessible(true);
            Field mResDir = loadedApkClass.getDeclaredField("mResDir");
            mResDir.setAccessible(true);

            // 10 doesn't have this field, 14 does. Fortunately, there are not many Honeycomb devices
            // floating around.
            Field mLoadedApk = null;
            try {
                mLoadedApk = Application.class.getDeclaredField("mLoadedApk");
            } catch (NoSuchFieldException e) {
                // According to testing, it's okay to ignore this.
            }

            // Enumerate all LoadedApk (or PackageInfo) fields in ActivityThread#mPackages and
            // ActivityThread#mResourcePackages and do two things:
            //   - Replace the Application instance in its mApplication field with the real one
            //   - Replace mResDir to point to the external resource file instead of the .apk. This is
            //     used as the asset path for new Resources objects.
            //   - Set Application#mLoadedApk to the found LoadedApk instance
            for (String fieldName : new String[]{"mPackages", "mResourcePackages"}) {
                Field field = activityThread.getDeclaredField(fieldName);
                field.setAccessible(true);
                Object value = field.get(currentActivityThread);

                for (Map.Entry<String, WeakReference<?>> entry :
                        ((Map<String, WeakReference<?>>) value).entrySet()) {
                    Object loadedApk = entry.getValue().get();
                    if (loadedApk == null) {
                        continue;
                    }

                    if (mApplication.get(loadedApk) == bootstrap) {
                        if (realApplication != null) {
                            mApplication.set(loadedApk, realApplication);
                        }
                        if (externalResourceFile != null) {
                            mResDir.set(loadedApk, externalResourceFile);
                        }

                        if (realApplication != null && mLoadedApk != null) {
                            mLoadedApk.set(realApplication, loadedApk);
                        }
                    }
                }
            }
        } catch (Throwable e) {
            throw new IllegalStateException(e);
        }
    }

```
结合注释可以清楚知道主要逻辑就是把代理的`Application`替换为真正的`Application`。

#### `monkeyPatchExistingResources`分析
代码
```java
    public static void monkeyPatchExistingResources(@Nullable Context context,
                                                    @Nullable String externalResourceFile,
                                                    @Nullable Collection<Activity> activities) {
        if (externalResourceFile == null) {
            return;
        }

        /*
        (Note: the resource directory is *also* inserted into the loadedApk in
        monkeyPatchApplication)
        The code seems to perform this:
        File externalResourceFile = <path to resources.ap_ or extracted directory>

        AssetManager newAssetManager = new AssetManager();
        newAssetManager.addAssetPath(externalResourceFile)

        // Kitkat needs this method call, Lollipop doesn't. However, it doesn't seem to cause any harm
        // in L, so we do it unconditionally.
        newAssetManager.ensureStringBlocks();

        // Find the singleton instance of ResourcesManager
        ResourcesManager resourcesManager = ResourcesManager.getInstance();

        // Iterate over all known Resources objects
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            for (WeakReference<Resources> wr : resourcesManager.mActiveResources.values()) {
                Resources resources = wr.get();
                // Set the AssetManager of the Resources instance to our brand new one
                resources.mAssets = newAssetManager;
                resources.updateConfiguration(resources.getConfiguration(), resources.getDisplayMetrics());
            }
        }

        // Also, for each context, call getTheme() to get the current theme; null out its
        // mTheme field, then invoke initializeTheme() to force it to be recreated (with the
        // new asset manager!)

        */

        try {
            // Create a new AssetManager instance and point it to the resources installed under
            // /sdcard
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
忽视处理版本兼容的代码，本质是如果`resource.ap_`文件有改变，那么新建一个AssetManager对象newAssetManager，然后用newAssetManager对象替换所有当前Resource、Resource.Theme的mAssets成员变量；如果当前的已经有Activity启动了，还需要替换所有Activity中mAssets成员变量。

#### `startServer`分析
`Server`类负责处理热部署、温部署还是冷部署以及通信协议，在此不做详细分析。

## 借鉴意义
通过分析InstantRun代码，一方面可以了解Android Studio一个简单按钮背后的原理，也可以借鉴到自己的需求中，主流热修复方案中对资源的修复都很大程度上参考了InstantRun的实现。
由于目前姿势水平有限，只是做了粗略的分析，希望以后有机会更加详细地分析InstantRun的技术细节。

## 参考

- [nuptboyzhb/AndroidInstantRun: Android Instant Run原理分析](https://github.com/nuptboyzhb/AndroidInstantRun)
- [Instant Run: How Does it Work?! – Google Developers – Medium](https://medium.com/google-developers/instant-run-how-does-it-work-294a1633367f)
- gradle_2.0.0[instant-run - platform/tools/base - Git at Google](https://android.googlesource.com/platform/tools/base/+/gradle_2.0.0/instant-run)
- gradle_2.3.0[instant-run - platform/tools/base - Git at Google](https://android.googlesource.com/platform/tools/base/+/gradle_2.3.0/instant-run)
- [构建和运行您的应用 | Android Studio](https://developer.android.com/studio/run/index.html#instant-run)
- [Instant Run 浅析 | Jason's Blog](http://jiajixin.cn/2015/11/25/instant-run/)
- [从 Instant-Run 出发，谈谈 Android 上的热修复 - Android - 掘金](https://juejin.im/entry/5731f50ef38c840067dcce48)
- [Android 插件化原理解析——插件加载机制 | Weishu's Notes](http://weishu.me/2016/04/05/understand-plugin-framework-classloader/)
