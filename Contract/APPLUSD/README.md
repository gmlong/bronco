# APPLUSD 智能合约项目

这是一个基于以太坊的可升级稳定币系统，允许用户使用USDT购买和赎回APPLUSD代币。

## 项目概述

### 核心功能
- **TestUSDT合约**: 测试用的USDT代币，任何人都可以mint
- **PriceOracle合约**: 价格预言机，固定USDT/APPL汇率为260:1  
- **APPLUSD合约**: 可升级的主合约，支持deposit/redeem功能

### 系统特点
- ✅ 完全去中心化的代币兑换
- ✅ 可升级的智能合约架构
- ✅ 固定汇率兑换机制
- ✅ 完整的事件日志
- ✅ 权限控制和安全检查

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

### PriceOracle.sol  
- **功能**: 价格预言机合约
- **特点**: 固定1 APPL = 260 USDT
- **主要函数**:
  - `getAPPLPriceInUSDT()`: 获取APPL价格
  - `getUSDTAmountForAPPL(uint256 applAmount)`: 计算APPL对应的USDT数量
  - `getAPPLAmountForUSDT(uint256 usdtAmount)`: 计算USDT对应的APPL数量
  - `updatePrice(uint256 newPriceInUSDT)`: 更新价格（仅所有者）

### APPLUSD.sol
- **功能**: 主要的可升级代币合约
- **特点**: ERC20代币，支持UUPS升级模式
- **主要函数**:
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

## 脚本说明

### 部署脚本 (`scripts/deploy.js`)
- 部署所有合约
- 自动配置合约关联
- 生成deployment.json文件
- 验证部署结果

### 交互脚本 (`scripts/interact.js`)
- 完整的系统演示
- 多用户操作示例
- 余额和状态验证
- 数学计算验证

### 测试套件 (`test/APPLUSD.test.js`)
- 全面的单元测试
- 集成测试
- 边界情况测试
- 升级功能测试

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

- **固定汇率**: 1 APPLUSD = 260 USDT
- **精度处理**: USDT使用6位小数，APPLUSD使用18位小数
- **计算公式**:
  - USDT → APPLUSD: `applAmount = (usdtAmount * 1e18) / (260 * 1e6)`
  - APPLUSD → USDT: `usdtAmount = (applAmount * 260 * 1e6) / 1e18`

## 安全特性

- ✅ 可升级合约使用UUPS代理模式
- ✅ 所有关键函数都有权限控制
- ✅ 输入参数验证和边界检查
- ✅ 重入攻击保护
- ✅ 零地址检查
- ✅ 余额充足性检查

## 事件日志

```solidity
event Deposit(address indexed user, uint256 usdtAmount, uint256 applAmount);
event Redeem(address indexed user, uint256 applAmount, uint256 usdtAmount);
event PriceUpdated(uint256 newPrice, uint256 timestamp);
```

## 技术栈

- **Solidity**: ^0.8.20
- **Hardhat**: 开发框架
- **OpenZeppelin**: 安全的智能合约库
- **Ethers.js**: 以太坊交互库

## 许可证

MIT License
