---
title: "重新认识Markdown"
date: 2019-05-02
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 重新认识Markdown
最近在调研文档写作工具，对 Markdown 有了一些新的思考。
## Markdown 的优势
毫无疑问，Markdown 是流行的，个人认为有以下几个原因：
1. 容易上手，设计得对新手非常友好，把最常用的十几个样式抽离出来，可以满足日常90%的编写场景
2. 社区支持，如Github，Hexo等，国内的博客平台CSDN，简书等也都支持了
3. 工具链完善，VS Code，Sublime等几乎所有的编辑器都支持Markdown扩展，在线网站，笔记工具，GitBook等等，可选择的编写工具非常多

## Markdown 的劣势
1. 复杂格式（例如表格、图片标题）支持不够。
2. 没有预留扩展语法，导致不同网站、工具各自扩展产生了很多方言（参考Lisp）。
3. 没有统一标准

社区有不少人意识到问题，其中就有 Jeff Atwood 牵头，联合 Stack Overflow、Github、Reddit 的一些员工发起了 Standard Markdown 项目，希望将 Markdown 标准化。 没想到项目起步遇到的最大阻力是 Markdown 的创建者 John Gruber，John 很不满意 Jeff 在未充分沟通的情况下宣称自己的项目是“Standard”，经过一番争吵，Jeff 把项目改名为 Common Markdown ，John 也没有加入项目。这个 Common Markdown 至今也没有被广发采纳。
另外，我觉 GitBook 多少沾了 Git 的光，DocBook 肯定更胜一筹。

## 使用误区
在使用 Hexo 写博客的过程中，我养成了一个不太好的习惯，就是痴迷于扩展，Hexo本身通过扩展丰富了 Markdown 的功能，但当我想要在简书、知乎发布同一文章时，可移植性就成了阻碍。
另外，嵌入 Html 解决复杂格式问题同样不是明智的选择，这相当于把样式带入了内容。

## 重新认识 Markdown
首先，不要过度依赖 Markdown，通过扩展，Markdown确实能支持很多功能，但这些东西更像是平台的特有功能，而不是 Markdown 本身。其次，认识 Markdown 的使用场景，大部分文章的排版都不会很复杂，Markdown基本能hold住，再复杂就应该用 Sphinx 或者 Asciidoc之类的工具，如果还不能满足，再用 LaTeX，虽然宰牛刀杀鸡有点浪费，但杀鸡的刀是一定宰不了牛，本质还是权衡学习成本和自身需求。

## 参考

- [Asciidoc简介](https://blog.csdn.net/u011411849/article/details/79031718)
- [Why You Shouldn’t Use “Markdown” for Documentation](http://www.ericholscher.com/blog/2016/mar/15/dont-use-markdown-for-technical-docs/)
- [Markdown 的设计是有很多问题的......](https://www.v2ex.com/t/254814)
