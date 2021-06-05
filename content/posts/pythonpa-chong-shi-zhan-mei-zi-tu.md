---
title: "'Python爬虫实战:妹子图'"
date: 2017-07-02
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 'Python爬虫实战:妹子图'
本文记录了一些爬虫的基础知识，并实现了一个50行左右的爬虫脚本。
## 前言
看了一些Python的语法后打算做一个小项目练手，打发一下时间。爬虫比较容易上手，加之Python十分适合写爬虫，于是花了半天时间写了一个爬虫，在此记录一下。

## 工具
Python比较爽的一点就是开源社区为其贡献了无数高质量的第三方库，可以将程序员从繁琐的细节中解放出来，更加专注于自己的目标。在这里需要安装两个库
```
sudo pip3 install requests
sudo pip3 install beautifulsoup4
```
`requests`用于网络请求，`beautifulsoup4`用于html解析。

> 这里不得不感慨一下，自己一年多前曾经用Java爬取过窝工教务处的网页，当时网络请求以及html解析均是用原生API写的，不仅浪费时间，而且经常出错，当时花了一天多，而今天可能就是一个小时的功夫就完成了，虽然部分是因为当时还Too Young，但也不得不承认Python在提高效率方面的巨大优势。

## 开始爬虫
### 第一步：分析
对于本次任务，只需做两件事：1.找到图片；2.下载图片。关键是如何找到图片，这就需要分析目标网站：[妹子图](http://www.mzitu.com/)。观察首页可以看到每个套图都有一张预览图，而一个页面由若干个套图的入口（图片预览和文字链接）组成。
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu01.png)

翻到最下方发现有若干页面选择
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu03.png)

点进一个套图之后，发现每个页面显示一张图片，下方会显示本套图一共多少页。
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu02.png)

针对套图中的某一页，在新标签页打开图片，上方的url地址就是我们的目标了
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu04.png)

从图片的url地址以及刚才的分析来看，这个网站还是十分有规律的，适合新手练习。

### 第二步：获取网页
需要注意的是，由于涉及网络和文件读写操作，在Linux环境需要在`root`下运行（亲测命令行需要，PyCharm不需要）。
接下来正式开始，尽量用代码表达。初次练习，可以用增量式的方法（完成一个功能，验证正确性后在此基础上开发下一个）：
```python
import requests

## 爬取目标
url = 'http://www.mzitu.com'
## 设置报头，Http协议
header = {'User-Agent' : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'}
main_page = requests.get(url, headers = header)
print(main_page.text)
```

通过以上4行代码就可以获取得到首页内容
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu05.png)

### 第三步：解析网页
分析可以发现，这个网站的每页的url其实就是`www.mzitu.com/n/`，其中n是数字，n为1的时候会重定向到`www.mzitu.com`，所以我们可以设置一个n的最大值，不超过网页实际最大值即可，如此就可实现网页的跳转了，而不用模拟点击了翻页的按钮。
我们比较关心的内容是套图的入口地址，再对网页进行分析，可以发现，所有链接都在一个`id`为`pins`的`ul`里面，如此便可获取该页面全部套图的入口地址了。
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu-7.png)

```python
#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup

## 爬取目标
url = 'http://www.mzitu.com/page/'
## 设置报头，Http协议
header = {'User-Agent' : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'}
## 爬取的预览页面数量
preview_page_cnt = 2
for cur_page in range(1, int(preview_page_cnt)+1):
    cur_url = url + str(cur_page)
    cur_page = requests.get(cur_url, headers = header)
    ## 解析网页
    soup = BeautifulSoup(cur_page.text, 'html.parser')
    ## 图片入口和文字入口取一个即可
    preview_link_list = soup.find(id='pins').find_all('a', target='_blank')[1::2]
    for link in preview_link_list:
        print(link)
```
结果如下，可以看到，现在已经获取到每个套图的入口地址了。
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu08.png)

### 第四步：解析套图网页
每个网页显示套图中的一张图片，所以我们需要做两件事：1.分析有多少图片（即网页）2.每个图片的地址（即右键选择“在新标签页打开”时的地址）。
分析可以发现，页面数量在`class`为`pagenavi`的`div`里面，而图片地址在`class`为`main-image`的`div`里面，并且每个每个网页格式一致：`www.mzitu.com/套图id/n`，其中n为不超过图片数量的一个数字。
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu09.png)

