---
title: "'android:excludeFromRecents踩坑指南'"
date: 2018-12-30
type: post
isCJKLanguage: true
categories:
    - "Bug解决记录"
---

# 'android:excludeFromRecents踩坑指南'
工作中遇到的一个小问题，记录一下。
## 现象
从Activity `A`跳转到`B`，`B`的`launchMode`设置为`singleInstance`，并通过`excludeFromRecents`属性保证`B`不出现在最近任务列表中。`MainActivity`：
```
public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        TextView textView = findViewById(R.id.text);
        textView.setText(MainActivity.class.getSimpleName());
        textView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent intent = new Intent(MainActivity.this, SecondActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);
                startActivity(intent);
            }
        });
    }
```

`SecondActivity`：
```
public class SecondActivity extends Activity {

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        TextView textView = findViewById(R.id.text);
        textView.setText(SecondActivity.class.getSimpleName());
    }
}
```

`AndroidManifest.xml`：
```
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="top.vimerzhao.recenttasks">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />

                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <activity android:name=".SecondActivity"
            android:taskAffinity=".SecondActivity"
            android:excludeFromRecents="true"
            android:launchMode="singleInstance"/>
    </application>

</manifest>
```

结果如下：
![](https://github.com/vimerzhao/images/raw/master/2018-12/recents-task-demo.gif)

可以看到：
1. 跳转到`B`后，Call起多任务显示两个Task，不符合预期
2. 返回主界面后，Call起多任务显示一个Task，符合预期

## 分析
查阅官方文档，属性解释如下：
>android:excludeFromRecents
Whether or not the task initiated by this activity should be excluded from the list of recently used applications, the overview screen. That is, when this activity is the root activity of a new task, this attribute determines whether the task should not appear in the list of recent apps. Set "true" if the task should be excluded from the list; set "false" if it should be included. The default value is "false".

中文版本如下：
>android:excludeFromRecents
是否应将该 Activity 启动的任务排除在最近使用的应用列表（即概览屏幕）之外。 也就是说，当该 Activity 是新任务的根 Activity 时，此属性确定任务是否应出现在最近使用的应用列表中。 如果应将任务排除在列表之外，请设置“true”；如果应将其包括在内，则设置“false”。 默认值为“false”。

按照这个解释，`现象1`还是说不通。继续检索，发现StackOverflow上有一个类似问题[Exclude current activity from Recent Tasks](https://stackoverflow.com/questions/20516832/exclude-current-activity-from-recent-tasks)，其中`Ricardo Lage`解释如下：
> I just tested on my app and the same thing happens. If I press the "recent tasks" button while having my activity in the foreground, it appears listed there. The moment I move out of it to another activity or to my phone's main screen, the activity is not listed anymore.
I also tested this on the built-in DeskClock app that comes with recent Android versions and the same behavior is present there when a new alarm is triggered. Note that the AlarmAlertFullscreen activity of that app has the same parameters you mentioned in your question.


也就是说，即使设置了`excludeFromRecents`属性，如果该Task在前台还是会显示在最近任务中，想想这样设计也是合理的，如果某个设置了该属性的`Activity`正在前台，此时Call多任务如果不显示该`Activity`那么用户怎么返回，所以说这个设计还是很合理的。**如果确实如此，只能说明官方文档在此处表述存在纰漏了。**
接下来从源码层面证实这个猜测。一开始我是从`RecentsActivity`入手，逐步分析，但是Android源码过于复杂，一直没找到重点，后面转变思路，直接搜索`FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS`属性，虽然总共有36个结果，但是通过命名很快定位到`./frameworks/base/packages/SystemUI/src/com/android/systemui/recents/`目录下的可疑类，最终定位到`SystemServicesProxy.java`的218行：
```
...
/** Returns a list of the recents tasks */
public List<ActivityManager.RecentTaskInfo> getRecentTasks(int numLatestTasks, int userId,
        boolean isTopTaskHome) {
    if (mAm == null) return null;

    ...

    Iterator<ActivityManager.RecentTaskInfo> iter = tasks.iterator();
    while (iter.hasNext()) {
        ActivityManager.RecentTaskInfo t = iter.next();

        // NOTE: The order of these checks happens in the expected order of the traversal of the
        // tasks

        // Check the first non-recents task, include this task even if it is marked as excluded
        // from recents if we are currently in the app.  In other words, only remove excluded
        // tasks if it is not the first active task.
        boolean isExcluded = (t.baseIntent.getFlags() & Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS)
                == Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS;
        if (isExcluded && (isTopTaskHome || !isFirstValidTask)) {
            iter.remove();
            continue;
        }
        isFirstValidTask = false;
    }

    return tasks.subList(0, Math.min(tasks.size(), numLatestTasks));
}
...
```

结合注释和代码可知前面的猜测是正确的的。

## 参考
- [Exclude current activity from Recent Tasks](https://stackoverflow.com/questions/20516832/exclude-current-activity-from-recent-tasks)
- [Recents Screen  |  Android Developers](https://developer.android.com/guide/components/activities/recents#java)
