---
title: "LinuxMint Mate中WiFi自动关闭问题"
date: 2017-09-22
type: post
isCJKLanguage: true
categories:
    - "折腾工具"
---

# LinuxMint Mate中WiFi自动关闭问题
在安装了LinuxMint Mate后，发现WiFi经常自动关闭，花了一点时间发现了解决办法，记录下来以防再次掉坑。
LinuxMint主流的桌面版本有Cinnamon、Mate和Xfce，Cinnamon是我之前用的版本，有一个小问题是每次开机都需要手动选择输入法，否则输入中文时无法显示候选框。
本着不断体验的精神，重装的时候选择了Mate，但是装好后发现WiFi总是掉线，需要不断重启才行，十分不方便。由于每次开启蓝牙都会自启动，所以我之前都设置了蓝牙开机后立即关闭的，在Cinnamon上没有问题。但Mate上WiFi中断好像就是这个原因造成的，只需要保持蓝牙开启即可。
总结:强如LinuxMint也是有坑的！

