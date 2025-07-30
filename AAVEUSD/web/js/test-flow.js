// 合约配置
const BSC_TESTNET_CONFIG = {
    chainId: '0x61', // 97
    chainName: 'BNB Smart Chain Testnet',
    nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
    },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
    blockExplorerUrls: ['https://testnet.bscscan.com/']
};

// 合约地址配置 - 请根据您的部署文件更新
const CONTRACT_ADDRESSES = {
    AAVEUSD_PROXY: "0x33Aa7D36b96F77CDef1cF07bfC33a210e7309de4",
    TEST_USDT: "0x4faFeBeF2e920379478AF6C05ABC9C39260Ccd91"
};

// 合约ABI
const AAVEUSD_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function getCurrentPrice() view returns (int256)",
    "function getTokenAmountForUSDT(uint256 usdtAmount) view returns (uint256)",
    "function getUSDTAmountForTokens(uint256 tokenAmount) view returns (uint256)",
    "function getContractUSDTBalance() view returns (uint256)",
    "function deposit(uint256 usdtAmount)",
    "function redeem(uint256 tokenAmount)",
    "function usdtToken() view returns (address)",
    "event Deposited(address indexed user, uint256 usdtAmount, uint256 tokenAmount, uint256 price)",
    "event Redeemed(address indexed user, uint256 tokenAmount, uint256 usdtAmount, uint256 price)"
];

const TEST_USDT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function freeMint(uint256 amount)"
];

// 全局变量
let provider = null;
let signer = null;
let currentAccount = null;
let aaveusdContract = null;
let testUsdtContract = null;
let isConnected = false;
let currentStep = 0;
let testData = {};

