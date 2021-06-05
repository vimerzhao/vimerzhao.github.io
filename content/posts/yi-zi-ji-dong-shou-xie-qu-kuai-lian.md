---
title: "【译】自己动手写区块链"
date: 2018-04-01
type: post
isCJKLanguage: true
categories:
    - "历史归档"
---

# 【译】自己动手写区块链
目前大多数对于区块链的文章都是停留在概念性的描述，大肆宣扬其颠覆性，本文则反其道行之，以一个程序员的视角，通过300行代码，快速实现了一个区块链原型。虽然没有覆盖区块链的全部内容（如Merkle树），但对于理解区块链的核心技术仍大有裨益。
--译者注

能够点进这篇文章，说明你也像我一样对加密货币的兴起十分激动，并想了解加密货币的支撑技术---区块链是如何工作的。
但理解区块链并不那么轻松，至少对我来说如此。我看了很多相关的视频和教程，却沮丧地发现实例真是太少了。
我喜欢通过实践学习。这种方式使我在代码层面思考问题，并发现关键所在。如果你和我一样，那么在本文结尾你将构建一个功能完备的区块链并对其工作机制有深刻的理解。

## 写在开始之前。。。
首先，区块链是一系列称作区块（Block）的结构顺序链接而成的不可改变的记录。块中可以包含交易记录、文件或者其他任何你想存储的数据。需要注意的是块与块之间通过hash值链接。如果你不清楚hash是什么，请参考[What Are Hash Functions](https://learncryptography.com/hash-functions/what-are-hash-functions)。

**本文适合哪些人看？**你应该懂得一些基本的Python知识，同时也应该对HTTP请求有所理解，因为我们的区块链是运行在HTTP协议之上的。

**我需要准备什么？**请确保Python3.6及以上版本和pip工具已经安装。还需要安装Flask和`requests`库。
```
pip install Flask==0.12.2 requests==2.18.4
```
对了，你还需要一个HTTP客户端，比如Postman或者cURL，当然，其他的也可以。

**最终的代码哪里可以获取？**[点击这里](https://github.com/dvf/blockchain)

## 第一步：构建区块链
创建一个新的Python文件，名为`blockchain.py`，我们所有的逻辑都在一个文件完成。
### 表示一个区块链
我们创建一个`BlockChain`类，其构造器会创建两个列表，一个存储区块链，另一个存储交易。下面是我们这个类的第一个版本：

```
class Blockchain(object):
    def __init__(self):
        self.chain = []
        self.current_transactions = []
        
    def new_block(self):
        ## Creates a new Block and adds it to the chain
        pass
    
    def new_transaction(self):
        ## Adds a new transaction to the list of transactions
        pass
    
    @staticmethod
    def hash(block):
        ## Hashes a Block
        pass

    @property
    def last_block(self):
        ## Returns the last Block in the chain
        pass
```

我们的`BlockChain`类负责管理整个区块链，它会存储交易并为新增区块等操作提供辅助方法。下面，我们来实现这些方法。
### 区块是什么
每个区块都有一个索引（index），一个时间戳（timestamp），一系列交易，一个工作量证明（稍后详述）和前置区块的哈希值。下面是单个区块的一个简单实例：

```
block = {
    'index': 1,
    'timestamp': 1506057125.900785,
    'transactions': [
        {
            'sender': "8527147fe1f5426f9dd545de4b27ee00",
            'recipient': "a77f5cdfa2934df3954a5c7c7da5df1f",
            'amount': 5,
        }
    ],
    'proof': 324984774000,
    'previous_hash': "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
}
```
显而易见，所有的区块会构成一条链---因为每个区块都保存了前一区块的hash值。这就是区块链不可篡改的重要原因：如果攻击者损坏了某一区块，那么后面所有的区块都会作废。
如果你不明白上面的话，请花一些时间理解，因为这是区块链的核心思想。
### 向区块添加交易
我们需要一个方法来向区块中添加交易记录，这里命名为`new_transaction()`，代码写的十分直白易懂：
```
class Blockchain(object):
    ...
    
    def new_transaction(self, sender, recipient, amount):
        """
        Creates a new transaction to go into the next mined Block
        :param sender: <str> Address of the Sender
        :param recipient: <str> Address of the Recipient
        :param amount: <int> Amount
        :return: <int> The index of the Block that will hold this transaction
        """

        self.current_transactions.append({
            'sender': sender,
            'recipient': recipient,
            'amount': amount,
        })

        return self.last_block['index'] + 1
```
在`new_transaction()`方法将交易添加进区块之后，区块索引将会被返回，该区块将可能被开采为链的最新区块，这在之后用户提交交易的时候十分有用。

### 创建新区块
当`BlockChain`类初始化的时候，我们需要产生一个创世区块（genesis block，即没有前置区块的区块）作为区块链的第一个区块。我们还需要添加一个`proof`字段在创世区块中作为挖矿的结果（或者说本次工作量的证明），我们将在后文继续讨论挖矿。
除了产生创世区块，我们还需要完成一些其他辅助方法(`new_block()`,`new_transaction()`和`hash()`)：
```
import hashlib
import json
from time import time


class Blockchain(object):
    def __init__(self):
        self.current_transactions = []
        self.chain = []

        ## Create the genesis block
        self.new_block(previous_hash=1, proof=100)

    def new_block(self, proof, previous_hash=None):
        """
        Create a new Block in the Blockchain
        :param proof: <int> The proof given by the Proof of Work algorithm
        :param previous_hash: (Optional) <str> Hash of previous Block
        :return: <dict> New Block
        """

        block = {
            'index': len(self.chain) + 1,
            'timestamp': time(),
            'transactions': self.current_transactions,
            'proof': proof,
            'previous_hash': previous_hash or self.hash(self.chain[-1]),
        }

        ## Reset the current list of transactions
        self.current_transactions = []

        self.chain.append(block)
        return block

    def new_transaction(self, sender, recipient, amount):
        """
        Creates a new transaction to go into the next mined Block
        :param sender: <str> Address of the Sender
        :param recipient: <str> Address of the Recipient
        :param amount: <int> Amount
        :return: <int> The index of the Block that will hold this transaction
        """
        self.current_transactions.append({
            'sender': sender,
            'recipient': recipient,
            'amount': amount,
        })

        return self.last_block['index'] + 1

    @property
    def last_block(self):
        return self.chain[-1]

    @staticmethod
    def hash(block):
        """
        Creates a SHA-256 hash of a Block
        :param block: <dict> Block
        :return: <str>
        """

        ## We must make sure that the Dictionary is Ordered, or we'll have inconsistent hashes
        block_string = json.dumps(block, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()
  
```
上面的代码十分直白，我还添加了一些注释帮助理解。我们几乎完成了表示一个区块链的工作。但此时，你应该思考下一个区块是如何产生或者说被开采出来的。
### 理解工作量证明机制（Proof of Work）
工作量证明（PoW）算法是用来产生或开采区块的一种机制，PoW的目标是找到一个符合要求的数字，从算力的角度来说这个数字对任何人来说都很难找到却十分容易验证（是否符合要求）。这就是PoW算法的核心思想。
我们举一个非常简单的例子来帮助理解：
假定我们需要找到一个整数y，使得他和整数x的乘积的哈希值以0结尾，即`hash(x*y) = ac23dc...0`。如果`x=5`那么用Python实现如下：
```
from hashlib import sha256
x = 5
y = 0  ## We don't know what y should be yet...
while sha256(f'{x*y}'.encode()).hexdigest()[-1] != "0":
    y += 1
print(f'The solution is y = {y}')
```
第一个符合要求的数是`y=21`，因为：
```
hash(5 * 21) = 1253e9373e...5e3600155e860
```
在比特币世界中，PoW算法被称为哈希现金（[Hashcash](https://en.wikipedia.org/wiki/Hashcash)）,它和我们上面的例子没有本质区别。在这算法中，矿工们开始了解决问题的竞赛，优胜者可以产生一个新的区块。通常来说，难度取决于限制字符的数量。矿工将会因为找到一个合法的解答收到一些比特币作为奖励，整个比特币网络能够很容易验证矿工挖掘的区块是否合法有效。
### 实现基本的PoW算法
下面来为我们的区块链实现一个类似的算法，我们的规则将会和上面的例子十分接近：找到一个数p，使得它与前置区块的哈希值由4个0开头。
```
import hashlib
import json

from time import time
from uuid import uuid4


class Blockchain(object):
    ...
        
    def proof_of_work(self, last_proof):
        """
        Simple Proof of Work Algorithm:
         - Find a number p' such that hash(pp') contains leading 4 zeroes, where p is the previous p'
         - p is the previous proof, and p' is the new proof
        :param last_proof: <int>
        :return: <int>
        """

        proof = 0
        while self.valid_proof(last_proof, proof) is False:
            proof += 1

        return proof

    @staticmethod
    def valid_proof(last_proof, proof):
        """
        Validates the Proof: Does hash(last_proof, proof) contain 4 leading zeroes?
        :param last_proof: <int> Previous Proof
        :param proof: <int> Current Proof
        :return: <bool> True if correct, False if not.
        """

        guess = f'{last_proof}{proof}'.encode()
        guess_hash = hashlib.sha256(guess).hexdigest()
        return guess_hash[:4] == "0000"
```
我们可以通过设置前导0的个数调整算法的难度，但4个足够了，你会发现增加一个0会使找到一个答案的时间大大增加。我们的类几乎完成了，现在我们将通过HTTP请求与区块链进行交互。
## 第二步：将区块链作为API
我们将使用Flask，它是一个轻量级的框架，可以很容易将一个网络节点映射为Python函数，这让我们可以通过HTTP请求与区块链交互。我们将创建以下方法：
- `/transactions/new`建立一个新的区块。
- `/mine`告诉服务器开采一个新的区块
- `/chain`返回整个区块链

### 设置Flask
我们的每个服务器将对应区块链网络中的一个单一节点。下面是样板代码：
```
import hashlib
import json
from textwrap import dedent
from time import time
from uuid import uuid4

from flask import Flask


class Blockchain(object):
    ...


## Instantiate our Node
app = Flask(__name__)

## Generate a globally unique address for this node
node_identifier = str(uuid4()).replace('-', '')

## Instantiate the Blockchain
blockchain = Blockchain()


@app.route('/mine', methods=['GET'])
def mine():
    return "We'll mine a new Block"
  
@app.route('/transactions/new', methods=['POST'])
def new_transaction():
    return "We'll add a new transaction"

@app.route('/chain', methods=['GET'])
def full_chain():
    response = {
        'chain': blockchain.chain,
        'length': len(blockchain.chain),
    }
    return jsonify(response), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```
下面是简单的解释：
- 15行：实例化节点，关于Flask点击[Quick Start](http://flask.pocoo.org/docs/0.12/quickstart/#a-minimal-application)
- 18行：为节点创建一个随机名字
- 21行：实例化`BlockChain`类
- 24-26行：创建`/mine`节点，这是一个`GET`请求。
- 28-30行：创建`/transactions/new`节点，因为需要发送数据，所以是`POST`请求。
- 32-38行：创建`/chain`节点，返回整个区块链
- 40-41行：运行服务器5000端口

### 交易节点
用户会想服务器发送交易请求，格式类似下面这样：
```
{
 "sender": "my address",
 "recipient": "someone else's address",
 "amount": 5
}
```
因为我们已经实现了将交易加入区块的方法，所以剩余部分十分容易：
```
import hashlib
import json
from textwrap import dedent
from time import time
from uuid import uuid4

from flask import Flask, jsonify, request

...

@app.route('/transactions/new', methods=['POST'])
def new_transaction():
    values = request.get_json()

    ## Check that the required fields are in the POST'ed data
    required = ['sender', 'recipient', 'amount']
    if not all(k in values for k in required):
        return 'Missing values', 400

    ## Create a new Transaction
    index = blockchain.new_transaction(values['sender'], values['recipient'], values['amount'])

    response = {'message': f'Transaction will be added to Block {index}'}
    return jsonify(response), 201
```
### 挖矿节点
挖矿节点很简单但也很神奇，他需要完成以下任务：
1. 计算执行PoW算法
2. 通过添加一笔交易奖励矿工1比特币
3. 产生新的区块并添加入链

```
import hashlib
import json

from time import time
from uuid import uuid4

from flask import Flask, jsonify, request

...

@app.route('/mine', methods=['GET'])
def mine():
    ## We run the proof of work algorithm to get the next proof...
    last_block = blockchain.last_block
    last_proof = last_block['proof']
    proof = blockchain.proof_of_work(last_proof)

    ## We must receive a reward for finding the proof.
    ## The sender is "0" to signify that this node has mined a new coin.
    blockchain.new_transaction(
        sender="0",
        recipient=node_identifier,
        amount=1,
    )

    ## Forge the new Block by adding it to the chain
    previous_hash = blockchain.hash(last_block)
    block = blockchain.new_block(proof, previous_hash)

    response = {
        'message': "New Block Forged",
        'index': block['index'],
        'transactions': block['transactions'],
        'proof': block['proof'],
        'previous_hash': block['previous_hash'],
    }
    return jsonify(response), 200
```
需要注意的是接受被开采区块的地址就是我们的节点，并且我们的大部分工作就是和`BlockChain`类的方法交互。我们已经完成了这部分，现在可以开始和区块链交互了。

## 第三步：和区块链交互
你可以使用简单古老的cURL或者Postman来和这些网络中的API交互，首先启动服务器：
```
$ python blockchain.py
* Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
```
让我们发送一个`GET`请求来开采一个区块：
```
http://localhost:5000/mine
```

![Using Postman to make a GET request](http://p2pe8gnn5.bkt.clouddn.com/learn_blockchain_1.png)

再向`http://localhost:5000/transactions/new`发送一个`POST`请求，参数是JSON格式的交易数据：

![Using Postman to make a POST request](http://p2pe8gnn5.bkt.clouddn.com/learn_blockchain_2.png)

如果不想用Postman，cURL也可以做到：

```
$ curl -X POST -H "Content-Type: application/json" -d '{
 "sender": "d4ee26eee15148ee92c6cd394edd974e",
 "recipient": "someone-other-address",
 "amount": 5
}' "http://localhost:5000/transactions/new"
```

我重启了服务器并开采了两个区块，所以现在总共有3个了，通过`http://localhost:5000/chain`节点可以获取整个区块：

```
{
  "chain": [
    {
      "index": 1,
      "previous_hash": 1,
      "proof": 100,
      "timestamp": 1506280650.770839,
      "transactions": []
    },
    {
      "index": 2,
      "previous_hash": "c099bc...bfb7",
      "proof": 35293,
      "timestamp": 1506280664.717925,
      "transactions": [
        {
          "amount": 1,
          "recipient": "8bbcb347e0634905b0cac7955bae152b",
          "sender": "0"
        }
      ]
    },
    {
      "index": 3,
      "previous_hash": "eff91a...10f2",
      "proof": 35089,
      "timestamp": 1506280666.1086972,
      "transactions": [
        {
          "amount": 1,
          "recipient": "8bbcb347e0634905b0cac7955bae152b",
          "sender": "0"
        }
      ]
    }
  ],
  "length": 3
}
```

## 第四步：共识机制
我们已经拥有了一个能接收交易的初级区块链，并且能够开采出新的区块。但整个区块链最核心的是去中心化，如果去中心了，我们又如何保证所有节点对应的是统一区块链呢？这就是共识问题，如果我们希望网络中有不止一个节点，就必须实现共识算法。
### 注册新节点
在实现共识算法之前，我们需要让节点知道有其他节点加入了网络。网络中的每一个节点应该存留其他全部节点的注册表，因此我们需要一些其他的服务器节点：
1. `/nodes/register`用来从URL中接收一系列节点
2. `/nodes/resolve`实现共识算法，并解决冲突以保证节点拥有正确的链
我们需要修改`BlockChain`类的构造器并提供一个方法来注册节点：

```
...
from urllib.parse import urlparse
...


class Blockchain(object):
    def __init__(self):
        ...
        self.nodes = set()
        ...

    def register_node(self, address):
        """
        Add a new node to the list of nodes
        :param address: <str> Address of node. Eg. 'http://192.168.0.5:5000'
        :return: None
        """

        parsed_url = urlparse(address)
        self.nodes.add(parsed_url.netloc)
```

现在可以使用`set()`来存储节点列表。这保证了节点的添加是幂等的，即一个节点无论添加多少次只会出现一次。
### 实现共识算法
当一个节点的区块链和另一节点的区块链不同时，冲突就发生了。为了解决这个问题，我们需要制定规则：最长有效链最有权威性，即网络中最长的那条链是真正的区块链。使用这个算法，我们能够达成大多数节点的一致。

```
...
import requests


class Blockchain(object)
    ...
    
    def valid_chain(self, chain):
        """
        Determine if a given blockchain is valid
        :param chain: <list> A blockchain
        :return: <bool> True if valid, False if not
        """

        last_block = chain[0]
        current_index = 1

        while current_index < len(chain):
            block = chain[current_index]
            print(f'{last_block}')
            print(f'{block}')
            print("\n-----------\n")
            ## Check that the hash of the block is correct
            if block['previous_hash'] != self.hash(last_block):
                return False

            ## Check that the Proof of Work is correct
            if not self.valid_proof(last_block['proof'], block['proof']):
                return False

            last_block = block
            current_index += 1

        return True

    def resolve_conflicts(self):
        """
        This is our Consensus Algorithm, it resolves conflicts
        by replacing our chain with the longest one in the network.
        :return: <bool> True if our chain was replaced, False if not
        """

        neighbours = self.nodes
        new_chain = None

        ## We're only looking for chains longer than ours
        max_length = len(self.chain)

        ## Grab and verify the chains from all the nodes in our network
        for node in neighbours:
            response = requests.get(f'http://{node}/chain')

            if response.status_code == 200:
                length = response.json()['length']
                chain = response.json()['chain']

                ## Check if the length is longer and the chain is valid
                if length > max_length and self.valid_chain(chain):
                    max_length = length
                    new_chain = chain

        ## Replace our chain if we discovered a new, valid chain longer than ours
        if new_chain:
            self.chain = new_chain
            return True

        return False
```

`valid_chain()`通过遍历每一区块并检查proof和hash的正确与否判断链的有效性。`resolve_conflicts()`遍历所有节点，并通过上面的方法验证其有效性。如果一个有效链的长度大于当前链，那么当前链将会被替换。现在添加两个API端口，一个用来添加节点，一个用来解决冲突：

```
@app.route('/nodes/register', methods=['POST'])
def register_nodes():
    values = request.get_json()

    nodes = values.get('nodes')
    if nodes is None:
        return "Error: Please supply a valid list of nodes", 400

    for node in nodes:
        blockchain.register_node(node)

    response = {
        'message': 'New nodes have been added',
        'total_nodes': list(blockchain.nodes),
    }
    return jsonify(response), 201


@app.route('/nodes/resolve', methods=['GET'])
def consensus():
    replaced = blockchain.resolve_conflicts()

    if replaced:
        response = {
            'message': 'Our chain was replaced',
            'new_chain': blockchain.chain
        }
    else:
        response = {
            'message': 'Our chain is authoritative',
            'chain': blockchain.chain
        }

    return jsonify(response), 200
```

现在你可以用不同的计算机来构建网络中的这些节点，当然也可以用同一机器的不同端口。例如，将`5001`端口也注册进区块链网络：

![Registering a new Node](http://p2pe8gnn5.bkt.clouddn.com/learn_blockchain_3.png)

现在，如果我在第二个节点开采一个新的区块，当我在节点1调用`GET /nodes/resolve`的时候，共识算法会保证链被更新到现有网络中的最长链：

![Consensus Algorithm at Work](http://p2pe8gnn5.bkt.clouddn.com/learn_blockchain_4.png)

现在你可以找一些朋友来和你一起测试这个区块链了。

## 后记
我希望这篇文章能够激发你的灵感，毕竟我对加密货币十分狂热，我相信他会改变我们对金融、政府和记录存储的思考方式。

**Update**：我计划写这个话题的第二部分，我将进一步拓展这个区块链并支持交易验证（ Transaction Validation Mechanism），同时也将讨论如何将你的区块链产业化。
