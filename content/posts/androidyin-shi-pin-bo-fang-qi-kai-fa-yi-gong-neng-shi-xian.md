---
title: "Android音视频播放器开发（一）：功能实现"
date: 2017-10-16
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# Android音视频播放器开发（一）：功能实现
本文主要介绍了一个简单的Android音视频播放器的功能模块实现。
## 概述
本文主要介绍开发一个Android音视频播放器的功能实现，包括4个模块：音乐列表，视频列表，音乐播放，视频播放。其中列表共用布局，所以其实是4个问题：
- 如何获取音视频列表？
- 如何显示列表？
- 如何播放音乐？
- 如何播放视频？

当然了，还有很多细节问题，比如实现上一曲、下一曲，列表循化、单曲循环，播放、暂停等，但都是细枝末节，下文都会提到。

## 获取本地音视频
获取音视频列表有两种思路：
- 递归遍历文件夹，获取目标文件
- 读取系统数据库

这里我采用了第二种，需要注意的是如果遍历所有目录，最好在一个子线程执行，否则可能出现ANR。以下相关代码：
```java
public class MusicUtils {
    public static List<MusicBean> scan(Context context) {
        List<MusicBean> musicList = new ArrayList<>();
        Cursor cursor = context.getContentResolver().query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                null, null, null, MediaStore.Audio.AudioColumns.IS_MUSIC);
        if (cursor != null) {
            while (cursor.moveToNext()) {
                MusicBean musicBean = new MusicBean();
                musicBean.setName(cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)));
                musicBean.setSinger(cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)));
                musicBean.setPath(cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)));
                musicBean.setDuration(cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)));
                musicBean.setSize(cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)));
                musicList.add(musicBean);
            }
        }
        cursor.close();
        return musicList;
    }
}
```
视频列表的读取基本相同：
```java
public class VideoUtils {
    public static List<VideoBean> scan(Context context) {
        List<VideoBean> videoList = new ArrayList<>();
        Cursor cursor = context.getContentResolver().query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                null, null, null, null);
        if (cursor != null) {
            while (cursor.moveToNext()) {
                VideoBean videoBean = new VideoBean();
                videoBean.setName(cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DISPLAY_NAME)));
                videoBean.setPath(cursor.getString(cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DATA)));
                videoBean.setDuration(cursor.getInt(cursor.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION)));
                videoBean.setSize(cursor.getLong(cursor.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE)));
                videoList.add(videoBean);
            }
        }
        cursor.close();
        return videoList;
    }
}
```
这里的`MusicBean`和`VideoBean`都是表示单个音乐/视频文件信息的类，如下（`get`和`set`方法省略）：
```java
public class MusicBean implements Parcelable {
    private String name;
    private String singer;
    private String path;
    private int duration;
    private long size;
}
```
 
```java
public class VideoBean implements Parcelable {
    String name;
    String path;
    int duration;
    long size;
}
```
可以看到这里实现了一个`Parcelable`接口，主要是用来通过`Intent`在不同对象之间传递。显示文件列表的界面不关心数据是数据库得到的还是遍历目录得到的，他只需要一个`List`集合就可以，同时这个`List`集合需要传递给播放音乐的那个界面（这里以音乐为例，视频同理）。而为了传递这个`List`就需要实现`Parcelable`接口，具体实现代码省略了，可以参考后文给出的源码。

