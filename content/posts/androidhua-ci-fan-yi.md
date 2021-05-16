---
title: "Android划词翻译"
date: 2017-10-10
type: post
isCJKLanguage: true
---

# Android划词翻译
通过复制实现单词查找，更加节省时间。

## 问题背景
个人经常用BCC News这个APP看新闻，但是遇到陌生词汇时总需要在APP内复制单词，再到另外一个词典应用内查找，如下：
![](http://ond7j4cnz.bkt.clouddn.com/blogtranslator-demo-1.gif)

十分不方便。
在试用过金山词霸、微软必应以及有道翻译之后，发现有道翻译提供了跨软件査词，正是我想要的功能：
![](http://ond7j4cnz.bkt.clouddn.com/blogtranslator-demo-2.gif)

但是问题又来了，我需要的只是这个一个简单的功能，但为了用这个功能，我需要安装整个有道词典，并分出很多资源让其在后台运行。如下：
![](http://ond7j4cnz.bkt.clouddn.com/blogtranslator-demo-5.jpg)

占用了整整258M内存，这主要是因为有道词典本身就是一个庞大的APP，包含了众多功能。
作为一个追求效率的程序员，自然不能忍受一个功能带来如此多的资源消耗；作为一个爱偷懒的程序员，自然不能忍受每次切换APP的麻烦，因此，最好的办法就是将这个复制査词的功能独立出来。

## 关键技术
当有了一个想法之后，不要急于动手，先评估一下可行性。首先，必须要要监听到用户复制了单词，通过查阅文档，发现系统已经提供了相关的API；其次，获取到用户复制的内容之后需要用代码进行查找，并返回结果，这一部分可以在网上找到免费的API。

### 监听剪贴板
监听剪贴板本来是很简单的事情，系统提供了`ClipboardManager`这个类，通过其`addPrimaryClipChangedListener`方法可以添加监听事件。可是实际测试发现，在某些APP复制时这个监听事件会被触发一次，有些APP内复制会触发两次，而BBC News内复制则会触发三次，在监听代码中加入`System.out.println(System.currentTimeMillis());`能找到如下输出：
```
...
10-10 16:30:17.494 12915-12915/com.vimerzhao.javatest I/System.out: 1507624217494
10-10 16:30:17.498 12915-12915/com.vimerzhao.javatest I/System.out: 1507624217498
10-10 16:30:17.500 12915-12915/com.vimerzhao.javatest I/System.out: 1507624217500
...
```
暂时的解决办法是在监听事件中使用如下代码：
```
....
    mHandler.removeCallbacks(runnable);
    mHandler.postDelayed(runnable, 200);
....
```
因为连续触发时间隔很短，这样就可以保证无论触发几次，只执行其中的最后一次。

### 翻译API
一开始使用的是有道智云API，但发现这个API有几个问题：

1. 接入复杂，需要添加Jar包，So依赖，这会使得APP相对更庞大，不便于维护
2. 虽然提供了Android SDK，但是后台（自动缓存、生成目录等）做的事情我无法知道
3. 收费

基于以上几个原因，我最后选择了金山词霸的API，在浏览器输入：
```
http://dict-co.iciba.com/api/dictionary.php?w=要查的词&key=密钥
```

就可以使用，在Android上无非就是封装一个GET请求，几十行代码即可以实现，便于维护。

## 代码实现
代码量也不是很大，主界面判断服务是否开启，并提供一个控制按钮：
```java
public class MainActivity extends AppCompatActivity {
    private Button translator;
    private static String SERVICE_NAME = "com.vimerzhao.translator.QueryService";
    private static boolean isServiceWork;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        translator = findViewById(R.id.btn_translator);
        isServiceWork = isServiceWork(this, SERVICE_NAME);
        if (isServiceWork) {
            translator.setText("关闭划词翻译");
        } else {
            translator.setText("开启划词翻译");
        }

        translator.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(MainActivity.this, QueryService.class);
                if (!isServiceWork) {
                    translator.setText("划词翻译已开启");
                    startService(intent);
                    isServiceWork = true;
                }
            }
        });
    }
    public boolean isServiceWork(Context mContext, String serviceName) {
        boolean isWork = false;
        ActivityManager myAM = (ActivityManager) mContext
                .getSystemService(Context.ACTIVITY_SERVICE);
        List<ActivityManager.RunningServiceInfo> myList = myAM.getRunningServices(Integer.MAX_VALUE);
        if (myList.size() <= 0) {
            return false;
        }
        for (int i = 0; i < myList.size(); i++) {
            String mName = myList.get(i).service.getClassName().toString();
            if (mName.equals(serviceName)) {
                isWork = true;
                break;
            }
        }
        return isWork;
    }
}
```


开启一个后台服务，用于查找：
```java
public class QueryService extends Service {
    private static Handler mHandler = new Handler();
    private static ClipboardManager cm =(ClipboardManager) MyApplication.getApplication().
            getSystemService(Context.CLIPBOARD_SERVICE);

    @Override
    public void onCreate() {
        super.onCreate();


        //获取剪贴板管理服务
        cm.addPrimaryClipChangedListener(new ClipboardManager.OnPrimaryClipChangedListener() {
            @Override
            public void onPrimaryClipChanged() {
                mHandler.removeCallbacks(runnable);
                mHandler.postDelayed(runnable, 200);
            }
        });
    }

    Runnable runnable = new Runnable() {
        @Override
        public void run() {

            if (cm.hasPrimaryClip()) {
                String input = cm.getPrimaryClip().getItemAt(0).getText().toString();
                System.out.println(cm.getPrimaryClip().toString());
                System.out.println(input);
                // 考虑到API能力有限，这里消去大小写和空格
                QueryUtils.query(input.toLowerCase().trim());
            }
        }
    };

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
```

最后通过一个封装的类发送要查找的词并解析返回的JSON数据：
```java
public class QueryUtils {
    private static final String API_URL = "http://dict-co.iciba.com/api/dictionary.php?w=";
    private static final String API_KEY = "&type=json&key=你的密钥";
    private static final int TOAST_FLAG = 1;
    private static Handler mHandler = new Handler(new Handler.Callback() {
        @Override
        public boolean handleMessage(Message msg) {
            switch (msg.what) {
                case TOAST_FLAG:
                    if (msg.obj != null) {
                    Toast.makeText(MyApplication.getApplication(), msg.obj.toString(), Toast.LENGTH_LONG).show();

                    } else {
                    Toast.makeText(MyApplication.getApplication(), "无内容",Toast.LENGTH_LONG).show();
                    }
                    break;
                default:
                    break;
            }
            return false;
        }
    });

    public static void query(final String input) {
        new Thread() {
            @Override
            public void run() {
                super.run();
                Message msg = new Message();
                msg.what = 1;
                msg.obj = getTranslation(API_URL + input + API_KEY);
                mHandler.sendMessage(msg);
            }
        }.start();

    }

    public static String getTranslation(String url) {
        BufferedReader in = null;
        try {
            URL realUrl = new URL(url);
            URLConnection connection = realUrl.openConnection();
            connection.setRequestProperty("accept", "*/*");
            connection.setRequestProperty("connection", "Keep-Alive");
            connection.setRequestProperty("user-agent", "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1;SV1)");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            // 建立实际的连接
            connection.connect();
            // 定义 BufferedReader输入流来读取URL的响应
            in = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuffer sb = new StringBuffer();
            String line;
            while ((line = in.readLine()) != null) {
                sb.append(line);
            }

            return analyze(sb.toString());
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            try {
                if (in != null) {
                    in.close();
                }
            } catch (Exception e2) {
                e2.printStackTrace();
            }
        }
        return null;
    }
    private static String analyze(String in) {
        StringBuilder res = new StringBuilder();
        try {
            JSONObject response= new JSONObject(in);
            JSONArray symbols = response.getJSONArray("symbols");
            if (symbols == null) return null;
            for (int k = 0; k < symbols.length(); ++k) {
                JSONArray parts =  symbols.getJSONObject(k).getJSONArray("parts");
                for (int i = 0; i < parts.length(); ++i) {
                    JSONObject part = parts.getJSONObject(i);
                    res.append(part.getString("part"));
                    res.append(part.getString("means"));
                    if (i < parts.length()-1) res.append("\n");
                }
            }
            return res.toString();
        } catch (JSONException e) {
            e.printStackTrace();
        }
        return null;
    }
}

```
其他：自定一个Application并开启网络权限即可。

## 效果演示
![](http://ond7j4cnz.bkt.clouddn.com/blogtranslator-demo-3.gif)

占用内存仅为17M（这还是未优化），远低于有道词典：
![](http://ond7j4cnz.bkt.clouddn.com/blogtranslator-demo-4.jpg)


## 后续工作
虽然功能勉强实现，但是开发过程中也发现了很多问题，作为一名准Android开发，感觉自己还有许多事情要做。

### Android剪贴板机制
这一次被剪贴板奇怪的多次响应浪费了不少时间，有必要深究下此部分代码，发现问题所在，避免以后再次踩坑。

### 更灵活的API
目前的API比较简陋，不能查找“The White House”这样带大写、空格但又确实十分常见的词，由于墙的原因基本没考虑google翻译，有道智云收费也不会考虑，有时间也可以留意一下是否有更好的翻译API。

### 线程及其他知识
目前是每次查找开启一个线程，查找完成自动销毁。开启并维持一个线程是否更好？写线程相关代码的时候，包括异步更新UI等，感觉对Android的线程机制还是一知半解，今后也要从源码深度好好学习Android的线程机制。

### 后台服务
理想情况时我关掉APP之后，这个翻译Service仍然在运行，但实际测试发现只有在Nexus4上可以，在魅蓝Note2和小米6都失败了，说明厂商修改了ROM，要实现此功能还需进一步研究。

## 参考
- [Android 剪贴板监听注册一次 onPrimaryClipChanged调用两次浅析](http://www.jianshu.com/p/ed4637bfeb05)
- [金山词霸开放平台-api](http://open.iciba.com/?c=api)
