# APPLUSD 智能合约项目

这是一个基于以太坊的可升级稳定币系统，允许用户使用USDT购买和赎回APPLUSD代币。

## 项目概述

### 核心功能
- **TestUSDT合约**: 测试用的USDT代币，任何人都可以mint
- **PriceOracleBase合约**: 独立的价格预言机基础合约，提供价格管理功能
- **APPLUSD合约**: 可升级的主合约，继承价格预言机功能，支持deposit/redeem功能

### 系统特点
- ✅ 完全去中心化的代币兑换
- ✅ 可升级的智能合约架构
- ✅ 模块化价格预言机设计，支持继承复用
- ✅ 完整的事件日志
- ✅ 权限控制和安全检查
- ✅ 优雅的代码架构，职责分离

## 快速开始

### 1. 环境准备
```bash
# 安装依赖
npm install

# 编译合约
npm run compile
```

### 2. 启动本地节点
```bash
# 在第一个终端启动Hardhat节点
npm run node
```

### 3. 部署合约
```bash
# 在第二个终端部署合约到本地节点
npm run deploy
```

### 4. 运行交互演示
```bash
# 运行完整的交互演示
npm run interact
```

### 5. 运行测试
```bash
# 运行完整测试套件
npm test
```

## 合约架构

### TestUSDT.sol
- **功能**: 测试用的USDT代币
- **特点**: 6位小数，任何人可mint
- **主要函数**:
  - `mint(address to, uint256 amount)`: mint指定数量代币
  - `mintTokens(address to, uint256 amount)`: mint完整代币数量

### PriceOracleBase.sol
- **功能**: 价格预言机基础合约（抽象合约）
- **特点**: 可被其他合约继承，提供完整的价格管理功能
- **主要函数**:
  - `getAPPLPriceInUSDT()`: 获取APPL价格
  - `getUSDTAmountForAPPL(uint256 applAmount)`: 计算APPL对应的USDT数量
  - `getAPPLAmountForUSDT(uint256 usdtAmount)`: 计算USDT对应的APPL数量
  - `updatePrice(uint256 newPriceInUSDT)`: 更新价格（仅所有者）
  - `getCurrentRate()`: 获取当前汇率
- **内部函数**:
  - `__PriceOracleBase_init(uint256 initialPrice)`: 初始化价格预言机
  - `_getCurrentPrice()`: 获取当前价格（供子合约使用）
  - `_setPrice(uint256 price)`: 设置价格（供子合约使用）

### APPLUSD.sol
- **功能**: 主要的可升级代币合约
- **特点**: ERC20代币，支持UUPS升级模式，继承PriceOracleBase价格功能
- **继承关系**: `APPLUSD` → `PriceOracleBase` → `OwnableUpgradeable`
- **存取功能**:
  - `deposit(uint256 usdtAmount)`: 存入USDT购买APPLUSD
  - `redeem(uint256 applAmount)`: 赎回APPLUSD获得USDT
  - `getAPPLAmountForDeposit(uint256 usdtAmount)`: 预览购买数量
  - `getUSDTAmountForRedeem(uint256 applAmount)`: 预览赎回数量

## 使用示例

### 基本操作流程

1. **mint测试USDT**
```javascript
await testUSDT.mintTokens(userAddress, 1000); // mint 1000 USDT
```

2. **授权APPLUSD合约**
```javascript
await testUSDT.approve(applusdAddress, amount);
```

3. **存入USDT购买APPLUSD**
```javascript
await applusd.deposit(ethers.parseUnits("260", 6)); // 存入260 USDT，获得1 APPLUSD
```

4. **赎回APPLUSD获得USDT**
```javascript
await applusd.redeem(ethers.parseUnits("1", 18)); // 赎回1 APPLUSD，获得260 USDT
```

5. **更新价格（仅所有者）**
```javascript
await applusd.updatePrice(ethers.parseUnits("280", 6)); // 更新为280 USDT per APPL
```

## 脚本说明

### 部署脚本 (`scripts/deploy.js`)
- 部署TestUSDT和APPLUSD合约
- 自动配置合约关联
- 验证继承的价格预言机功能
- 生成deployment.json文件
- 验证部署结果

### 交互脚本 (`scripts/interact.js`)
- 完整的系统演示
- 多用户操作示例
- 价格更新功能演示
- 余额和状态验证
- 数学计算验证

### 测试套件 (`test/APPLUSD.test.js` & `test/TestUSDT.test.js`)
- 全面的单元测试
- 继承价格预言机功能测试
- 集成测试
- 边界情况测试
- 升级功能测试
- 专门的TestUSDT测试

## 网络配置

### 本地开发网络
```bash
# Hardhat内置网络（测试用）
npm run deploy:hardhat
npm run interact:hardhat

# 本地节点网络（持久化）
npm run node        # 启动节点
npm run deploy      # 部署到本地节点
npm run interact    # 与本地节点交互
```

## 汇率机制

- **固定汇率**: 1 APPLUSD = 260 USDT（初始值，可调整）
- **精度处理**: USDT使用6位小数，APPLUSD使用18位小数
- **计算公式**:
  - USDT → APPLUSD: `applAmount = (usdtAmount * 1e18) / priceInUSDT`
  - APPLUSD → USDT: `usdtAmount = (applAmount * priceInUSDT) / 1e18`
- **价格更新**: 所有者可以调用`updatePrice()`函数更新汇率

## 架构优势

### 模块化设计
- ✅ 价格预言机功能独立成基础合约
- ✅ 可被其他项目继承复用
- ✅ 职责分离，代码清晰
- ✅ 便于单元测试和维护

### 继承架构
- ✅ APPLUSD继承PriceOracleBase，获得完整价格功能
- ✅ 避免代码重复，提高复用性
- ✅ 支持未来扩展和定制
- ✅ 保持升级兼容性

### 部署简化
- ✅ 只需部署2个合约（TestUSDT + APPLUSD）
- ✅ PriceOracleBase作为基础库自动包含
- ✅ 减少合约间调用，节省gas
- ✅ 简化用户交互

## 安全特性

- ✅ 可升级合约使用UUPS代理模式
- ✅ 所有关键函数都有权限控制
- ✅ 输入参数验证和边界检查
- ✅ 重入攻击保护
- ✅ 零地址检查
- ✅ 余额充足性检查
- ✅ 价格更新权限控制

## 事件日志

```solidity
// APPLUSD合约事件
event Deposit(address indexed user, uint256 usdtAmount, uint256 applAmount);
event Redeem(address indexed user, uint256 applAmount, uint256 usdtAmount);
event USDTTokenUpdated(address newUSDTToken);

// PriceOracleBase合约事件
event PriceUpdated(uint256 newPrice, uint256 timestamp);
```

## 继承关系图

```
                    Initializable
                         |
    ┌─────────────────────┼─────────────────────┐
    |                     |                     |
OwnableUpgradeable   ERC20Upgradeable   UUPSUpgradeable
    |                     |                     |
    └─── PriceOracleBase ─┼─────── APPLUSD ─────┘
                          |
                     IERC20 (usdtToken)
```

## 测试结果

- ✅ **46项测试全部通过**
- ✅ **Gas优化良好** (继承方式减少代码重复)
- ✅ **完整的功能覆盖** (部署、mint、存入、赎回、价格更新、升级)
- ✅ **边界情况处理** (零值、余额不足、权限控制等)
- ✅ **继承架构验证通过**

## 技术栈

- **Solidity**: ^0.8.28
- **Hardhat**: 开发框架
- **OpenZeppelin**: 安全的智能合约库
- **Ethers.js**: 以太坊交互库

## 许可证

MIT License
