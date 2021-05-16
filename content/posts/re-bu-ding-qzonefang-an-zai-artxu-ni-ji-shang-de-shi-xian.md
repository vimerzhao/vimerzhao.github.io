---
title: "热补丁：Qzone方案在Art虚拟机上的实现"
date: 2017-07-30
type: post
isCJKLanguage: true
---

# 热补丁：Qzone方案在Art虚拟机上的实现
本文对Qzone的超级热补丁方案做了一个简单实现。

## 引子
> 当一个App发布之后，突然发现了一个严重bug需要进行紧急修复，这时候公司各方就会忙得焦头烂额：重新打包App、测试、向各个应用市场和渠道换包、提示用户升级、用户下载、覆盖安装。有时候仅仅是为了修改了一行代码，也要付出巨大的成本进行换包和重新发布。
这时候就提出一个问题：有没有办法以补丁的方式动态修复紧急Bug，不再需要重新发布App，不再需要用户重新下载，覆盖安装？

以上是QQ空间某篇技术推送的开头，也就是这篇推送之后安卓热补丁技术开始流行，腾讯系的Qzone超级热补丁、Tinker以及阿里系的Andfix以及最近推出的Sophix，性能和适用范围各不相同，并且都在已有方案的基础上取得了很大进步。
本文将着眼于Qzone的超级热补丁方案做一个简单实现。为什么选择Qzone？主要有以下几点：
1. Qzone方案没有实际开源，而Tinker有官方源码可供研究。
2. Qzone方案比较简单，易于实现。
3. Qzone方案是热补丁的开端，动手实现有利于理解其他更复杂的热补丁技术。

