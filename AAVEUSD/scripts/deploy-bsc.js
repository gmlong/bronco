const { ethers, upgrades } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 开始在BNB Chain Testnet部署AAVEUSD合约...");
  
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

  // 1. 部署TestUSDT合约
  console.log("\n=== 部署TestUSDT合约 ===");
  
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  console.log("正在部署TestUSDT合约...");
  
  const testUSDT = await TestUSDT.deploy();
  await testUSDT.waitForDeployment();
  const usdtAddress = await testUSDT.getAddress();
  
  console.log("✅ TestUSDT部署成功!");
  console.log("TestUSDT地址:", usdtAddress);
  
  // 验证USDT合约
  const usdtName = await testUSDT.name();
  const usdtSymbol = await testUSDT.symbol();
  const usdtDecimals = await testUSDT.decimals();
  const usdtTotalSupply = await testUSDT.totalSupply();
  
  console.log("📊 TestUSDT信息:");
  console.log(`   名称: ${usdtName}`);
  console.log(`   符号: ${usdtSymbol}`);
  console.log(`   小数位: ${usdtDecimals}`);
  console.log(`   总供应量: ${ethers.formatUnits(usdtTotalSupply, usdtDecimals)} USDT`);

  // 2. 部署可升级AAVEUSD合约
  console.log("\n=== 部署可升级AAVEUSD合约 ===");
  
  // 使用BSC测试网的Chainlink AAVE/USD价格聚合器地址
  const aaveUsdPriceFeedAddress = process.env.AAVE_USD_PRICE_FEED_TESTNET || "0x298619601ebCd58d0b526963Deb2365B485Edc74";
  console.log("Chainlink AAVE/USD价格聚合器地址:", aaveUsdPriceFeedAddress);
  
  const AAVEUSD = await ethers.getContractFactory("AAVEUSD");
  console.log("正在部署AAVEUSD代理合约...");
  
  // 使用OpenZeppelin的升级插件部署可升级合约
  const aaveusd = await upgrades.deployProxy(
    AAVEUSD,
    [usdtAddress, aaveUsdPriceFeedAddress],
    { 
      initializer: 'initialize',
      kind: 'uups'
    }
  );
  await aaveusd.waitForDeployment();
  const aaveusdAddress = await aaveusd.getAddress();
  
  console.log("✅ AAVEUSD部署成功!");
  console.log("代理合约地址:", aaveusdAddress);

  // 获取实现合约地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(aaveusdAddress);
  console.log("实现合约地址:", implementationAddress);

  // 3. 验证部署结果
  console.log("\n=== 验证部署结果 ===");
  
  try {
    // 验证合约基本信息
    const name = await aaveusd.name();
    const symbol = await aaveusd.symbol();
    const decimals = await aaveusd.decimals();
    const totalSupply = await aaveusd.totalSupply();
    const owner = await aaveusd.owner();
    
    console.log("📊 AAVEUSD基本信息:");
    console.log(`   名称: ${name}`);
    console.log(`   符号: ${symbol}`);
    console.log(`   小数位: ${decimals}`);
    console.log(`   总供应量: ${totalSupply.toString()} 个（整数）`);
    console.log(`   所有者: ${owner}`);
    
    // 验证小数位设置
    if (decimals == 0) {
      console.log("✅ 代币小数位正确设置为0（整数代币）");
    } else {
      console.log("❌ 警告：代币小数位设置错误");
    }

    // 验证USDT集成
    const usdtTokenAddress = await aaveusd.usdtToken();
    console.log(`   USDT代币地址: ${usdtTokenAddress}`);
    console.log(`   USDT集成: ${usdtTokenAddress === usdtAddress ? "✅ 正确" : "❌ 错误"}`);

    // 测试价格预言机功能
    console.log("\n=== 测试价格预言机功能 ===");
    
    const priceFeedAddress = await aaveusd.getPriceFeedAddress();
    const priceFeedDecimals = await aaveusd.getDecimals();
    const currentPrice = await aaveusd.getCurrentPrice();
    
    console.log("价格预言机信息:");
    console.log(`   价格聚合器地址: ${priceFeedAddress}`);
    console.log(`   价格小数位: ${priceFeedDecimals}`);
    console.log(`   当前AAVE价格: $${ethers.formatUnits(currentPrice, priceFeedDecimals)}`);
    
    if (currentPrice > 0) {
      // 测试价格计算功能
      const testUSDTAmount = 100 * 10**18; // $100 USDT (18位小数)
      const calculatedTokens = await aaveusd.getTokenAmountForUSDT(testUSDTAmount);
      console.log(`$100 USDT 可购买 ${calculatedTokens.toString()} AAVEUSD`);
      
      const testTokenAmount = 10; // 10 AAVEUSD（整数）
      const calculatedUSDT = await aaveusd.getUSDTAmountForTokens(testTokenAmount);
      console.log(`10 AAVEUSD 可赎回 ${ethers.formatUnits(calculatedUSDT, 18)} USDT`);
    } else {
      console.log("⚠️  Chainlink价格为0或负数");
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
      testUSDT: {
        name: "TestUSDT",
        address: usdtAddress,
        symbol: "USDT",
        decimals: 6
      },
      aaveusd: {
        name: "AAVEUSD",
        proxyAddress: aaveusdAddress,
        implementationAddress: implementationAddress,
        symbol: "AAVEUSD",
        decimals: 0,
        initialSupply: "1000000"
      }
    },
    chainlink: {
      priceFeedAddress: aaveUsdPriceFeedAddress,
      priceFeedType: "AAVE/USD",
      network: "BNB Chain Testnet",
      simplified: true
    },
    features: {
      chainlinkPriceOracle: true,
      simplifiedOracle: true,
      buyRedeemFunctionality: true,
      upgradeableProxy: true,
      uupsPattern: true,
      zeroDecimals: true
    },
    links: {
      testUSDT: `https://testnet.bscscan.com/address/${usdtAddress}`,
      proxyContract: `https://testnet.bscscan.com/address/${aaveusdAddress}`,
      implementationContract: `https://testnet.bscscan.com/address/${implementationAddress}`
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
      console.log("✅ TestUSDT合约验证成功!");
      
      // 验证AAVEUSD实现合约
      console.log("验证AAVEUSD实现合约...");
      await hre.run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log("✅ AAVEUSD实现合约验证成功!");
      
      deploymentInfo.verification = {
        status: "verified",
        timestamp: new Date().toISOString()
      };
      
      // 更新部署信息文件
      fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
      
    } catch (error) {
      console.log("⚠️  自动验证失败:", error.message);
      console.log("💡 您可以稍后手动验证：");
      console.log(`npx hardhat verify --network bscTestnet ${usdtAddress}`);
      console.log(`npx hardhat verify --network bscTestnet ${implementationAddress}`);
      
      deploymentInfo.verification = {
        status: "failed",
        error: error.message,
        manualCommands: [
          `npx hardhat verify --network bscTestnet ${usdtAddress}`,
          `npx hardhat verify --network bscTestnet ${implementationAddress}`
        ]
      };
      
      // 更新部署信息文件
      fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    }
  } else {
    console.log("\n⚠️  未检测到BSCScan API密钥");
    console.log("💡 如需自动验证，请在.env文件中设置BSCSCAN_API_KEY");
    console.log("📖 获取API密钥: https://bscscan.com/apis");
  }

  // 6. 打印总结
  console.log("\n" + "=".repeat(60));
  console.log("🎉 AAVEUSD项目部署完成!");
  console.log("=".repeat(60));
  console.log("📋 合约信息:");
  console.log(`   TestUSDT: ${usdtAddress}`);
  console.log(`   AAVEUSD代理: ${aaveusdAddress}`);
  console.log(`   AAVEUSD实现: ${implementationAddress}`);
  console.log(`   Chainlink预言机: AAVE/USD（简化版）`);
  console.log("\n🔗 区块链浏览器链接:");
  console.log(`   TestUSDT: https://testnet.bscscan.com/address/${usdtAddress}`);
  console.log(`   AAVEUSD代理: https://testnet.bscscan.com/address/${aaveusdAddress}`);
  console.log(`   AAVEUSD实现: https://testnet.bscscan.com/address/${implementationAddress}`);
  console.log("\n✨ 特性:");
  console.log("   ✅ 基于Chainlink AAVE/USD价格预言机（简化版）");
  console.log("   ✅ 0位小数（整数代币）");
  console.log("   ✅ 购买和赎回功能");
  console.log("   ✅ 可升级合约（UUPS模式）");
  console.log("   ✅ 集成TestUSDT代币");
  console.log("\n📖 后续步骤:");
  console.log("1. 在BSCScan上验证合约代码");
  console.log("2. 测试购买和赎回功能");
  console.log("3. 测试价格预言机功能");
  console.log("4. 部署到主网前进行充分测试");
  
  return {
    testUSDT,
    aaveusd,
    addresses: {
      testUSDT: usdtAddress,
      proxy: aaveusdAddress,
      implementation: implementationAddress
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