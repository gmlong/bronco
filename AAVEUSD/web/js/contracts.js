// 合约实例
let aaveusdContract = null;
let testUsdtContract = null;
let provider = null;
let signer = null;

// 合约管理器
const Contracts = {
    // 初始化合约
    async init() {
        try {
            if (!window.ethereum) {
                throw new Error('请安装 MetaMask 钱包');
            }

            provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // 检查网络
            const network = await provider.getNetwork();
            console.log('当前网络:', network);
            
            // 获取signer
            signer = provider.getSigner();
            
            // 初始化合约实例
            await this.initializeContracts();
            
            return true;
        } catch (error) {
            console.error('合约初始化失败:', error);
            throw error;
        }
    },

    // 初始化合约实例
    async initializeContracts() {
        const addresses = CONFIG.getCurrentAddresses();
        
        // 初始化 AAVEUSD 合约
        if (addresses.AAVEUSD_PROXY) {
            aaveusdContract = new ethers.Contract(
                addresses.AAVEUSD_PROXY,
                AAVEUSD_ABI,
                signer
            );
            console.log('AAVEUSD 合约已连接:', addresses.AAVEUSD_PROXY);
        }

        // 获取USDT合约地址 (从AAVEUSD合约中读取)
        if (aaveusdContract && !addresses.TEST_USDT) {
            try {
                const usdtAddress = await aaveusdContract.usdtToken();
                if (usdtAddress && usdtAddress !== ethers.constants.AddressZero) {
                    CONTRACT_ADDRESSES[CURRENT_NETWORK].TEST_USDT = usdtAddress;
                    console.log('从合约获取USDT地址:', usdtAddress);
                }
            } catch (error) {
                console.warn('无法从合约获取USDT地址:', error);
            }
        }

        // 初始化 TestUSDT 合约
        const usdtAddress = CONTRACT_ADDRESSES[CURRENT_NETWORK].TEST_USDT;
        if (usdtAddress) {
            testUsdtContract = new ethers.Contract(
                usdtAddress,
                TEST_USDT_ABI,
                signer
            );
            console.log('TestUSDT 合约已连接:', usdtAddress);
        }
    },

    // 检查合约是否已连接
    isConnected() {
        return aaveusdContract !== null && testUsdtContract !== null;
    },

    // 获取用户地址
    async getUserAddress() {
        if (!signer) return null;
        return await signer.getAddress();
    },

    // === 余额查询功能 ===
    
    // 获取BNB余额
    async getBNBBalance(address) {
        if (!provider || !address) return '0';
        const balance = await provider.getBalance(address);
        return balance;
    },

    // 获取USDT余额
    async getUSDTBalance(address) {
        if (!testUsdtContract || !address) return '0';
        const balance = await testUsdtContract.balanceOf(address);
        return balance;
    },

    // 获取AAVEUSD余额
    async getAAVEUSDBalance(address) {
        if (!aaveusdContract || !address) return '0';
        const balance = await aaveusdContract.balanceOf(address);
        return balance;
    },

    // 获取合约中的USDT余额
    async getContractUSDTBalance() {
        if (!aaveusdContract) return '0';
        const balance = await aaveusdContract.getContractUSDTBalance();
        return balance;
    },

    // 获取所有余额
    async getAllBalances(address) {
        if (!address) return {};
        
        try {
            const [bnbBalance, usdtBalance, aaveusdBalance, contractUsdtBalance] = await Promise.all([
                this.getBNBBalance(address),
                this.getUSDTBalance(address),
                this.getAAVEUSDBalance(address),
                this.getContractUSDTBalance()
            ]);

            return {
                bnb: bnbBalance,
                usdt: usdtBalance,
                aaveusd: aaveusdBalance,
                contractUsdt: contractUsdtBalance
            };
        } catch (error) {
            console.error('获取余额失败:', error);
            return {};
        }
    },

    // === 价格相关功能 ===

    // 获取当前AAVE价格
    async getCurrentPrice() {
        if (!aaveusdContract) return '0';
        const price = await aaveusdContract.getCurrentPrice();
        return price;
    },

    // 获取价格聚合器地址
    async getPriceFeedAddress() {
        if (!aaveusdContract) return '';
        const address = await aaveusdContract.getPriceFeedAddress();
        return address;
    },

    // 计算可购买的AAVEUSD数量
    async getTokenAmountForUSDT(usdtAmount) {
        if (!aaveusdContract || !usdtAmount) return '0';
        const amount = await aaveusdContract.getTokenAmountForUSDT(usdtAmount);
        return amount;
    },

    // 计算可赎回的USDT数量
    async getUSDTAmountForTokens(tokenAmount) {
        if (!aaveusdContract || !tokenAmount) return '0';
        const amount = await aaveusdContract.getUSDTAmountForTokens(tokenAmount);
        return amount;
    },

    // === 交易功能 ===

    // 免费铸造测试USDT
    async freeMintUSDT(amount) {
        if (!testUsdtContract) {
            throw new Error('TestUSDT 合约未连接');
        }

        const tx = await testUsdtContract.freeMint(amount, {
            gasLimit: GAS_SETTINGS.gasLimit.freeMint
        });
        
        return tx;
    },

    // 批准USDT授权
    async approveUSDT(amount) {
        if (!testUsdtContract || !aaveusdContract) {
            throw new Error('合约未连接');
        }

        const tx = await testUsdtContract.approve(aaveusdContract.address, amount, {
            gasLimit: GAS_SETTINGS.gasLimit.approve
        });
        
        return tx;
    },

    // 检查USDT授权额度
    async getUSDTAllowance(owner, spender) {
        if (!testUsdtContract) return '0';
        const allowance = await testUsdtContract.allowance(owner, spender || aaveusdContract.address);
        return allowance;
    },

    // 新的存款函数 - 使用deposit
    async deposit(usdtAmount) {
        if (!aaveusdContract) {
            throw new Error('AAVEUSD 合约未连接');
        }

        const tx = await aaveusdContract.deposit(usdtAmount, {
            gasLimit: GAS_SETTINGS.gasLimit.deposit
        });
        
        return tx;
    },

    // 新的赎回函数 - 使用redeem
    async redeem(tokenAmount) {
        if (!aaveusdContract) {
            throw new Error('AAVEUSD 合约未连接');
        }

        const tx = await aaveusdContract.redeem(tokenAmount, {
            gasLimit: GAS_SETTINGS.gasLimit.redeem
        });
        
        return tx;
    },

    // 保持向后兼容的购买AAVEUSD代币函数
    async buyTokens(usdtAmount) {
        if (!aaveusdContract) {
            throw new Error('AAVEUSD 合约未连接');
        }

        const tx = await aaveusdContract.buyTokens(usdtAmount, {
            gasLimit: GAS_SETTINGS.gasLimit.buyTokens
        });
        
        return tx;
    },

    // 保持向后兼容的赎回USDT函数
    async redeemTokens(tokenAmount) {
        if (!aaveusdContract) {
            throw new Error('AAVEUSD 合约未连接');
        }

        const tx = await aaveusdContract.redeemTokens(tokenAmount, {
            gasLimit: GAS_SETTINGS.gasLimit.redeemTokens
        });
        
        return tx;
    },

    // === 合约信息功能 ===

    // 获取合约基本信息
    async getContractInfo() {
        if (!aaveusdContract) return {};

        try {
            const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
                aaveusdContract.name(),
                aaveusdContract.symbol(),
                aaveusdContract.decimals(),
                aaveusdContract.totalSupply(),
                aaveusdContract.owner()
            ]);

            return {
                name,
                symbol,
                decimals,
                totalSupply,
                owner
            };
        } catch (error) {
            console.error('获取合约信息失败:', error);
            return {};
        }
    },

    // === 管理员功能 ===

    // 检查是否为合约所有者
    async isOwner(address) {
        if (!aaveusdContract || !address) return false;
        try {
            const owner = await aaveusdContract.owner();
            return owner.toLowerCase() === address.toLowerCase();
        } catch (error) {
            return false;
        }
    },

    // 铸造代币
    async mintTokens(toAddress, amount) {
        if (!aaveusdContract) {
            throw new Error('AAVEUSD 合约未连接');
        }

        const tx = await aaveusdContract.mint(toAddress, amount, {
            gasLimit: GAS_SETTINGS.gasLimit.mint
        });
        
        return tx;
    },

    // 更新价格聚合器
    async updatePriceFeed(newPriceFeedAddress) {
        if (!aaveusdContract) {
            throw new Error('AAVEUSD 合约未连接');
        }

        const tx = await aaveusdContract.updatePriceFeed(newPriceFeedAddress, {
            gasLimit: GAS_SETTINGS.gasLimit.updatePriceFeed
        });
        
        return tx;
    },

    // 紧急提取USDT
    async emergencyWithdrawUSDT(amount) {
        if (!aaveusdContract) {
            throw new Error('AAVEUSD 合约未连接');
        }

        const tx = await aaveusdContract.emergencyWithdrawUSDT(amount, {
            gasLimit: GAS_SETTINGS.gasLimit.emergencyWithdraw
        });
        
        return tx;
    },

    // === 新的事件监听 ===

    // 监听新的存款事件 (包含价格信息)
    onDeposited(callback) {
        if (!aaveusdContract) return;
        
        aaveusdContract.on('Deposited', (user, usdtAmount, tokenAmount, price, event) => {
            callback({
                user,
                usdtAmount,
                tokenAmount,
                price, // 新增价格信息
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });
    },

    // 监听新的赎回事件 (包含价格信息)
    onRedeemed(callback) {
        if (!aaveusdContract) return;
        
        aaveusdContract.on('Redeemed', (user, tokenAmount, usdtAmount, price, event) => {
            callback({
                user,
                tokenAmount,
                usdtAmount,
                price, // 新增价格信息
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });
    },

    // 保持向后兼容的事件监听
    // 监听购买事件
    onTokensPurchased(callback) {
        if (!aaveusdContract) return;
        
        aaveusdContract.on('TokensPurchased', (buyer, usdtAmount, tokenAmount, event) => {
            callback({
                buyer,
                usdtAmount,
                tokenAmount,
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });
    },

    // 监听赎回事件
    onTokensRedeemed(callback) {
        if (!aaveusdContract) return;
        
        aaveusdContract.on('TokensRedeemed', (redeemer, tokenAmount, usdtAmount, event) => {
            callback({
                redeemer,
                tokenAmount,
                usdtAmount,
                txHash: event.transactionHash,
                blockNumber: event.blockNumber
            });
        });
    },

    // 移除所有事件监听器
    removeAllListeners() {
        if (aaveusdContract) {
            aaveusdContract.removeAllListeners();
        }
        if (testUsdtContract) {
            testUsdtContract.removeAllListeners();
        }
    },

    // === 工具函数 ===

    // 等待交易确认
    async waitForTransaction(tx, confirmations = 1) {
        if (!provider) throw new Error('Provider 未连接');
        
        console.log('等待交易确认:', tx.hash);
        const receipt = await provider.waitForTransaction(tx.hash, confirmations);
        console.log('交易已确认:', receipt);
        
        return receipt;
    },

    // 获取交易详情
    async getTransaction(txHash) {
        if (!provider) return null;
        
        try {
            const tx = await provider.getTransaction(txHash);
            const receipt = await provider.getTransactionReceipt(txHash);
            
            return {
                transaction: tx,
                receipt: receipt
            };
        } catch (error) {
            console.error('获取交易详情失败:', error);
            return null;
        }
    },

    // 获取当前gas价格
    async getGasPrice() {
        if (!provider) return null;
        return await provider.getGasPrice();
    },

    // 估算gas用量
    async estimateGas(contract, method, params = []) {
        try {
            const gasEstimate = await contract.estimateGas[method](...params);
            return gasEstimate;
        } catch (error) {
            console.error('Gas估算失败:', error);
            return null;
        }
    }
};

// 导出合约实例以供其他模块使用
window.Contracts = Contracts; 