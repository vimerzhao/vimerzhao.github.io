---
title: "'AI实战:搭建客服机器人'"
date: 2017-07-29
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 'AI实战:搭建客服机器人'
本文简要介绍了但前客服机器人的发展情况，并实际开发了一个Demo作为演示。

## 客服机器人
随着科技发展，廉价劳动力正在不断被淘汰。客服机器人就是这样一个例子，具体参见[巨头、创业者都在搞的人工智能客服，真能取代人力？](http://www.tmtpost.com/2537691.html)
苹果的Siri，微软的小冰都极具战略意义。而作为一家电商，阿里巴巴也开发了自己的客服机器人：阿里小蜜，并在购物、招聘等场合投入使用。
![](http://ond7j4cnz.bkt.clouddn.com/blogalibaba_xiaomi.png)
腾讯有QQ小冰，并且正在开发自己的客服机器人平台
![](http://ond7j4cnz.bkt.clouddn.com/blogtencetn_csr.png)
而市场上，已经有智齿科技、网易七鱼等解决方案
![](http://ond7j4cnz.bkt.clouddn.com/blogwangyiqiyu.png)
只是价格不菲。
由此可见，客服机器人也因为人工智能的大热而进入产业化。而本文就试图实现一个类似的客服机器人。

## 问题分析
制作一个客服机器人，可以说这是一个非常笼统的需求。如果沿着这个思路去做，我们会发现，已经有不少可以直接集成的平台。比如网易七鱼，如下图：
![](http://ond7j4cnz.bkt.clouddn.com/blogqiyu_demo.jpg)
通过注册帐号，集成SDK，在后台添加知识库，我只用了20分钟就搭建好了一个客服系统。但这样也有很多问题，比如很多细节被隐藏、数据需要走别人的服务器以及高昂的价格等，所以这不是我们需要的解决方案。
将问题分解下，可以用下图表示
![](http://ond7j4cnz.bkt.clouddn.com/blogcsr_structure.png)
用户在前台(网页或手机)提问，后台进行处理，处理的核心无非是回答接收到的问题，所以，客服机器人的核心是回答问题，于是提炼出了第一个关键词：**问答系统**，其核心在于同一个问题有很多不同的提问方式，我们的问答系统需要正确地理解这个问题；在正确的理解问题之后，我们面临第二个问题：如何回答，程序是不能凭空产生回答的，他需要有一个知识库，就像大脑需要经常读书、储备知识一样。于是，提炼出了第二个关键词：**知识库**。
通过以上梳理，我们明确了问题的核心，接下来进行解决！

## 问答系统选型
我们需要一个问答系统，通过百度、Google进行查找，我们可以找到很多解决方案，最后我决定选用[ChatterBot](https://github.com/gunthercox/ChatterBot)，主要有以下原因：
1. 文档齐全，[https://chatterbot.readthedocs.io](https://chatterbot.readthedocs.io/en/stable/)
2. 功能对口，ChatterBot is a machine learning, conversational dialog engine for creating chat bots
3. 性能优异，后文会涉及

其实，选型是最困难的一步。需要不断的试错、尝试、否定、证明等，就像爱迪生在发明灯泡前尝试了几千次一样。
关于ChatterBot的使用不做赘述，因为文档十分齐全。以下是一个简单例子，结合注释十分容易理解：
```python
## !/usr/bin/python3.5
## 导入库
from chatterbot import ChatBot
from chatterbot.trainers import ListTrainer
my_bot = ChatBot("Training demo")
my_bot.set_trainer(ListTrainer)
## 训练集
my_bot.train([
    "嗳，渡边君，真喜欢我?",
    "那还用说?",
    "那么，可依得我两件事?",
    "三件也依得",
])
while True:
    print(my_bot.get_response(input(">")))
```
运行结果
```
$ python3.5   chatrobot.py
>真的喜欢？
那还用说?
>可依我两件事
三件也依得
```
可见，ChatterBot对于问题的分析还是很有一定鲁棒性的。

## 制作知识库
具体的制作方法由上一节选用的问答系统决定，如ChatterBot可以通过脚本注入sqlite数据库(关闭只读模式)作为知识库，所以我可以写一个脚本来把知识库注入sqlite数据库，这里我选用的是腾讯招聘的FAQ页面：
![](http://ond7j4cnz.bkt.clouddn.com/blogtencent_faq.png)
注入代码如下：
```python
## !/usr/bin/python3.5

from chatterbot import ChatBot
from chatterbot.trainers import ListTrainer

my_bot = ChatBot("腾讯招聘FAQ")
my_bot.set_trainer(ListTrainer)
my_bot.train([
"提前批针对哪些岗位的招聘？",
"提前批面向2018年应届毕业生，开放软件开发、技术运营、安全技术、软件测试、技术研究等技术类岗位，以及游戏策划、游戏运营岗位。"
])
my_bot.train([
"什么时候面试？以什么样的形式面试？",
"简历通过筛选就会被发起面试，将会在7月27日-9月8日安排电话面试或视频面试，部分同学会被邀请至北上广深的办公大厦进行现场面试，我们将报销来回路费和住宿费用，请同学们保持手机畅通，并留意短信和邮件通知。考虑到筛选简历的时间，建议投递简历的时间为7月27日-8月25日。"
])
my_bot.train([
"意向事业群的选择有什么用处？",
"提前批中，你所选择的意向事业群会优先看到你的简历。而在正式校招中，意向事业群只作为参考，并不会完全按照意愿分配。如果你有强烈想加入某一个事业群的意愿，提前批是唯一可以主动选择事业群的机会。如果你的简历没有通过意向事业群的筛选，一样有机会被其他事业群发起面试。建议在面试时询问面试官所在的事业群，以免发生不必要的误会。"
])
my_bot.train([
"如果提前批失败了会影响之后的正式校招么？",
"如果提前批面试失败，或是未被发起面试，都会自动转为参加正式校招的对应岗位，也可以修改应聘岗位。正式校招不受影响。 需要说明的是，提前批未通过的面试记录将会留在系统中，供后续面试官参考。"
])
my_bot.train([
"其他岗位什么时候开始招聘？",
"其他岗位将在8月初全面开放投递，涵盖产品、市场、设计、职能等众多岗位，大家可以持续关注“腾讯招聘”微信公众号，将在第一时间推送。也可关注校招官网join.qq.com的更新。"
])

```
运行之后我们就可以看到目录下生成了一个`db.sqlite3`文件，这就是我们的知识库了！接下来，我们写一个脚本测试一下，注意打开只读模式，否则ChatterBot会不断学习，修改知识库，而这个过程实际不应该让用户来参与，所以应该关闭！测试脚本如下：
```python
## !/usr/bin/python3.5
from chatterbot import ChatBot
from chatterbot.trainers import ListTrainer
## 建议打开只读，防止修改数据库
my_bot = ChatBot("FAQ Demo", read_only=True)
## test
while True:
    print(my_bot.get_response(input(">")))
```
运行结果：
```
$python3.5   faq-terminal.py
 >面试形式
 简历通过筛选就会被发起面试，将会在7月27日-9月8日安排电话面试或视频面试，部分同学会被邀请至北上广深的办公大厦进行现场面试，我们将报销来回路费和住宿费用，请同学们保持手机畅通，并留意短信和邮件通知。考虑到筛选简历的时间，建议投递简历的时间为7月27日-8月25日。
 >选择事业群的用处
 提前批中，你所选择的意向事业群会优先看到你的简历。而在正式校招中，意向事业群只作为参考，并不会完全按照意愿分配。如果你有强烈想加入某一个事业群的意愿，提前批是唯一可以主动选择事业群的机会。如果你的简历没有通过意向事业群的筛选，一样有机会被其他事业群发起面试。建议在面试时询问面试官所在的事业群，以免发生不必要的误会。
 >
```
可以看到，虽然问题稍有变化，但是还是得到了正确答案。

## 搭建前端后台
通过前面的努力，我们成功解决了核心问题，接下来就好办了！用户反馈的渠道一般是手机或者网页，所以我们要为之前的成果搭建一个前端，也就是完成下图的左半边，这里只是用于演示，所以我们直接用Socket传输数据。客户端代码：
```java
public class MainActivity extends AppCompatActivity {
    private Button mSendMessage;
    private EditText mQuestion;
    private TextView mAnswer;
    private EditText mIP;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        mSendMessage = (Button) findViewById(R.id.send_message);
        mQuestion = (EditText) findViewById(R.id.question);
        mAnswer = (TextView) findViewById(R.id.answer);
        mIP = (EditText) findViewById(R.id.ip_info);
        mSendMessage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mAnswer.setText("查询中.....");
                new Thread(){
                    @Override
                    public void run() {
                        super.run();
                        try {
                            Socket socket = new Socket(mIP.getText().toString(), 8085);
                            OutputStream os = socket.getOutputStream();
                            os.write(mQuestion.getText().toString().getBytes());
                            os.flush();
                            socket.shutdownOutput();
                            // Java代码真是罗嗦
                            InputStream is = socket.getInputStream();
                            InputStreamReader reader = new InputStreamReader(is);
                            BufferedReader bufReader = new BufferedReader(reader);
                            String s = null;
                            final StringBuffer sb = new StringBuffer();
                            while((s = bufReader.readLine()) != null){
                                sb.append(s);
                            }
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    mAnswer.setText(sb.toString());
                                }
                            });
                            //注：实际开发中需要放到finally中
                            bufReader.close();
                            reader.close();
                            is.close();
                            os.close();
                            socket.close();
                        } catch (UnknownHostException e) {
                            Log.e("未知主机", mIP.getText().toString());
                            e.printStackTrace();
                        } catch (IOException e) {
                            Log.e("IO错误", "-------------");
                            e.printStackTrace();
                        }
                    }
                }.start();

            }
        });
    }
}
```
服务器端我们需要通过Java来调用Python脚本，将接收到的前台消息传入问答系统处理，然后获取系统输出反馈到前端。这一部分的本质就是Socket通信，比较简单，不做赘述，后台代码如下：
```java
public class ServerThread extends Thread{
    private Socket socket;
    //在构造中得到要单独会话的socket
    public ServerThread(Socket socket) {
        this.socket = socket;
    }
    @Override
    public void run() {
        super.run();
        InputStreamReader reader = null;
        BufferedReader bufReader = null;
        OutputStream os = null;
        try {
            reader = new InputStreamReader(socket.getInputStream());
            bufReader = new BufferedReader(reader);
            String s = null;
            StringBuffer sb = new StringBuffer();
            while((s = bufReader.readLine()) != null){
                sb.append(s);
            }
            Date date = new Date();
            DateFormat format = new SimpleDateFormat("HH:mm:ss");
            String time = format.format(date);
            System.out.println("\033[32m"+ time +"--> \033[0m" + sb.toString());
            //关闭输入流
            socket.shutdownInput();

            // 开始调用python脚本
            String[] command = {"python3.5", "faq-server.py",  sb.toString()};
            Process process = Runtime.getRuntime().exec(command);
            // 实际开发时要设定阻塞时间限制
            process.waitFor();
            BufferedReader screenOutput = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            StringBuilder builder = new StringBuilder();
            while ((line = screenOutput.readLine()) != null) {
                builder.append(line);
                System.out.println(builder.toString());
            }
            String response = "Answer:" + builder.toString();
            //返回给客户端数据
            os = socket.getOutputStream();
            os.write(response.getBytes());
            os.flush();
            socket.shutdownOutput();
        } catch (Exception e) {
            e.printStackTrace();
        } finally{
            if(reader != null){
                try {
                    reader.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            if(bufReader != null){
                try {
                    bufReader.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            if(os != null){
                try {
                    os.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
```

```java
public class MultiThreadServer {

    public static void main(String[] args) {
        try {
            ServerSocket serverSocket = new ServerSocket(8085);
            while(true){
                //accept方法会阻塞，直到有客户端与之建立连接
                Socket socket = serverSocket.accept();
                ServerThread serverThread = new ServerThread(socket);
                serverThread.start();
            }
        } catch (IOException e) {
            e.printStackTrace();
        } catch(Exception e){
            e.printStackTrace();
        }
    }

}
```
后台开始监听：
```
$java   MultiThreadServer
```
最终效果：
![](http://ond7j4cnz.bkt.clouddn.com/blogfaq-demo.gif)

## 小插曲
本来实现前后端通信是最容易的部分，但是一开始把电脑和手机都连在公司WiFi的时候，竟然出现了找不到路由的奇怪错误，弄得我一直以为是自己代码出了问题，花了几个钟头！！最后才知道是公司WiFi的安全措施，使得无法通过代码在公司网络上随便传包（还有这种操作）！！后来连在自己租的腾讯云服务器又发现连接超时。最后改成电脑开WiFi，手机连入电脑WiFi果然好了。自己还是too young,sometimes naive啊！
![](http://ond7j4cnz.bkt.clouddn.com/blogguestwifi-problem.png)
