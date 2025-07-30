// 应用状态
let currentAccount = null;
let isConnected = false;
let transactionHistory = [];

// DOM 元素引用
const elements = {
    // 钱包连接
    connectWallet: document.getElementById('connectWallet'),
    walletAddress: document.getElementById('walletAddress'),
    networkName: document.getElementById('networkName'),
    contractStatus: document.getElementById('contractStatus'),
    networkInfo: document.getElementById('networkInfo'),
    
    // 余额显示
    bnbBalance: document.getElementById('bnbBalance'),
    usdtBalance: document.getElementById('usdtBalance'),
    aaveusdBalance: document.getElementById('aaveusdBalance'),
    contractUsdtBalance: document.getElementById('contractUsdtBalance'),
    refreshBalances: document.getElementById('refreshBalances'),
    
    // 价格信息
    currentPrice: document.getElementById('currentPrice'),
    priceFeedAddress: document.getElementById('priceFeedAddress'),
    usdtInput: document.getElementById('usdtInput'),
    aaveusdInput: document.getElementById('aaveusdInput'),
    calculatedAAVEUSD: document.getElementById('calculatedAAVEUSD'),
    calculatedUSDT: document.getElementById('calculatedUSDT'),
    refreshPrice: document.getElementById('refreshPrice'),
    
    // 交易操作
    freeMintUSDT: document.getElementById('freeMintUSDT'),
    buyUsdtAmount: document.getElementById('buyUsdtAmount'),
    buyUsdtBalance: document.getElementById('buyUsdtBalance'),
    buyPreview: document.getElementById('buyPreview'),
    buyTokens: document.getElementById('buyTokens'),
    redeemTokenAmount: document.getElementById('redeemTokenAmount'),
    redeemTokenBalance: document.getElementById('redeemTokenBalance'),
    redeemPreview: document.getElementById('redeemPreview'),
    redeemTokens: document.getElementById('redeemTokens'),
    transactionHistory: document.getElementById('transactionHistory'),
    
    // 管理功能
    contractName: document.getElementById('contractName'),
    contractSymbol: document.getElementById('contractSymbol'),
    contractDecimals: document.getElementById('contractDecimals'),
    totalSupply: document.getElementById('totalSupply'),
    contractOwner: document.getElementById('contractOwner'),
    mintToAddress: document.getElementById('mintToAddress'),
    mintAmount: document.getElementById('mintAmount'),
    mintTokens: document.getElementById('mintTokens'),
    newPriceFeed: document.getElementById('newPriceFeed'),
    updatePriceFeed: document.getElementById('updatePriceFeed'),
    withdrawAmount: document.getElementById('withdrawAmount'),
    emergencyWithdraw: document.getElementById('emergencyWithdraw'),
    aaveusdProxyAddress: document.getElementById('aaveusdProxyAddress'),
    testUsdtAddress: document.getElementById('testUsdtAddress'),
    
    // UI 控制
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingMessage: document.getElementById('loadingMessage'),
    notification: document.getElementById('notification'),
    notificationIcon: document.getElementById('notificationIcon'),
    notificationMessage: document.getElementById('notificationMessage')
};

// 应用主类
class AAVEUSDApp {
    constructor() {
        this.init();
    }

    async init() {
        console.log('初始化 AAVEUSD 应用...');
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 设置标签页切换
        this.setupTabs();
        
        // 检查是否已连接钱包
        await this.checkConnection();
        
        // 设置合约地址显示
        this.updateContractAddresses();
        
        console.log('应用初始化完成');
    }

