---
title: "自己动手写事件总线(EventBus)"
date: 2018-12-23
type: post
isCJKLanguage: true
---

# 自己动手写事件总线(EventBus)
事件总线核心逻辑的实现。

## EventBus的作用
Android中存在各种通信场景，如`Activity`之间的跳转，`Activity`与`Fragment`以及其他组件之间的交互，以及在某个耗时操作（如请求网络）之后的callback回调等，互相之之间往往需要持有对方的引用，每个场景的写法也有差异，导致耦合性较高且不便维护。以`Activity`和`Fragment`的通信为例，官方做法是实现一个接口，然后持有对方的引用，再强行转成接口类型，导致耦合度偏高。再以`Activity`的返回为例，一方需要设置`setResult`，而另一方需要在`onActivityResult`做对应处理，如果有多个返回路径，代码就会十分臃肿。而`SimpleEventBus`（本文最终实现的简化版事件总线）的写法如下：
```java
public class MainActivity extends AppCompatActivity {
    TextView mTextView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        mTextView = findViewById(R.id.tv_demo);
        mTextView.setText("MainActivity");
        mTextView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent intent = new Intent(MainActivity.this, SecondActivity.class);
                startActivity(intent);
            }
        });

        EventBus.getDefault().register(this);
    }

    @Subscribe(threadMode = ThreadMode.MAIN)
    public void onReturn(Message message) {
        mTextView.setText(message.mContent);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        EventBus.getDefault().unregister(this);
    }
}
```