// DOM元素
const elements = {
    connectWallet: document.getElementById('connectWallet'),
    walletAddress: document.getElementById('walletAddress'),
    networkName: document.getElementById('networkName'),
    networkStatus: document.getElementById('networkStatus'),
    contractStatus: document.getElementById('contractStatus'),
    startTest: document.getElementById('startTest'),
    clearLog: document.getElementById('clearLog'),
    logContent: document.getElementById('logContent'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingMessage: document.getElementById('loadingMessage')
};

// 应用类
class TestFlowApp {
    constructor() {
        this.init();
    }

    async init() {
        console.log('初始化测试流程应用...');
        this.setupEventListeners();
        await this.checkConnection();
    }

    setupEventListeners() {
        elements.connectWallet.addEventListener('click', () => this.connectWallet());
        elements.startTest.addEventListener('click', () => this.startTestFlow());
        elements.clearLog.addEventListener('click', () => this.clearLog());

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

    // 连接钱包
    async connectWallet() {
        try {
            this.showLoading('连接钱包中...');
            this.log('🔗 开始连接钱包...');

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
            this.log(`✅ 钱包连接成功: ${this.formatAddress(currentAccount)}`);

            // 初始化provider和signer
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();

            // 检查和切换网络
            await this.checkAndSwitchNetwork();

            // 初始化合约
            await this.initializeContracts();

            // 更新UI
            await this.updateUI();

            this.log('🎉 所有初始化完成，可以开始测试！');

        } catch (error) {
            console.error('连接钱包失败:', error);
            this.log(`❌ 连接失败: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // 检查并切换到BSC测试网
    async checkAndSwitchNetwork() {
        try {
            const networkId = await window.ethereum.request({
                method: 'net_version'
            });

            this.log(`🌐 当前网络ID: ${networkId}`);

            if (parseInt(networkId) !== 97) {
                this.log('🔄 需要切换到BNB测试网...');
                
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: BSC_TESTNET_CONFIG.chainId }]
                    });
                    this.log('✅ 成功切换到BNB测试网');
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        this.log('📝 添加BNB测试网到钱包...');
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [BSC_TESTNET_CONFIG]
                        });
                        this.log('✅ 成功添加BNB测试网');
                    } else {
                        throw switchError;
                    }
                }
            } else {
                this.log('✅ 已连接到BNB测试网');
            }
        } catch (error) {
            throw new Error(`网络切换失败: ${error.message}`);
        }
    }

    // 初始化合约
    async initializeContracts() {
        try {
            this.log('📄 初始化合约连接...');

            // 初始化AAVEUSD合约
            aaveusdContract = new ethers.Contract(
                CONTRACT_ADDRESSES.AAVEUSD_PROXY,
                AAVEUSD_ABI,
                signer
            );

            // 初始化TestUSDT合约
            testUsdtContract = new ethers.Contract(
                CONTRACT_ADDRESSES.TEST_USDT,
                TEST_USDT_ABI,
                signer
            );

            // 验证合约连接
            const aaveusdName = await aaveusdContract.name();
            const usdtName = await testUsdtContract.name();

            this.log(`✅ AAVEUSD合约连接成功: ${aaveusdName}`);
            this.log(`✅ TestUSDT合约连接成功: ${usdtName}`);

            isConnected = true;

        } catch (error) {
            throw new Error(`合约初始化失败: ${error.message}`);
        }
    }

    // 更新UI
    async updateUI() {
        // 更新钱包信息
        elements.walletAddress.textContent = this.formatAddress(currentAccount);
        elements.networkName.textContent = 'BNB Smart Chain Testnet';
        elements.networkStatus.textContent = 'BNB测试网';
        elements.contractStatus.textContent = isConnected ? '已连接' : '未连接';

        // 更新连接按钮
        elements.connectWallet.innerHTML = '<i class="fas fa-check mr-2"></i>已连接';
        elements.connectWallet.classList.add('bg-green-600', 'text-white');
        elements.connectWallet.classList.remove('bg-white', 'text-blue-600');

        // 更新网络指示器
        const indicator = document.querySelector('.network-indicator');
        indicator.classList.remove('network-wrong');
        indicator.classList.add('network-correct');

        // 启用开始测试按钮
        elements.startTest.disabled = !isConnected;
    }

    // 开始测试流程
    async startTestFlow() {
        try {
            this.log('🚀 开始执行测试流程...');
            elements.startTest.disabled = true;
            currentStep = 0;

            // 重置测试数据
            testData = {};

            // 依次执行各个步骤
            await this.executeStep1(); // 检查初始状态
            await this.executeStep2(); // 准备测试USDT
            await this.executeStep3(); // 测试deposit
            await this.executeStep4(); // 测试redeem
            await this.executeStep5(); // 验证最终状态

            this.showTestSummary();
            this.log('🎉 所有测试步骤完成！');

        } catch (error) {
            console.error('测试流程失败:', error);
            this.log(`❌ 测试失败: ${error.message}`, 'error');
            this.setStepStatus(currentStep, 'error');
        } finally {
            elements.startTest.disabled = false;
        }
    }

    // 步骤1: 检查初始状态
    async executeStep1() {
        this.log('📊 步骤1: 检查初始状态...');
        this.setStepStatus(1, 'active');

        try {
            // 获取余额和价格信息
            const usdtBalance = await testUsdtContract.balanceOf(currentAccount);
            const aaveusdBalance = await aaveusdContract.balanceOf(currentAccount);
            const currentPrice = await aaveusdContract.getCurrentPrice();
            const contractUsdtBalance = await aaveusdContract.getContractUSDTBalance();

            // 保存初始数据
            testData.initialUsdtBalance = usdtBalance;
            testData.initialAaveusdBalance = aaveusdBalance;
            testData.currentPrice = currentPrice;
            testData.contractUsdtBalance = contractUsdtBalance;

            // 更新UI
            document.getElementById('initial-usdt').textContent = this.formatUSDT(usdtBalance);
            document.getElementById('initial-aaveusd').textContent = aaveusdBalance.toString();
            document.getElementById('current-price').textContent = this.formatPrice(currentPrice) + ' USD';
            document.getElementById('contract-usdt').textContent = this.formatUSDT(contractUsdtBalance);

            document.getElementById('step1-details').classList.remove('hidden');

            this.log(`   USDT余额: ${this.formatUSDT(usdtBalance)}`);
            this.log(`   AAVEUSD余额: ${aaveusdBalance.toString()}`);
            this.log(`   当前价格: $${this.formatPrice(currentPrice)}`);
            this.log(`   合约USDT余额: ${this.formatUSDT(contractUsdtBalance)}`);

            this.setStepStatus(1, 'completed');

        } catch (error) {
            this.setStepStatus(1, 'error');
            throw error;
        }
    }

    // 步骤2: 准备测试USDT
    async executeStep2() {
        this.log('💰 步骤2: 准备测试USDT...');
        this.setStepStatus(2, 'active');

        try {
            const requiredAmount = ethers.utils.parseUnits("100000", 6); // 需要100000 USDT

            if (testData.initialUsdtBalance.lt(requiredAmount)) {
                const mintAmount = ethers.utils.parseUnits("1000000", 6); // 铸造1000000 USDT
                
                this.log(`   需要铸造USDT: ${this.formatUSDT(mintAmount)}`);
                document.getElementById('mint-needed').textContent = this.formatUSDT(mintAmount);
                document.getElementById('step2-details').classList.remove('hidden');

                this.showLoading('铸造测试USDT中...');
                const mintTx = await testUsdtContract.freeMint(mintAmount);
                await mintTx.wait();

                this.log(`   ✅ 成功铸造 ${this.formatUSDT(mintAmount)} USDT`);
                this.log(`   交易哈希: ${mintTx.hash}`);
            } else {
                this.log('   ✅ USDT余额充足，无需铸造');
                document.getElementById('mint-needed').textContent = '0 USDT';
                document.getElementById('step2-details').classList.remove('hidden');
            }

            this.setStepStatus(2, 'completed');

        } catch (error) {
            this.setStepStatus(2, 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    // 步骤3: 测试deposit功能
    async executeStep3() {
        this.log('🏦 步骤3: 测试deposit功能...');
        this.setStepStatus(3, 'active');

        try {
            const depositAmount = ethers.utils.parseUnits("50000", 6); // 50000 USDT

            // 预计算代币数量
            const expectedTokens = await aaveusdContract.getTokenAmountForUSDT(depositAmount);
            
            this.log(`   存款金额: ${this.formatUSDT(depositAmount)} USDT`);
            this.log(`   预计获得: ${expectedTokens.toString()} AAVEUSD`);
            this.log(`   使用价格: $${this.formatPrice(testData.currentPrice)}`);

            // 更新UI
            document.getElementById('expected-tokens').textContent = expectedTokens.toString() + ' AAVEUSD';
            document.getElementById('deposit-price').textContent = this.formatPrice(testData.currentPrice) + ' USD';
            document.getElementById('step3-details').classList.remove('hidden');

            // 检查授权
            this.showLoading('检查USDT授权...');
            const allowance = await testUsdtContract.allowance(currentAccount, aaveusdContract.address);
            
            if (allowance.lt(depositAmount)) {
                this.log('   📝 授权USDT...');
                this.showLoading('授权USDT中...');
                const approveTx = await testUsdtContract.approve(aaveusdContract.address, depositAmount);
                await approveTx.wait();
                this.log(`   ✅ USDT授权成功`);
            }

            // 执行deposit
            this.log('   💳 执行deposit交易...');
            this.showLoading('执行deposit中...');
            const depositTx = await aaveusdContract.deposit(depositAmount);
            
            document.getElementById('deposit-tx').textContent = depositTx.hash;
            this.log(`   交易已发送: ${depositTx.hash}`);

            this.showLoading('等待交易确认...');
            const receipt = await depositTx.wait();

            // 解析事件
            const depositEvent = receipt.events?.find(e => e.event === 'Deposited');
            if (depositEvent) {
                const [user, usdtAmount, tokenAmount, price] = depositEvent.args;
                this.log(`   🎉 Deposit成功！`);
                this.log(`   用户: ${user}`);
                this.log(`   USDT数量: ${this.formatUSDT(usdtAmount)}`);
                this.log(`   获得代币: ${tokenAmount.toString()}`);
                this.log(`   使用价格: $${this.formatPrice(price)}`);

                testData.depositEvent = depositEvent.args;
            }

            this.setStepStatus(3, 'completed');

        } catch (error) {
            this.setStepStatus(3, 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    // 步骤4: 测试redeem功能
    async executeStep4() {
        this.log('🔄 步骤4: 测试redeem功能...');
        this.setStepStatus(4, 'active');

        try {
            const redeemAmount = 10; // 10个AAVEUSD

            // 预计算USDT数量
            const expectedUsdt = await aaveusdContract.getUSDTAmountForTokens(redeemAmount);
            
            this.log(`   赎回数量: ${redeemAmount} AAVEUSD`);
            this.log(`   预计获得: ${this.formatUSDT(expectedUsdt)} USDT`);
            this.log(`   使用价格: $${this.formatPrice(testData.currentPrice)}`);

            // 更新UI
            document.getElementById('expected-usdt').textContent = this.formatUSDT(expectedUsdt) + ' USDT';
            document.getElementById('redeem-price').textContent = this.formatPrice(testData.currentPrice) + ' USD';
            document.getElementById('step4-details').classList.remove('hidden');

            // 执行redeem
            this.log('   💳 执行redeem交易...');
            this.showLoading('执行redeem中...');
            const redeemTx = await aaveusdContract.redeem(redeemAmount);
            
            document.getElementById('redeem-tx').textContent = redeemTx.hash;
            this.log(`   交易已发送: ${redeemTx.hash}`);

            this.showLoading('等待交易确认...');
            const receipt = await redeemTx.wait();

            // 解析事件
            const redeemEvent = receipt.events?.find(e => e.event === 'Redeemed');
            if (redeemEvent) {
                const [user, tokenAmount, usdtAmount, price] = redeemEvent.args;
                this.log(`   🎉 Redeem成功！`);
                this.log(`   用户: ${user}`);
                this.log(`   代币数量: ${tokenAmount.toString()}`);
                this.log(`   获得USDT: ${this.formatUSDT(usdtAmount)}`);
                this.log(`   使用价格: $${this.formatPrice(price)}`);

                testData.redeemEvent = redeemEvent.args;
            }

            this.setStepStatus(4, 'completed');

        } catch (error) {
            this.setStepStatus(4, 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    // 步骤5: 验证最终状态
    async executeStep5() {
        this.log('✅ 步骤5: 验证最终状态...');
        this.setStepStatus(5, 'active');

        try {
            // 获取最终余额
            const finalUsdtBalance = await testUsdtContract.balanceOf(currentAccount);
            const finalAaveusdBalance = await aaveusdContract.balanceOf(currentAccount);

            // 计算变化
            const usdtChange = finalUsdtBalance.sub(testData.initialUsdtBalance);
            const aaveusdChange = finalAaveusdBalance.sub(testData.initialAaveusdBalance);

            testData.finalUsdtBalance = finalUsdtBalance;
            testData.finalAaveusdBalance = finalAaveusdBalance;
            testData.usdtChange = usdtChange;
            testData.aaveusdChange = aaveusdChange;

            // 更新UI
            document.getElementById('final-usdt').textContent = this.formatUSDT(finalUsdtBalance);
            document.getElementById('final-aaveusd').textContent = finalAaveusdBalance.toString();
            document.getElementById('usdt-change').textContent = (usdtChange.gte(0) ? '+' : '') + this.formatUSDT(usdtChange);
            document.getElementById('aaveusd-change').textContent = (aaveusdChange.gte(0) ? '+' : '') + aaveusdChange.toString();
            document.getElementById('step5-details').classList.remove('hidden');

            this.log(`   最终USDT余额: ${this.formatUSDT(finalUsdtBalance)}`);
            this.log(`   最终AAVEUSD余额: ${finalAaveusdBalance.toString()}`);
            this.log(`   USDT变化: ${(usdtChange.gte(0) ? '+' : '')}${this.formatUSDT(usdtChange)}`);
            this.log(`   AAVEUSD变化: ${(aaveusdChange.gte(0) ? '+' : '')}${aaveusdChange.toString()}`);

            this.setStepStatus(5, 'completed');

        } catch (error) {
            this.setStepStatus(5, 'error');
            throw error;
        }
    }

    // 显示测试摘要
    showTestSummary() {
        const summaryElement = document.getElementById('summaryContent');
        const summary = [
            `✅ Deposit功能: 成功存款 ${this.formatUSDT(testData.depositEvent[1])} USDT，获得 ${testData.depositEvent[2].toString()} AAVEUSD`,
            `✅ Redeem功能: 成功赎回 ${testData.redeemEvent[1].toString()} AAVEUSD，获得 ${this.formatUSDT(testData.redeemEvent[2])} USDT`,
            `💰 USDT净变化: ${(testData.usdtChange.gte(0) ? '+' : '')}${this.formatUSDT(testData.usdtChange)}`,
            `🪙 AAVEUSD净变化: ${(testData.aaveusdChange.gte(0) ? '+' : '')}${testData.aaveusdChange.toString()}`,
            `💱 使用价格: $${this.formatPrice(testData.currentPrice)}`,
            `🎯 价格信息事件: 正常包含在Deposited和Redeemed事件中`
        ];

        summaryElement.innerHTML = summary.map(item => `<div>${item}</div>`).join('');
        document.getElementById('testSummary').classList.remove('hidden');
    }

    // 设置步骤状态
    setStepStatus(step, status) {
        currentStep = step;
        
        const card = document.querySelector(`[data-step="${step}"]`);
        const number = card.querySelector('.step-number');
        const statusIcon = card.querySelector(`#step${step}-status`);

        // 重置所有状态
        card.classList.remove('active', 'completed', 'error');
        number.classList.remove('pending', 'active', 'completed', 'error');

        // 设置新状态
        card.classList.add(status);
        number.classList.add(status);

        // 更新状态图标
        const icons = {
            pending: 'fas fa-clock',
            active: 'fas fa-spinner fa-spin',
            completed: 'fas fa-check',
            error: 'fas fa-times'
        };

        const colors = {
            pending: 'text-gray-400',
            active: 'text-blue-600',
            completed: 'text-green-600',
            error: 'text-red-600'
        };

        statusIcon.className = `${colors[status]}`;
        statusIcon.innerHTML = `<i class="${icons[status]}"></i>`;
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
                await this.connectWallet();
            }
        } catch (error) {
            console.error('检查连接失败:', error);
        }
    }

    // 处理账户变更
    async handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            this.disconnect();
        } else if (accounts[0] !== currentAccount) {
            currentAccount = accounts[0];
            await this.updateUI();
        }
    }

    // 处理网络变更
    async handleChainChanged(chainId) {
        window.location.reload();
    }

    // 断开连接
    disconnect() {
        currentAccount = null;
        isConnected = false;
        provider = null;
        signer = null;
        aaveusdContract = null;
        testUsdtContract = null;

        // 重置UI
        elements.walletAddress.textContent = '未连接钱包';
        elements.networkName.textContent = '未连接';
        elements.contractStatus.textContent = '未连接合约';

        elements.connectWallet.innerHTML = '<i class="fas fa-wallet mr-2"></i>连接钱包';
        elements.connectWallet.classList.remove('bg-green-600', 'text-white');
        elements.connectWallet.classList.add('bg-white', 'text-blue-600');

        elements.startTest.disabled = true;

        const indicator = document.querySelector('.network-indicator');
        indicator.classList.remove('network-correct');
        indicator.classList.add('network-wrong');
    }

    // 工具函数
    formatAddress(address) {
        if (!address) return '--';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    formatUSDT(amount) {
        if (!amount) return '0';
        return parseFloat(ethers.utils.formatUnits(amount, 6)).toFixed(6);
    }

    formatPrice(price) {
        if (!price) return '0';
        return parseFloat(ethers.utils.formatUnits(price, 8)).toFixed(8);
    }

    showLoading(message = '处理中...') {
        elements.loadingMessage.textContent = message;
        elements.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        elements.loadingOverlay.classList.add('hidden');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: 'text-green-400',
            error: 'text-red-400',
            warning: 'text-yellow-400'
        };

        const logEntry = document.createElement('div');
        logEntry.className = `${colors[type]} mb-1`;
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        
        elements.logContent.appendChild(logEntry);
        elements.logContent.scrollTop = elements.logContent.scrollHeight;
    }

    clearLog() {
        elements.logContent.innerHTML = '<div class="text-gray-400">日志已清空...</div>';
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new TestFlowApp();
}); 