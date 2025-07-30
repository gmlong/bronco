// 网络配置
const NETWORKS = {
    bscTestnet: {
        chainId: '0x61', // 97 in decimal
        chainName: 'Binance Smart Chain Testnet',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
        blockExplorerUrls: ['https://testnet.bscscan.com/']
    },
    bscMainnet: {
        chainId: '0x38', // 56 in decimal
        chainName: 'Binance Smart Chain Mainnet',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: ['https://bsc-dataseed.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/']
    }
};

// 当前使用的网络
const CURRENT_NETWORK = 'bscTestnet';

// 合约地址配置 - 请根据您的部署结果更新这些地址
const CONTRACT_ADDRESSES = {
    bscTestnet: {
        // 从 deployment-info.json 获取这些地址
        AAVEUSD_PROXY: "0x340630e310D481a2f7D10cE0a71098Db08De56aE", // 用户提供的代理合约地址
        TEST_USDT: "0x95858Ba9e0BEdF5905f20d8E97F7e19507280005", // 将从AAVEUSD合约中自动获取，或者从deployment-info.json手动填入
        CHAINLINK_AAVE_USD: "0x298619601ebCd58d0b526963Deb2365B485Edc74"
    },
    bscMainnet: {
        AAVEUSD_PROXY: "",
        TEST_USDT: "",
        CHAINLINK_AAVE_USD: "0x298619601ebCd58d0b526963Deb2365B485Edc74" // 需要确认主网地址
    }
};

// 合约ABI - 更新以支持新的函数名和事件
const AAVEUSD_ABI = [
    // ERC20 基础功能
    "function name() view returns (string)",
    "function symbol() view returns (string)", 
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    
    // AAVEUSD 新的主要功能
    "function deposit(uint256 usdtAmount)",
    "function redeem(uint256 tokenAmount)",
    "function getCurrentPrice() view returns (int256)",
    "function getTokenAmountForUSDT(uint256 usdtAmount) view returns (uint256)",
    "function getUSDTAmountForTokens(uint256 tokenAmount) view returns (uint256)",
    "function getContractUSDTBalance() view returns (uint256)",
    
    // 向后兼容的别名函数
    "function buyTokens(uint256 usdtAmount)",
    "function redeemTokens(uint256 tokenAmount)",
    
    // 价格预言机功能
    "function getPriceFeedAddress() view returns (address)",
    "function getLatestPrice() view returns (int256)",
    "function getDecimals() view returns (uint8)",
    
    // USDT 代币地址
    "function usdtToken() view returns (address)",
    
    // 管理员功能
    "function owner() view returns (address)",
    "function mint(address to, uint256 amount)",
    "function updatePriceFeed(address _newPriceFeed)",
    "function emergencyWithdrawUSDT(uint256 amount)",
    
    // 新的事件 - 包含价格信息
    "event Deposited(address indexed user, uint256 usdtAmount, uint256 tokenAmount, uint256 price)",
    "event Redeemed(address indexed user, uint256 tokenAmount, uint256 usdtAmount, uint256 price)",
    
    // 保持向后兼容的旧事件（如果需要）
    "event TokensPurchased(address indexed buyer, uint256 usdtAmount, uint256 tokenAmount)",
    "event TokensRedeemed(address indexed redeemer, uint256 tokenAmount, uint256 usdtAmount)",
    
    // 其他事件
    "event PriceFeedUpdated(address newPriceFeed)"
];

const TEST_USDT_ABI = [
    // ERC20 基础功能
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    
    // TestUSDT 特有功能
    "function freeMint(uint256 amount)",
    "function mint(address to, uint256 amount)"
];

// 工具函数
const CONFIG = {
    // 获取当前网络配置
    getCurrentNetwork() {
        return NETWORKS[CURRENT_NETWORK];
    },
    
    // 获取当前网络的合约地址
    getCurrentAddresses() {
        return CONTRACT_ADDRESSES[CURRENT_NETWORK];
    },
    
    // 设置USDT合约地址 (从AAVEUSD合约获取后调用)
    setUSDTAddress(address) {
        CONTRACT_ADDRESSES[CURRENT_NETWORK].TEST_USDT = address;
        console.log('USDT地址已更新:', address);
    },
    
    // 格式化地址显示
    formatAddress(address) {
        if (!address) return '--';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    },
    
    // 格式化数字显示
    formatNumber(number, decimals = 6) {
        if (!number) return '0';
        return parseFloat(number).toFixed(decimals);
    },
    
    // 格式化BNB数量
    formatBNB(wei) {
        if (!wei) return '0';
        return parseFloat(ethers.utils.formatEther(wei)).toFixed(4);
    },
    
    // 格式化USDT数量 (6位小数)
    formatUSDT(amount) {
        if (!amount) return '0';
        return parseFloat(ethers.utils.formatUnits(amount, 6)).toFixed(6);
    },
    
    // 格式化AAVEUSD数量 (0位小数)
    formatAAVEUSD(amount) {
        if (!amount) return '0';
        return amount.toString();
    },
    
    // 格式化价格 (8位小数)
    formatPrice(price) {
        if (!price) return '0';
        return parseFloat(ethers.utils.formatUnits(price, 8)).toFixed(8);
    },
    
    // 解析USDT输入
    parseUSDT(value) {
        return ethers.utils.parseUnits(value.toString(), 6);
    },
    
    // 解析AAVEUSD输入
    parseAAVEUSD(value) {
        return ethers.BigNumber.from(value.toString());
    },
    
    // 获取区块浏览器链接
    getExplorerUrl(address, type = 'address') {
        const baseUrl = NETWORKS[CURRENT_NETWORK].blockExplorerUrls[0];
        return `${baseUrl}${type}/${address}`;
    },
    
    // 检查是否为有效地址
    isValidAddress(address) {
        try {
            return ethers.utils.isAddress(address);
        } catch {
            return false;
        }
    }
};

// 错误处理辅助函数
const ERROR_MESSAGES = {
    WALLET_NOT_CONNECTED: '请先连接钱包',
    WRONG_NETWORK: '请切换到正确的网络',
    INSUFFICIENT_BALANCE: '余额不足',
    INVALID_AMOUNT: '请输入有效金额',
    TRANSACTION_FAILED: '交易失败',
    CONTRACT_NOT_FOUND: '合约未找到',
    UNAUTHORIZED: '权限不足',
    USER_REJECTED: '用户取消交易'
};

// 常用的Gas设置 - 更新函数名
const GAS_SETTINGS = {
    gasLimit: {
        approve: '100000',
        transfer: '100000', 
        deposit: '300000',        // 新的存款函数
        redeem: '300000',         // 新的赎回函数
        buyTokens: '300000',      // 保持向后兼容
        redeemTokens: '300000',   // 保持向后兼容
        freeMint: '100000',
        mint: '100000',
        updatePriceFeed: '100000',
        emergencyWithdraw: '100000'
    }
}; 