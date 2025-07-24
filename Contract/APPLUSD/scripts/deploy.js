const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("开始部署合约...");
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // 1. 部署测试USDT合约
  console.log("\n=== 部署测试USDT合约 ===");
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const testUSDT = await TestUSDT.deploy();
  await testUSDT.waitForDeployment();
  const usdtAddress = await testUSDT.getAddress();
  console.log("TestUSDT 部署地址:", usdtAddress);

  // 给部署者mint一些测试USDT
  const mintAmount = ethers.parseUnits("1000000", 6); // 1百万 USDT
  await testUSDT.mint(deployer.address, mintAmount);
  console.log("给部署者mint了", ethers.formatUnits(mintAmount, 6), "TUSDT");

  // 2. 部署价格预言机合约
  console.log("\n=== 部署价格预言机合约 ===");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const oracleAddress = await priceOracle.getAddress();
  console.log("PriceOracle 部署地址:", oracleAddress);

  // 验证初始价格
  const initialPrice = await priceOracle.getAPPLPriceInUSDT();
  console.log("初始价格: 1 APPL =", ethers.formatUnits(initialPrice, 6), "USDT");

  // 3. 部署可升级APPLUSD合约
  console.log("\n=== 部署可升级APPLUSD合约 ===");
  const APPLUSD = await ethers.getContractFactory("APPLUSD");
  
  // 使用OpenZeppelin的升级插件部署可升级合约
  const applusd = await upgrades.deployProxy(
    APPLUSD,
    [usdtAddress, oracleAddress],
    { initializer: 'initialize' }
  );
  await applusd.waitForDeployment();
  const applusdAddress = await applusd.getAddress();
  console.log("APPLUSD 代理合约地址:", applusdAddress);

  // 获取实现合约地址（可选，用于验证）
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(applusdAddress);
  console.log("APPLUSD 实现合约地址:", implementationAddress);

  // 4. 验证部署结果
  console.log("\n=== 验证部署结果 ===");
  
  // 验证APPLUSD合约设置
  const usdtTokenInContract = await applusd.usdtToken();
  const priceOracleInContract = await applusd.priceOracle();
  
  console.log("APPLUSD中的USDT地址:", usdtTokenInContract);
  console.log("APPLUSD中的预言机地址:", priceOracleInContract);
  console.log("设置验证:", usdtTokenInContract === usdtAddress && priceOracleInContract === oracleAddress ? "✅ 成功" : "❌ 失败");

  // 5. 打印总结信息
  console.log("\n=== 部署总结 ===");
  console.log("网络:", (await ethers.provider.getNetwork()).name);
  console.log("链ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("部署者地址:", deployer.address);
  console.log("TestUSDT地址:", usdtAddress);
  console.log("PriceOracle地址:", oracleAddress);
  console.log("APPLUSD代理地址:", applusdAddress);
  console.log("APPLUSD实现地址:", implementationAddress);

  // 6. 保存部署信息到文件
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    contracts: {
      TestUSDT: usdtAddress,
      PriceOracle: oracleAddress,
      APPLUSD_Proxy: applusdAddress,
      APPLUSD_Implementation: implementationAddress
    },
    timestamp: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\n部署信息已保存到 deployment.json");

  return {
    testUSDT,
    priceOracle,
    applusd,
    addresses: {
      testUSDT: usdtAddress,
      priceOracle: oracleAddress,
      applusd: applusdAddress
    }
  };
}

// 如果直接运行此脚本，则执行main函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main; 