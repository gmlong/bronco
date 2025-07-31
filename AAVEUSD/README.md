# AAVEUSD - 可升级的AAVE价格锚定代币

基于Chainlink价格预言机的可升级ERC20代币，支持存款/赎回功能。

## 🎯 项目概述

AAVEUSD是一个创新的DeFi代币项目，具有以下特点：

- **🔮 实时价格**: 集成Chainlink预言机获取AAVE/USD实时价格
- **🔄 可升级**: 使用OpenZeppelin UUPS代理模式，支持合约升级
- **💎 零小数**: 代币精度为0，使用整数计量
- **💳 存款赎回**: 支持USDT存款购买AAVEUSD，赎回AAVEUSD换取USDT
- **🛡️ 安全保障**: 基于OpenZeppelin标准，经过充分测试

## 📋 合约信息

### BSC测试网部署地址
- **AAVEUSD代理合约**: `0x33Aa7D36b96F77CDef1cF07bfC33a210e7309de4`
- **TestUSDT合约**: `0x4faFeBeF2e920379478AF6C05ABC9C39260Ccd91`
- **Chainlink AAVE/USD**: `0x298619601ebCd58d0b526963Deb2365B485Edc74`

### 合约特性
```
AAVEUSD代币:
├── 名称: AAVE USD Token
├── 符号: AAVEUSD  
├── 小数位: 0 (整数代币)
├── 模式: UUPS可升级代理
└── 功能: 存款/赎回/价格查询
```

## 🛠️ 环境准备

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
创建`.env`文件：
```env
PRIVATE_KEY=你的私钥
BSCSCAN_API_KEY=你的BSCScan API密钥
AAVE_USD_PRICE_FEED_TESTNET=0x298619601ebCd58d0b526963Deb2365B485Edc74
AAVE_USD_PRICE_FEED_MAINNET=主网价格预言机地址
```

### 3. 网络配置
确保Hardhat配置了BSC网络：
```javascript
// hardhat.config.js已配置
bscTestnet: {
  url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  accounts: [process.env.PRIVATE_KEY]
}
```

## 🚀 快速开始

### 编译合约
```bash
npm run compile
```

### 部署到BSC测试网
```bash
npm run deploy:bsc-testnet
```

### 升级合约
```bash
npm run upgrade:bsc-testnet
```

## 📜 可用脚本

### 部署相关
```bash
npm run deploy:bsc-testnet     # 部署到BSC测试网
npm run deploy:bsc-mainnet     # 部署到BSC主网
npm run upgrade:bsc-testnet    # 升级测试网合约
npm run upgrade:bsc-mainnet    # 升级主网合约
```

### 测试相关
```bash
npm run test-price:bsc-testnet           # 测试价格预言机
npm run test-buy-redeem:bsc-testnet      # 测试购买赎回功能
npm run test-new-functions:bsc-testnet   # 测试新函数(deposit/redeem)
```

### 工具相关
```bash
npm run proxy-info:bsc-testnet     # 获取代理合约信息
npm run deployment-info            # 查看部署信息
npm run diagnose:bsc-testnet       # 诊断合约状态
```

### 验证相关
```bash
npm run verify:bsc-testnet         # 验证测试网合约
npm run verify:bsc-mainnet         # 验证主网合约
```

## 💎 核心功能

### 1. 存款功能 (deposit)
用户可以存款USDT购买AAVEUSD代币：
```javascript
// 存款1000 USDT
await aaveusd.deposit(ethers.utils.parseUnits("1000", 6));
```

**计算公式**:
```
AAVEUSD数量 = (USDT数量 × 100) ÷ AAVE价格
```

### 2. 赎回功能 (redeem)
用户可以赎回AAVEUSD换取USDT：
```javascript
// 赎回100个AAVEUSD
await aaveusd.redeem(100);
```

**计算公式**:
```
USDT数量 = (AAVEUSD数量 × AAVE价格) ÷ 100
```

### 3. 价格查询
```javascript
// 获取当前AAVE价格 (8位小数)
const price = await aaveusd.getCurrentPrice();

// 计算购买数量
const tokenAmount = await aaveusd.getTokenAmountForUSDT(usdtAmount);

// 计算赎回数量  
const usdtAmount = await aaveusd.getUSDTAmountForTokens(tokenAmount);
```

### 4. 向后兼容
保持对旧版本的兼容性：
```javascript
// 旧函数仍然可用
await aaveusd.buyTokens(usdtAmount);     // 等同于 deposit()
await aaveusd.redeemTokens(tokenAmount); // 等同于 redeem()
```

