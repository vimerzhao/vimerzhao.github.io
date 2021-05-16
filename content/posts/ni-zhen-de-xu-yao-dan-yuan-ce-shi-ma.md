---
title: "你真的需要单元测试吗?"
date: 2018-04-07
type: post
isCJKLanguage: true
---

# 你真的需要单元测试吗?
博主最近在接触一些Android单元测试方面的工作，发现自己并没有体会到大多数文章所宣传的“单元测试会带来工作效率的巨大提升”之类的诸多好处，于是本着批判与自我批判的精神对单元测试做了一番研究，以下言论仅代表个人观点，如果不足，欢迎指教。

## 单元测试不是用来找Bug的
当你看到网上诸多关于单元测试的赞美时，仔细看看你就会发现很多说的其实是TDD(Test-Driven Development，测试驱动开发)，不幸的是大多数人并没有注意区分这两个概念。在[Writing Great Unit Tests: Best and Worst Practices](http://blog.stevensanderson.com/2009/08/24/writing-great-unit-tests-best-and-worst-practises/)中，Steven Sanderson强烈表达了自己的观点：Unit testing is not about finding bugs。简单来说，当先写代码后写单元测试的时候，单元测试就成了一种发现Bug的手段，但作者根据其几十年的开发经验指出这种手段其实是十分低效的，因为即使每个功能模块都能正常工作，但是仍然不能保证模块之间、模块与用户环境之间能正确交互，而后者往往是Bug的主要来源。单元测试或许能找到一些Bug，但相比集成测试和系统测试就显得十分低效了。
既然如此，那么单元测试为何又备受追捧呢？在*How Google Tests Software*中，三位谷歌的专家介绍了谷歌的软件测试之道，总而言之就是谷歌会在开发之初设计好单元测试（其实是用代码表达需求），在开发中不断迭代以通过全部的测试（其实是完成全部需求），最终交付给测试人员的软件已经经过一轮测试，如果还有集成后的Bug，就可以交给专业的测试人员发现了。这是一种典型的敏捷开发，可以看到单元测试扮演更多的是驱动开发的角色。
作为技术标杆的谷歌已经全面引入了单元测试，那么我作为一个普通开发者为什么还要提出一番质疑呢？请看下一节。

## 单元测试的边际收益
在经济学领域，有一个著名的**边际收益递减规律**，指在投入生产要素后，每单位生产要素所能提供的产量增加发生递减（二阶导数为负）的现象。在本文讨论的场景中，投入产出如下（引自：[软件开发过程中值不值得写单元测试？ - voidint's blog](https://voidint.github.io/post/2017/10/24/ut/)）：

> 成本(投入)
> * 编写单元测试用例所额外付出的时间，短期内会拖慢项目进度。

> 收益(产出)
> * 提升代码质量。监督开发人员写出更加易于测试和可维护的代码。
> * 提升开发团队内部的协作效率。其他开发人员可以通过阅读单元测试用例来理解代码原作者的意图。
> * 保证功能实现的长期稳定。代码一旦发生与原功能意图不相符的变化，通过跑单元测试可以体现出来，即可以防止功能被无意识地破坏。
> * 提高自动化测试占比，降低其他测试方式上的投入。

在经济学中，边际收益递减现象常出现于产量的短期分析中。结合对同事的咨询以及自己的调研，这个现象在软件开发领域同样适用。当我们需要写原型或者开发一个短期紧急需求的时候，（产品、运营人员）往往要求快速交付，并且由于代码规模有限也往往不会有太多Bug，在这种短期开发中如果引入单元测试往往会适得其反，投入了双倍的时间却没有明显的附加收益。而分析*How Google Tests Software*一书中最多提及的几个项目（Chrome,Android,Gmail）可以发现，单元测试（更准确说是Test-Driven Development）的成功案例往往都是一些**架构设计良好，处于长期迭代开发，基本没有短期临时紧急需求**的产品，项目初期的单元测试往往在几年后还能使用，复用率极高（私以为**复用率某种程度上可以作为是否值得引入单元测试的标准**）。而如果一个项目**一开始没有引入单元测试、过时和糟糕的代码没有及时重构、临时短期需求偏多**，往往就没有引入单元测试的必要了。

## Jake Wharton也头疼的单元测试
Jake Wharton何许人也?答：诸多著名开源项目的作者，Android社区的旗帜人物：
![Jake Wharton Github Screenshot](http://p2pe8gnn5.bkt.clouddn.com/jake%20wharton.png)
Jake Wharton对于Android平台的单元测试也十分头痛（[Against Android Unit Tests](https://www.philosophicalhacker.com/2015/04/10/against-android-unit-tests/)），其原因也是我调研并写下本文的原因。Android相对于其他开发环境有以下几个特点：
1. 大多数代码是在与Android环境（SDK）交互，逻辑往往放在后端
2. UI与逻辑容易耦合，虽然MVP等模式的出现在尝试缓解这个问题
3. 版本众多（不同ROM），使用环境复杂（用户行为、网络波动等）导致具体环境的Bug远多于单个模块的Bug

可以想象，当你投入大量精力，使用[Robolectric](http://robolectric.org/)、[Mockito](http://site.mockito.org/)等框架模拟出一个将数据库数据发往后台的单元测试并通过测试用例后，用户却因为切换网络等小概率场景触发了Bug，你会不会感叹我要这单测有何用？类似Android这种终端环境，其边际收益递减的临界点往往更容易达到，引入单元测试犹需谨慎。

## 你的代码能做单元测试吗
结合上面的分析，哪些场景不适合做单元测试已经显而易见了，[When is unit testing inappropriate or unnecessary? [duplicate]](https://softwareengineering.stackexchange.com/questions/147055/when-is-unit-testing-inappropriate-or-unnecessary)中一个高票回答做了如下总结：
> 1. The code has no branches is trivial. A getter that returns 0 doesn't need to be tested, and changes will be covered by tests for its consumers.
2. The code simply passes through into a stable API. I'll assume that the standard library works properly.
3. The code needs to interact with other deployed systems; then an integration test is called for.
4. If the test of success/fail is something that is so difficult to quantify as to not be reliably measurable, such as steganography being unnoticeable to humans.
5. If the test itself is an order of magnitude more difficult to write than the code.
6. If the code is throw-away or placeholder code. If there's any doubt, test.

在[Definition of brittle unit tests](https://softwareengineering.stackexchange.com/questions/356236/definition-of-brittle-unit-tests/356238)中也有详细总结，都有一定参考价值。
此外，有了适合单元测试的场景并不代表就有适合单元测试的代码。在TDD模式中，测试先于开发，所以开发部分的代码接口往往需要经过良好的设计和定义，最好能解耦各个模块，如此开发代码将能够完美匹配测试代码。但这种开发模式往往对开发经验、设计能力要求很高。能都达成此境界的已经是TDD的行家了。然而事实是对于没有单元测试经验的开发人员而言，往往没有意识到自己写的代码“不可测试”。以下面伪代码为例：
```
object processObject(Object object) {
    if (object == objectA) {
        log.i('error 1 ....')
        return object;
    }
    if (object == objectB) {
        log.i('error 1 ....')
        return object;
    }
    .....
    return object;
}
```

开发人员在Debug的时候，能根据log信息快速定位问题，但对于测试来说就十分不友好了：返回值都一样。如果想要领会单元测试的优越性，短期的镇痛与适应似乎是不可避免的。

## 写在最后
本文没有讨论TDD的各种优势，也没有讨论单元测试的最佳实践，是个人的一些总结，讨论的是单元测试的一些局限之处，或许有不足、有遗漏，又或者完全错误，**欢迎拍砖**。譬如，在stackoverflow上有一个关于是否值得做单元测试的问题就因为其争议性而被关闭回答，而又因为有其存在的历史意义而被一直锁定(locked)，感兴趣可以看看：

![](http://p2pe8gnn5.bkt.clouddn.com/Is%20Unit%20Testing%20worth%20the%20effort.png)
链接：[Is Unit Testing worth the effort? - Stack Overflow](https://stackoverflow.com/questions/67299/is-unit-testing-worth-the-effort)

本文讨论的只是单元测试（TDD）的局限性，在合适的场景中其作用是巨大的，尤其是轮子级、框架级和开源项目中，了解单元测试也大有裨益。比如，我在为ChatteBot提交代码时，就因为当时不了解单元测试的作用，只修改了代码Bug而没有修改测试代码的错误（测试代码写错真是没救了）。我也因此失去了成为一个5000+ star开源项目贡献者的机会.....
![](http://p2pe8gnn5.bkt.clouddn.com/unit%20test%20example.png)

## 参考
- [Against Android Unit Tests · Philosophical Hacker](https://www.philosophicalhacker.com/2015/04/10/against-android-unit-tests/)
- [When is unit testing inappropriate or unnecessary? - Software Engineering Stack Exchange](https://softwareengineering.stackexchange.com/questions/147055/when-is-unit-testing-inappropriate-or-unnecessary)
- [tdd - When is it appropriate to not unit test? - Software Engineering Stack Exchange](https://softwareengineering.stackexchange.com/questions/66480/when-is-it-appropriate-to-not-unit-test/66487)
- [terminology - Definition of brittle unit tests - Software Engineering Stack Exchange](https://softwareengineering.stackexchange.com/questions/356236/definition-of-brittle-unit-tests/356238)
- [Writing Great Unit Tests: Best and Worst Practices](http://blog.stevensanderson.com/2009/08/24/writing-great-unit-tests-best-and-worst-practises/)
- [what to unit test, in android apps - Stack Overflow](https://stackoverflow.com/questions/16696412/what-to-unit-test-in-android-apps)
- [Definition of brittle unit tests](https://softwareengineering.stackexchange.com/questions/356236/definition-of-brittle-unit-tests/356238)
- [软件开发过程中值不值得写单元测试？ - voidint's blog](https://voidint.github.io/post/2017/10/24/ut/)
- [报酬递减 - 维基百科，自由的百科全书](https://zh.wikipedia.org/wiki/%E5%A0%B1%E9%85%AC%E9%81%9E%E6%B8%9B)
- *The Art of Unit Testing*, Roy Osherove
- *How Google Tests Software*, James A. Whittaker / Jason Arbon / Jeff Carollo

