---
title: "匿名内部类导致热补丁Crash"
date: 2017-08-20
type: post
isCJKLanguage: true
---

# 匿名内部类导致热补丁Crash
本文记录了匿名内部类可能导致的热补丁Crash及其原因。
## 问题描述
### 新建工程
新建一个工程，集成Andfix（设置权限、添加gradle、自定义`Application`），同时在布局文件添加两个`Button`按钮，在`MainActivity.java`为`button1`添加点击事件，代码如下:
```java
public class MainActivity extends AppCompatActivity {
    private Button button1;
    private Button button2;
    private String patchPath = Environment.getExternalStorageDirectory().getAbsolutePath().concat("/out.apatch");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        button1 = (Button) findViewById(R.id.button1);
        button2 = (Button) findViewById(R.id.button2);

        registerButton1();
        registerButton2();

    }
    private void registerButton2() { }

    private void registerButton1() {
        button1.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
                    MyApplication.getInstance().getPatchManager().addPatch(patchPath);
                } catch (IOException e) {
                    e.printStackTrace();
                }

                Toast.makeText(MainActivity.this, "button1--无--bug", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
```
注意，这里需要两个函数封装一下，以保证后面修改代码时`onCreate`始终没被标记为修改，运行效果如下:

pic  before的运行效果

### 修改代码
下面在`registerButton2`中添加上为`Button2`添加点击事件，如下:
```java
public class MainActivity extends AppCompatActivity {
    private Button button1;
    private Button button2;
    private String patchPath = Environment.getExternalStorageDirectory().getAbsolutePath().concat("/out.apatch");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        button1 = (Button) findViewById(R.id.button1);
        button2 = (Button) findViewById(R.id.button2);

        registerButton1();
        registerButton2();

    }
    private void registerButton2() {

        button2.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
                    MyApplication.getInstance().getPatchManager().addPatch(patchPath);
                } catch (IOException e) {
                    e.printStackTrace();
                }

                Toast.makeText(MainActivity.this, "button2--有--bug", Toast.LENGTH_SHORT).show();
            }
        });

    }

    private void registerButton1() {
        button1.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
                    MyApplication.getInstance().getPatchManager().addPatch(patchPath);
                } catch (IOException e) {
                    e.printStackTrace();
                }

                Toast.makeText(MainActivity.this, "button1--无--bug", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
```

### 生成补丁
利用Andfix提供的工具生成补丁:


### 真机运行
分析上图的输出信息，发现`registerButton1`也被修改了，然而并没有！！先不管这个，直接下发补丁运行:

和想象的完全不一样！为什么点击`Button1`输出了`Button2`的信息，而点击`Button2`什么都没有？重启之后甚至直接崩溃！

## 问题分析
### 匿名内部类编译规则
需要解释这个问题，还要从`javac`对匿名内部类的编译谈起。实际上，**在编译期匿名会根据在外部类中的出现顺序累加命名**。所有生成的`class`文件都在`AndroidStudio`的`/app/build/intermediates/classes/debug/`目录下，但是匿名内部类编译出的字节码并不会显示出来:

我们可以反编译一下`MainActivity`中的第一个匿名内部类:
```
 javap -v MainActivity\$1
Warning: Binary file MainActivity$1 contains vimerzhao.andfixbug.MainActivity$1
Classfile /home/zhaoyu/下载/app/build/intermediates/classes/debug/vimerzhao/andfixbug/MainActivity$1.class
  Last modified Aug 20, 2017; size 1467 bytes
  MD5 checksum 5620f0e7298b7110af86d7de734c4a4d
  Compiled from "MainActivity.java"
class vimerzhao.andfixbug.MainActivity$1 implements android.view.View$OnClickListener
  minor version: 0
  major version: 51
  flags: ACC_SUPER
Constant pool:

    ......

   #9 = String             #49            // button2--有--bug
    ......
{
  final vimerzhao.andfixbug.MainActivity this$0;
    descriptor: Lvimerzhao/andfixbug/MainActivity;
    flags: ACC_FINAL, ACC_SYNTHETIC
    ......
}
SourceFile: "MainActivity.java"
EnclosingMethod: #37.#38                // vimerzhao.andfixbug.MainActivity.registerButton2
InnerClasses:
     #13; //class vimerzhao/andfixbug/MainActivity$1
     public static #57= #15 of #55; //OnClickListener=class android/view/View$OnClickListener of class android/view/View
```

### Crash场景分析
可以发现，第一个匿名内部类实际上对应着`Button2`被点击之后的信息，这也理所应当，因为`Button2`对应的匿名内部类先出现。但是结合Andfix使用就会出现严重的问题。因为在修改代码之前，`Button1`实际对应着第一个匿名内部类，如果重新编译的话`Button1`自然会对应第二个匿名内部类，但下发热补丁的场景下，apkPatch工具只会捕捉到第一个匿名内部类（在字节码层次`MainActivity$1`也是顶级类）的方法发生了变化，所以在客户端捕捉到的修改为:
```java
@Override
public void onClick(View v) {
    try {
        MyApplication.getInstance().getPatchManager().addPatch(patchPath);
    } catch (IOException e) {
        e.printStackTrace();
    }

    Toast.makeText(MainActivity.this, "button1--无--bug", Toast.LENGTH_SHORT).show();
}
```
被修改为:
```java
@Override
public void onClick(View v) {
    try {
        MyApplication.getInstance().getPatchManager().addPatch(patchPath);
    } catch (IOException e) {
        e.printStackTrace();
    }
    Toast.makeText(MainActivity.this, "button2--有--bug", Toast.LENGTH_SHORT).show();
}
```
这也解释了下图的第一句:

pic 第一个输出

而为什么重启之后会Crash，应该是由于系统再次执行`registerButton2`是希望在`MainActivity$2`中找到`onClick`方法，但Andfix只能修复方法，所以本地根本找不到这个类！！此外，底层代码也会因此不能与正确的类对应，导致地址错乱，程序崩溃，报错日志部分截图如下:

## 问题解决
解决方法非常简单，就是**使用Andfix时，涉及增加匿名内部类的代码总挪到最后**,如下:

运行正常:


## 参考
