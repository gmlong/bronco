# AAVEUSD 前端交互界面

这是一个完整的前端界面，用于与AAVEUSD智能合约进行交互，替代JavaScript脚本操作。

## 🌟 功能特色

### 📱 用户界面
- **现代化设计**: 使用 Tailwind CSS 构建的响应式界面
- **直观操作**: 标签页布局，功能分类清晰
- **实时反馈**: 交易状态、余额更新、价格显示
- **错误处理**: 友好的错误提示和处理

### 💼 核心功能

#### 1. 钱包连接
- 自动检测 MetaMask 钱包
- 自动切换到 BSC 测试网
- 实时显示连接状态

#### 2. 余额查询
- BNB 余额
- USDT 余额 
- AAVEUSD 余额
- 合约 USDT 余额
- 一键刷新功能

#### 3. 价格信息
- 实时 AAVE/USD 价格
- 价格聚合器信息
- 购买/赎回计算器
- 自动价格更新

#### 4. 交易操作
- **免费获取测试USDT**: 一键获取1000测试USDT
- **购买AAVEUSD**: 使用USDT购买AAVEUSD代币
- **赎回USDT**: 将AAVEUSD代币赎回为USDT
- **实时预览**: 显示预计获得数量
- **交易历史**: 记录最近10笔交易

#### 5. 管理功能 (仅合约所有者)
- 代币铸造
- 更新价格聚合器
- 紧急提取USDT
- 合约信息查看

## 🚀 使用方法

### 1. 配置合约地址

编辑 `js/config.js` 文件，更新合约地址：

```javascript
const CONTRACT_ADDRESSES = {
    bscTestnet: {
        AAVEUSD_PROXY: "0xaA9f32bE69e6b570dD9e86167A58863E002A73C1", // 您的代理合约地址
        TEST_USDT: "", // 自动从合约获取，或手动填入
        CHAINLINK_AAVE_USD: "0x298619601ebCd58d0b526963Deb2365B485Edc74"
    }
};
```

### 2. 启动前端

#### 方法一: 使用简单HTTP服务器
```bash
# 在 AAVEUSD/web 目录下
python3 -m http.server 8000
# 或者
python -m SimpleHTTPServer 8000

# 访问 http://localhost:8000
```

#### 方法二: 使用 Node.js serve
```bash
npx serve .
# 按照提示访问给出的地址
```

#### 方法三: 直接打开文件
在文件管理器中双击 `index.html` 文件

### 3. 连接钱包

1. 确保已安装 MetaMask 浏览器扩展
2. 点击右上角 "连接钱包" 按钮
3. 在 MetaMask 中选择要连接的账户
4. 系统会自动切换到 BSC 测试网

### 4. 开始使用

#### 首次使用流程:
1. **连接钱包** → 点击"连接钱包"
2. **获取测试币** → 前往交易操作标签页，点击"免费获取测试USDT"
3. **查看余额** → 在余额查询标签页查看各种代币余额
4. **查看价格** → 在价格信息标签页查看实时AAVE价格
5. **进行交易** → 在交易操作标签页进行购买/赎回操作

#### 购买AAVEUSD:
1. 切换到"交易操作"标签页
2. 在"购买AAVEUSD"区域输入要花费的USDT数量
3. 查看预计获得的AAVEUSD数量
4. 点击"购买AAVEUSD"按钮
5. 在MetaMask中确认交易

#### 赎回USDT:
1. 在"交易操作"标签页的"赎回USDT"区域
2. 输入要赎回的AAVEUSD数量
3. 查看预计获得的USDT数量
4. 点击"赎回USDT"按钮
5. 在MetaMask中确认交易

## 🔧 技术架构

### 前端技术栈
- **HTML5**: 语义化标记
- **CSS3**: Tailwind CSS框架
- **JavaScript**: ES6+ 原生JavaScript
- **Ethers.js**: 以太坊库用于区块链交互

### 文件结构
```
web/
├── index.html          # 主页面
├── js/
│   ├── config.js       # 配置文件 (网络、合约地址、ABI)
│   ├── contracts.js    # 合约交互模块
│   └── app.js         # 主应用逻辑
└── README.md          # 说明文档
```

### 模块说明

#### config.js - 配置模块
- 网络配置 (BSC测试网/主网)
- 合约地址管理
- ABI定义
- 工具函数 (格式化、解析等)

#### contracts.js - 合约交互模块
- 合约实例化
- 余额查询功能
- 价格相关功能  
- 交易功能 (购买、赎回、授权等)
- 管理员功能
- 事件监听

#### app.js - 主应用模块
- UI状态管理
- 用户交互处理
- 钱包连接管理
- 错误处理
- 通知系统

## 🛠️ 自定义配置

### 更新合约地址
如果您重新部署了合约，需要更新 `js/config.js` 中的地址。

### 更改网络
要切换到BSC主网，修改 `js/config.js`:
```javascript
const CURRENT_NETWORK = 'bscMainnet';
```

### 调整Gas设置
在 `js/config.js` 中的 `GAS_SETTINGS` 对象修改各种操作的Gas限制。

## 🔍 故障排除

### 常见问题

1. **钱包连接失败**
   - 确保已安装MetaMask
   - 检查是否在正确的网络
   - 刷新页面重试

2. **合约调用失败**
   - 检查合约地址是否正确
   - 确认合约已正确部署和初始化
   - 查看浏览器控制台错误信息

3. **交易失败**
   - 检查余额是否充足
   - 确认Gas设置是否合理
   - 查看MetaMask中的错误提示

4. **价格显示异常**
   - 检查Chainlink价格聚合器是否正常
   - 确认合约初始化是否正确

### 调试技巧

1. **打开浏览器开发者工具** (F12)
2. **查看控制台日志** - 所有操作都有详细日志
3. **检查网络请求** - 查看RPC调用是否成功
4. **使用BSCScan** - 验证交易状态和合约状态

## 📋 与脚本操作对比

### 前端界面优势:
- ✅ 用户友好的图形界面
- ✅ 实时状态反馈
- ✅ 错误处理和提示
- ✅ 无需命令行操作
- ✅ 交易历史记录
- ✅ 自动网络切换

### 脚本操作优势:
- ✅ 批量操作
- ✅ 自动化测试
- ✅ 详细日志输出
- ✅ 无需浏览器环境

## 🔗 相关链接

- [BSC测试网浏览器](https://testnet.bscscan.com/)
- [MetaMask官网](https://metamask.io/)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds/using-data-feeds)
- [BSC测试网水龙头](https://testnet.binance.org/faucet-smart)

## 📞 技术支持

如果遇到问题:
1. 检查浏览器控制台错误信息
2. 确认合约地址和网络配置
3. 验证MetaMask连接状态
4. 查看BSCScan上的合约状态 