## 显示文件列表
显示原理相同，这里以音乐列表界面为例讲解。为了显示一个列表可以用`ListView`也可以用`RecyclerView`，这里以`RecyclerView`为例（其实用`ListView`更简单）。
需要注意的是点击某一项应调转到对应的音乐播放的界面，所以需要添加监听事件，`RecyclerView`添加监听事件比`ListView`稍复杂。在XML中添加一个`RecyclerView`：
```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent">
    <android.support.v7.widget.RecyclerView
        android:id="@+id/rv_music_list"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_centerInParent="true"
        android:visibility="invisible"/>

    <Button
        android:id="@+id/btn_scan_music"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_centerInParent="true"
        android:text="扫描本地音乐"
        android:layout_margin="40dp"/>
</RelativeLayout>
```
对应的`Fragment`代码为（添加了一些注释）：
```java
public class MusicListFragment extends Fragment {
    private RecyclerView mMusicListView;
    private List<MusicBean> mMusicList;
    private MusicAdapter mAdapter;
    private Button mScanMusicButton;
    public static final String CUR_MUSIC = "CurrentMusic";
    public static final String MUSIC_LIST= "MusicList";
    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View rootView = inflater.inflate(R.layout.fragment_music_list, container, false);
        mMusicListView = rootView.findViewById(R.id.rv_music_list);
        LinearLayoutManager manager = new LinearLayoutManager(getActivity());
        manager.setOrientation(OrientationHelper.VERTICAL);
        mMusicListView.setLayoutManager(manager);
        mMusicListView.setItemAnimator(new DefaultItemAnimator());
        mScanMusicButton = rootView.findViewById(R.id.btn_scan_music);
        mScanMusicButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // 获取音乐列表
                mMusicList = MusicUtils.scan(getActivity());
                // 设置列表对应的适配器
                mAdapter = new MusicAdapter(mMusicList, getActivity());
                mMusicListView.setAdapter(mAdapter);
                mScanMusicButton.setVisibility(View.GONE);
                mMusicListView.setVisibility(View.VISIBLE);

                mAdapter.setListener(new MusicAdapter.OnItemClickListener() {
                    @Override
                    public void onItemClick(View view, int position) {
                        Bundle bundle = new Bundle();
                        bundle.putParcelableArrayList(MUSIC_LIST, (ArrayList<? extends Parcelable>) mMusicList);
                        bundle.putInt(CUR_MUSIC, position);
                        Intent intent = new Intent(getActivity(), MusicPlayActivity.class);
                        intent.putExtras(bundle);
                        startActivity(intent);
                    }
                });
            }
        });

        return rootView;
    }
}
```
比较难理解是`setAdapter`这个方法，Android里面的列表都是使用了适配器模式，具体可自行查阅。以下是`MusicAdapter`的代码：
```java
public class MusicAdapter extends RecyclerView.Adapter<MusicAdapter.MusicItemHolder> implements View.OnClickListener {
    private List<MusicBean> musicList;
    private Context context;
    private OnItemClickListener listener;
    private LayoutInflater layoutInflater;

    public MusicAdapter(List<MusicBean> musicList, Context context) {
        this.musicList = musicList;
        this.context = context;
        layoutInflater = LayoutInflater.from(context);
    }

    @Override
    public MusicItemHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View view = layoutInflater.inflate(R.layout.item_music_list, parent, false);
        MusicItemHolder holder = new MusicItemHolder(view);
        view.setOnClickListener(this);
        return holder;
    }

    @Override
    public void onBindViewHolder(MusicItemHolder holder, int position) {
        holder.number.setText(String.valueOf(position+1));
        holder.name.setText(musicList.get(position).getName());
        long size = musicList.get(position).getSize()/1024/1024;
        //考虑边界情况，需要单独出来处理

        int minute = musicList.get(position).getDuration()/1000/60;
        int second = musicList.get(position).getDuration()/1000%60;
        holder.info.setText("歌手: " + musicList.get(position).getSinger() +
                ", 时长: " + minute + ":" + second + ",大小：" + size + "M");

        holder.itemView.setTag(position);
    }

    @Override
    public int getItemCount() {
        return musicList.size();
    }

    @Override
    public void onClick(View v) {
        if (listener != null) {
            listener.onItemClick(v, (Integer) v.getTag());
        }
    }

    class MusicItemHolder  extends RecyclerView.ViewHolder{
        TextView number;
        TextView name;
        TextView info;

        public MusicItemHolder(View itemView) {
            super(itemView);
            number = itemView.findViewById(R.id.tv_number);
            name = itemView.findViewById(R.id.tv_name);
            info = itemView.findViewById(R.id.tv_info);
        }
    }

    public interface OnItemClickListener {
        void onItemClick(View view, int position);
    }

    public void setListener(OnItemClickListener listener) {
        this.listener = listener;
    }
}
```
视频列表的显示同理，此时的效果：
![](http://ond7j4cnz.bkt.clouddn.com/blogmedia-player-4.gif)

## 播放音频
由于音频界面可以切换歌曲，所以点击调转时不能传递点击项的歌曲路径，而是全部歌曲的列表。即上面代码的：
```java
....
                mAdapter.setListener(new MusicAdapter.OnItemClickListener() {
                    @Override
                    public void onItemClick(View view, int position) {
                        Bundle bundle = new Bundle();
                        bundle.putParcelableArrayList(MUSIC_LIST, (ArrayList<? extends Parcelable>) mMusicList);
                        bundle.putInt(CUR_MUSIC, position);
                        Intent intent = new Intent(getActivity(), MusicPlayActivity.class);
                        intent.putExtras(bundle);
                        startActivity(intent);
                    }
                }
....
```
由于歌曲界面支持各种按钮操作，所以代码比较复杂，不贴出来，但核心代码就是使用`MediaPlayer`这个类，如下时播放音乐的代码：
```java
public class MusicPlayService extends Service {
    ......

    private MediaPlayer player;

    ......

    private void prepare(String path) {
        try {
            player.reset();
            player.setDataSource(path);
            player.prepare();
        } catch (IOException e) {
            e.printStackTrace();
        }
        player.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
            @Override
            public void onCompletion(MediaPlayer mp) {
                updateIndex(1);
                init();
                play();
            }
        });

    }

    public void play() {
        player.start();

    }
    ......
}
```

## 播放视频
播放视频和音乐很类似，其实核心就是`VideoView`这个类，以下是布局代码：
```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:background="#000"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <VideoView
        android:id="@+id/vv_video_play"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_centerInParent="true"/>
    <FrameLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_alignParentBottom="true"
        android:background="#4FFF">
        <include layout="@layout/common_play_bar" />
    </FrameLayout>
</RelativeLayout>
```
以下是视频播放代码：
```java
public class VideoPlayActivity extends AppCompatActivity {
    private VideoView mVideoView;
    private ArrayList<VideoBean> mPlayList;
    private int mCurIndex;
    private int mCurMode;//Single,Loop,random
    private ImageButton mLoopModeBtn;
    private ImageButton mPreviousBtn;
    private ImageButton mPlayPauseBtn;
    private ImageButton mNextBtn;
    private ImageButton mVideoListBtn;
    public final static int LOOP_MODE = 0;
    public final static int SINGLE_MODE = 1;
    public final static int RANDOM_MODE = 2;
    private final static int MODE_COUNT = 3;
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_video_play);
        initViews();
        mCurMode = LOOP_MODE;
        Bundle bundle = this.getIntent().getExtras();
        mPlayList = bundle.getParcelableArrayList(VideoListFragment.VIDEO_LIST);
        mCurIndex = bundle.getInt(VideoListFragment.CUR_VIDEO);
        play();
        mPlayPauseBtn.setImageResource(R.mipmap.btn_media_pause);

    }
    private void play() {
        mVideoView.requestFocus();
        mVideoView.setVideoURI(Uri.parse(mPlayList.get(mCurIndex).getPath()));
        mVideoView.start();
    }

    .....

}
```
使用其实非常简单，但是需要加上不同的循环模式，暂停效果，播放切换就需要一点代码代码，具体请阅读源码。音乐和视频播放效果：
![](http://ond7j4cnz.bkt.clouddn.com/blogmedia-player-5.gif)

## 自定义View
所谓自定义View就是使用非Android提供的控件，能够提高视觉效果。
### 方形TextView
Android的`TextView`不是正方形，如果直接写死宽高可能带来兼容性问题，所以需要自定义一个`SquareTextView`，如下：
```java
public class SquareTextView extends android.support.v7.widget.AppCompatTextView {

    public SquareTextView(Context context) {
        super(context);
    }

    public SquareTextView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public SquareTextView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        setMeasuredDimension(getDefaultSize(0, widthMeasureSpec),
                getDefaultSize(0, heightMeasureSpec));
        int length = getMeasuredHeight();
        heightMeasureSpec = widthMeasureSpec = MeasureSpec.makeMeasureSpec(length, MeasureSpec.EXACTLY);
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
    }
}
```
使用系统`TextView`的效果：
![](http://ond7j4cnz.bkt.clouddn.com/blogmedia-player-1.jpg)

使用自定义`TextView`的效果：
![](http://ond7j4cnz.bkt.clouddn.com/blogmedia-player-3.jpg)

这个想法来自网易云音乐：
![](http://ond7j4cnz.bkt.clouddn.com/blogmedia-player-2.jpg)

### 音乐频谱
添加一个随音乐跳动的频谱可以使APP更加美观，其核心也是自定义View并重写`onDraw`方法，在播放音乐时监听频率变化：
```java
    ......
            mVisualizer = new Visualizer(playService.getPlayer().getAudioSessionId());
            mVisualizer.setEnabled(false);
            mVisualizer.setCaptureSize(Visualizer.getCaptureSizeRange()[0]);
            mVisualizer.setDataCaptureListener(new Visualizer.OnDataCaptureListener() {
                @Override
                public void onWaveFormDataCapture(Visualizer visualizer, byte[] waveform, int samplingRate) {
                    // 这里添加获得数据的处理 byte[] 数组 更新出去，并画图。这里可以把这个
                    // 数组传到RunOnMusic里去
                    mVisualizerView.updateVisualizer(waveform);
                }

                @Override
                public void onFftDataCapture(Visualizer visualizer, byte[] fft, int samplingRate) {
                    mVisualizerView.updateVisualizer(fft);
                }
            }, Visualizer.getMaxCaptureRate() / 2, false, true);
            mVisualizer.setEnabled(true);

    ......
```
其中`updateVisualizer`方法就是在自定义View实现的：
```java
public class VisualizerView extends View {

    private byte[] mBytes;
    private float[] mPoints;
    private Rect mRect = new Rect();
    private Paint mForePaint = new Paint();
    private int mSpectrumNum = 24;
    public VisualizerView(Context context) {
        super(context);
        init();
    }

    public VisualizerView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    /**
     * 初始化
     */
    private void init() {
        mBytes = null;
        DisplayMetrics dm =getResources().getDisplayMetrics();
        mForePaint.setStrokeWidth((float) (dm.widthPixels*1.0/mSpectrumNum)-1);
        mForePaint.setAntiAlias(true);
        mForePaint.setColor(Color.rgb(0, 128, 255));
    }
    public void updateVisualizer(byte[] fft)
    {
        byte[] model = new byte[fft.length / 2 + 1];
        model[0] = (byte) Math.abs(fft[0]);
        for (int i = 2, j = 1; j < mSpectrumNum;)
        {
            model[j] = (byte) Math.hypot(fft[i], fft[i + 1]);
            i += 2;
            j++;
        }
        mBytes = model;
        invalidate();
    }
    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (mBytes == null)
        {
            return;
        }
        if (mPoints == null || mPoints.length < mBytes.length * 4)
        {
            mPoints = new float[mBytes.length * 4];
        }
        mRect.set(0, 0, getWidth(), getHeight());
        //绘制频谱
        final int baseX = mRect.width()/mSpectrumNum;
        final int height = mRect.height();
        for (int i = 0; i < mSpectrumNum ; i++)
        {
            if (mBytes[i] < 0)
            {
                mBytes[i] = 127;
            }
            final int xi = baseX*i + baseX/2;
            mPoints[i * 4] = xi;
            mPoints[i * 4 + 1] = height;
            mPoints[i * 4 + 2] = xi;
            mPoints[i * 4 + 3] = height - mBytes[i];
        }
        canvas.drawLines(mPoints, mForePaint);
    }
}
```

## 源码
[click Here](https://github.com/vimerzhao/SimpleMediaPlayer/commit/c9a9d9a40b46433c91cd66336b698901a920c55b)

## 备注
图片分辨率还是大了点，下次图片应该再调小一点。
