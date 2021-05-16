---
title: "自己动手写Android插件化框架"
date: 2018-10-04
type: post
isCJKLanguage: true
---

# 自己动手写Android插件化框架
最近在工作中接触到了Android插件内的开发，发现自己这种技术还缺乏最基本的了解，以至于在一些基本问题上浪费不少时间，如插件Context和主工程Context的区别，权限必须在主工程申明等，因此花了点时间了解了一下插件的历史，并写了两个Demo作为总结。本文旨在通过两个实例直观的说明插件的实现原理以加深对插件内开发的理解，因此不会深入探讨背景和原理，代码也尽量专注于核心逻辑。
## 原理与背景
Android插件化从技术上来说就是如何启动未安装的apk（主要是四大组件）里面的类，主要问题涉及如何加载类、如何加载资源、如何管理组件生命周期。
### 类加载
Android对于外部的dex文件，主要通过`DexClassLoader`类加载，因此，只需要给定插件的路径，就可以构造对应的类加载器：
```
private DexClassLoader createDexClassLoader(String apkPath) {
    File dexOutputDir = mContext.getDir("dex", Context.MODE_PRIVATE);
    DexClassLoader loader = new DexClassLoader(apkPath, dexOutputDir.getAbsolutePath(),
            null, mContext.getClassLoader());
    return loader;
}
```

### 资源加载
Android系统通过Resource对象加载资源,因此只需要添加资源（即apk文件）所在路径到`AssetManager`中，即可实现对插件资源的访问。
```
  AssetManager assetManager = AssetManager.class.newInstance();
  Method addAssetPath = assetManager.getClass().getMethod(addAssetPathMethod, String.class);
  addAssetPath.invoke(assetManager, apkPath);
  Resources pluginRes = new Resources(assetManager,
          mContext.getResources().getDisplayMetrics(),
          mContext.getResources().getConfiguration());
  pluginApk = new PluginApk(pluginRes);
  pluginApk.classLoader = createDexClassLoader(apkPath);
```
### 生命周期
插件化中较为复杂的是对生命周期的管理，其中以Activity最为复杂。早期的dynamic-load-apk采用的是代理的方式，通过一个空壳Activity作为代理（Proxy），系统对该Activity的回调都会映射到插件Activity，如此便可以实现通过系统来管理插件的生命周期。这种方式十分直观，但是需要所有的插件Activity都继承这个用作代理的`PluginActivity`（Demo中的命名），侵入性强，可结合后面的例子加深理解。因此，如何避免这种侵入性成了第二代插件化框架的目标，VirtualApk通过Hook少量系统类达到了这个目标，插件的开发和普通工程无异，接入成本极低。
了解了这些原理往往还不够，知识往往需要经过推导和实践才能变成自己的，因此，接下来我们结合这些原理来实现一个插件化框架，不考虑兼容性和健壮性，纯粹来实践上面提及的原理。