## 资料
本文专注于实现，理论部分可参考QQ空间技术团队的[安卓App热补丁动态修复技术介绍](https://mp.weixin.qq.com/s?__biz=MzI1MTA1MzM2Nw==&mid=400118620&idx=1&sn=b4fdd5055731290eef12ad0d17f39d4a&scene=0#wechat_redirect)，同时强烈建议读者自己去查阅Android源码，进行求证。下载一份完整Android源码并不是一件简单的事情，在此推荐一个网站[androidxref](http://androidxref.com/)可以十分方便地在线阅读源码。
此外，开源项目[Nuwa](https://github.com/jasonross/Nuwa)就是Qzone超级热补丁的完整实现，虽然作者已经不再更新，其代码也已经无法在最新版的AndroidStudio上运行通过，但仍然值得借鉴。

## 实现
### 准备补丁
我们建立一个简单的Android工程，`MainActivity.java`代码如下：
```java
public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        // >= 2.0.0 则是ART
        Log.e("MainActivity",  System.getProperty("java.vm.version"));
        ((TextView) findViewById(R.id.info)).setText(new BugClass().sayHello());
    }
}
```java

`BugClass.java`代码如下：
```java
public class BugClass {
    public String sayHello() {
        return "Before Hotfix";
    }
}
```
运行之后显示"Before Hotfix"，现在我们发现本来打算写的是"After Hotfix"，怎么办？首先，修改`BugClass.java`：
```java
public class BugClass {
    public String sayHello() {
        return "After Hotfix";
    }
}
```
传统办法是重新编译，重新安装。那么可不可以不重新安装就修复错误呢？这就是热补丁技术！
首先，重新编译项目但不要运行，在工程项目下找到生成的class文件，连同包名目录一起复制出来：
![](http://ond7j4cnz.bkt.clouddn.com/blogqzone-find-class.png)
通过如下两个命令生成补丁文件：
![](http://ond7j4cnz.bkt.clouddn.com/bloguse-dx-command.PNG)

### 加载补丁
通过`adb push`可以把补丁发送到手机，需要注意的是实际应用中热补丁文件往往是通过网络下载，具体参见文末给出的参考。
结合源码已经知道，关键是在加载原有class文件之前加载补丁，而这是一个动态过程，需要借助Java中的**反射**来实现，之前没认真研究过，这次终于知道反射的应用场合了！！
具体实现见代码，把这个指定为应用的`Application`：
```java
public class PatchApplication extends Application {
    private final static String CLASS_NAME = "PatchApplication";
    private final static String DEX_ELEMENTS = "dexElements";
    private final static String PATH_LIST = "pathList";
    @Override
    public void onCreate() {
        super.onCreate();
        // 获取补丁
        String dexPath = Environment.getExternalStorageDirectory().getAbsolutePath().concat("/patch_dex_qzone.jar");
        System.out.println(dexPath);
        File file = new File(dexPath);
        if (file.exists()) {
            inject(dexPath);
        } else {
            Log.e(CLASS_NAME, dexPath+ "不存在");
        }
    }
    private void inject(String path) {
        try {
            // 获取classes的dexElements
            Class<?> cl = Class.forName("dalvik.system.BaseDexClassLoader");
            Object pathList = getField(cl, PATH_LIST, getClassLoader());
            Object baseElements = getField(pathList.getClass(), DEX_ELEMENTS, pathList);

            // 获取patch_dex的dexElements（需要先加载dex）
            String dexopt = getDir("dexopt", 0).getAbsolutePath();
            DexClassLoader dexClassLoader = new DexClassLoader(path, dexopt, dexopt, getClassLoader());
            Object obj = getField(cl, PATH_LIST, dexClassLoader);
            Object dexElements = getField(obj.getClass(), DEX_ELEMENTS, obj);

            // 合并两个Elements
            Object combineElements = combineArray(dexElements, baseElements);

            // 将合并后的Element数组重新赋值给app的classLoader
            setField(pathList.getClass(), DEX_ELEMENTS, pathList, combineElements);

            Object object = getField(pathList.getClass(), DEX_ELEMENTS, pathList);
            int length = Array.getLength(object);
            Log.e("totalLength", "" + length);

        } catch (ClassNotFoundException | IllegalAccessException | NoSuchFieldException e) {
            e.printStackTrace();
        }
    }
    /* 通过反射获取对象的属性值 */
    private Object getField(Class<?> cl, String fieldName, Object object) throws NoSuchFieldException, IllegalAccessException {
        Field field = cl.getDeclaredField(fieldName);
        field.setAccessible(true);
        return field.get(object);
    }

    /* 通过反射设置对象的属性值 */
    private void setField(Class<?> cl, String fieldName, Object object, Object value) throws NoSuchFieldException, IllegalAccessException {
        Field field = cl.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(object, value);
    }

    /* 通过反射合并两个数组 */
    private Object combineArray(Object firstArr, Object secondArr) {
        int firstLength = Array.getLength(firstArr);
        Log.e("firstLength", firstLength + "");
        int secondLength = Array.getLength(secondArr);
        Log.e("secondLength", secondLength + "");
        int length = firstLength + secondLength;

        Class<?> componentType = firstArr.getClass().getComponentType();
        Object newArr = Array.newInstance(componentType, length);
        for (int i = 0; i < length; i++) {
            if (i < firstLength) {
                Array.set(newArr, i, Array.get(firstArr, i));
            } else {
                Array.set(newArr, i, Array.get(secondArr, i - firstLength));
            }
        }
        return newArr;
    }
}
```
最终效果（一开始是"Before Hotfix"，而在将补丁文件移动到指定位置后就会优先加载补丁文件，得到"After Hotfix"）
![](http://ond7j4cnz.bkt.clouddn.com/blogqzone-hotfix-demo.gif)
需要注意的是本代码只能运行在art虚拟上(Android5.0以上)，在dalvik虚拟机上还需要一个插桩过程。如何插桩以及为什么需要插桩可以参考下文给出的链接。
## 感悟
源码面前，了无秘密。本文的代码并不复杂，但是建立在对源码透彻的理解之上。阅读源码不会带来直接收益，但从长远看绝对会促成质的飞跃！！
## 参考
- [安卓App热补丁动态修复技术介绍](https://mp.weixin.qq.com/s?__biz=MzI1MTA1MzM2Nw==&mid=400118620&idx=1&sn=b4fdd5055731290eef12ad0d17f39d4a)
- [ Android热补丁动态修复技术（二）：实战！CLASS_ISPREVERIFIED问题！](http://blog.csdn.net/u010386612/article/details/51077291)
- [jasonross/Nuwa](https://github.com/jasonross/Nuwa)
- [Android 热补丁技术的探索与简单实战----Qzone方案](http://www.voidcn.com/blog/u012760183/article/p-6117282.html)