## 🔧 合约架构

```
AAVEUSD.sol
├── ERC20Upgradeable          # 标准ERC20功能
├── ChainlinkPriceOracle      # 价格预言机
├── UUPSUpgradeable          # 可升级代理
└── Ownable                  # 权限管理

支持的合约:
├── TestUSDT.sol             # 测试用USDT代币
└── ChainlinkPriceOracle.sol # 价格预言机基类
```

## 📊 事件系统

### Deposited 事件
```solidity
event Deposited(
    address indexed user,
    uint256 usdtAmount,
    uint256 tokenAmount, 
    uint256 price
);
```

### Redeemed 事件
```solidity
event Redeemed(
    address indexed user,
    uint256 tokenAmount,
    uint256 usdtAmount,
    uint256 price
);
```

## 🧪 测试流程

### 完整测试流程示例
```bash
# 1. 测试价格预言机
npm run test-price:bsc-testnet

# 2. 测试存款赎回
npm run test-buy-redeem:bsc-testnet

# 3. 测试新功能
npm run test-new-functions:bsc-testnet
```

### 手动测试步骤
1. **准备测试代币**: 使用`TestUSDT.freeMint()`铸造测试USDT
2. **授权代币**: 使用`TestUSDT.approve()`授权AAVEUSD合约
3. **存款测试**: 调用`AAVEUSD.deposit()`存款
4. **赎回测试**: 调用`AAVEUSD.redeem()`赎回
5. **验证余额**: 检查USDT和AAVEUSD余额变化

## 🔐 安全特性

### 访问控制
- **onlyOwner**: 只有合约所有者可以调用的函数
  - `mint()`: 铸造代币
  - `emergencyWithdrawUSDT()`: 紧急提取USDT
  - `updatePriceFeed()`: 更新价格预言机
  - `_authorizeUpgrade()`: 授权升级

### 安全检查
- **余额验证**: 存款前检查USDT余额和授权
- **合约余额**: 赎回前检查合约USDT余额是否充足
- **价格验证**: 确保获取到有效的价格数据
- **数量验证**: 防止零数量或负数量操作

## 🔗 相关链接

### 区块链浏览器
- **代理合约**: [BSCScan](https://testnet.bscscan.com/address/0x33Aa7D36b96F77CDef1cF07bfC33a210e7309de4)
- **TestUSDT**: [BSCScan](https://testnet.bscscan.com/address/0x4faFeBeF2e920379478AF6C05ABC9C39260Ccd91)

### 获取测试代币
- **BSC测试网水龙头**: https://testnet.binance.org/faucet-smart
- **TestUSDT铸造**: 调用合约的`freeMint()`函数

### 开发工具
- **Hardhat**: https://hardhat.org/
- **OpenZeppelin**: https://openzeppelin.com/
- **Chainlink**: https://docs.chain.link/

## 📋 常见问题

### Q: 为什么AAVEUSD是0位小数？
A: 简化计算和用户体验，避免小数点操作的复杂性。

### Q: 如何获取测试USDT？
A: 连接BSC测试网，调用TestUSDT合约的`freeMint()`函数。

### Q: 价格是如何计算的？
A: 使用Chainlink提供的AAVE/USD实时价格，结合USDT的6位小数和AAVEUSD的0位小数进行换算。

### Q: 合约可以升级吗？
A: 是的，使用UUPS代理模式，合约所有者可以升级合约逻辑。

### Q: 如何查看合约在代理上的函数？
A: 在BSCScan上点击"Is this a proxy?"按钮，或手动验证实现合约。

## 🐛 故障排除

### 常见错误及解决方案

**1. "Token amount too small"**
```
原因: 输入的USDT数量太少，计算出的代币数量为0
解决: 增加USDT数量，建议至少1000 USDT
```

**2. "Insufficient USDT in contract"**
```
原因: 合约中USDT余额不足以支付赎回
解决: 等待更多用户存款，或联系管理员
```

**3. "USDT transfer failed"** 
```
原因: USDT授权不足或余额不够
解决: 检查USDT余额和授权额度
```

**4. "Invalid price"**
```
原因: 无法获取有效的价格数据
解决: 检查Chainlink预言机状态
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目使用 MIT 许可证。详见 `LICENSE` 文件。

## ⚠️ 免责声明

本项目仅用于学习和测试目的。请在使用前进行充分的安全审计。作者不对任何损失承担责任。

---

**🎯 快速开始**: `npm install && npm run deploy:bsc-testnet`  
**📞 技术支持**: 请提交GitHub Issue