## 代理实现
首先建立一个`PluginManager`类来实现插件的加载：
```
public class PluginManager {
    static class PluginMgrHolder {
        static PluginManager sManager = new PluginManager();
    }

    private static Context mContext;

    Map<String, PluginApk> sMap = new HashMap<>();

    public static PluginManager getInstance() {
        return PluginMgrHolder.sManager;
    }
    public PluginApk getPluginApk(String packageName) {
        return sMap.get(packageName);
    }

    public static void init(Context context) {
        mContext = context.getApplicationContext();
    }

    public final void loadApk(String apkPath) {
        PackageInfo packageInfo = queryPackageInfo(apkPath);
        if (packageInfo == null || TextUtils.isEmpty(packageInfo.packageName)) {
            return;
        }
        // check cache
        PluginApk pluginApk = sMap.get(packageInfo.packageName);

        if (pluginApk == null) {
            pluginApk = createApk(apkPath);
            if (pluginApk != null) {
                pluginApk.packageInfo = packageInfo;
                sMap.put(packageInfo.packageName, pluginApk);
            } else {
                throw new NullPointerException("PluginApk is null");
            }
        }
    }

    private PluginApk createApk(String apkPath) {
        String addAssetPathMethod = "addAssetPath";
        PluginApk pluginApk = null;
        try {
            AssetManager assetManager = AssetManager.class.newInstance();
            Method addAssetPath = assetManager.getClass().getMethod(addAssetPathMethod, String.class);
            addAssetPath.invoke(assetManager, apkPath);
            Resources pluginRes = new Resources(assetManager,
                    mContext.getResources().getDisplayMetrics(),
                    mContext.getResources().getConfiguration());
            pluginApk = new PluginApk(pluginRes);
            pluginApk.classLoader = createDexClassLoader(apkPath);
        } catch (IllegalAccessException
                | InstantiationException
                | NoSuchMethodException
                | InvocationTargetException e) {
            e.printStackTrace();
        }
        return pluginApk;
    }
    private PackageInfo queryPackageInfo(String apkPath) {
        PackageInfo packageInfo = mContext.getPackageManager().getPackageArchiveInfo(apkPath,
                PackageManager.GET_ACTIVITIES | PackageManager.GET_SERVICES);
        if (packageInfo == null) {
            return null;
        }
        return packageInfo;
    }

    private DexClassLoader createDexClassLoader(String apkPath) {
        File dexOutputDir = mContext.getDir("dex", Context.MODE_PRIVATE);
        DexClassLoader loader = new DexClassLoader(apkPath, dexOutputDir.getAbsolutePath(),
                null, mContext.getClassLoader());
        return loader;
    }

    public void startActivity(Intent intent) {
        Intent pluginIntent = new Intent(mContext, ProxyActivity.class);
        Bundle extra = intent.getExtras();
        // complicate if statement
        if (extra == null || !extra.containsKey(Constants.PLUGIN_CLASS_NAME) && !extra.containsKey(Constants.PACKAGE_NAME)) {
            try {
                throw new IllegalAccessException("lack class of plugin and package name");
            } catch (IllegalAccessException e) {
                e.printStackTrace();
            }
        }
        pluginIntent.putExtras(intent);
        pluginIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        mContext.startActivity(pluginIntent);
    }
}

```
`PluginApk`表示一个Apk文件：
```
public class PluginApk {
    public PackageInfo packageInfo;
    public DexClassLoader classLoader;
    public Resources pluginRes;

    public PluginApk(Resources pluginRes) {
        this.pluginRes = pluginRes;
    }

}
```
所有插件Activity都要继承一个父类`PluginActivity`:
```
public abstract class PluginActivity extends Activity implements Pluginable, Attachable<Activity> {
    public final static String TAG = PluginActivity.class.getSimpleName();
    protected Activity mProxyActivity;
    private Resources mResources;
    PluginApk mPluginApk;

    @Override
    public void attach(Activity proxy, PluginApk apk) {
        mProxyActivity = proxy;
        mPluginApk = apk;
        mResources = apk.pluginRes;
    }

    @Override
    public void setContentView(int layoutResID) {
        mProxyActivity.setContentView(layoutResID);
    }

    @Override
    public void setContentView(View view) {
        mProxyActivity.setContentView(view);
    }

    @Override
    public void setContentView(View view, ViewGroup.LayoutParams params) {
        mProxyActivity.setContentView(view, params);
    }


    @Override
    public View findViewById(int id) {
        return mProxyActivity.findViewById(id);
    }

    @Override
    public Resources getResources() {
        return mResources;
    }

    @Override
    public WindowManager getWindowManager() {
        return mProxyActivity.getWindowManager();
    }

    @Override
    public ClassLoader getClassLoader() {
        return mProxyActivity.getClassLoader();
    }

    @Override
    public Context getApplicationContext() {
        return mProxyActivity.getApplicationContext();
    }

    @Override
    public MenuInflater getMenuInflater() {
        return mProxyActivity.getMenuInflater();
    }


    @Override
    public Window getWindow() {
        return mProxyActivity.getWindow();
    }

    @Override
    public Intent getIntent() {
        return mProxyActivity.getIntent();
    }

    @Override
    public LayoutInflater getLayoutInflater() {
        return mProxyActivity.getLayoutInflater();
    }

    @Override
    public String getPackageName() {
        return mPluginApk.packageInfo.packageName;
    }


    @Override
    public void onCreate(Bundle bundle) {
        // DO NOT CALL super.onCreate(bundle)
        // following same
        VLog.log(TAG + ": onCreate");
    }

    @Override
    public void onStart() {

    }

    @Override
    public void onResume() {

    }

    @Override
    public void onStop() {

    }

    @Override
    public void onPause() {

    }

    @Override
    public void onDestroy() {
    }
}

```
这个类只是一个壳，系统会通过`ProxyActivity`触发对应的方法的具体实现：
```
public class ProxyActivity extends Activity {
    LifeCircleController mPluginController = new LifeCircleController(this);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mPluginController.onCreate(getIntent().getExtras());
    }

    @Override
    public Resources getResources() {
        // construct when loading apk
        Resources resources = mPluginController.getResources();
        return resources == null ? super.getResources() : resources;
    }

    @Override
    public Resources.Theme getTheme() {
        Resources.Theme theme = mPluginController.getTheme();
        return theme == null ? super.getTheme() : theme;
    }

    @Override
    public AssetManager getAssets() {
        return mPluginController.getAssets();
    }


    @Override
    protected void onStart() {
        super.onStart();
        mPluginController.onStart();
    }

    @Override
    protected void onResume() {
        super.onResume();
        mPluginController.onResume();
    }

    @Override
    protected void onStop() {
        super.onStop();
        mPluginController.onStop();
    }

    @Override
    protected void onPause() {
        super.onPause();
        mPluginController.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        mPluginController.onDestroy();
    }
}
```
这个类是系统实际启动的类，其主要逻辑由`LifeCircleController`负责：
```
public class LifeCircleController implements Pluginable {
    Activity mProxy;
    PluginActivity mPlugin;
    Resources mResources;
    Resources.Theme mTheme;
    PluginApk mPluginApk;
    String mPluginClazz;

    public LifeCircleController(Activity activity) {
        mProxy = activity;
    }

    public void onCreate(Bundle bundle) {
        mPluginClazz = bundle.getString(Constants.PLUGIN_CLASS_NAME);
        String packageName = bundle.getString(Constants.PACKAGE_NAME);
        mPluginApk = PluginManager.getInstance().getPluginApk(packageName);
        try {
            mPlugin = (PluginActivity) loadPluginable(mPluginApk.classLoader, mPluginClazz);
            mPlugin.attach(mProxy, mPluginApk);
            mResources = mPluginApk.pluginRes;
            mPlugin.onCreate(bundle);
        } catch (Exception e) {
            VLog.log("Fail in LifeCircleController onCreate");
            VLog.log(e.getMessage());
            e.printStackTrace();
        }

    }
    private Object loadPluginable(ClassLoader classLoader, String pluginActivityClass)
            throws Exception {
        Class<?> pluginClz = classLoader.loadClass(pluginActivityClass);
        Constructor<?> constructor = pluginClz.getConstructor(new Class[] {});
        constructor.setAccessible(true);
        return constructor.newInstance(new Object[] {});
    }

    @Override
    public void onStart() {
        if (mPlugin != null) {
            mPlugin.onStart();
        }
    }

    @Override
    public void onResume() {
        if (mPlugin != null) {
            mPlugin.onResume();
        }
    }

    @Override
    public void onStop() {
        mPlugin.onStop();
    }

    @Override
    public void onPause() {
        mPlugin.onPause();
    }

    @Override
    public void onDestroy() {
        mPlugin.onDestroy();
    }

    public Resources getResources() {
        return mResources;
    }

    public Resources.Theme getTheme() {
        return mTheme;
    }

    public AssetManager getAssets() {
        return mResources.getAssets();
    }

}

```
有点像Activity源码的外观模式，内部的分工和职责划分对于使用者是不可见的。
最后在主工程启动插件：
```
Intent intent = new Intent();
intent.putExtra(Constants.PACKAGE_NAME, PLUGIN_PACKAGE_NAME);
intent.putExtra(Constants.PLUGIN_CLASS_NAME, PLUGIN_CLAZZ_NAME);
mPluginManager.startActivity(intent);
```
插件Activity如下：
```
public class MainActivity extends PluginActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        setTitle("Plugin App");
        ((ImageView) findViewById(R.id.iv_logo)).setImageResource(R.drawable.android);
    }
}
```
效果：
![](http://ond7j4cnz.bkt.clouddn.com/plugin_demo.gif)

## Hook实现
Hook的方式需要基本了解系统启动一个Activity的过程，一般来说系统会先检查Activity是否注册，然后再去生成该Activity，那么我们只需要在检查的时候用一个已经注册的Activity（桩，通常表示为StubActivity）来给系统检查，检查通过后在生成的时候再替换成插件的就可以了。
首先要自己实现一个`Instrumentation`，在里面做一些替换工作，然后去Hook掉系统持有的对象：
```
public class HookedInstrumentation extends Instrumentation implements Handler.Callback {
    public static final String TAG = "HookedInstrumentation";
    protected Instrumentation mBase;
    private PluginManager mPluginManager;

    public HookedInstrumentation(Instrumentation base, PluginManager pluginManager) {
        mBase = base;
        mPluginManager = pluginManager;
    }

    /**
     * 覆盖掉原始Instrumentation类的对应方法,用于插件内部跳转Activity时适配
     *
     * @Override
     */
    public ActivityResult execStartActivity(
            Context who, IBinder contextThread, IBinder token, Activity target,
            Intent intent, int requestCode, Bundle options) {

        if (Constants.DEBUG) Log.e(TAG, "execStartActivity");
        mPluginManager.hookToStubActivity(intent);

        try {
            Method execStartActivity = Instrumentation.class.getDeclaredMethod(
                    "execStartActivity", Context.class, IBinder.class, IBinder.class,
                    Activity.class, Intent.class, int.class, Bundle.class);
            execStartActivity.setAccessible(true);
            return (ActivityResult) execStartActivity.invoke(mBase, who,
                    contextThread, token, target, intent, requestCode, options);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("do not support!!!" + e.getMessage());
        }
    }

    @Override
    public Activity newActivity(ClassLoader cl, String className, Intent intent) throws InstantiationException, IllegalAccessException, ClassNotFoundException {
        if (Constants.DEBUG) Log.e(TAG, "newActivity");

        if (mPluginManager.hookToPluginActivity(intent)) {
            String targetClassName = intent.getComponent().getClassName();
            PluginApp pluginApp = mPluginManager.getLoadedPluginApk();
            Activity activity = mBase.newActivity(pluginApp.mClassLoader, targetClassName, intent);
            activity.setIntent(intent);
            ReflectUtil.setField(ContextThemeWrapper.class, activity, Constants.FIELD_RESOURCES, pluginApp.mResources);
            return activity;
        }

        if (Constants.DEBUG) Log.e(TAG, "super.newActivity(...)");
        return super.newActivity(cl, className, intent);
    }

    @Override
    public boolean handleMessage(Message message) {
        if (Constants.DEBUG) Log.e(TAG, "handleMessage");
        return false;
    }


    @Override
    public void callActivityOnCreate(Activity activity, Bundle icicle) {
        if (Constants.DEBUG) Log.e(TAG, "callActivityOnCreate");
        super.callActivityOnCreate(activity, icicle);
    }
}

```
在负责启动的`execStartActivity`设置为启动已注册的Activity，再在`newActivity`设置为实际要启动的插件的Activity。然后去Hook系统持有的该字段：
```
public class ReflectUtil {
    public static final String METHOD_currentActivityThread = "currentActivityThread";
    public static final String CLASS_ActivityThread = "android.app.ActivityThread";
    public static final String FIELD_mInstrumentation = "mInstrumentation";
    public static final String TAG = "ReflectUtil";


    private static Instrumentation sInstrumentation;
    private static Instrumentation sActivityInstrumentation;
    private static Field sActivityThreadInstrumentationField;
    private static Field sActivityInstrumentationField;
    private static Object sActivityThread;

    public static boolean init() {
        //获取当前的ActivityThread对象
        Class<?> activityThreadClass = null;
        try {
            activityThreadClass = Class.forName(CLASS_ActivityThread);
            Method currentActivityThreadMethod = activityThreadClass.getDeclaredMethod(METHOD_currentActivityThread);
            currentActivityThreadMethod.setAccessible(true);
            Object currentActivityThread = currentActivityThreadMethod.invoke(null);


            //拿到在ActivityThread类里面的原始mInstrumentation对象
            Field instrumentationField = activityThreadClass.getDeclaredField(FIELD_mInstrumentation);
            instrumentationField.setAccessible(true);
            sActivityThreadInstrumentationField = instrumentationField;

            sInstrumentation = (Instrumentation) instrumentationField.get(currentActivityThread);
            sActivityThread = currentActivityThread;


            sActivityInstrumentationField =  Activity.class.getDeclaredField(FIELD_mInstrumentation);
            sActivityInstrumentationField.setAccessible(true);
            return true;
        } catch (ClassNotFoundException
                | NoSuchMethodException
                | IllegalAccessException
                | InvocationTargetException
                | NoSuchFieldException e) {
            e.printStackTrace();
        }

        return false;
    }

    public static Instrumentation getInstrumentation() {
        return sInstrumentation;
    }

    public static Object getActivityThread() {
        return sActivityThread;
    }

    public static void setInstrumentation(Object activityThread, HookedInstrumentation hookedInstrumentation) {
        try {
            sActivityThreadInstrumentationField.set(activityThread, hookedInstrumentation);
            if (Constants.DEBUG) Log.e(TAG, "set hooked instrumentation");
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }
    }

    public static void setActivityInstrumentation(Activity activity, PluginManager manager) {
        try {
            sActivityInstrumentation = (Instrumentation) sActivityInstrumentationField.get(activity);
            HookedInstrumentation instrumentation = new HookedInstrumentation(sActivityInstrumentation, manager);
            sActivityInstrumentationField.set(activity, instrumentation);
            if (Constants.DEBUG) Log.e(TAG, "set activity hooked instrumentation");
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }
    }


    public static void setField(Class clazz, Object target, String field, Object object) {
        try {
            Field f = clazz.getDeclaredField(field);
            f.setAccessible(true);
            f.set(target, object);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

}

```
`PluginManager`同样负责加载插件的类和资源等：
```
public class PluginManager {
    private final static String TAG = "PluginManager";
    private static PluginManager sInstance;
    private Context mContext;
    private PluginApp mPluginApp;


    public static PluginManager getInstance(Context context) {
        if (sInstance == null && context != null) {
            sInstance = new PluginManager(context);
        }
        return sInstance;
    }

    private PluginManager(Context context) {
        mContext = context;
    }


    public void hookInstrumentation() {
        try {
            Instrumentation baseInstrumentation = ReflectUtil.getInstrumentation();

            final HookedInstrumentation instrumentation = new HookedInstrumentation(baseInstrumentation, this);

            Object activityThread = ReflectUtil.getActivityThread();
            ReflectUtil.setInstrumentation(activityThread, instrumentation);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void hookCurrentActivityInstrumentation(Activity activity) {
        ReflectUtil.setActivityInstrumentation(activity, sInstance);
    }


    public void hookToStubActivity(Intent intent) {
        if (Constants.DEBUG) Log.e(TAG, "hookToStubActivity");

        if (intent == null || intent.getComponent() == null) {
            return;
        }
        String targetPackageName = intent.getComponent().getPackageName();
        String targetClassName = intent.getComponent().getClassName();

        if (mContext != null
                && !mContext.getPackageName().equals(targetPackageName)
                && isPluginLoaded(targetPackageName)) {
            if (Constants.DEBUG) Log.e(TAG, "hook " +  targetClassName + " to " + Constants.STUB_ACTIVITY);

            intent.setClassName(Constants.STUB_PACKAGE, Constants.STUB_ACTIVITY);
            intent.putExtra(Constants.KEY_IS_PLUGIN, true);
            intent.putExtra(Constants.KEY_PACKAGE, targetPackageName);
            intent.putExtra(Constants.KEY_ACTIVITY, targetClassName);
        }
    }

    public boolean hookToPluginActivity(Intent intent) {
        if (Constants.DEBUG) Log.e(TAG, "hookToPluginActivity");
        if (intent.getBooleanExtra(Constants.KEY_IS_PLUGIN, false)) {
            String pkg = intent.getStringExtra(Constants.KEY_PACKAGE);
            String activity = intent.getStringExtra(Constants.KEY_ACTIVITY);
            if (Constants.DEBUG) Log.e(TAG, "hook " + intent.getComponent().getClassName() + " to " + activity);
            intent.setClassName(pkg, activity);
            return true;
        }
        return false;
    }

    private boolean isPluginLoaded(String packageName) {
        // TODO 检查packageNmae是否匹配
        return mPluginApp != null;
    }



    public PluginApp loadPluginApk(String apkPath) {
        String addAssetPathMethod = "addAssetPath";
        PluginApp pluginApp = null;
        try {
            AssetManager assetManager = AssetManager.class.newInstance();
            Method addAssetPath = assetManager.getClass().getMethod(addAssetPathMethod, String.class);
            addAssetPath.invoke(assetManager, apkPath);
            Resources pluginRes = new Resources(assetManager,
                    mContext.getResources().getDisplayMetrics(),
                    mContext.getResources().getConfiguration());
            pluginApp = new PluginApp(pluginRes);
            pluginApp.mClassLoader = createDexClassLoader(apkPath);
        } catch (IllegalAccessException
                | InstantiationException
                | NoSuchMethodException
                | InvocationTargetException e) {
            e.printStackTrace();
        }
        return pluginApp;
    }

    private DexClassLoader createDexClassLoader(String apkPath) {
        File dexOutputDir = mContext.getDir("dex", Context.MODE_PRIVATE);
        return new DexClassLoader(apkPath, dexOutputDir.getAbsolutePath(),
                null, mContext.getClassLoader());

    }

    public boolean loadPlugin(String apkPath) {
        File apk = new File(apkPath);
        if (!apk.exists()) {
            return false;
        }
        mPluginApp = loadPluginApk(apkPath);
        return mPluginApp != null;
    }

    public PluginApp getLoadedPluginApk() {
        return mPluginApp;
    }
}
```
在MainActivity中初始化，注意Hook的时机：
```
public class MainActivity extends Activity implements View.OnClickListener {
    // https://zhuanlan.zhihu.com/p/33017826

    public static final boolean DEBUG = true;
    public static final String TAG = "MainActivity";

    private String mPluginPackageName = "top.vimerzhao.image";
    private String mPluginClassName = "top.vimerzhao.image.MainActivity";

    //读写权限
    private static String[] PERMISSIONS_STORAGE = {Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE};
    //请求状态码
    private static int REQUEST_PERMISSION_CODE = 1;

    private PluginManager mPluginManager;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initData();
        initView();
        initPlugin();
    }


    private void initPlugin() {
        // !! must first
        ReflectUtil.init();

        mPluginManager = PluginManager.getInstance(getApplicationContext());
        mPluginManager.hookInstrumentation();
        mPluginManager.hookCurrentActivityInstrumentation(this);
    }

    private void initData() {
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.LOLLIPOP) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, PERMISSIONS_STORAGE, REQUEST_PERMISSION_CODE);
            }
        }
    }

    private void initView() {
        (findViewById(R.id.tv_launch)).setOnClickListener(this);
    }

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(newBase);
        // !!! 不要在此Hook,看源码发现mInstrumentaion会在此方法后初始化
    }

    @Override
    public void onClick(View view) {
        if (Constants.DEBUG) Log.e(TAG, "click view id: " + view.getId());
        if (view.getId() == R.id.tv_launch) {
            // TODO launch plugin app
            if (mPluginManager.loadPlugin(Constants.PLUGIN_PATH)) {
                Intent intent = new Intent();
                intent.setClassName(mPluginPackageName, mPluginClassName);
                startActivity(intent);
            }
        }

    }
}
```
现在插件Activity不会有任何限制：
```
public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

    }

    @Override
    protected void onResume() {
        super.onResume();

    }
}
```
效果和上图类似。

## Demo地址
部分源码无关核心逻辑，没有给到，目录结构也没有说明，详见Demo源码。
[PluginDemo](https://github.com/vimerzhao/PluginDemo)

## 总结
看着理论感觉似懂非懂，实战发现问题其实挺多的，尤其是Hook的时机，照搬网上的文章发现根本不可行。插件化也不是一蹴而就的，而是在已有成果的基础上一次一次的小创新积累起来的，跟着插件化发展的路径自己动手实践一遍还是能发现很多自己理解不够深刻的地方的。
以上。
## 参考
- 《Android源码设计模式解析与实战》
- [深入理解Android插件化技术](https://zhuanlan.zhihu.com/p/33017826)