来源`Activity`：
```java
public class SecondActivity extends AppCompatActivity {
    TextView mTextView;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        mTextView = findViewById(R.id.tv_demo);
        mTextView.setText("SecondActivity,点击返回");
        mTextView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Message message = new Message();
                message.mContent = "从SecondActivity返回";
                EventBus.getDefault().post(message);
                finish();
            }
        });
    }

}
```
效果如下：
![](https://github.com/vimerzhao/images/raw/master/2018-12/eventbus-demo.gif)

似乎只是换了一种写法，但在场景愈加复杂后，`EventBus`能够体现出更好的解耦能力。

## 背景知识
主要涉及三方面的知识：

1. 观察者模式(or 发布-订阅模式)
2. Android消息机制
3. Java并发编程

本文可以认为是[greenrobot/EventBus](https://github.com/greenrobot/EventBus)这个开源库的源码阅读指南，笔者在看设计模式相关书籍的时候了解到这个库，觉得有必要实现一下核心功能以加深理解。

## 实现过程
`EventBus`的使用分三个步骤：注册监听、发送事件和取消监听，相应本文也将分这三步来实现。

### 注册监听
定义一个注解：

```
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Subscribe {
    ThreadMode threadMode() default ThreadMode.POST;
}
```

`greenrobot/EventBus`还支持优先级和粘性事件，这里只支持最基本的能力：区分线程，因为如更新UI的操作必须放在主线程。`ThreadMode`如下：

```
public enum ThreadMode {
    MAIN, // 主线程
    POST, // 发送消息的线程
    ASYNC // 新开一个线程发送
}
```

在对象初始化的时候，使用`register`方法注册，该方法会解析被注册对象的所有方法，并解析声明了注解的方法（即观察者），核心代码如下：

```
public class EventBus {
    ...

    public void register(Object subscriber) {
        if (subscriber == null) {
            return;
        }
        synchronized (this) {
            subscribe(subscriber);
        }
    }

    ...
    private void subscribe(Object subscriber) {
        if (subscriber == null) {
            return;
        }

        // TODO 巨踏马难看的缩进
        Class<?> clazz = subscriber.getClass();
        while (clazz != null && !isSystemClass(clazz.getName())) {
            final Method[] methods = clazz.getDeclaredMethods();
            for (Method method : methods) {
                Subscribe annotation = method.getAnnotation(Subscribe.class);
                if (annotation != null) {
                    Class<?>[] paramClassArray = method.getParameterTypes();
                    if (paramClassArray != null && paramClassArray.length == 1) {
                        Class<?> paramType = convertType(paramClassArray[0]);
                        EventType eventType = new EventType(paramType);
                        SubscriberMethod subscriberMethod = new SubscriberMethod(method, annotation.threadMode(), paramType);
                        realSubscribe(subscriber, subscriberMethod, eventType);
                    }
                }
            }
            clazz = clazz.getSuperclass();
        }
    }

    ...
    private void realSubscribe(Object subscriber, SubscriberMethod method, EventType eventType) {
        CopyOnWriteArrayList<Subscription> subscriptions = mSubscriptionsByEventtype.get(subscriber);
        if (subscriptions == null) {
            subscriptions = new CopyOnWriteArrayList<>();
        }
        Subscription subscription = new Subscription(subscriber, method);
        if (subscriptions.contains(subscription)) {
            return;
        }
        subscriptions.add(subscription);
        mSubscriptionsByEventtype.put(eventType, subscriptions);
    }

    ...
}

```

执行过这些逻辑后，该对象所有的观察者方法都会被存在一个Map中，其Key是`EventType`，即观察事件的类型，Value是订阅了该类型事件的所有方法（即观察者）的一个列表，每个方法和对象一起封装成了一个`Subscription`类：

```
public class Subscription {
    public final Reference<Object> subscriber;
    public final SubscriberMethod subscriberMethod;

    public Subscription(Object subscriber, 
                        SubscriberMethod subscriberMethod) {
        this.subscriber = new WeakReference<>(subscriber);// EventBus3 没用弱引用?
        this.subscriberMethod = subscriberMethod;
    }

    @Override
    public int hashCode() {
        return subscriber.hashCode() + subscriberMethod.methodString.hashCode();
    }

    @Override
    public boolean equals(Object obj) {
        if (obj instanceof Subscription) {
            Subscription other = (Subscription) obj;
            return subscriber == other.subscriber
                    && subscriberMethod.equals(other.subscriberMethod);
        } else {
            return false;
        }
    }
}
```
如此，便是注册监听方法的核心逻辑了。

### 消息发送
消息的发送代码很简单：

```
public class EventBus {
    ...
    private EventDispatcher mEventDispatcher = new EventDispatcher();
    private ThreadLocal<Queue<EventType>> mThreadLocalEvents = new ThreadLocal<Queue<EventType>>() {
        @Override
        protected Queue<EventType> initialValue() {
            return new ConcurrentLinkedQueue<>();
        }
    };
    ...
    public void post(Object message) {
        if (message == null) {
            return;
        }

        mThreadLocalEvents.get().offer(new EventType(message.getClass()));
        mEventDispatcher.dispatchEvents(message);
    }

    ...
}
```

比较复杂一点的是需要根据注解声明的线程模式在对应的线程进行发布：

```
public class EventBus {

    ...
    private class EventDispatcher {
        private IEventHandler mMainEventHandler = new MainEventHandler();
        private IEventHandler mPostEventHandler = new DefaultEventHandler();
        private IEventHandler mAsyncEventHandler = new AsyncEventHandler();

        void dispatchEvents(Object message) {
            Queue<EventType> eventQueue = mThreadLocalEvents.get();
            while (eventQueue.size() > 0) {
                handleEvent(eventQueue.poll(), message);
            }
        }

        private void handleEvent(EventType eventType, Object message) {
            List<Subscription> subscriptions = mSubscriptionsByEventtype.get(eventType);
            if (subscriptions == null) {
                return;
            }
            for (Subscription subscription : subscriptions) {
                IEventHandler eventHandler =  getEventHandler(subscription.subscriberMethod.threadMode);
                eventHandler.handleEvent(subscription, message);
            }
        }

        private IEventHandler getEventHandler(ThreadMode mode) {
            if (mode == ThreadMode.ASYNC) {
                return mAsyncEventHandler;
            }
            if (mode == ThreadMode.POST) {
                return mPostEventHandler;
            }
            return mMainEventHandler;
        }
    }// end of the class

    ...
}
```

三种线程模式分别如下，`DefaultEventHandler`（在发布线程执行观察者放方法）：

```
public class DefaultEventHandler implements IEventHandler {
    @Override
    public void handleEvent(Subscription subscription, Object message) {
        if (subscription == null || subscription.subscriber.get() == null) {
            return;
        }
        try {
            subscription.subscriberMethod.method.invoke(subscription.subscriber.get(), message);
        } catch (IllegalAccessException | InvocationTargetException e) {
            e.printStackTrace();
        }
    }
}
```

`MainEventHandler`（在主线程执行）：

```
public class MainEventHandler implements IEventHandler {
    private Handler mMainHandler = new Handler(Looper.getMainLooper());
    DefaultEventHandler hanlder = new DefaultEventHandler();

    @Override
    public void handleEvent(final Subscription subscription, final Object message) {
        mMainHandler.post(new Runnable() {
            @Override
            public void run() {
                hanlder.handleEvent(subscription, message);
            }
        });

    }
}
```

`AsyncEventHandler`（新开一个线程执行）：

```
public class AsyncEventHandler implements IEventHandler {
    private DispatcherThread mDispatcherThread;
    private IEventHandler mEventHandler = new DefaultEventHandler();

    public AsyncEventHandler() {
        mDispatcherThread = new DispatcherThread(AsyncEventHandler.class.getSimpleName());
        mDispatcherThread.start();
    }

    @Override
    public void handleEvent(final Subscription subscription, final Object message) {
        mDispatcherThread.post(new Runnable() {
            @Override
            public void run() {
                mEventHandler.handleEvent(subscription, message);
            }
        });

    }

    private class DispatcherThread extends HandlerThread {

        // 关联了AsyncExecutor消息队列的Handler
        Handler mAsyncHandler;

        DispatcherThread(String name) {
            super(name);
        }

        public void post(Runnable runnable) {
            if (mAsyncHandler == null) {
                throw new NullPointerException("mAsyncHandler == null, please call start() first.");
            }
            mAsyncHandler.post(runnable);
        }

        @Override
        public synchronized void start() {
            super.start();
            mAsyncHandler = new Handler(this.getLooper());
        }

    }

}
```

以上便是发布消息的代码。

### 注销监听
最后一个对象被销毁还要注销监听，否则容易导致内存泄露，目前`SimpleEventBus`用的是`WeakReference`，能够通过GC自动回收，但不知道`greenrobot/EventBus`为什么没这样实现，待研究。注销监听其实就是遍历Map，拿掉该对象的订阅即可：
```
public class EventBus {

    ...
    public void unregister(Object subscriber) {
        if (subscriber == null) {
            return;
        }
        Iterator<CopyOnWriteArrayList<Subscription>> iterator = mSubscriptionsByEventtype.values().iterator();
        while (iterator.hasNext()) {
            CopyOnWriteArrayList<Subscription> subscriptions = iterator.next();
            if (subscriptions != null) {
                List<Subscription> foundSubscriptions = new LinkedList<>();
                for (Subscription subscription : subscriptions) {
                    Object cacheObject = subscription.subscriber.get();
                    if (cacheObject == null || cacheObject.equals(subscriber)) {
                        foundSubscriptions.add(subscription);
                    }
                }
                subscriptions.removeAll(foundSubscriptions);
            }
            // 如果针对某个Event的订阅者数量为空了,那么需要从map中清除
            if (subscriptions == null || subscriptions.size() == 0) {
                iterator.remove();
            }
        }
    }
    ...
}
```

以上便是事件总线最核心部分的代码实现，完整代码见[vimerzhao/SimpleEventBus](https://github.com/vimerzhao/SimpleEventBus)，后面发现问题更新或者进行升级也只会改动仓库的代码。

## 局限性
由于时间关系，目前只研究了`EventBus`的核心部分，还有几个值得深入研究的点，在此记录一下，也欢迎路过的大牛指点一二。

### 性能问题
实际使用时，注解和反射会导致性能问题，但`EventBus3`已经通过`Subscriber Index`基本解决了这一问题，实现也非常有意思，是通过注解处理器（`Annotation Processor`）把耗时的逻辑从运行期提前到了编译期，通过编译期生成的索引来给运行期提速，这也是这个名字的由来。

### 可用性问题
如果订阅者很多会不会影响体验，毕竟原始的方法是点对点的消息传递，不会有这种问题，如果部分订阅者尚未初始化怎么办。等等。目前`EventBus3`提供了优先级和粘性事件的属性来进一步满足开发需求。但是否彻底解决问题了还有待验证。

### 跨进程问题
`EventBus`是进程内的消息管理机制，并且从开源社区的反馈来看这个项目是非常成功的，但稍微有点体量的APP都做了进程拆分，所以是否有必要支持多进程，能否在保证性能的情况下提供同等的代码解耦能力，也值得继续挖掘。目前有[lsxiao/Apollo](https://github.com/lsxiao/Apollo)和[Xiaofei-it/HermesEventBus](https://github.com/Xiaofei-it/HermesEventBus)等可供参考。


## 参考
- [greenrobot/EventBus](https://github.com/greenrobot/EventBus)
- [hehonghui/AndroidEventBus](https://github.com/hehonghui/AndroidEventBus)
- 《Android开发艺术探索》第十章
