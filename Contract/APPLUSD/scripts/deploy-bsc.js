const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 开始在BNB Chain Testnet部署合约...");
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  
  // 获取账户余额
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("账户余额:", ethers.formatEther(balance), "BNB");
  
  // 检查余额是否足够
  if (balance < ethers.parseEther("0.1")) {
    console.log("⚠️  警告：BNB余额较低，建议从水龙头获取更多测试BNB");
    console.log("BNB Chain Testnet水龙头: https://testnet.bnbchain.org/faucet-smart");
  }
  
  // 获取当前网络信息
  const network = await ethers.provider.getNetwork();
  console.log("网络:", network.name);
  console.log("链ID:", network.chainId);
  
  if (network.chainId !== 97n) {
    console.log("⚠️  警告：当前网络不是BNB Chain Testnet (Chain ID: 97)");
  }

  // 1. 部署测试USDT合约
  console.log("\n=== 部署测试USDT合约 ===");
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  console.log("正在部署TestUSDT...");
  
  const testUSDT = await TestUSDT.deploy();
  await testUSDT.waitForDeployment();
  const usdtAddress = await testUSDT.getAddress();
  
  console.log("✅ TestUSDT部署成功!");
  console.log("地址:", usdtAddress);

  // 给部署者mint一些测试USDT
  console.log("正在mint测试USDT...");
  const mintAmount = ethers.parseUnits("1000000", 6); // 1百万 USDT
  const mintTx = await testUSDT.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log("✅ 已mint", ethers.formatUnits(mintAmount, 6), "TUSDT到部署者账户");

  // 2. 部署可升级APPLUSD合约
  console.log("\n=== 部署可升级APPLUSD合约 ===");
  
  // 使用真实的Chainlink价格聚合器地址 (BNB Chain Testnet AAVE/USD)
  const aavePriceFeedAddress = process.env.AAVE_PRICE_FEED_TESTNET || "0x298619601ebCd58d0b526963Deb2365B485Edc74";
  console.log("Chainlink AAVE/USD价格聚合器地址:", aavePriceFeedAddress);
  
  const APPLUSD = await ethers.getContractFactory("APPLUSD");
  console.log("正在部署APPLUSD代理合约...");
  
  // 使用OpenZeppelin的升级插件部署可升级合约
  const applusd = await upgrades.deployProxy(
    APPLUSD,
    [usdtAddress, aavePriceFeedAddress],
    { 
      initializer: 'initialize',
      kind: 'uups'
    }
  );
  await applusd.waitForDeployment();
  const applusdAddress = await applusd.getAddress();
  
  console.log("✅ APPLUSD部署成功!");
  console.log("代理合约地址:", applusdAddress);

  // 获取实现合约地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(applusdAddress);
  console.log("实现合约地址:", implementationAddress);

  // 3. 验证部署结果
  console.log("\n=== 验证部署结果 ===");
  
  try {
    // 验证APPLUSD合约设置
    const usdtTokenInContract = await applusd.usdtToken();
    console.log("APPLUSD中的USDT地址:", usdtTokenInContract);
    console.log("设置验证:", usdtTokenInContract === usdtAddress ? "✅ 成功" : "❌ 失败");

    // 测试Chainlink价格功能
    console.log("\n=== 测试Chainlink价格功能 ===");
    const chainlinkPrice = await applusd.getChainlinkDataFeedLatestAnswer();
    console.log("Chainlink原始价格:", chainlinkPrice.toString());
    
    if (chainlinkPrice > 0) {
      const currentPrice = await applusd.getCurrentPrice();
      console.log("当前AAVE价格:", ethers.formatUnits(currentPrice, 6), "USDT");
      
      // 测试价格计算
      const testUSDTAmount = ethers.parseUnits("1000", 6); // 1000 USDT
      const calculatedAPPL = await applusd.getAPPLAmountForDeposit(testUSDTAmount);
      console.log("1000 USDT 可兑换", calculatedAPPL.toString(), "APPLUSD（整数）");

      const testAPPLAmount = 5n; // 5 APPL（整数）
      const calculatedUSDT = await applusd.getUSDTAmountForRedeem(testAPPLAmount);
      console.log("5 APPLUSD 可兑换", ethers.formatUnits(calculatedUSDT, 6), "USDT");
    } else {
      console.log("⚠️  Chainlink价格无效，将使用备用价格");
      
      // 启用备用价格模式进行测试
      const enableTx = await applusd.enableFallbackPrice();
      await enableTx.wait();
      console.log("已启用备用价格模式");
      
      const fallbackPrice = await applusd.getCurrentPrice();
      console.log("备用价格:", ethers.formatUnits(fallbackPrice, 6), "USDT");
    }
    
  } catch (error) {
    console.log("❌ 验证过程中出错:", error.message);
  }

  // 4. 保存部署信息
  console.log("\n=== 保存部署信息 ===");
  
  const deploymentInfo = {
    network: "BNB Chain Testnet",
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployerBalance: ethers.formatEther(balance),
    timestamp: new Date().toISOString(),
    contracts: {
      TestUSDT: {
        address: usdtAddress,
        name: "Test USDT",
        symbol: "TUSDT",
        decimals: 6
      },
      APPLUSD: {
        proxyAddress: applusdAddress,
        implementationAddress: implementationAddress,
        name: "Apple USD",
        symbol: "APPLUSD",
        decimals: 0
      }
    },
    chainlink: {
      priceFeedAddress: aavePriceFeedAddress,
      priceFeedType: "AAVE/USD",
      network: "BNB Chain Testnet"
    },
    features: {
      chainlinkPriceOracle: true,
      fallbackPriceMechanism: true,
      upgradeableProxy: true,
      uupsPattern: true
    },
    verification: {
      bscscanLinks: {
        testUSDT: `https://testnet.bscscan.com/address/${usdtAddress}`,
        applusdProxy: `https://testnet.bscscan.com/address/${applusdAddress}`,
        applusdImplementation: `https://testnet.bscscan.com/address/${implementationAddress}`
      }
    }
  };

  const filename = `deployment-bsc-testnet-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ 部署信息已保存到 ${filename}`);

  // 5. 自动验证合约（如果提供了API密钥）
  if (process.env.BSCSCAN_API_KEY) {
    console.log("\n=== 自动验证合约 ===");
    console.log("🔍 检测到BSCScan API密钥，开始自动验证...");
    
    try {
      // 等待几个区块确认
      console.log("等待区块确认...");
      await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒
      
      // 验证TestUSDT合约
      console.log("验证TestUSDT合约...");
      await hre.run("verify:verify", {
        address: usdtAddress,
        constructorArguments: [],
      });
      console.log("✅ TestUSDT验证成功!");
      
      // 验证APPLUSD实现合约
      console.log("验证APPLUSD实现合约...");
      await hre.run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log("✅ APPLUSD实现合约验证成功!");
      
      deploymentInfo.verification.status = "verified";
      deploymentInfo.verification.timestamp = new Date().toISOString();
      
    } catch (error) {
      console.log("⚠️  自动验证失败:", error.message);
      console.log("💡 您可以稍后手动验证：");
      console.log(`npx hardhat verify --network bscTestnet ${usdtAddress}`);
      console.log(`npx hardhat verify --network bscTestnet ${implementationAddress}`);
      
      deploymentInfo.verification.status = "failed";
      deploymentInfo.verification.error = error.message;
      deploymentInfo.verification.manualCommands = [
        `npx hardhat verify --network bscTestnet ${usdtAddress}`,
        `npx hardhat verify --network bscTestnet ${implementationAddress}`
      ];
    }
    
    // 更新部署信息文件
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  } else {
    console.log("\n⚠️  未检测到BSCScan API密钥");
    console.log("💡 如需自动验证，请在.env文件中设置BSCSCAN_API_KEY");
    console.log("📖 获取API密钥: https://bscscan.com/apis");
  }

  // 6. 打印总结
  console.log("\n" + "=".repeat(60));
  console.log("🎉 BNB Chain Testnet 部署完成!");
  console.log("=".repeat(60));
  console.log("📋 合约地址:");
  console.log(`   TestUSDT: ${usdtAddress}`);
  console.log(`   APPLUSD:  ${applusdAddress}`);
  console.log("\n🔗 区块链浏览器链接:");
  console.log(`   TestUSDT: https://testnet.bscscan.com/address/${usdtAddress}`);
  console.log(`   APPLUSD:  https://testnet.bscscan.com/address/${applusdAddress}`);
  console.log("\n📖 后续步骤:");
  console.log("1. 在BSCScan上验证合约代码");
  console.log("2. 测试存入/赎回功能");
  console.log("3. 监控Chainlink价格更新");
  console.log("4. 部署到主网前进行充分测试");
  
  return {
    testUSDT,
    applusd,
    addresses: {
      testUSDT: usdtAddress,
      applusd: applusdAddress
    },
    deploymentInfo
  };
}

// 如果直接运行此脚本，则执行main函数
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ 部署脚本执行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 部署失败:", error);
      process.exit(1);
    });
}

module.exports = main; 