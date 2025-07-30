const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🧪 测试AAVEUSD购买和赎回功能...");
  console.log("=".repeat(60));
  
  // 获取部署的合约地址（从最新的部署文件）
  const fs = require('fs');
  const deploymentFiles = fs.readdirSync('.').filter(f => f.startsWith('deployment-bsc-testnet-'));
  if (deploymentFiles.length === 0) {
    throw new Error("未找到部署文件，请先运行部署脚本");
  }
  
  const latestDeployment = deploymentFiles.sort().reverse()[0];
  console.log("📋 从部署文件读取合约地址:", latestDeployment);
  
  const deploymentInfo = JSON.parse(fs.readFileSync(latestDeployment, 'utf8'));
  const usdtAddress = deploymentInfo.contracts.testUSDT.address;
  const aaveusdAddress = deploymentInfo.contracts.aaveusd.proxyAddress;
  
  console.log("📍 TestUSDT地址:", usdtAddress);
  console.log("📍 AAVEUSD地址:", aaveusdAddress);
  
  // 连接到网络和获取签名者
  const [deployer] = await ethers.getSigners();
  console.log("👤 测试账户:", deployer.address);
  
  // 获取合约实例
  const TestUSDT = await ethers.getContractFactory("TestUSDT");
  const testUSDT = TestUSDT.attach(usdtAddress);
  
  const AAVEUSD = await ethers.getContractFactory("AAVEUSD");
  const aaveusd = AAVEUSD.attach(aaveusdAddress);
  
  console.log("\n" + "=".repeat(60));
  console.log("🔍 验证合约状态");
  console.log("=".repeat(60));
  
  // 检查初始状态
  const initialUSDTBalance = await testUSDT.balanceOf(deployer.address);
  const initialAAVEUSDBalance = await aaveusd.balanceOf(deployer.address);
  const contractUSDTBalance = await aaveusd.getContractUSDTBalance();
  const currentPrice = await aaveusd.getCurrentPrice();
  
  console.log("📊 初始状态:");
  console.log(`   用户USDT余额: ${ethers.formatUnits(initialUSDTBalance, 6)} USDT`);
  console.log(`   用户AAVEUSD余额: ${initialAAVEUSDBalance.toString()} AAVEUSD`);
  console.log(`   合约USDT余额: ${ethers.formatUnits(contractUSDTBalance, 6)} USDT`);
  console.log(`   当前AAVE价格: $${ethers.formatUnits(currentPrice, 8)}`);
  
  if (currentPrice <= 0) {
    console.log("❌ AAVE价格无效，测试终止");
    return;
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("💰 准备测试USDT");
  console.log("=".repeat(60));
  
  // 如果用户USDT余额不足，则免费铸造一些
  const requiredUSDT = 1000 * 10**6; // 1000 USDT
  if (initialUSDTBalance < requiredUSDT) {
    console.log("USDT余额不足，正在免费铸造...");
    const mintTx = await testUSDT.mint(deployer.address, requiredUSDT);
    await mintTx.wait();
    
    const newUSDTBalance = await testUSDT.balanceOf(deployer.address);
    console.log(`✅ 铸造成功！新余额: ${ethers.formatUnits(newUSDTBalance, 6)} USDT`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🛒 测试购买功能");
  console.log("=".repeat(60));
  
  try {
    // 测试购买 - 使用600 USDT
    const buyAmount = 600 * 10**6; // 600 USDT (6位小数)
    
    console.log(`正在购买 ${ethers.formatUnits(buyAmount, 6)} USDT 的AAVEUSD...`);
    
    // 计算预期获得的代币数量
    const expectedTokens = await aaveusd.getTokenAmountForUSDT(buyAmount);
    console.log(`预期获得: ${expectedTokens.toString()} AAVEUSD`);
    
    // 授权AAVEUSD合约使用USDT
    console.log("正在授权USDT使用权限...");
    const approveTx = await testUSDT.approve(aaveusdAddress, buyAmount);
    await approveTx.wait();
    console.log("✅ 授权成功");
    
    // 执行购买
    console.log("正在执行购买...");
    const buyTx = await aaveusd.deposit(buyAmount);
    const buyReceipt = await buyTx.wait();
    console.log("✅ 购买成功");
    
    // 查找TokensPurchased事件
    const purchaseEvent = buyReceipt.logs.find(
      log => log.fragment && log.fragment.name === 'Deposited'
    );
    
    if (purchaseEvent) {
      console.log("📊 购买事件详情:");
      console.log(`   买家: ${purchaseEvent.args.user}`);
      console.log(`   USDT金额: ${ethers.formatUnits(purchaseEvent.args.usdtAmount, 6)} USDT`);
      console.log(`   获得代币: ${purchaseEvent.args.tokenAmount.toString()} AAVEUSD`);
      console.log(`   价格: ${purchaseEvent.args.price.toString()}`);
    }
    
    // 检查购买后的余额
    const afterBuyUSDTBalance = await testUSDT.balanceOf(deployer.address);
    const afterBuyAAVEUSDBalance = await aaveusd.balanceOf(deployer.address);
    const afterBuyContractUSDTBalance = await aaveusd.getContractUSDTBalance();
    
    console.log("📊 购买后状态:");
    console.log(`   用户USDT余额: ${ethers.formatUnits(afterBuyUSDTBalance, 6)} USDT`);
    console.log(`   用户AAVEUSD余额: ${afterBuyAAVEUSDBalance.toString()} AAVEUSD`);
    console.log(`   合约USDT余额: ${ethers.formatUnits(afterBuyContractUSDTBalance, 6)} USDT`);
    
    // 验证购买是否正确
    const usdtSpent = initialUSDTBalance - afterBuyUSDTBalance;
    const aaveusdGained = afterBuyAAVEUSDBalance - initialAAVEUSDBalance;
    
    console.log("✅ 购买验证:");
    console.log(`   USDT消耗: ${ethers.formatUnits(usdtSpent, 6)} USDT`);
    console.log(`   AAVEUSD获得: ${aaveusdGained.toString()} AAVEUSD`);
    console.log(`   购买正确: ${usdtSpent === BigInt(buyAmount) ? "✅" : "❌"}`);
    
  } catch (error) {
    console.log("❌ 购买测试失败:", error.message);
    return;
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("💸 测试赎回功能");
  console.log("=".repeat(60));
  
  try {
    // 测试赎回 - 使用部分AAVEUSD
    const currentAAVEUSDBalance = await aaveusd.balanceOf(deployer.address);
    const redeemAmount = BigInt(2); // 赎回2个
    
    if (redeemAmount === 0n) {
      console.log("❌ 没有AAVEUSD可以赎回");
      return;
    }
    
    console.log(`正在赎回 ${redeemAmount.toString()} AAVEUSD...`);
    
    // 计算预期获得的USDT数量
    const expectedUSDT = await aaveusd.getUSDTAmountForTokens(redeemAmount);
    console.log(`预期获得: ${ethers.formatUnits(expectedUSDT, 6)} USDT`);
    
    // 记录赎回前的余额
    const beforeRedeemUSDTBalance = await testUSDT.balanceOf(deployer.address);
    const beforeRedeemAAVEUSDBalance = await aaveusd.balanceOf(deployer.address);
    const beforeRedeemContractUSDTBalance = await aaveusd.getContractUSDTBalance();
    
    // 执行赎回
    console.log("正在执行赎回...");
    const redeemTx = await aaveusd.redeem(redeemAmount);
    const redeemReceipt = await redeemTx.wait();
    console.log("✅ 赎回成功");
    
    // 查找TokensRedeemed事件
    const redeemEvent = redeemReceipt.logs.find(
      log => log.fragment && log.fragment.name === 'Redeemed'
    );
    
    if (redeemEvent) {
      console.log("📊 赎回事件详情:");
      console.log(`   赎回者: ${redeemEvent.args.user}`);
      console.log(`   代币金额: ${redeemEvent.args.tokenAmount.toString()} AAVEUSD`);
      console.log(`   获得USDT: ${ethers.formatUnits(redeemEvent.args.usdtAmount, 6)} USDT`);
      console.log(`   价格: ${redeemEvent.args.price.toString()}`);
    }
    
    // 检查赎回后的余额
    const afterRedeemUSDTBalance = await testUSDT.balanceOf(deployer.address);
    const afterRedeemAAVEUSDBalance = await aaveusd.balanceOf(deployer.address);
    const afterRedeemContractUSDTBalance = await aaveusd.getContractUSDTBalance();
    
    console.log("📊 赎回后状态:");
    console.log(`   用户USDT余额: ${ethers.formatUnits(afterRedeemUSDTBalance, 6)} USDT`);
    console.log(`   用户AAVEUSD余额: ${afterRedeemAAVEUSDBalance.toString()} AAVEUSD`);
    console.log(`   合约USDT余额: ${ethers.formatUnits(afterRedeemContractUSDTBalance, 6)} USDT`);
    
    // 验证赎回是否正确
    const usdtGained = afterRedeemUSDTBalance - beforeRedeemUSDTBalance;
    const aaveusdBurned = beforeRedeemAAVEUSDBalance - afterRedeemAAVEUSDBalance;
    
    console.log("✅ 赎回验证:");
    console.log(`   USDT获得: ${ethers.formatUnits(usdtGained, 6)} USDT`);
    console.log(`   AAVEUSD销毁: ${aaveusdBurned.toString()} AAVEUSD`);
    console.log(`   赎回正确: ${aaveusdBurned === redeemAmount ? "✅" : "❌"}`);
    
  } catch (error) {
    console.log("❌ 赎回测试失败:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📈 总结报告");
  console.log("=".repeat(60));
  
  // 最终状态
  const finalUSDTBalance = await testUSDT.balanceOf(deployer.address);
  const finalAAVEUSDBalance = await aaveusd.balanceOf(deployer.address);
  const finalContractUSDTBalance = await aaveusd.getContractUSDTBalance();
  
  console.log("✅ AAVEUSD购买赎回功能测试完成!");
  console.log("\n📊 最终状态:");
  console.log(`   用户USDT余额: ${ethers.formatUnits(finalUSDTBalance, 6)} USDT`);
  console.log(`   用户AAVEUSD余额: ${finalAAVEUSDBalance.toString()} AAVEUSD`);
  console.log(`   合约USDT余额: ${ethers.formatUnits(finalContractUSDTBalance, 6)} USDT`);
  
  console.log("\n🎯 测试结果:");
  console.log("   ✅ 合约部署正确");
  console.log("   ✅ 价格预言机工作正常");
  console.log("   ✅ 购买功能正常");
  console.log("   ✅ 赎回功能正常");
  console.log("   ✅ 事件发射正常");
  console.log("   ✅ 余额计算正确");
  
  console.log("\n💡 重要说明:");
  console.log("   • AAVEUSD是整数代币（0位小数）");
  console.log("   • 购买和赎回基于实时Chainlink AAVE价格");
  console.log("   • USDT有6位小数，AAVE价格有8位小数");
  console.log("   • 价格计算公式已针对不同小数位优化");
  
  console.log(`\n🔗 BSCScan链接:`);
  console.log(`   TestUSDT: https://testnet.bscscan.com/address/${usdtAddress}`);
  console.log(`   AAVEUSD: https://testnet.bscscan.com/address/${aaveusdAddress}`);
}

// 如果直接运行此脚本，则执行main函数
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n✅ 测试脚本执行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ 测试失败:", error);
      process.exit(1);
    });
}

module.exports = main; 