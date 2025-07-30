const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🔄 开始升级APPLUSD合约...");
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("升级账户:", deployer.address);
  
  // 获取当前网络信息
  const network = await ethers.provider.getNetwork();
  console.log("网络:", network.name);
  console.log("链ID:", network.chainId);
  
  // 读取最新的部署信息
  const deploymentFiles = fs.readdirSync('.').filter(f => f.startsWith('deployment-bsc-testnet-'));
  if (deploymentFiles.length === 0) {
    throw new Error("❌ 未找到部署文件，请先运行部署脚本");
  }
  
  const latestDeployment = deploymentFiles.sort().reverse()[0];
  console.log("📋 从部署文件读取信息:", latestDeployment);
  
  const deploymentInfo = JSON.parse(fs.readFileSync(latestDeployment, 'utf8'));
  const proxyAddress = deploymentInfo.contracts.APPLUSD.proxyAddress;
  
  console.log("📍 当前APPLUSD代理地址:", proxyAddress);
  
  // 1. 编译新的合约
  console.log("\n=== 编译新版本合约 ===");
  await hre.run("compile");
  console.log("✅ 合约编译完成");
  
  // 2. 准备升级
  console.log("\n=== 准备升级APPLUSD合约 ===");
  const APPLUSDv2 = await ethers.getContractFactory("APPLUSD");
  
  console.log("正在升级APPLUSD合约...");
  console.log("⚠️  注意：升级过程中会保持所有现有状态和余额");
  
  // 3. 执行升级
  const upgradedContract = await upgrades.upgradeProxy(proxyAddress, APPLUSDv2);
  await upgradedContract.waitForDeployment();
  
  console.log("✅ APPLUSD合约升级成功!");
  console.log("代理地址保持不变:", proxyAddress);
  
  // 获取新的实现合约地址
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("新实现合约地址:", newImplementationAddress);
  
  // 4. 验证升级结果
  console.log("\n=== 验证升级结果 ===");
  
  try {
    // 连接到升级后的合约
    const applusd = APPLUSDv2.attach(proxyAddress);
    
    // 验证基本功能
    const name = await applusd.name();
    const symbol = await applusd.symbol();
    const decimals = await applusd.decimals();
    const owner = await applusd.owner();
    
    console.log("📊 合约信息验证:");
    console.log(`   名称: ${name}`);
    console.log(`   符号: ${symbol}`);
    console.log(`   小数位: ${decimals}`);
    console.log(`   所有者: ${owner}`);
    
    // 验证关键升级：decimals应该是0
    if (decimals == 0) {
      console.log("✅ 成功！APPLUSD现在是0位小数（整数代币）");
    } else {
      console.log("❌ 警告：decimals仍然不是0位");
    }
    
    // 验证价格功能
    console.log("\n=== 测试价格功能 ===");
    const currentPrice = await applusd.getCurrentPrice();
    console.log("当前价格:", ethers.formatUnits(currentPrice, 6), "USDT");
    
    // 测试0位小数的价格计算
    const testUSDTAmount = ethers.parseUnits("260", 6); // 260 USDT
    const calculatedAPPL = await applusd.getAPPLAmountForDeposit(testUSDTAmount);
    console.log("260 USDT 可兑换", calculatedAPPL.toString(), "APPLUSD（整数）");
    
    const testAPPLAmount = 1n; // 1 APPL
    const calculatedUSDT = await applusd.getUSDTAmountForRedeem(testAPPLAmount);
    console.log("1 APPLUSD 可兑换", ethers.formatUnits(calculatedUSDT, 6), "USDT");
    
    // 验证用户余额（如果有的话）
    const deployerBalance = await applusd.balanceOf(deployer.address);
    console.log("部署者APPLUSD余额:", deployerBalance.toString(), "个（整数）");
    
  } catch (error) {
    console.log("❌ 验证过程中出错:", error.message);
  }
  
  // 5. 更新部署信息
  console.log("\n=== 更新部署信息 ===");
  
  const upgradeInfo = {
    ...deploymentInfo,
    upgrade: {
      previousImplementation: deploymentInfo.contracts.APPLUSD.implementationAddress,
      newImplementation: newImplementationAddress,
      upgradeTimestamp: new Date().toISOString(),
      upgradeBy: deployer.address,
      changes: [
        "将APPLUSD decimals从18位改为0位（整数代币）",
        "调整价格计算逻辑以适配0位小数",
        "保持所有现有状态和用户余额"
      ]
    },
    contracts: {
      ...deploymentInfo.contracts,
      APPLUSD: {
        ...deploymentInfo.contracts.APPLUSD,
        implementationAddress: newImplementationAddress,
        decimals: 0,
        lastUpgrade: new Date().toISOString()
      }
    }
  };
  
  const filename = `deployment-bsc-testnet-upgraded-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(upgradeInfo, null, 2));
  console.log(`✅ 升级信息已保存到 ${filename}`);
  
  // 6. 自动验证新实现合约（如果提供了API密钥）
  if (process.env.BSCSCAN_API_KEY) {
    console.log("\n=== 验证新实现合约 ===");
    console.log("🔍 检测到BSCScan API密钥，开始验证新实现合约...");
    
    try {
      // 等待几个区块确认
      console.log("等待区块确认...");
      await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒
      
      // 验证新的APPLUSD实现合约
      console.log("验证新APPLUSD实现合约...");
      await hre.run("verify:verify", {
        address: newImplementationAddress,
        constructorArguments: [],
      });
      console.log("✅ 新实现合约验证成功!");
      
      upgradeInfo.verification = {
        ...upgradeInfo.verification,
        newImplementationVerified: true,
        newImplementationAddress: newImplementationAddress,
        verificationTimestamp: new Date().toISOString()
      };
      
      // 更新部署信息文件
      fs.writeFileSync(filename, JSON.stringify(upgradeInfo, null, 2));
      
    } catch (error) {
      console.log("⚠️  自动验证失败:", error.message);
      console.log("💡 您可以稍后手动验证新实现合约：");
      console.log(`npx hardhat verify --network bscTestnet ${newImplementationAddress}`);
      
      upgradeInfo.verification = {
        ...upgradeInfo.verification,
        newImplementationVerified: false,
        verificationError: error.message,
        manualVerificationCommand: `npx hardhat verify --network bscTestnet ${newImplementationAddress}`
      };
      
      // 更新部署信息文件
      fs.writeFileSync(filename, JSON.stringify(upgradeInfo, null, 2));
    }
  } else {
    console.log("\n⚠️  未检测到BSCScan API密钥");
    console.log("💡 如需验证新实现合约，请手动运行：");
    console.log(`npx hardhat verify --network bscTestnet ${newImplementationAddress}`);
  }
  
  // 7. 打印总结
  console.log("\n" + "=".repeat(60));
  console.log("🎉 APPLUSD合约升级完成!");
  console.log("=".repeat(60));
  console.log("📋 关键信息:");
  console.log(`   代理地址（不变）: ${proxyAddress}`);
  console.log(`   新实现地址: ${newImplementationAddress}`);
  console.log(`   APPLUSD现在是0位小数代币`);
  console.log("\n🔗 BSCScan链接:");
  console.log(`   代理合约: https://testnet.bscscan.com/address/${proxyAddress}`);
  console.log(`   新实现合约: https://testnet.bscscan.com/address/${newImplementationAddress}`);
  console.log("\n✅ 升级优势:");
  console.log("   ✅ 保持相同的合约地址");
  console.log("   ✅ 保持所有用户余额和状态");
  console.log("   ✅ 更新为0位小数逻辑");
  console.log("   ✅ 无需重新授权或迁移");
  
  return {
    proxyAddress,
    newImplementationAddress,
    upgradedContract,
    upgradeInfo
  };
}

// 如果直接运行此脚本，则执行main函数
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ 升级脚本执行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 升级失败:", error);
      process.exit(1);
    });
}

module.exports = main; 