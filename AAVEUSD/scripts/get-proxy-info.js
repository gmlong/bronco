const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 获取代理合约信息...");
  console.log("=".repeat(60));
  
  // 用户的代理合约地址
  const proxyAddress = "0xaA9f32bE69e6b570dD9e86167A58863E002A73C1";
  console.log("📍 代理合约地址:", proxyAddress);
  
  try {
    // 获取实现合约地址
    console.log("\n=== 获取实现合约地址 ===");
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log("📍 实现合约地址:", implementationAddress);
    
    // 获取管理员地址
    const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
    console.log("👤 管理员地址:", adminAddress);
    
    // 检查代理类型
    console.log("\n=== 代理类型检查 ===");
    
    // EIP-1967 存储槽
    const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const adminSlot = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
    
    const implStorage = await ethers.provider.getStorageAt(proxyAddress, implementationSlot);
    const adminStorage = await ethers.provider.getStorageAt(proxyAddress, adminSlot);
    
    console.log("🔧 实现槽位值:", implStorage);
    console.log("👮 管理员槽位值:", adminStorage);
    
    // 验证这是UUPS代理
    if (implStorage !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      console.log("✅ 确认这是EIP-1967兼容的代理合约");
      
      if (adminStorage === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log("✅ 这是UUPS代理（无管理员）");
      } else {
        console.log("⚠️  这是透明代理（有管理员）");
      }
    }
    
    console.log("\n=== 合约验证状态检查 ===");
    
    // 检查实现合约代码
    const implCode = await ethers.provider.getCode(implementationAddress);
    if (implCode === "0x") {
      console.log("❌ 实现合约无代码");
    } else {
      console.log("✅ 实现合约有代码");
      console.log("📏 代码长度:", implCode.length, "字符");
    }
    
    // 尝试连接到合约
    console.log("\n=== 合约功能测试 ===");
    
    try {
      const AAVEUSD = await ethers.getContractFactory("AAVEUSD");
      const aaveusd = AAVEUSD.attach(proxyAddress);
      
      const name = await aaveusd.name();
      const symbol = await aaveusd.symbol();
      const decimals = await aaveusd.decimals();
      
      console.log("📛 name():", name || "(空值)");
      console.log("🏷️  symbol():", symbol || "(空值)");
      console.log("🔢 decimals():", decimals.toString());
      
      if (!name || !symbol) {
        console.log("⚠️  合约可能未初始化");
      } else {
        console.log("✅ 合约已正确初始化");
      }
      
    } catch (error) {
      console.log("❌ 合约调用失败:", error.message);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("📋 BSCScan代理验证指南");
    console.log("=".repeat(60));
    
    console.log("🔗 相关链接:");
    console.log(`   代理合约: https://testnet.bscscan.com/address/${proxyAddress}`);
    console.log(`   实现合约: https://testnet.bscscan.com/address/${implementationAddress}`);
    
    console.log("\n📝 在BSCScan上设置代理的步骤:");
    console.log("1. 访问代理合约页面");
    console.log("2. 点击 'More Options' → 'Is this a proxy?'");
    console.log("3. BSCScan会自动检测并验证代理");
    console.log("4. 验证成功后会显示读写功能");
    
    console.log("\n🛠️  如果自动检测失败，手动操作:");
    console.log("1. 先验证实现合约的源代码");
    console.log("2. 在代理合约页面选择 'Contract' → 'Write as Proxy'");
    console.log("3. 输入实现合约地址进行关联");
    
    console.log("\n📋 验证命令:");
    console.log(`npx hardhat verify --network bscTestnet ${implementationAddress}`);
    
  } catch (error) {
    console.log("❌ 获取代理信息失败:", error.message);
  }
}

// 如果直接运行此脚本，则执行main函数
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ 脚本执行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 脚本失败:", error);
      process.exit(1);
    });
}

module.exports = main; 