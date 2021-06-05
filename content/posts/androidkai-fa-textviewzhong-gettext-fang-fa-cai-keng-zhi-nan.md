---
title: "【Android开发】TextView中getText()方法踩坑指南"
date: 2018-08-03
type: post
isCJKLanguage: true
categories:
    - "Android实践"
---

# 【Android开发】TextView中getText()方法踩坑指南
本文记录了在使用`TextView`的`getText()`方法时，由于编码不规范导致的诡异问题。
## 问题背景
大意可以描述为以下一段代码：
```
public class MainActivity extends Activity {
    public static final String label = "中文";
    @Override
        protected void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            setContentView(R.layout.activity_main);

            TextView textView = findViewById(R.id.tv_text);
            textView.setText(label);
            if (label.equals(textView.getText())) {
                // 低版本判断为false,高版本判断为false
            }
        }
}
```

## 问题排查
经过debug之后，发现`textView.getText()`返回的类型是`android.text.SpannableString`，但是在高版本机器上返回为`android.text.String`。为此，我们阅读了`TextView`的源码，发现有两处执行了`setText(mText, BufferType.SPANNABLE);`这个方法，其中一处是在`getIterableTextForAccessibility`方法中：
```
/**
 * @hide
 */
@Override
public CharSequence getIterableTextForAccessibility() {
    if (!(mText instanceof Spannable)) {
        setText(mText, BufferType.SPANNABLE);
    }
    return mText;
}
```
正好我们的工程就要求开启**辅助功能**，上面的代码是Android4.4中`TextView`的实现，而在Android6.0中，该方法的实现为：
```
/**
 * @hide
 */
@Override
public CharSequence getIterableTextForAccessibility() {
    return mText;
}
```
看来因为辅助功能的开启触发了这个方法，导致了`equals()`方法在不同版本上表现不一致。
此外`setSelectAllOnFocus`方法也可能会导致`setText(mText, BufferType.SPANNABLE);`的执行：
```
/**
 * Set the TextView so that when it takes focus, all the text is
 * selected.
 *
 * @attr ref android.R.styleable#TextView_selectAllOnFocus
 */
@android.view.RemotableViewMethod
public void setSelectAllOnFocus(boolean selectAllOnFocus) {
    createEditorIfNeeded();
    mEditor.mSelectAllOnFocus = selectAllOnFocus;

    if (selectAllOnFocus && !(mText instanceof Spannable)) {
        setText(mText, BufferType.SPANNABLE);
    }
}
```
因此，如果`TextView`设置了`android:selectAllOnFocus="true"`属性，也会导致类似的问题。

## 总结
`getText()`方法其实是返回一个`CharSequence`,对应不同的实现（如`String`、`SpannableString`）,建议写法为：
```
if (textView.getText() != null) {
    if (label.equals(textView.getText().toString())) {
                
    }
}
```
类型统一之后就不会出现此类“诡异”问题了，也说明了编码习惯的重要性！！

感谢应用宝终端技术团队同学的分享。
