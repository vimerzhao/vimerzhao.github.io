---
title: "TCP连接的建立与释放"
date: 2017-04-21
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# TCP连接的建立与释放
本文通过实际抓包验证了TCP连接建立与释放的方式。
## 关于计算机网络
我在大三上修了计算机网络这门课，这门课真是我大学最差的记忆之一。教授这门课的老师水平很低，以至于辅导员安排另一位老师偷偷在考试前给我们安排了两次突击。此外这门课本身就知识面广，内容理论而抽象，所以理解起来本身就很费劲。即使考试拿了80分，我也自认为对这门课一无所知。
幸而，本学期的计网实验课给了我一些实际的体验，感觉收获远比上学期理论课收获多！此外，因为实验有一个调研IPv6的环节，我为此编写了一个IPv6的抓包程序，并取得了不错的效果。今天突发奇想，这个程序可不仅仅只能解析IPv6的数据包，由于我当时抓取到了传输层，所以我应该也能从抓到的TCP/UDP包头里面找到一些有用的东西！
我决定，分析一下抓取到的TCP包，来验证所谓的“三次握手”、“四次挥手”。书上虽然讲的很详细，但终究纸上得来终觉浅，觉知此事要躬行！就我而言，光看看书基本过两天就忘了......
![](http://ond7j4cnz.bkt.clouddn.com/blogTCP-Link.png)
![](http://ond7j4cnz.bkt.clouddn.com/blogTCP-Free.png)

## 如何抓包
在之前计网实验的时候，用WireShark抓过包，当时是使用TCP/UDP通信软件进行抓包的，冗余信息较少（因为没连外网），而这次决定用自己写的程序（做了小的修改，不完整的包也抓取下来了），并完全在真实环境下抓包（在浏览器打开一个链接）。
为什么不用WireShark呢，一方面我不需要那么多功能，另一方面我觉得自己的程序更适合这个需求，WireShark反而显示地没那么完整：
![](http://ond7j4cnz.bkt.clouddn.com/blogWireShark.PNG)


## TCP连接的建立
首先看看我从抓取到的数据里提取的以下三个包：

```
Ethernet Header
	|-Destination Address  : 20-47-47-DE-87-14
	|-Source Address       : 58-69-6C-91-13-BA
	|-Protocol             : 8
	IP Header
		|-IP Version           : 4
		|-IP Header Length     : 5 DWORDS or 20 Bytes
		|-Type Of Service      : 0
		|-IP Total Length      : 60  Bytes(size of Packet)
		|-Identification       : 3003
		|-TTL                  : 54
		|-Protocol             : 6
		|-Checksum             : 18413
		|-Source IP            : 119.75.217.109
		|-Destination IP       : 222.26.194.64
		TCP Header
			|-Source Port         : 443
			|-Destination Port    : 44994
			|-Sequence Number     : 3505863429
			|-Acknowledge Number  : 1506036327
			|-Header Length       : 10 DWORDS or 40 BYTES
			|-Urgent Flag         : 0
			|-Acknowledgement Flag: 1
			|-Push Flag           : 0
			|-Reset Flag          : 0
			|-Synchronise Flag    : 1
			|-Finish Flag         : 0
			|-Window              : 8192
			|-Checksum            : 55364
			|-Urgent Pointer      : 0
Ethernet Header
   20 47 47 DE 87 14 58 69 6C 91 13 BA 08 00                 GG...Xil.....
IP Header
   45 00 00 3C 0B BB 40 00 36 06 47 ED 77 4B D9 6D          E..<..@.6.G.wK.m
   DE 1A C2 40 01 BB AF C2 D0 F7 3B 05 59 C4 4A 67          ...@......;.Y.Jg
   A0 12 20 00 D8 44 00 00                                  .. ..D..
TCP/UDP/ICMP Header
   02 04 05 AC 04 02 01 01 01 01 01 01 01 01 01 01          ................
   01 03 03 05 90 00 00 00 A5 7A F9 58 29 E2 6F 0F          .........z.X).o.
   36 00 00 00 36 00 00 00                                  6...6...
DATA Packet

Ethernet Header
	|-Destination Address  : 58-69-6C-91-13-BA
	|-Source Address       : 20-47-47-DE-87-14
	|-Protocol             : 8
	IP Header
		|-IP Version           : 4
		|-IP Header Length     : 5 DWORDS or 20 Bytes
		|-Type Of Service      : 0
		|-IP Total Length      : 40  Bytes(size of Packet)
		|-Identification       : 3015
		|-TTL                  : 64
		|-Protocol             : 6
		|-Checksum             : 15861
		|-Source IP            : 222.26.194.64
		|-Destination IP       : 119.75.217.109
		TCP Header
			|-Source Port         : 44994
			|-Destination Port    : 443
			|-Sequence Number     : 1506040505
			|-Acknowledge Number  : 3505867697
			|-Header Length       : 5 DWORDS or 20 BYTES
			|-Urgent Flag         : 0
			|-Acknowledgement Flag: 1
			|-Push Flag           : 0
			|-Reset Flag          : 0
			|-Synchronise Flag    : 0
			|-Finish Flag         : 1
			|-Window              : 349
			|-Checksum            : 15038
			|-Urgent Pointer      : 0
Ethernet Header
   58 69 6C 91 13 BA 20 47 47 DE 87 14 08 00                Xil... GG.....
IP Header
   45 00 00 28 0B C7 40 00 40 06 3D F5 DE 1A C2 40          E..(..@.@.=....@
   77 4B D9 6D AF C2 01 BB 59 C4 5A B9 D0 F7 4B B1          wK.m....Y.Z...K.
   50 11 01 5D 3A BE 00 00                                  P..]:...
TCP/UDP/ICMP Header
   00 00 00 00 90 00 00 00 A8 7A F9 58 76 EA 47 1A          .........z.Xv.G.
   36 00 00 00                                              6...
DATA Packet

Ethernet Header
	|-Destination Address  : 20-47-47-DE-87-14
	|-Source Address       : 58-69-6C-91-13-BA
	|-Protocol             : 8
	IP Header
		|-IP Version           : 4
		|-IP Header Length     : 5 DWORDS or 20 Bytes
		|-Type Of Service      : 0
		|-IP Total Length      : 40  Bytes(size of Packet)
		|-Identification       : 27772
		|-TTL                  : 52
		|-Protocol             : 6
		|-Checksum             : 59711
		|-Source IP            : 119.75.217.109
		|-Destination IP       : 222.26.194.64
		TCP Header
			|-Source Port         : 443
			|-Destination Port    : 44994
			|-Sequence Number     : 3505867697
			|-Acknowledge Number  : 1506040506
			|-Header Length       : 5 DWORDS or 20 BYTES
			|-Urgent Flag         : 0
			|-Acknowledgement Flag: 1
			|-Push Flag           : 0
			|-Reset Flag          : 0
			|-Synchronise Flag    : 0
			|-Finish Flag         : 1
			|-Window              : 1084
			|-Checksum            : 14302
			|-Urgent Pointer      : 0
Ethernet Header
   20 47 47 DE 87 14 58 69 6C 91 13 BA 08 00                 GG...Xil.....
IP Header
   45 00 00 28 6C 7C 40 00 34 06 E9 3F 77 4B D9 6D          E..(l|@.4..?wK.m
   DE 1A C2 40 01 BB AF C2 D0 F7 4B B1 59 C4 5A BA          ...@......K.Y.Z.
   50 11 04 3C 37 DE 00 00                                  P..<7...
TCP/UDP/ICMP Header
   AA AA 04 3C 37 DE 00 00 00 00 00 00 90 00 00 00          ...<7...........
   A8 7A F9 58                                              .z.X
DATA Packet

