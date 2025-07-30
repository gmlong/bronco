# BNB Chain 部署指南

这个指南将帮助您在BNB Chain Testnet和Mainnet上部署APPLUSD智能合约项目。

## 🚀 快速开始

### 1. 环境准备

#### 安装依赖
```bash
npm install
```

#### 配置环境变量
复制环境变量示例文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的配置：
```bash
# 您的私钥（从MetaMask或其他钱包导出）
PRIVATE_KEY=your_private_key_here

# BSCScan API密钥（用于验证合约）
BSCSCAN_API_KEY=your_bscscan_api_key_here

# Chainlink价格聚合器地址
AAVE_PRICE_FEED_TESTNET=0x298619601ebCd58d0b526963Deb2365B485Edc74
```

### 2. 获取测试BNB

#### BNB Chain Testnet水龙头
访问：https://testnet.bnbchain.org/faucet-smart

1. 连接您的MetaMask钱包
2. 确保网络设置为BNB Chain Testnet
3. 申请测试BNB（建议申请0.5 BNB以上）

#### 网络配置
在MetaMask中添加BNB Chain Testnet：
- **网络名称**: BNB Chain Testnet  
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **链ID**: 97
- **符号**: BNB
- **区块浏览器**: https://testnet.bscscan.com

### 3. 部署到测试网

```bash
# 编译合约
npm run compile

# 部署到BNB Chain Testnet
npm run deploy:bsc-testnet
```

### 4. 部署到主网

```bash
# 部署到BNB Chain Mainnet
npm run deploy:bsc-mainnet
```

## 📋 部署脚本功能

### 自动化部署流程
1. **账户验证** - 检查部署账户余额和网络
2. **TestUSDT部署** - 部署测试USDT代币合约
3. **APPLUSD部署** - 部署可升级的主合约
4. **Chainlink集成** - 连接真实的AAVE/USD价格聚合器
5. **功能验证** - 测试价格获取和计算功能
6. **信息保存** - 生成详细的部署报告

### 部署输出
部署完成后，您将获得：
- 合约地址
- BSCScan浏览器链接
- 部署信息JSON文件
- 验证步骤指导

## 🔍 合约验证

### 自动验证（推荐）
获取BSCScan API密钥：
1. 访问 https://bscscan.com/apis
2. 注册账户并创建API密钥
3. 将API密钥添加到 `.env` 文件

### 手动验证
如果自动验证失败，可以手动在BSCScan上验证：
1. 访问合约地址页面
2. 点击"Contract" → "Verify and Publish"
3. 选择编译器版本：0.8.28
4. 上传合约源代码

## 📊 Chainlink价格聚合器

### 支持的价格对
- **测试网**: AAVE/USD (0x298619601ebCd58d0b526963Deb2365B485Edc74)
- **主网**: 请查找最新的Chainlink价格聚合器地址

### 价格功能特性
- ✅ 实时价格获取
- ✅ 备用价格机制
- ✅ 价格有效性检查
- ✅ 管理员价格控制

## 🛠 部署后操作

### 1. 验证部署
```bash
# 检查合约是否正确部署
# 访问BSCScan查看合约状态
```

### 2. 测试功能
```bash
# 使用交互脚本测试合约功能
npm run interact:bsc-testnet
```

### 3. 初始配置
- 检查Chainlink价格是否正常获取
- 设置适当的备用价格
- 配置管理员权限

## 🔐 安全考虑

### 私钥安全
- ⚠️ 永远不要在代码中硬编码私钥
- ✅ 使用环境变量管理敏感信息
- ✅ 生产环境使用硬件钱包或多签

### 合约权限
- 部署者自动成为所有者
- 可以更新价格聚合器地址
- 可以启用/禁用备用价格模式
- 可以紧急提取资金

### 审计建议
- 在主网部署前进行充分测试
- 考虑第三方安全审计
- 设置时间锁定机制
- 实施多签治理

## 📈 监控和维护

### 价格监控
- 监控Chainlink价格更新
- 设置价格异常警报
- 准备备用价格方案

### 系统健康
- 监控合约余额
- 跟踪用户存取活动
- 定期检查升级需求

## 🆘 故障排除

### 常见问题

#### 部署失败
```bash
Error: insufficient funds for gas
```
**解决方案**: 确保账户有足够的BNB支付gas费用

#### Chainlink价格获取失败
```bash
Error: could not decode result data
```
**解决方案**: 检查价格聚合器地址是否正确，或启用备用价格模式

#### 网络连接问题
```bash
Error: network timeout
```
**解决方案**: 检查网络配置，尝试使用不同的RPC端点

### 支持资源
- [BNB Chain文档](https://docs.bnbchain.org/)
- [Chainlink文档](https://docs.chain.link/)
- [OpenZeppelin升级指南](https://docs.openzeppelin.com/upgrades-plugins/)
- [Hardhat部署文档](https://hardhat.org/tutorial/deploying-to-a-live-network)

## 📞 联系支持

如果遇到问题，请：
1. 检查日志输出中的错误信息
2. 查看部署生成的JSON文件
3. 在BSCScan上确认交易状态
4. 参考相关文档或社区支持

---

*最后更新: 2024年* 