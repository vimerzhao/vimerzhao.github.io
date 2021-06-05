---
title: "20行代码搭建微信聊天机器人"
date: 2017-08-03
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 20行代码搭建微信聊天机器人
介绍了如何用20行Python搭建一个微信聊天机器人，并讨论了其可能的拓展方向。
## 引子
在之前一边文章中介绍客服机器人：[AI实战:搭建客服机器人](https://vimerzhao.github.io/2017/07/29/AI%E5%AE%9E%E6%88%98-%E6%90%AD%E5%BB%BA%E5%AE%A2%E6%9C%8D%E6%9C%BA%E5%99%A8%E4%BA%BA/)，本文将在此基础上制作一个聊天机器人，前一篇文章的重点在于问答，而本文的重点在于如何接入微信。

## 环境配置
实现一个微信机器人，最重要的有两件事：
- 接入微信
- 智能回复

第一个功能，可以借助[wxpy](https://github.com/youfou/wxpy)；而对于第二个功能，则使用之前已经实践过的[ChatterBot](https://github.com/gunthercox/ChatterBot)。在开源社区有不少接入微信的库，而开源的聊天机器人也有很多，之所以选择二者是因为他们的文档都非常齐全，因此本文也不会对如何使用这两个库做过多讲解。
注意！Python版本要求**3.5**，wxpy和ChatterBot都可以通过pip安装，不赘述。

## 编写代码
实际的代码不超过20行（果然人生苦短、我用Python），这里添加一些注释便于理解
```python
#!/usr/bin/env python3.5
from wxpy import *
from chatterbot import ChatBot
from chatterbot.trainers import ChatterBotCorpusTrainer
chatbot = ChatBot("deepThought")## 用于回复消息的机器人
chatbot.set_trainer(ChatterBotCorpusTrainer)
chatbot.train("chatterbot.corpus.chinese")## 使用该库的中文语料库
bot = Bot(cache_path=True)## 用于接入微信的机器人
group_2 = bot.groups("友谊是")[0]## 进行测试的群
group_2.send("大家好,我是人工智障")

@bot.register(group_2)
def reply_my_friend(msg):
    print(msg)
    return chatbot.get_response(msg.text).text## 使用机器人进行自动回复

## 堵塞线程，并进入 Python 命令行
embed()
```

## 效果演示
扫码登陆：
![](http://ond7j4cnz.bkt.clouddn.com/blogscan-code-login-new.png)

进入人工智障模式：
![](http://ond7j4cnz.bkt.clouddn.com/blogchat-demo-new.png)
![](http://ond7j4cnz.bkt.clouddn.com/blogchat-demo-2-new.png)

后台效果：

![](http://ond7j4cnz.bkt.clouddn.com/blogbackend-chat-new.png)

## 一点思考
这是一个非常简单的例子，因为没有对机器人的知识库进行定制，所以机器人的回复十分简单，十几句对话就会被识破。但基于这两个库所能做的事情绝不仅限于此，本文只是抛砖引玉，可以在此基础上做出更多有意思的东西，比如：
1. 监测微信群对话，以此为语料库训练机器人。其实我之前有一个想法就是利用海贼王里面的对话（又或者金庸的小说）作为训练的语料，可以得到一个满满海贼王画风（又或者武侠风格）的聊天机器人。
2. 完成一些自动化的任务，比如每天定时跟女票道早安（这个的难点在于首先得有一个女票）。最近在鹅厂实习，每天早晨都需要微信签到，可以考虑自动化（因为程序员的信条就是不做重复性的工作）。
3. Demo中机器人对每句话都做了回复，可以增强其表现，比如只回复@了自己的以及语料库匹配度比较高的消息（对应实际情景中聊天者比较熟悉的话题），这样就更能以见乱真了。

以上，是我比较期望的三点，如有时间、精力可以试试。此外，除了使用库，了解背后的原理也十分有必要。比如，要实现一个wxpy可能就需要对微信抓包，分析他的通信协议；要实现一个ChatterBot功能类似的库可能就需要实现一种NLU算法，选择合适的机器学习模型和数据库等。风格良好的文档可以帮助我们快速上手，但要游刃有余还需深入源码！
以上，一点思考。
