const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("=== APPLUSD 系统交互演示 ===\n");

  // 读取部署信息
  let deploymentInfo;
  try {
    deploymentInfo = JSON.parse(fs.readFileSync('deployment.json', 'utf8'));
    console.log("已读取部署信息:");
    console.log("- TestUSDT:", deploymentInfo.contracts.TestUSDT);
    console.log("- PriceOracle:", deploymentInfo.contracts.PriceOracle);
    console.log("- APPLUSD:", deploymentInfo.contracts.APPLUSD_Proxy);
    console.log("");
  } catch (error) {
    console.log("❌ 找不到deployment.json文件，请先运行部署脚本");
    return;
  }

  // 获取合约实例
  const [deployer, user1, user2] = await ethers.getSigners();
  
  const testUSDT = await ethers.getContractAt("TestUSDT", deploymentInfo.contracts.TestUSDT);
  const priceOracle = await ethers.getContractAt("PriceOracle", deploymentInfo.contracts.PriceOracle);
  const applusd = await ethers.getContractAt("APPLUSD", deploymentInfo.contracts.APPLUSD_Proxy);

  console.log("当前账户:");
  console.log("- 部署者:", deployer.address);
  console.log("- 用户1:", user1.address);
  console.log("- 用户2:", user2.address);
  console.log("");

  // 演示1: 查看当前价格
  console.log("=== 1. 查看当前价格 ===");
  const currentPrice = await priceOracle.getAPPLPriceInUSDT();
  console.log("当前价格: 1 APPL =", ethers.formatUnits(currentPrice, 6), "USDT");
  
  // 计算一些兑换示例
  const usdtAmount1 = ethers.parseUnits("1000", 6); // 1000 USDT
  const applAmount1 = await priceOracle.getAPPLAmountForUSDT(usdtAmount1);
  console.log("1000 USDT 可兑换", ethers.formatUnits(applAmount1, 18), "APPLUSD");

  const applAmount2 = ethers.parseUnits("5", 18); // 5 APPL
  const usdtAmount2 = await priceOracle.getUSDTAmountForAPPL(applAmount2);
  console.log("5 APPLUSD 可兑换", ethers.formatUnits(usdtAmount2, 6), "USDT");
  console.log("");

  // 演示2: 给用户mint测试USDT
  console.log("=== 2. 为用户mint测试USDT ===");
  const mintAmount = ethers.parseUnits("10000", 6); // 10000 USDT
  
  await testUSDT.mint(user1.address, mintAmount);
  await testUSDT.mint(user2.address, mintAmount);
  
  console.log("给用户1 mint了", ethers.formatUnits(mintAmount, 6), "TUSDT");
  console.log("给用户2 mint了", ethers.formatUnits(mintAmount, 6), "TUSDT");
  
  console.log("用户余额:");
  console.log("- 用户1 USDT余额:", ethers.formatUnits(await testUSDT.balanceOf(user1.address), 6));
  console.log("- 用户2 USDT余额:", ethers.formatUnits(await testUSDT.balanceOf(user2.address), 6));
  console.log("");

  // 演示3: 用户1存入USDT购买APPLUSD
  console.log("=== 3. 用户1存入USDT购买APPLUSD ===");
  const depositAmount = ethers.parseUnits("2600", 6); // 2600 USDT
  
  // 计算预期获得的APPLUSD
  const expectedAPPL = await applusd.getAPPLAmountForDeposit(depositAmount);
  console.log("用户1准备存入", ethers.formatUnits(depositAmount, 6), "USDT");
  console.log("预期获得", ethers.formatUnits(expectedAPPL, 18), "APPLUSD");
  
  // 授权并存入
  await testUSDT.connect(user1).approve(applusd.getAddress(), depositAmount);
  console.log("✅ 已授权APPLUSD合约使用USDT");
  
  const tx1 = await applusd.connect(user1).deposit(depositAmount);
  await tx1.wait();
  console.log("✅ 存入交易完成");
  
  // 检查余额
  console.log("存入后余额:");
  console.log("- 用户1 USDT余额:", ethers.formatUnits(await testUSDT.balanceOf(user1.address), 6));
  console.log("- 用户1 APPLUSD余额:", ethers.formatUnits(await applusd.balanceOf(user1.address), 18));
  console.log("- 合约USDT余额:", ethers.formatUnits(await applusd.getUSDTBalance(), 6));
  console.log("");

  // 演示4: 用户2也进行存入
  console.log("=== 4. 用户2存入USDT购买APPLUSD ===");
  const depositAmount2 = ethers.parseUnits("1300", 6); // 1300 USDT
  
  await testUSDT.connect(user2).approve(applusd.getAddress(), depositAmount2);
  const tx2 = await applusd.connect(user2).deposit(depositAmount2);
  await tx2.wait();
  
  console.log("用户2存入", ethers.formatUnits(depositAmount2, 6), "USDT");
  console.log("用户2获得", ethers.formatUnits(await applusd.balanceOf(user2.address), 18), "APPLUSD");
  console.log("合约总USDT余额:", ethers.formatUnits(await applusd.getUSDTBalance(), 6));
  console.log("");

  // 演示5: 用户1赎回部分APPLUSD
  console.log("=== 5. 用户1赎回部分APPLUSD ===");
  const user1Balance = await applusd.balanceOf(user1.address);
  const redeemAmount = user1Balance / 3n; // 赎回1/3
  
  const expectedUSDT = await applusd.getUSDTAmountForRedeem(redeemAmount);
  console.log("用户1准备赎回", ethers.formatUnits(redeemAmount, 18), "APPLUSD");
  console.log("预期获得", ethers.formatUnits(expectedUSDT, 6), "USDT");
  
  const tx3 = await applusd.connect(user1).redeem(redeemAmount);
  await tx3.wait();
  console.log("✅ 赎回交易完成");
  
  console.log("赎回后余额:");
  console.log("- 用户1 USDT余额:", ethers.formatUnits(await testUSDT.balanceOf(user1.address), 6));
  console.log("- 用户1 APPLUSD余额:", ethers.formatUnits(await applusd.balanceOf(user1.address), 18));
  console.log("- 合约USDT余额:", ethers.formatUnits(await applusd.getUSDTBalance(), 6));
  console.log("");

  // 演示6: 显示最终状态
  console.log("=== 6. 最终状态总结 ===");
  console.log("用户余额总结:");
  console.log("用户1:");
  console.log("  - USDT:", ethers.formatUnits(await testUSDT.balanceOf(user1.address), 6));
  console.log("  - APPLUSD:", ethers.formatUnits(await applusd.balanceOf(user1.address), 18));
  
  console.log("用户2:");
  console.log("  - USDT:", ethers.formatUnits(await testUSDT.balanceOf(user2.address), 6));
  console.log("  - APPLUSD:", ethers.formatUnits(await applusd.balanceOf(user2.address), 18));
  
  console.log("合约状态:");
  console.log("  - 总USDT储备:", ethers.formatUnits(await applusd.getUSDTBalance(), 6));
  console.log("  - 总APPLUSD发行量:", ethers.formatUnits(await applusd.totalSupply(), 18));
  
  // 验证数学正确性
  const totalUSDTReserve = await applusd.getUSDTBalance();
  const totalAPPLSupply = await applusd.totalSupply();
  const calculatedUSDTValue = await priceOracle.getUSDTAmountForAPPL(totalAPPLSupply);
  
  console.log("\n数学验证:");
  console.log("- 当前USDT储备:", ethers.formatUnits(totalUSDTReserve, 6));
  console.log("- 根据APPLUSD计算的USDT价值:", ethers.formatUnits(calculatedUSDTValue, 6));
  console.log("- 差异:", ethers.formatUnits(calculatedUSDTValue - totalUSDTReserve, 6), "USDT");
  
  console.log("\n✅ 演示完成！系统运行正常。");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main; 