```
#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup

## 爬取目标
url = 'http://www.mzitu.com/page/'
parser = 'html.parser'
## 设置报头，Http协议
header = {'User-Agent' : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'}
## 爬取的预览页面数量
preview_page_cnt = 2
for cur_page in range(1, int(preview_page_cnt)+1):
    cur_url = url + str(cur_page)
    cur_page = requests.get(cur_url, headers = header)
    ## 解析网页
    soup = BeautifulSoup(cur_page.text, parser)
    ## 图片入口和文字入口取一个即可
    preview_link_list = soup.find(id='pins').find_all('a', target='_blank')[1::2]
    for link in preview_link_list:
        link = link['href']
        soup = BeautifulSoup(requests.get(link).text, parser)
        ## 获取图片数量
        pic_cnt = soup.find('div', class_='pagenavi').find_all('a')[4].get_text()
        ## 遍历获取每页图片的地址
        for pic_index in range(1, int(pic_cnt)+1):
            pic_link = link + '/' + str(pic_index)
            cur_page = requests.get(pic_link, headers = header)
            soup = BeautifulSoup(cur_page.text, parser)
            pic_src = soup.find('div', 'main-image').find('img')['src']
            print(pic_src)
```
运行之后如下：
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu10.png)

### 第五步：下载图片
主要涉及文件读写，比较简单，添加之后完整代码如下：
```
#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import os

## 爬取目标
url = 'http://www.mzitu.com/page/'
parser = 'html.parser'
cur_path = os.getcwd() + '/'

## 设置报头，Http协议
header = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'}
## 爬取的预览页面数量
preview_page_cnt = 2
for cur_page in range(1, int(preview_page_cnt) + 1):
    cur_url = url + str(cur_page)
    cur_page = requests.get(cur_url, headers=header)
    ## 解析网页
    soup = BeautifulSoup(cur_page.text, parser)
    ## 图片入口和文字入口取一个即可
    preview_link_list = soup.find(id='pins').find_all('a', target='_blank')[1::2]
    for link in preview_link_list:
        dir_name = link.get_text().strip().replace('?', '')
        link = link['href']
        soup = BeautifulSoup(requests.get(link).text, parser)

        ## 获取图片数量
        pic_cnt = soup.find('div', class_='pagenavi').find_all('a')[4].get_text()
        ## 创建目录
        pic_path = cur_path + dir_name
        if os.path.exists(pic_path):
            print('directory exist!')
        else:
            os.mkdir(pic_path)
        os.chdir(pic_path)  ## 进入目录，开始下载
        print('下载' + dir_name + '...')
        ## 遍历获取每页图片的地址
        for pic_index in range(1, int(pic_cnt) + 1):
            pic_link = link + '/' + str(pic_index)
            cur_page = requests.get(pic_link, headers=header)
            soup = BeautifulSoup(cur_page.text, parser)
            pic_src = soup.find('div', 'main-image').find('img')['src']
            pic_name = pic_src.split('/')[-1]
            f = open(pic_name, 'wb')
            f.write(requests.get(pic_src, headers=header).content)
            f.close()
        os.chdir(cur_path)  ## 完成下载，退出目录
print('下载完成')    
```

### 第六步：爬取图片
如下：
![](http://ond7j4cnz.bkt.clouddn.com/blogmzitu-demo.gif)

## 总结
人生苦短，我用Python。何况我是泽学家。

## 2018-4-11更新
本文在知乎上浏览量还是很多的，也发现评论区也很多人反应无法抓取，今天我又看了一下，发现妹子图已经开始屏蔽爬虫了，一番探索之后发现其识别爬虫的手段是判断`Referer`字段，这个字段是用来判断请求的来源，正常我们都是从主页进去的，所以能够加载图片，如下：
![](http://p2pe8gnn5.bkt.clouddn.com/Peek%202018-04-11%2021-32.gif)

如果我们直接输入一个图片地址就会被认为是爬虫：
![](http://p2pe8gnn5.bkt.clouddn.com/Peek%202018-04-11%2021-43.gif)

因为请求的`Referer`字段为空,所以代码运行之后是这样：
![](http://p2pe8gnn5.bkt.clouddn.com/2018-04-11-21-17-24.png)

处理方法也很简单，增加一个不断更新`Referer`字段的函数，然后每次请求前调用就可以绕过这个拦截了：
```
....
def update_header(referer):
    header['Referer'] = '{}'.format(referer)
....
            pic_src = soup.find('div', 'main-image').find('img')['src']
            pic_name = pic_src.split('/')[-1]
            update_header(pic_src)
            f = open(pic_name, 'wb')
            f.write(requests.get(pic_src, headers=header).content)
            f.close()
....
```
绕过之后就可以正常下载了：
![](http://p2pe8gnn5.bkt.clouddn.com/2018-04-11%2021-18-04.png)

以后可能还有新的反爬虫机制，所以代码放在了Gists做长期管理，地址：[vimerzhao/mzitu_spider.py](https://gist.github.com/vimerzhao/8485f89978aba2e7d9a0f8d82c371643)

