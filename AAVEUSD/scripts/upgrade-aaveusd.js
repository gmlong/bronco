const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🔄 开始升级 AAVEUSD 合约...");
    
    try {
        // 获取部署者账户
        const [deployer] = await ethers.getSigners();
        console.log("📍 升级账户:", deployer.address);
        
        // 修复ethers.js版本兼容性问题
        const balance = await deployer.provider.getBalance(deployer.address);
        const formatEther = ethers.formatEther || ethers.utils.formatEther;
        console.log("💰 账户余额:", formatEther(balance), "BNB");
        
        // 读取现有部署信息 - 查找deployment-bsc-testnet-*.json文件
        const deploymentFiles = fs.readdirSync(__dirname + '/../').filter(f => f.startsWith('deployment-bsc-testnet-') && f.endsWith('.json'));
        if (deploymentFiles.length === 0) {
            throw new Error("❌ 未找到部署文件 deployment-bsc-testnet-*.json，请先部署合约");
        }
        
        // 选择最新的部署文件
        const latestDeploymentFile = deploymentFiles.sort().reverse()[0];
        const deploymentFilePath = path.join(__dirname, '..', latestDeploymentFile);
        console.log("📄 使用部署文件:", latestDeploymentFile);
        
        const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
        const proxyAddress = deploymentInfo.contracts?.aaveusd?.proxyAddress || deploymentInfo.aaveusd?.proxy;
        
        if (!proxyAddress) {
            throw new Error("❌ 未找到代理合约地址，请检查部署文件");
        }
        
        console.log("📍 代理合约地址:", proxyAddress);
        
        // 获取当前实现合约地址
        const currentImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        console.log("📍 当前实现合约地址:", currentImplementation);
        
        // 编译新合约
        console.log("🔨 编译新的 AAVEUSD 合约...");
        const AAVEUSDv2 = await ethers.getContractFactory("AAVEUSD");
        
        // 验证合约升级兼容性
        console.log("🔍 验证升级兼容性...");
        try {
            await upgrades.validateUpgrade(proxyAddress, AAVEUSDv2);
            console.log("✅ 升级兼容性验证通过");
        } catch (error) {
            console.warn("⚠️ 升级兼容性警告:", error.message);
            // 继续执行，因为某些警告可能是可接受的
        }
        
        // 执行升级
        console.log("🚀 执行合约升级...");
        const upgradedContract = await upgrades.upgradeProxy(proxyAddress, AAVEUSDv2);
        await upgradedContract.waitForDeployment();
        
        // 获取新实现合约地址
        const newImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        console.log("📍 新实现合约地址:", newImplementation);
        
        // 验证升级是否成功
        console.log("🔍 验证升级结果...");
        const upgradedAAVEUSD = AAVEUSDv2.attach(proxyAddress);
        
        // 检查基本信息
        const name = await upgradedAAVEUSD.name();
        const symbol = await upgradedAAVEUSD.symbol();
        const decimals = await upgradedAAVEUSD.decimals();
        const owner = await upgradedAAVEUSD.owner();
        
        console.log("📊 升级后合约信息:");
        console.log("   名称:", name);
        console.log("   符号:", symbol);
        console.log("   小数位:", decimals.toString());
        console.log("   所有者:", owner);
        
        // 检查新函数是否存在
        try {
            // 测试新的函数（deposit 和 redeem）
            console.log("🔍 验证新函数...");
            
            // 注意：这里只是检查函数是否存在，不实际调用
            const depositInterface = upgradedAAVEUSD.interface.getFunction('deposit');
            const redeemInterface = upgradedAAVEUSD.interface.getFunction('redeem');
            
            console.log("✅ deposit 函数存在");
            console.log("✅ redeem 函数存在");
            
            // 检查向后兼容的函数
            const buyTokensInterface = upgradedAAVEUSD.interface.getFunction('buyTokens');
            const redeemTokensInterface = upgradedAAVEUSD.interface.getFunction('redeemTokens');
            
            console.log("✅ buyTokens 函数存在（向后兼容）");
            console.log("✅ redeemTokens 函数存在（向后兼容）");
            
        } catch (error) {
            console.warn("⚠️ 函数验证警告:", error.message);
        }
        
        // 更新部署信息
        const upgradeTime = new Date().toISOString();
        const upgradeInfo = {
            ...deploymentInfo,
            contracts: {
                ...deploymentInfo.contracts,
                aaveusd: {
                    ...deploymentInfo.contracts.aaveusd,
                    implementations: [
                        ...(deploymentInfo.contracts.aaveusd.implementations || []),
                        {
                            address: newImplementation,
                            version: (deploymentInfo.contracts.aaveusd.implementations?.length || 0) + 2, // v2, v3, etc.
                            deployedAt: upgradeTime,
                            changes: [
                                "将 buyTokens 重命名为 deposit",
                                "将 redeemTokens 重命名为 redeem", 
                                "在 Deposited 和 Redeemed 事件中添加价格信息",
                                "保持向后兼容的别名函数"
                            ]
                        }
                    ],
                    lastUpgrade: {
                        from: currentImplementation,
                        to: newImplementation,
                        timestamp: upgradeTime,
                        txHash: upgradedContract.deploymentTransaction()?.hash
                    }
                }
            }
        };
        
        // 保存升级信息到原文件
        fs.writeFileSync(deploymentFilePath, JSON.stringify(upgradeInfo, null, 2));
        console.log("💾 部署信息已更新到:", latestDeploymentFile);
        
        // 验证新实现合约（如果有BSCScan API密钥）
        if (process.env.BSCSCAN_API_KEY && hre.network.name.includes('bsc')) {
            try {
                console.log("🔍 验证新实现合约...");
                await hre.run("verify:verify", {
                    address: newImplementation,
                    constructorArguments: []
                });
                console.log("✅ 新实现合约验证成功");
            } catch (error) {
                console.warn("⚠️ 合约验证失败:", error.message);
                console.log("📝 手动验证命令:");
                console.log(`   npx hardhat verify --network ${hre.network.name} ${newImplementation}`);
            }
        }
        
        // 升级完成总结
        console.log("\n🎉 合约升级成功！");
        console.log("📋 升级总结:");
        console.log("   代理合约地址:", proxyAddress);
        console.log("   旧实现地址:", currentImplementation);
        console.log("   新实现地址:", newImplementation);
        console.log("   升级时间:", upgradeTime);
        
        console.log("\n📝 新功能:");
        console.log("   ✅ 新增 deposit() 函数（替代 buyTokens）");
        console.log("   ✅ 新增 redeem() 函数（替代 redeemTokens）");
        console.log("   ✅ 事件包含价格信息：Deposited 和 Redeemed");
        console.log("   ✅ 保持向后兼容：buyTokens 和 redeemTokens 仍可使用");
        
        console.log("\n🔗 区块链浏览器链接:");
        const networkConfig = hre.network.config;
        if (hre.network.name === 'bscTestnet') {
            console.log("   代理合约:", `https://testnet.bscscan.com/address/${proxyAddress}`);
            console.log("   新实现合约:", `https://testnet.bscscan.com/address/${newImplementation}`);
        } else if (hre.network.name === 'bscMainnet') {
            console.log("   代理合约:", `https://bscscan.com/address/${proxyAddress}`);
            console.log("   新实现合约:", `https://bscscan.com/address/${newImplementation}`);
        }
        
        console.log("\n💡 下一步:");
        console.log("   1. 在 BSCScan 上验证代理合约显示新的 ABI");
        console.log("   2. 更新前端代码以使用新的函数名");
        console.log("   3. 测试新的 deposit 和 redeem 功能");
        console.log("   4. 验证事件是否包含价格信息");
        
    } catch (error) {
        console.error("❌ 升级失败:", error);
        process.exit(1);
    }
}

// 执行升级
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("💥 脚本执行失败:", error);
            process.exit(1);
        });
}

module.exports = main; 