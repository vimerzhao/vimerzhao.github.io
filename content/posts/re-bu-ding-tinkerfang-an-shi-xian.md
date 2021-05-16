---
title: "热补丁：Tinker方案实现"
date: 2017-08-03
type: post
isCJKLanguage: true
---

# 热补丁：Tinker方案实现
本文简单分析了Tinker的实现原理并对dex文件更新做了演示Demo。
## Qzone方案与Tinker
在之前的博客里简单介绍了Qzone超级热补丁的原理与实现，本文介绍了腾讯系最著名的热补丁方案Tinker。关于Tinker的特点以及其与Qzone方案的差别，参见文末链接。
本文演示的Demo包含五个类：
![](http://ond7j4cnz.bkt.clouddn.com/blogtinker-class.PNG)
其中，修改`BugClass.java`以生成补丁文件。修改前
```java
package vimerzhao.tinker;

public class BugClass {
    public String sayHello() {
        return "Before Hotfix";
    }
}
```
修改后
```java
package vimerzhao.tinker;

public class BugClass {
    public String sayHello() {
        return "After Hotfix";
    }
}
```

生成补丁，并发送至手机
![](http://ond7j4cnz.bkt.clouddn.com/blogtinker-patch.PNG)

## Bsdiff/Bspatch算法
Tinker一大特点就是在dex文件合成的时候采用了微信的自研算法，能以更高的效率和更适合dex文件格式的算法完成补丁生成。本文主要用于演示、实践Tinker的原理，所以采用Bsdiff/Bspatch算法，其实Tinker早期的Demo也是用的这个算法，后期优化时才使用了自研的算法。
正常来说，我们需要在后台生存patch文件，发送到手机进行合成，即服务器端执行Bsdiff算法，移动端执行Bspatch算法，各个平台上的可执行文件很容易找到，这里不提供资源。
如何在移动端合成？需要在源代码中引入实现了Bspatch算法的文件，如下：
![](http://ond7j4cnz.bkt.clouddn.com/blogtinker-cpp.PNG)
其中，`bzip2`是为`bspatch.c`提供支持，如何在AS中引入C/C++代码参见官方文档。
最后写一个调用此算法的Java类：
```java
package vimerzhao.tinker;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;

public class BsPatch {
    /**
     * 获取已安装Apk文件的源Apk文件
     * @param context
     * @param packageName
     * @return
     */
    public static String getSourceApkPath(Context context, String packageName) {
        try {
            ApplicationInfo info = context.getPackageManager().getApplicationInfo(packageName, 0);
            return info.sourceDir;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
        return null;
    }

    static {
        System.loadLibrary("bspatch");
    }
    public static native void startPatch(String oldfile,String newfile ,String patchfile);
}
```

## 提取dex文件
通过前面的代码，已经生成了新的zip文件（其实就是apk文件），现在需要提取其中的dex文件。其实就是解压缩一个zip文件，这里直接用Java提供的工具类：
```java
package vimerzhao.tinker;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;

public class ZipUtil {
    public static void unzip(String path, String fileName, String dirName) throws IOException {
        File file = new File(path +  fileName);
        ZipFile zipFile = new ZipFile(file);
        ZipInputStream zipInputStream = new ZipInputStream(new FileInputStream(file));
        ZipEntry zipEntry;
        while ((zipEntry = zipInputStream.getNextEntry()) != null) {
            String newFileName = zipEntry.getName();
            File temp = new File(path + dirName + "/" + newFileName);
            if (! temp.getParentFile().exists())
                temp.getParentFile().mkdirs();
            BufferedOutputStream os = new BufferedOutputStream(new FileOutputStream(temp));//文件缓冲区
            InputStream is = zipFile.getInputStream(zipEntry);
            byte[] datas = new byte[2048];
            int len;
            while ((len = is.read(datas)) != -1) {
                os.write(datas,0,len);
            }
            os.close();
            is.close();
        }
        zipInputStream.close();
    }
}
```


## 反射注入补丁
注入补丁和Qzone的方案很像，都是利用反射，但这里需要做的是全量替换，本Demo中只有一个`classes.dex`文件，如果后面有`classes2.dex`...的话应该全部替换，而不是像Qzone方案一样插入，这样可以避免在dalvik虚拟机上需要进行插桩的问题，代码和之前Qzone的注入类似：
```java
package vimerzhao.tinker;

import android.app.Application;
import android.os.Environment;
import android.util.Log;

import java.io.File;
import java.lang.reflect.Field;

import dalvik.system.DexClassLoader;


public class TinkerApplication extends Application {
    private final static String CLASS_NAME = "TinkerApplication";
    private final static String DEX_ELEMENTS = "dexElements";
    private final static String PATH_LIST = "pathList";

    @Override
    public void onCreate() {
        super.onCreate();
        String dexPath = Environment.getExternalStorageDirectory().getAbsolutePath().concat("/"+MainActivity.UNZIP_PATH+"/");
        dexPath = dexPath + "classes.dex";
        File file = new File(dexPath);
        if (file.exists()) {
            inject(dexPath);
        } else {
            Log.e(CLASS_NAME, dexPath + "don't exist!");
        }
    }

    private void inject(String dexPath) {
        try {
            // 获取classes的dexElements
            Class<?> cl = Class.forName("dalvik.system.BaseDexClassLoader");
            Object pathList = getField(cl, PATH_LIST, getClassLoader());

            // 获取patch_dex的dexElements（需要先加载dex）
            String dexopt = getDir("dexopt", 0).getAbsolutePath();
            DexClassLoader dexClassLoader = new DexClassLoader(dexPath, dexopt, dexopt, getClassLoader());
            Object obj = getField(cl, PATH_LIST, dexClassLoader);
            Object dexElements = getField(obj.getClass(), DEX_ELEMENTS, obj);

            setField(pathList.getClass(), DEX_ELEMENTS, pathList, dexElements);

        } catch (ClassNotFoundException | NoSuchFieldException | IllegalAccessException e) {
            e.printStackTrace();
        }
    }
    private Object getField(Class<?> cl, String fieldName, Object object) throws NoSuchFieldException, IllegalAccessException {
        Field field = cl.getDeclaredField(fieldName);
        field.setAccessible(true);
        return field.get(object);
    }

    private void setField(Class<?> cl, String fieldName, Object object, Object value) throws NoSuchFieldException, IllegalAccessException {
        Field field = cl.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(object, value);
    }
}
```
## 补丁效果
在启动时进行合成（注意，这里没有做检查，实际应该检查是否有patch文件）。在`MainActivity.java`中设置一个生成补丁的线程：
```java
package vimerzhao.tinker;

import android.os.Environment;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;

public class MainActivity extends AppCompatActivity {
    public static final String NEW_APK_NAME = "bugfix.zip";
    public static final String PACKAGE_NAME = "vimerzhao.tinker";
    public static final String PATCH_NAME = "update.patch";
    public static final String UNZIP_PATH = "tinker-test";
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        TextView tv = (TextView) findViewById(R.id.sample_text);
        tv.setText(new BugClass().sayHello());
        tv.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                new Thread(){
                    @Override
                    public void run() {
                        super.run();
                        String oldfile = BsPatch.getSourceApkPath(MainActivity.this, PACKAGE_NAME);
                        String newfile = Environment.getExternalStorageDirectory().getAbsolutePath().concat("/" + NEW_APK_NAME);
                        String pathfile = Environment.getExternalStorageDirectory().getAbsolutePath().concat("/" + PATCH_NAME);
                        BsPatch.startPatch(oldfile, newfile, pathfile);
                        try {
                            String path = Environment.getExternalStorageDirectory().getAbsolutePath().concat("/");
                            ZipUtil.unzip(path, NEW_APK_NAME, UNZIP_PATH);
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }
                }.start();
                Toast.makeText(MainActivity.this, "热更新中...", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
```

效果（注意`Before Hotfix`和`After Hotfix`）：
![](http://ond7j4cnz.bkt.clouddn.com/blogtinker-demo.gif)
## 增量更新
在使用Bsdiff/Bspatch算法后，我们就可以生成新的Apk文件了（把代码中文件名的后缀改一下即可），在添加一段安装Apk的代码，即可实现所谓的增量更新，即只需要发布一个较小的patch文件，在移动端合成然后Apk文件进行安装，可以大大减少用户更新时需要消耗的下载流量，用户只会关心更新消耗了多少流量而不会关心是下载patch文件合成Apk还是直接下载新的安装包，所以通过前一种方式可以提高用户体验。

## 其他
本文只是做了一个简单的演示Demo，实际情景下应用通过后台分发patch文件，进行合成、更新时也应该做诸多安全性的检查，具体可以参考Tinker源码。

## 参考
- [Binary diff/patch utility](http://www.daemonology.net/bsdiff/)
- [Tencent/tinker](https://github.com/Tencent/tinker)
- [微信热修复框架 Tinker 的源码分析 -- 上](https://juejin.im/entry/57eb3ec60bd1d0005b1e32ca)
- [【Dev Club 分享第六期】微信热补丁 Tinker 的实践演进之路](https://dev.qq.com/topic/57ad7a70eaed47bb2699e68e)
- [微信Android热补丁实践演进之路](https://mp.weixin.qq.com/s?__biz=MzAwNDY1ODY2OQ==&mid=2649286306&idx=1&sn=d6b2865e033a99de60b2d4314c6e0a25&scene=1&srcid=0811AOttpqUnh1Wu5PYcXbnZ#rd)
- [Android热修复技术选型——三大流派解析](https://mp.weixin.qq.com/s/uY5N_PSny7_CHOgUA99UjA?spm=a3c0d.7629140.0.0.4XnKJk)