    // 设置事件监听器
    setupEventListeners() {
        // 钱包连接
        elements.connectWallet.addEventListener('click', () => this.connectWallet());
        
        // 余额刷新
        elements.refreshBalances.addEventListener('click', () => this.refreshBalances());
        
        // 价格相关
        elements.refreshPrice.addEventListener('click', () => this.refreshPrice());
        elements.usdtInput.addEventListener('input', () => this.updateBuyPreview());
        elements.aaveusdInput.addEventListener('input', () => this.updateRedeemPreview());
        
        // 交易操作
        elements.freeMintUSDT.addEventListener('click', () => this.freeMintUSDT());
        elements.buyUsdtAmount.addEventListener('input', () => this.updateBuyPreview());
        elements.buyTokens.addEventListener('click', () => this.buyTokens());
        elements.redeemTokenAmount.addEventListener('input', () => this.updateRedeemPreview());
        elements.redeemTokens.addEventListener('click', () => this.redeemTokens());
        
        // 管理员功能
        elements.mintTokens.addEventListener('click', () => this.mintTokens());
        elements.updatePriceFeed.addEventListener('click', () => this.updatePriceFeed());
        elements.emergencyWithdraw.addEventListener('click', () => this.emergencyWithdraw());
        
        // 监听钱包事件
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                this.handleAccountsChanged(accounts);
            });
            
            window.ethereum.on('chainChanged', (chainId) => {
                this.handleChainChanged(chainId);
            });
        }
    }

    // 设置标签页切换
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // 更新按钮状态
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // 更新内容显示
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                    if (content.id === tabName) {
                        content.classList.remove('hidden');
                    }
                });
                
                // 加载对应标签页的数据
                this.loadTabData(tabName);
            });
        });
    }

    // 加载标签页数据
    async loadTabData(tabName) {
        if (!isConnected) return;
        
        switch (tabName) {
            case 'balances':
                await this.refreshBalances();
                break;
            case 'price':
                await this.refreshPrice();
                break;
            case 'trading':
                await this.updateTradingInfo();
                break;
            case 'admin':
                await this.loadContractInfo();
                break;
        }
    }

    // 连接钱包
    async connectWallet() {
        try {
            this.showLoading('连接钱包中...');
            
            if (!window.ethereum) {
                throw new Error('请安装 MetaMask 钱包');
            }

            // 请求账户访问
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('未找到账户');
            }

            currentAccount = accounts[0];
            
            // 检查网络
            await this.checkNetwork();
            
            // 初始化合约
            await Contracts.init();
            
            if (!Contracts.isConnected()) {
                throw new Error('合约连接失败');
            }
            
            isConnected = true;
            await this.updateUI();
            
            // 设置事件监听
            this.setupContractEventListeners();
            
            this.showNotification('钱包连接成功！', 'success');
            
        } catch (error) {
            console.error('连接钱包失败:', error);
            this.showNotification(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 检查连接状态
    async checkConnection() {
        if (!window.ethereum) return;
        
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });
            
            if (accounts.length > 0) {
                currentAccount = accounts[0];
                await this.checkNetwork();
                await Contracts.init();
                
                if (Contracts.isConnected()) {
                    isConnected = true;
                    await this.updateUI();
                    this.setupContractEventListeners();
                }
            }
        } catch (error) {
            console.error('检查连接失败:', error);
        }
    }

    // 检查网络
    async checkNetwork() {
        const networkId = await window.ethereum.request({
            method: 'net_version'
        });
        
        const expectedNetworkId = parseInt(CONFIG.getCurrentNetwork().chainId, 16);
        
        if (parseInt(networkId) !== expectedNetworkId) {
            await this.switchNetwork();
        }
    }

    // 切换网络
    async switchNetwork() {
        try {
            const network = CONFIG.getCurrentNetwork();
            
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: network.chainId }]
            });
            
        } catch (switchError) {
            // 如果网络不存在，尝试添加
            if (switchError.code === 4902) {
                await this.addNetwork();
            } else {
                throw switchError;
            }
        }
    }

    // 添加网络
    async addNetwork() {
        const network = CONFIG.getCurrentNetwork();
        
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network]
        });
    }

    // 更新UI
    async updateUI() {
        try {
            // 更新连接状态
            elements.walletAddress.textContent = CONFIG.formatAddress(currentAccount);
            elements.networkName.textContent = CONFIG.getCurrentNetwork().chainName;
            elements.contractStatus.textContent = isConnected ? '已连接' : '未连接';
            
            // 更新钱包按钮
            elements.connectWallet.innerHTML = '<i class="fas fa-check mr-2"></i>已连接';
            elements.connectWallet.classList.add('bg-green-600', 'text-white');
            elements.connectWallet.classList.remove('bg-white', 'text-blue-600');
            
            // 更新网络信息
            const network = await window.ethereum.request({ method: 'net_version' });
            elements.networkInfo.textContent = `网络 ID: ${network}`;
            
            // 加载初始数据
            await this.refreshBalances();
            await this.refreshPrice();
            await this.loadContractInfo();
            
        } catch (error) {
            console.error('更新UI失败:', error);
        }
    }

    // 刷新余额
    async refreshBalances() {
        if (!isConnected || !currentAccount) return;
        
        try {
            const balances = await Contracts.getAllBalances(currentAccount);
            
            elements.bnbBalance.textContent = CONFIG.formatBNB(balances.bnb);
            elements.usdtBalance.textContent = CONFIG.formatUSDT(balances.usdt);
            elements.aaveusdBalance.textContent = CONFIG.formatAAVEUSD(balances.aaveusd);
            elements.contractUsdtBalance.textContent = CONFIG.formatUSDT(balances.contractUsdt);
            
            // 更新交易页面的余额显示
            elements.buyUsdtBalance.textContent = CONFIG.formatUSDT(balances.usdt);
            elements.redeemTokenBalance.textContent = CONFIG.formatAAVEUSD(balances.aaveusd);
            
        } catch (error) {
            console.error('刷新余额失败:', error);
            this.showNotification('刷新余额失败', 'error');
        }
    }

    // 刷新价格信息
    async refreshPrice() {
        if (!isConnected) return;
        
        try {
            const [price, priceFeedAddr] = await Promise.all([
                Contracts.getCurrentPrice(),
                Contracts.getPriceFeedAddress()
            ]);
            
            elements.currentPrice.textContent = CONFIG.formatPrice(price);
            elements.priceFeedAddress.textContent = priceFeedAddr;
            
            // 更新计算器
            this.updateCalculator();
            
        } catch (error) {
            console.error('刷新价格失败:', error);
            this.showNotification('刷新价格失败', 'error');
        }
    }

    // 更新计算器
    async updateCalculator() {
        // 更新USDT -> AAVEUSD计算
        const usdtValue = elements.usdtInput.value;
        if (usdtValue) {
            try {
                const usdtAmount = CONFIG.parseUSDT(usdtValue);
                const tokenAmount = await Contracts.getTokenAmountForUSDT(usdtAmount);
                elements.calculatedAAVEUSD.textContent = CONFIG.formatAAVEUSD(tokenAmount);
            } catch (error) {
                elements.calculatedAAVEUSD.textContent = '--';
            }
        }
        
        // 更新AAVEUSD -> USDT计算
        const aaveusdValue = elements.aaveusdInput.value;
        if (aaveusdValue) {
            try {
                const tokenAmount = CONFIG.parseAAVEUSD(aaveusdValue);
                const usdtAmount = await Contracts.getUSDTAmountForTokens(tokenAmount);
                elements.calculatedUSDT.textContent = CONFIG.formatUSDT(usdtAmount);
            } catch (error) {
                elements.calculatedUSDT.textContent = '--';
            }
        }
    }

    // 更新购买预览
    async updateBuyPreview() {
        const usdtValue = elements.buyUsdtAmount.value;
        if (!usdtValue || !isConnected) {
            elements.buyPreview.textContent = '-- AAVEUSD';
            return;
        }
        
        try {
            const usdtAmount = CONFIG.parseUSDT(usdtValue);
            const tokenAmount = await Contracts.getTokenAmountForUSDT(usdtAmount);
            elements.buyPreview.textContent = `${CONFIG.formatAAVEUSD(tokenAmount)} AAVEUSD`;
        } catch (error) {
            elements.buyPreview.textContent = '-- AAVEUSD';
        }
    }

    // 更新赎回预览
    async updateRedeemPreview() {
        const tokenValue = elements.redeemTokenAmount.value;
        if (!tokenValue || !isConnected) {
            elements.redeemPreview.textContent = '-- USDT';
            return;
        }
        
        try {
            const tokenAmount = CONFIG.parseAAVEUSD(tokenValue);
            const usdtAmount = await Contracts.getUSDTAmountForTokens(tokenAmount);
            elements.redeemPreview.textContent = `${CONFIG.formatUSDT(usdtAmount)} USDT`;
        } catch (error) {
            elements.redeemPreview.textContent = '-- USDT';
        }
    }

    // 免费铸造USDT
    async freeMintUSDT() {
        if (!isConnected) {
            this.showNotification(ERROR_MESSAGES.WALLET_NOT_CONNECTED, 'error');
            return;
        }
        
        try {
            this.showLoading('铸造测试USDT中...');
            
            const mintAmount = CONFIG.parseUSDT('1000'); // 铸造1000 USDT
            const tx = await Contracts.freeMintUSDT(mintAmount);
            
            this.showLoading('等待交易确认...');
            await Contracts.waitForTransaction(tx);
            
            this.showNotification('成功获取 1000 测试USDT！', 'success');
            await this.refreshBalances();
            
        } catch (error) {
            console.error('铸造USDT失败:', error);
            this.handleTransactionError(error);
        } finally {
            this.hideLoading();
        }
    }

    // 存款购买代币 (更新后的函数)
    async buyTokens() {
        const usdtAmount = elements.buyUsdtAmount.value;
        
        if (!isConnected) {
            this.showNotification(ERROR_MESSAGES.WALLET_NOT_CONNECTED, 'error');
            return;
        }
        
        if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
            this.showNotification(ERROR_MESSAGES.INVALID_AMOUNT, 'error');
            return;
        }
        
        try {
            this.showLoading('存款USDT中...');
            
            const amount = CONFIG.parseUSDT(usdtAmount);
            
            // 检查余额
            const balance = await Contracts.getUSDTBalance(currentAccount);
            if (balance.lt(amount)) {
                throw new Error(ERROR_MESSAGES.INSUFFICIENT_BALANCE);
            }
            
            // 检查授权
            const allowance = await Contracts.getUSDTAllowance(currentAccount);
            if (allowance.lt(amount)) {
                this.showLoading('授权USDT中...');
                const approveTx = await Contracts.approveUSDT(amount);
                await Contracts.waitForTransaction(approveTx);
            }
            
            // 使用新的存款函数
            this.showLoading('存款购买代币中...');
            const tx = await Contracts.deposit(amount);
            
            this.showLoading('等待交易确认...');
            const receipt = await Contracts.waitForTransaction(tx);
            
            this.addTransactionToHistory({
                type: '存款',
                txHash: receipt.transactionHash,
                amount: usdtAmount + ' USDT',
                timestamp: new Date()
            });
            
            this.showNotification(`成功存款购买 AAVEUSD！`, 'success');
            
            // 清空输入
            elements.buyUsdtAmount.value = '';
            elements.buyPreview.textContent = '-- AAVEUSD';
            
            await this.refreshBalances();
            
        } catch (error) {
            console.error('存款失败:', error);
            this.handleTransactionError(error);
        } finally {
            this.hideLoading();
        }
    }

    // 赎回代币 (更新后的函数)
    async redeemTokens() {
        const tokenAmount = elements.redeemTokenAmount.value;
        
        if (!isConnected) {
            this.showNotification(ERROR_MESSAGES.WALLET_NOT_CONNECTED, 'error');
            return;
        }
        
        if (!tokenAmount || parseFloat(tokenAmount) <= 0) {
            this.showNotification(ERROR_MESSAGES.INVALID_AMOUNT, 'error');
            return;
        }
        
        try {
            this.showLoading('赎回USDT中...');
            
            const amount = CONFIG.parseAAVEUSD(tokenAmount);
            
            // 检查余额
            const balance = await Contracts.getAAVEUSDBalance(currentAccount);
            if (balance.lt(amount)) {
                throw new Error(ERROR_MESSAGES.INSUFFICIENT_BALANCE);
            }
            
            // 使用新的赎回函数
            const tx = await Contracts.redeem(amount);
            
            this.showLoading('等待交易确认...');
            const receipt = await Contracts.waitForTransaction(tx);
            
            this.addTransactionToHistory({
                type: '赎回',
                txHash: receipt.transactionHash,
                amount: tokenAmount + ' AAVEUSD',
                timestamp: new Date()
            });
            
            this.showNotification(`成功赎回 USDT！`, 'success');
            
            // 清空输入
            elements.redeemTokenAmount.value = '';
            elements.redeemPreview.textContent = '-- USDT';
            
            await this.refreshBalances();
            
        } catch (error) {
            console.error('赎回失败:', error);
            this.handleTransactionError(error);
        } finally {
            this.hideLoading();
        }
    }

    // 加载合约信息
    async loadContractInfo() {
        if (!isConnected) return;
        
        try {
            const info = await Contracts.getContractInfo();
            
            elements.contractName.textContent = info.name || '--';
            elements.contractSymbol.textContent = info.symbol || '--';
            elements.contractDecimals.textContent = info.decimals?.toString() || '--';
            elements.totalSupply.textContent = CONFIG.formatAAVEUSD(info.totalSupply) || '--';
            elements.contractOwner.textContent = info.owner || '--';
            
            // 检查是否为管理员
            const isOwner = await Contracts.isOwner(currentAccount);
            const adminSection = document.querySelector('.bg-blue-50');
            if (adminSection) {
                adminSection.style.display = isOwner ? 'block' : 'none';
            }
            
        } catch (error) {
            console.error('加载合约信息失败:', error);
        }
    }

    // 铸造代币 (管理员功能)
    async mintTokens() {
        const toAddress = elements.mintToAddress.value;
        const amount = elements.mintAmount.value;
        
        if (!CONFIG.isValidAddress(toAddress)) {
            this.showNotification('请输入有效地址', 'error');
            return;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            this.showNotification(ERROR_MESSAGES.INVALID_AMOUNT, 'error');
            return;
        }
        
        try {
            this.showLoading('铸造代币中...');
            
            const mintAmount = CONFIG.parseAAVEUSD(amount);
            const tx = await Contracts.mintTokens(toAddress, mintAmount);
            
            this.showLoading('等待交易确认...');
            await Contracts.waitForTransaction(tx);
            
            this.showNotification('代币铸造成功！', 'success');
            
            // 清空输入
            elements.mintToAddress.value = '';
            elements.mintAmount.value = '';
            
            await this.refreshBalances();
            await this.loadContractInfo();
            
        } catch (error) {
            console.error('铸造失败:', error);
            this.handleTransactionError(error);
        } finally {
            this.hideLoading();
        }
    }

    // 更新价格聚合器 (管理员功能)
    async updatePriceFeed() {
        const newAddress = elements.newPriceFeed.value;
        
        if (!CONFIG.isValidAddress(newAddress)) {
            this.showNotification('请输入有效地址', 'error');
            return;
        }
        
        try {
            this.showLoading('更新价格聚合器中...');
            
            const tx = await Contracts.updatePriceFeed(newAddress);
            
            this.showLoading('等待交易确认...');
            await Contracts.waitForTransaction(tx);
            
            this.showNotification('价格聚合器更新成功！', 'success');
            
            elements.newPriceFeed.value = '';
            await this.refreshPrice();
            
        } catch (error) {
            console.error('更新失败:', error);
            this.handleTransactionError(error);
        } finally {
            this.hideLoading();
        }
    }

    // 紧急提取USDT (管理员功能)
    async emergencyWithdraw() {
        const amount = elements.withdrawAmount.value;
        
        if (!amount || parseFloat(amount) <= 0) {
            this.showNotification(ERROR_MESSAGES.INVALID_AMOUNT, 'error');
            return;
        }
        
        try {
            this.showLoading('提取USDT中...');
            
            const withdrawAmount = CONFIG.parseUSDT(amount);
            const tx = await Contracts.emergencyWithdrawUSDT(withdrawAmount);
            
            this.showLoading('等待交易确认...');
            await Contracts.waitForTransaction(tx);
            
            this.showNotification('USDT提取成功！', 'success');
            
            elements.withdrawAmount.value = '';
            await this.refreshBalances();
            
        } catch (error) {
            console.error('提取失败:', error);
            this.handleTransactionError(error);
        } finally {
            this.hideLoading();
        }
    }

    // 更新合约地址显示
    updateContractAddresses() {
        const addresses = CONFIG.getCurrentAddresses();
        elements.aaveusdProxyAddress.textContent = addresses.AAVEUSD_PROXY || '--';
        elements.testUsdtAddress.textContent = addresses.TEST_USDT || '--';
    }

    // 更新交易信息
    async updateTradingInfo() {
        await this.refreshBalances();
        await this.updateBuyPreview();
        await this.updateRedeemPreview();
        this.updateTransactionHistory();
    }

    // 添加交易到历史记录
    addTransactionToHistory(transaction) {
        transactionHistory.unshift(transaction);
        if (transactionHistory.length > 10) {
            transactionHistory.pop();
        }
        this.updateTransactionHistory();
    }

    // 更新交易历史显示
    updateTransactionHistory() {
        if (transactionHistory.length === 0) {
            elements.transactionHistory.innerHTML = '<div class="text-gray-600 text-center">暂无交易记录</div>';
            return;
        }
        
        const historyHTML = transactionHistory.map(tx => {
            // 构建价格信息显示
            const priceInfo = tx.price ? `<div class="text-xs text-gray-500">价格: $${tx.price}</div>` : '';
            
            return `
                <div class="flex justify-between items-center p-3 bg-white rounded mb-2">
                    <div>
                        <div class="font-semibold">${tx.type}</div>
                        <div class="text-sm text-gray-600">${tx.amount}</div>
                        ${priceInfo}
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-600">${tx.timestamp.toLocaleString()}</div>
                        <a href="${CONFIG.getExplorerUrl(tx.txHash, 'tx')}" target="_blank" class="text-blue-600 text-sm hover:underline">
                            查看交易 <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
        
        elements.transactionHistory.innerHTML = historyHTML;
    }

    // 设置合约事件监听
    setupContractEventListeners() {
        // 监听新的存款事件 (包含价格信息)
        Contracts.onDeposited((event) => {
            if (event.user.toLowerCase() === currentAccount.toLowerCase()) {
                const price = CONFIG.formatPrice(event.price);
                this.showNotification(`存款成功！价格: $${price}`, 'success');
                
                // 添加到交易历史
                this.addTransactionToHistory({
                    type: '存款',
                    txHash: event.txHash,
                    amount: `${CONFIG.formatUSDT(event.usdtAmount)} USDT → ${CONFIG.formatAAVEUSD(event.tokenAmount)} AAVEUSD`,
                    price: price,
                    timestamp: new Date()
                });
                
                this.refreshBalances();
            }
        });
        
        // 监听新的赎回事件 (包含价格信息)
        Contracts.onRedeemed((event) => {
            if (event.user.toLowerCase() === currentAccount.toLowerCase()) {
                const price = CONFIG.formatPrice(event.price);
                this.showNotification(`赎回成功！价格: $${price}`, 'success');
                
                // 添加到交易历史
                this.addTransactionToHistory({
                    type: '赎回',
                    txHash: event.txHash,
                    amount: `${CONFIG.formatAAVEUSD(event.tokenAmount)} AAVEUSD → ${CONFIG.formatUSDT(event.usdtAmount)} USDT`,
                    price: price,
                    timestamp: new Date()
                });
                
                this.refreshBalances();
            }
        });
        
        // 保持向后兼容的事件监听
        // 监听旧的购买事件
        Contracts.onTokensPurchased((event) => {
            if (event.buyer.toLowerCase() === currentAccount.toLowerCase()) {
                this.showNotification('代币购买成功！', 'success');
                this.refreshBalances();
            }
        });
        
        // 监听旧的赎回事件
        Contracts.onTokensRedeemed((event) => {
            if (event.redeemer.toLowerCase() === currentAccount.toLowerCase()) {
                this.showNotification('代币赎回成功！', 'success');
                this.refreshBalances();
            }
        });
    }

    // 处理账户变更
    async handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            // 用户断开连接
            this.disconnect();
        } else if (accounts[0] !== currentAccount) {
            // 账户切换
            currentAccount = accounts[0];
            await this.updateUI();
        }
    }

    // 处理网络变更
    async handleChainChanged(chainId) {
        // 重新加载页面或重新初始化
        window.location.reload();
    }

    // 断开连接
    disconnect() {
        currentAccount = null;
        isConnected = false;
        
        // 重置UI
        elements.walletAddress.textContent = '未连接钱包';
        elements.networkName.textContent = '未连接';
        elements.contractStatus.textContent = '未连接合约';
        
        elements.connectWallet.innerHTML = '<i class="fas fa-wallet mr-2"></i>连接钱包';
        elements.connectWallet.classList.remove('bg-green-600', 'text-white');
        elements.connectWallet.classList.add('bg-white', 'text-blue-600');
        
        // 清空余额显示
        elements.bnbBalance.textContent = '0';
        elements.usdtBalance.textContent = '0';
        elements.aaveusdBalance.textContent = '0';
        elements.contractUsdtBalance.textContent = '0';
        
        // 移除事件监听
        Contracts.removeAllListeners();
    }

    // 处理交易错误
    handleTransactionError(error) {
        let message = ERROR_MESSAGES.TRANSACTION_FAILED;
        
        if (error.code === 4001) {
            message = ERROR_MESSAGES.USER_REJECTED;
        } else if (error.message.includes('insufficient funds')) {
            message = ERROR_MESSAGES.INSUFFICIENT_BALANCE;
        } else if (error.message.includes('Ownable: caller is not the owner')) {
            message = ERROR_MESSAGES.UNAUTHORIZED;
        } else if (error.reason) {
            message = error.reason;
        }
        
        this.showNotification(message, 'error');
    }

    // 显示加载状态
    showLoading(message = '处理中...') {
        elements.loadingMessage.textContent = message;
        elements.loadingOverlay.classList.remove('hidden');
    }

    // 隐藏加载状态
    hideLoading() {
        elements.loadingOverlay.classList.add('hidden');
    }

    // 显示通知
    showNotification(message, type = 'info') {
        elements.notificationMessage.textContent = message;
        elements.notification.className = `notification ${type}`;
        
        // 设置图标
        let icon = 'fas fa-info-circle';
        if (type === 'success') icon = 'fas fa-check-circle';
        else if (type === 'error') icon = 'fas fa-exclamation-circle';
        else if (type === 'warning') icon = 'fas fa-exclamation-triangle';
        
        elements.notificationIcon.className = icon;
        elements.notification.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            elements.notification.style.display = 'none';
        }, 3000);
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new AAVEUSDApp();
}); 