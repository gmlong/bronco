# AAPLUSDT 锚定ERC20代币项目结构

**AAPL 股票锚定 ERC20 代币 MyToken**在 **BNB 测试网**部署项目的**合约开发技术文档**与**项目架构设计方案**
---

# 📘 合约开发技术文档（Technical Specification）

## 🎯 项目目标

发行一个锚定 AAPLUSDT 股票价格的 ERC20 可升级代币 MyToken（例如命名为 AAPLUSDT），部署在 BNB 测试网，具备基本交易能力、灵活权限控制、可升级结构以及与 Chainlink 集成的外部价格获取能力。

---

## 🧱 技术栈

| 组件    | 技术 / 工具                                   |
| ----- | ----------------------------------------- |
| 主链    | BNB Chain Testnet                         |
| 编程语言  | Solidity ^0.8.20                          |
| 合约标准  | ERC20（OpenZeppelin）                       |
| 升级模式  | ERC1967 + Transparent Proxy（OpenZeppelin） |
| 安全机制  | Pausable（可暂停）、Ownable、AccessControl       |
| 价格预言机 | Chainlink Price Feed for AAPL/USD         |
| 管理权限  | ProxyAdmin + Ownable                      |
| 工具链   | Hardhat（推荐），Remix 也可调试使用                  |

---

## 🏗️ 项目架构总览

```
aaplusdt-project/
├── contracts/
│   ├── AAPLToken.sol           // 主逻辑合约（ERC20 + 黑白名单 + 存/取功能）
│   ├── USDTVault.sol           // USDT 白名单提款合约
│   ├── AAPLProxy.sol          // ERC1967 代理合约
│   ├── ProxyAdmin.sol          // 升级控制合约
│   └── PriceFeed.sol           // Chainlink 喂价模块
├── scripts/
│   ├── deploy.js               // 一键部署脚本
│   └── upgrade.js              // 合约升级脚本
├── test/                       // 单元测试
├── hardhat.config.js
└── README.md
```

---

## 🧩 合约模块说明

### 1. `AAPLToken.sol` – 主逻辑合约（可升级）

* **继承自：**

  * `ERC20Upgradeable`
  * `ERC20BurnableUpgradeable`
  * `ERC20PausableUpgradeable`
  * `OwnableUpgradeable`
  * `UUPSUpgradeable`

* **功能点包含：**

  * ✅ ERC20 标准接口（transfer、approve、mint、burn、burnFrom等）
  * ✅ 可暂停/取消暂停/查看暂停状态合约交易（pause/unpause/paused）
  * ✅ 黑名单机制：限制被列入地址的转账、购买、赎回等行为
  * ✅ 存入（deposit）函数：用 USDT 购买 AAPL，调用时读取 Chainlink 最新价格（成功则后端调用mint函数给到购买用户）
  * ✅ 赎回（redeem）函数：用 AAPL 赎回 USDT（成功则后端调用withdrawUSDT函数将USDT发送给赎回用户）
  * ✅ emit `Deposit(address, uint256)`、`Redeem(address, uint256)` 事件
  * 订单长时间未成交，需要调用updateOrderStatus函数，将订单状态更新到区块链，emit OrderStatusUpdated(string txHash, string status);

  * ✅ 可升级性通过 `UUPSUpgradeable` 实现

---

### 2. `PriceFeed.sol` – Chainlink 价格预言机模块

* 通过 Chainlink Aggregator 接口读取最新的 AAPL/USD 价格
* 示例接口：`AggregatorV3Interface public priceFeed;`
* 函数：`getLatestPrice() returns (int256)`

---

### 3. `USDTVault.sol` – 管理 USDT 提现的白名单合约

* 可由主合约调用，如 `redeem` 时触发
* 管理员可从该 Vault 中提取 USDT 到白名单地址，作运营使用
* 管理员可动态添加/移除白名单地址

| 函数名                                             | 功能说明                  |
| ----------------------------------------------- | --------------------- |
| `initialize(address _usdt)`                     | 初始化函数                 |
| `addToWhitelist(address account)`               | 添加白名单地址（仅 owner）      |
| `removeFromWhitelist(address account)`          | 移除白名单地址               |
| `isWhitelisted(address account) returns (bool)` | 查询地址是否在白名单中           |
| `depositUSDT(address from, uint256 amount)`     | 从主合约转入 USDT           |
| `withdrawUSDT(address to, uint256 amount)`      | 用户赎回 USDT          |
| `getVaultBalance() returns (uint256)`           | 查询 Vault 中 USDT 余额    |

---

### 4. `AAPLProxy.sol` + `ProxyAdmin.sol` – 可升级部署模块

* 遵循 ERC1967 标准结构
* 所有用户与 `AAPLProxy` 交互，实际逻辑在 `AAPLToken`
* `ProxyAdmin` 合约负责未来的升级控制（通过 `upgradeTo`）

---

## 🔐 权限控制设计

| 权限角色            | 权限                         |
| --------------- | -------------------------- |
| `owner` （合约部署者） | 可以暂停/取消暂停，设置白名单、黑名单，升级逻辑合约 |
| `USDT提现白名单地址`     | owner可以提现USDT到白名单           |
| `黑名单地址`         | 无法执行任何代币交互                 |

---

## ⚙️ 工作流程（含价格锚定逻辑）

### 📥 购买（Deposit）

1. 用户向合约调用 `deposit(uint256 usdtAmount)`
2. 合约读取 Chainlink 的 `AAPL/USD` 价格
3. 计算用户可获得多少 AAPL（按实时价格兑换率）
4. 将用户 USDT 转入 `USDTVault` 中
5. emit `Deposit(address indexed user, uint256 amount)`
6. 后端获取日志，然后调用 mint 相应的 AAPL 代币给用户


### 📤 赎回（Redeem）

1. 用户调用 `redeem(uint256 aaplAmount)`
2. 合约根据当前价格换算出应返回 USDT 数量
3. 检查用户是否在白名单中
4. burn 掉用户的 AAPL 代币
5. emit `Redeem(address indexed user, uint256 amount)`
6. 后端获取日志，然后调用USDTVault合约withdrawUSDT函数，将对应数量的 USDT 返回用户

---

## 🧪 测试建议

* ✅ 正常用户购买流程
* ✅ 正常用户赎回流程（白名单）
* ✅ 非白名单地址尝试赎回应失败
* ✅ 黑名单地址交互应 revert
* ✅ Chainlink 价格更新正确性
* ✅ 升级前后功能保持稳定性
* ✅ pause/unpause 测试是否成功阻断交易

---

## 📈 扩展建议（未来）

* ✅ 添加 AAPL 每股锚定比例（比如1:10倍缩放）
* ✅ 支持多种股票锚定扩展
* ✅ 前端集成 Chainlink 实时价格显示
* ✅ 多签进行 ProxyAdmin 的控制转移
* ✅ 实现 gas 优化版本的喂价模块

---

