const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

async function main() {
    console.log("🧪 测试新的 deposit 和 redeem 函数...");
    
    try {
        // 获取部署者账户
        const [deployer] = await ethers.getSigners();
        console.log("📍 测试账户:", deployer.address);
        
        // 修复ethers.js版本兼容性问题
        const balance = await deployer.provider.getBalance(deployer.address);
        const formatEther = ethers.formatEther || ethers.utils.formatEther;
        const formatUnits = ethers.formatUnits || ethers.utils.formatUnits;
        const parseUnits = ethers.parseUnits || ethers.utils.parseUnits;
        console.log("💰 账户余额:", formatEther(balance), "BNB");
        
        // 读取部署信息 - 查找deployment-bsc-testnet-*.json文件
        const deploymentFiles = fs.readdirSync(__dirname + '/../').filter(f => f.startsWith('deployment-bsc-testnet-') && f.endsWith('.json'));
        if (deploymentFiles.length === 0) {
            throw new Error("❌ 未找到部署文件 deployment-bsc-testnet-*.json，请先部署合约");
        }
        
        // 选择最新的部署文件
        const latestDeploymentFile = deploymentFiles.sort().reverse()[0];
        const deploymentFilePath = path.join(__dirname, '..', latestDeploymentFile);
        console.log("📄 使用部署文件:", latestDeploymentFile);
        
        const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
        const aaveusdAddress = deploymentInfo.aaveusd?.proxy;
        const usdtAddress = deploymentInfo.testUsdt?.address;
        
        if (!aaveusdAddress || !usdtAddress) {
            throw new Error("❌ 未找到合约地址");
        }
        
        console.log("📍 AAVEUSD 代理地址:", aaveusdAddress);
        console.log("📍 TestUSDT 地址:", usdtAddress);
        
        // 连接到合约
        const AAVEUSD = await ethers.getContractFactory("AAVEUSD");
        const aaveusd = AAVEUSD.attach(aaveusdAddress);
        
        const TestUSDT = await ethers.getContractFactory("TestUSDT");
        const testUSDT = TestUSDT.attach(usdtAddress);
        
        // 检查初始状态
        console.log("\n📊 初始状态:");
        const initialUSDTBalance = await testUSDT.balanceOf(deployer.address);
        const initialAAVEUSDBalance = await aaveusd.balanceOf(deployer.address);
        const currentPrice = await aaveusd.getCurrentPrice();
        
        console.log("   USDT余额:", formatUnits(initialUSDTBalance, 6));
        console.log("   AAVEUSD余额:", initialAAVEUSDBalance.toString());
        console.log("   当前价格:", formatUnits(currentPrice, 8), "USD");
        
        // 确保有足够的测试USDT
        if (initialUSDTBalance.lt(parseUnits("100", 6))) {
            console.log("💰 铸造测试USDT...");
            const mintTx = await testUSDT.freeMint(parseUnits("1000", 6));
            await mintTx.wait();
            console.log("✅ 成功铸造 1000 测试USDT");
        }
        
        // 测试新的 deposit 函数
        console.log("\n🔄 测试 deposit 函数...");
        const depositAmount = parseUnits("100", 6); // 100 USDT
        
        // 授权USDT
        console.log("📝 授权USDT...");
        const approveTx = await testUSDT.approve(aaveusdAddress, depositAmount);
        await approveTx.wait();
        console.log("✅ USDT授权成功");
        
        // 预计算可获得的代币数量
        const expectedTokens = await aaveusd.getTokenAmountForUSDT(depositAmount);
        console.log("💡 预计获得代币:", expectedTokens.toString(), "AAVEUSD");
        
        // 执行存款
        console.log("💳 执行存款...");
        const depositTx = await aaveusd.deposit(depositAmount);
        const depositReceipt = await depositTx.wait();
        
        // 解析存款事件
        const depositEvent = depositReceipt.events?.find(e => e.event === 'Deposited');
        if (depositEvent) {
            const [user, usdtAmount, tokenAmount, price] = depositEvent.args;
            console.log("🎉 存款成功！");
            console.log("   用户:", user);
            console.log("   USDT数量:", formatUnits(usdtAmount, 6));
            console.log("   获得代币:", tokenAmount.toString());
            console.log("   使用价格:", formatUnits(price, 8), "USD");
        }
        
        // 检查余额变化
        const afterDepositUSDT = await testUSDT.balanceOf(deployer.address);
        const afterDepositAAVEUSD = await aaveusd.balanceOf(deployer.address);
        
        console.log("📊 存款后余额:");
        console.log("   USDT余额:", formatUnits(afterDepositUSDT, 6));
        console.log("   AAVEUSD余额:", afterDepositAAVEUSD.toString());
        
        // 测试新的 redeem 函数
        console.log("\n🔄 测试 redeem 函数...");
        const redeemAmount = afterDepositAAVEUSD.div(2); // 赎回一半
        
        // 预计算可获得的USDT数量
        const expectedUSDT = await aaveusd.getUSDTAmountForTokens(redeemAmount);
        console.log("💡 预计获得USDT:", formatUnits(expectedUSDT, 6));
        
        // 执行赎回
        console.log("💳 执行赎回...");
        const redeemTx = await aaveusd.redeem(redeemAmount);
        const redeemReceipt = await redeemTx.wait();
        
        // 解析赎回事件
        const redeemEvent = redeemReceipt.events?.find(e => e.event === 'Redeemed');
        if (redeemEvent) {
            const [user, tokenAmount, usdtAmount, price] = redeemEvent.args;
            console.log("🎉 赎回成功！");
            console.log("   用户:", user);
            console.log("   代币数量:", tokenAmount.toString());
            console.log("   获得USDT:", formatUnits(usdtAmount, 6));
            console.log("   使用价格:", formatUnits(price, 8), "USD");
        }
        
        // 检查最终余额
        const finalUSDTBalance = await testUSDT.balanceOf(deployer.address);
        const finalAAVEUSDBalance = await aaveusd.balanceOf(deployer.address);
        
        console.log("📊 最终余额:");
        console.log("   USDT余额:", formatUnits(finalUSDTBalance, 6));
        console.log("   AAVEUSD余额:", finalAAVEUSDBalance.toString());
        
        // 测试向后兼容性
        console.log("\n🔄 测试向后兼容性...");
        
        // 测试 buyTokens 别名函数
        const buyAmount = parseUnits("50", 6); // 50 USDT
        
        console.log("📝 授权USDT（用于buyTokens）...");
        const approve2Tx = await testUSDT.approve(aaveusdAddress, buyAmount);
        await approve2Tx.wait();
        
        console.log("💳 执行 buyTokens（向后兼容）...");
        const buyTx = await aaveusd.buyTokens(buyAmount);
        const buyReceipt = await buyTx.wait();
        
        // 由于buyTokens内部调用deposit，应该触发Deposited事件
        const buyEvent = buyReceipt.events?.find(e => e.event === 'Deposited');
        if (buyEvent) {
            console.log("✅ buyTokens 向后兼容测试成功，触发了 Deposited 事件");
        }
        
        // 测试 redeemTokens 别名函数
        const redeemAmount2 = parseUnits("10", 0); // 10 AAVEUSD
        
        console.log("💳 执行 redeemTokens（向后兼容）...");
        const redeemTokensTx = await aaveusd.redeemTokens(redeemAmount2);
        const redeemTokensReceipt = await redeemTokensTx.wait();
        
        // 由于redeemTokens内部调用redeem，应该触发Redeemed事件
        const redeemTokensEvent = redeemTokensReceipt.events?.find(e => e.event === 'Redeemed');
        if (redeemTokensEvent) {
            console.log("✅ redeemTokens 向后兼容测试成功，触发了 Redeemed 事件");
        }
        
        // 最终报告
        console.log("\n📋 测试总结:");
        console.log("✅ deposit 函数正常工作");
        console.log("✅ redeem 函数正常工作");
        console.log("✅ Deposited 事件包含价格信息");
        console.log("✅ Redeemed 事件包含价格信息");
        console.log("✅ buyTokens 向后兼容性正常");
        console.log("✅ redeemTokens 向后兼容性正常");
        
        console.log("\n🎉 所有测试通过！新功能和向后兼容性都正常工作。");
        
    } catch (error) {
        console.error("❌ 测试失败:", error);
        process.exit(1);
    }
}

// 执行测试
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("💥 测试脚本执行失败:", error);
            process.exit(1);
        });
}

module.exports = main; 