---
title: "Hexo配置指南"
date: 2019-04-21
type: post
isCJKLanguage: true
---

# Hexo配置指南
本文记录了笔者的Hexo配置，持续更新中～

## 功能增强
### 文章加密
对于部分隐私文章，进行加密。使用插件[hexo-blog-encrypt](https://github.com/MikeCoder/hexo-blog-encrypt)
1. 在`Hexo`根目录的`package.json`中添加`"hexo-blog-encrypt": "1.1.*"`依赖，然后执行npm install 命令，该插件会自动安装
2. 在`_config.yml`中启用该插件:
```
## Security
##
encrypt:
    enable: true
```
3. 在的文章的头部添加上对应的字段，如`password`，列表摘要`abstract`，文章页密码框提示`message`。

### 思维导图
参考[在Hexo中使用思维导图 | 猎人杂货铺](https://hunterx.xyz/use-mindmap-in-hexo.html)一文实现，其实就是加入百度的`kityminder`渲染引擎，首先准备以下文件：
- `jquery.min.js`：通常情况下不需要另外准备
- `kity.min.js`：官方库
- `kityminder.core.min.js`：官方库
- `mindmap.css` & `mindmap.min.js`：[作者提供](https://github.com/HunterXuan/unordered-list-to-mind-map)

以上文件我均备份到了自己的私有仓库～～方便集中管理，防止以后不好找。

然后在Hexo中进行配置，以 Next 主题为例：
- 将JS文件放入`themes\next\source\js\src`目录下
- 更改`mindmap.css`为`mindmap.styl`，放入`themes\next\source\css\_custom`
- 编辑`themes\next\source\css\_custom\custom.styl`，添加`@import "mindmap"`
- 编辑`themes\next\layout\_scripts\commons.swig`中的`js_commons，`添加所需的JS文件

用`hexo s`，如果没有报错信息，基本说明操作成功.使用Hexo的`pullquote`将思维导图的内容包裹起来，`mindmap`是思维导图渲染的标志，尺寸有三种规格：`mindmap-sm`、`mindmap-md`和`mindmap-lg`。思维导图的内容和层级关系通过无序列表表示，支持基本的文字和超链接。举个例子，撰写文章时在需要的位置添加如下内容。
```
{% pullquote mindmap mindmap-md %}
- [在 Hexo 中使用思维导图](https://hunterx.xyz/use-mindmap-in-hexo.html)
  - 前言
  - 操作指南
    - 准备需要的文件
    - 为主题添加 CSS/JS 文件
  - 使用方法
{% endpullquote %}
```
会得到如下内容：

{% pullquote mindmap mindmap-md %}
- [在 Hexo 中使用思维导图](https://hunterx.xyz/use-mindmap-in-hexo.html)
  - 前言
  - 操作指南
    - 准备需要的文件
    - 为主题添加 CSS/JS 文件
  - 使用方法
{% endpullquote %}

这是我比较喜欢的展现方式，原因有三：
- 不需要处理图片的分辨率
- 只需要更改源代码就可以更新，如果贴思维导图的图片链接还要单独维护源文件
- 和Hexo能很好的集成，虽然还有优化空间
