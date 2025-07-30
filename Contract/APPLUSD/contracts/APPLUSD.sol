// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title APPLUSD
 * @dev 可升级的APPLUSD代币合约，内置Chainlink价格预言机功能，支持USDT购买和赎回功能
 */
contract APPLUSD is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    // === 原始存储变量（必须保持原有顺序） ===
    IERC20 public usdtToken;
    
    // === 新增的价格预言机变量（放在所有原有变量之后） ===
    AggregatorV3Interface internal dataFeed;
    uint256 private _fallbackPrice;
    bool private _useFallbackPrice;
    uint256 private _priceValidityDuration;
    
    // 事件
    event Deposit(address indexed user, uint256 usdtAmount, uint256 applAmount);
    event Redeem(address indexed user, uint256 applAmount, uint256 usdtAmount);
    event USDTTokenUpdated(address newUSDTToken);
    event PriceFeedUpdated(address newPriceFeed);
    event FallbackPriceEnabled(uint256 fallbackPrice);
    event FallbackPriceDisabled();
    event FallbackPriceUpdated(uint256 newFallbackPrice);
    event PriceValidityDurationUpdated(uint256 newDuration);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param _usdtToken USDT代币合约地址
     * @param _priceFeedAddress Chainlink价格聚合器地址
     */
    function initialize(address _usdtToken, address _priceFeedAddress) initializer public {
        __ERC20_init("Apple USD", "APPLUSD");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        require(_usdtToken != address(0), "USDT token address cannot be zero");
        require(_priceFeedAddress != address(0), "Price feed address cannot be zero");
        
        usdtToken = IERC20(_usdtToken);
        
        // 初始化Chainlink价格预言机：1 APPL = 260 USDT，有效期1小时
        dataFeed = AggregatorV3Interface(_priceFeedAddress);
        _fallbackPrice = 260 * 1e6; // 260 USDT (6位小数)
        _useFallbackPrice = false;
        _priceValidityDuration = 3600; // 1小时
    }

    // ==============================================
    // ERC20重写函数
    // ==============================================

    /**
     * @dev 重写decimals函数，APPLUSD使用0位小数（整数代币）
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // ==============================================
    // Chainlink价格预言机功能
    // ==============================================

    /**
     * @dev 获取Chainlink最新价格和时间戳
     * @return price 最新价格
     * @return timestamp 价格时间戳
     * @return isValid 价格是否在有效期内
     */
    function getChainlinkLatestPrice() public view returns (int256 price, uint256 timestamp, bool isValid) {
        try dataFeed.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // 检查价格有效性
            bool priceValid = answer > 0 && 
                             updatedAt > 0 && 
                             (block.timestamp - updatedAt) <= _priceValidityDuration;
            
            return (answer, updatedAt, priceValid);
        } catch {
            return (0, 0, false);
        }
    }

    /**
     * @dev 获取Chainlink数据源的最新答案
     * @return 最新价格答案
     */
    function getChainlinkDataFeedLatestAnswer() public view returns (int256) {
        (int256 price, , ) = getChainlinkLatestPrice();
        return price;
    }

    /**
     * @dev 获取当前有效价格（优先使用Chainlink，失败则使用备用价格）
     * @return 当前价格（USDT最小单位）
     */
    function getCurrentPrice() public view returns (uint256) {
        if (_useFallbackPrice) {
            return _fallbackPrice;
        }
        
        (int256 chainlinkPrice, , bool isValid) = getChainlinkLatestPrice();
        
        if (isValid && chainlinkPrice > 0) {
            // Chainlink AAVE/USD 价格转换为 USDT 价格（8位小数转6位小数）
            uint256 aaveUsdPrice = uint256(chainlinkPrice) / 100; // 从8位小数转6位小数
            return aaveUsdPrice; // 返回 AAVE 以 USDT 计价的价格
        } else {
            return _fallbackPrice;
        }
    }

    /**
     * @dev 获取价格信息汇总
     * @return useFallback 是否使用备用价格
     * @return chainlinkPrice Chainlink原始价格
     * @return timestamp 价格时间戳
     * @return isValid Chainlink价格是否有效
     * @return currentPrice 当前使用的价格
     */
    function getPriceInfo() external view returns (
        bool useFallback,
        int256 chainlinkPrice,
        uint256 timestamp,
        bool isValid,
        uint256 currentPrice
    ) {
        (chainlinkPrice, timestamp, isValid) = getChainlinkLatestPrice();
        currentPrice = getCurrentPrice();
        useFallback = _useFallbackPrice;
    }

    /**
     * @dev 获取价格聚合器的小数位数
     * @return 小数位数
     */
    function getPriceFeedDecimals() external view returns (uint8) {
        try dataFeed.decimals() returns (uint8 dec) {
            return dec;
        } catch {
            return 8; // 默认8位小数
        }
    }

    // ==============================================
    // 价格预言机管理功能（仅所有者）
    // ==============================================

    /**
     * @dev 更新Chainlink价格聚合器地址
     * @param _newPriceFeed 新的价格聚合器地址
     */
    function updateChainlinkPriceFeed(address _newPriceFeed) external onlyOwner {
        require(_newPriceFeed != address(0), "Price feed address cannot be zero");
        dataFeed = AggregatorV3Interface(_newPriceFeed);
        emit PriceFeedUpdated(_newPriceFeed);
    }

    /**
     * @dev 更新备用价格
     * @param newFallbackPrice 新的备用价格
     */
    function updateFallbackPrice(uint256 newFallbackPrice) external onlyOwner {
        require(newFallbackPrice > 0, "Fallback price must be greater than 0");
        _fallbackPrice = newFallbackPrice;
        emit FallbackPriceUpdated(newFallbackPrice);
    }

    /**
     * @dev 启用备用价格模式
     */
    function enableFallbackPrice() external onlyOwner {
        _useFallbackPrice = true;
        emit FallbackPriceEnabled(_fallbackPrice);
    }

    /**
     * @dev 禁用备用价格模式
     */
    function disableFallbackPrice() external onlyOwner {
        _useFallbackPrice = false;
        emit FallbackPriceDisabled();
    }

    /**
     * @dev 更新价格有效期
     * @param newValidityDuration 新的有效期（秒）
     */
    function updatePriceValidityDuration(uint256 newValidityDuration) external onlyOwner {
        require(newValidityDuration > 0, "Validity duration must be greater than 0");
        _priceValidityDuration = newValidityDuration;
        emit PriceValidityDurationUpdated(newValidityDuration);
    }

    /**
     * @dev 兼容函数：直接更新备用价格（用于向后兼容）
     * @param newPriceInUSDT 新价格（USDT最小单位）
     */
    function updatePrice(uint256 newPriceInUSDT) external onlyOwner {
        require(newPriceInUSDT > 0, "Fallback price must be greater than 0");
        _fallbackPrice = newPriceInUSDT;
        emit FallbackPriceUpdated(newPriceInUSDT);
    }

    // ==============================================
    // 价格计算功能
    // ==============================================

    /**
     * @dev 计算指定数量USDT对应的APPLUSD数量
     * @param usdtAmount USDT数量（USDT最小单位，1e6）
     * @return APPLUSD数量（APPLUSD最小单位，1e0 = 整数）
     */
    function getAPPLAmountForUSDT(uint256 usdtAmount) public view returns (uint256) {
        uint256 priceInUSDT = getCurrentPrice();
        // 由于APPLUSD是0位小数，所以直接除以价格，不需要乘以1e18
        return usdtAmount / priceInUSDT;
    }

    /**
     * @dev 计算指定数量APPLUSD对应的USDT数量
     * @param applAmount APPLUSD数量（APPLUSD最小单位，1e0 = 整数）
     * @return USDT数量（USDT最小单位，1e6）
     */
    function getUSDTAmountForAPPL(uint256 applAmount) public view returns (uint256) {
        uint256 priceInUSDT = getCurrentPrice();
        // 由于APPLUSD是0位小数，所以直接乘以价格
        return applAmount * priceInUSDT;
    }

    /**
     * @dev 计算购买指定USDT数量能获得多少APPLUSD
     * @param usdtAmount USDT数量
     * @return APPLUSD数量
     */
    function getAPPLAmountForDeposit(uint256 usdtAmount) external view returns (uint256) {
        return getAPPLAmountForUSDT(usdtAmount);
    }

    /**
     * @dev 计算赎回指定APPLUSD数量能获得多少USDT
     * @param applAmount APPLUSD数量
     * @return USDT数量
     */
    function getUSDTAmountForRedeem(uint256 applAmount) external view returns (uint256) {
        return getUSDTAmountForAPPL(applAmount);
    }

    // ==============================================
    // 存取功能
    // ==============================================

    /**
     * @dev 购买APPLUSD代币（存入USDT）
     * @param usdtAmount 要存入的USDT数量（USDT最小单位）
     */
    function deposit(uint256 usdtAmount) external {
        require(usdtAmount > 0, "Amount must be greater than 0");
        
        // 计算能获得的APPLUSD数量
        uint256 applAmount = getAPPLAmountForUSDT(usdtAmount);
        require(applAmount > 0, "Invalid APPL amount");
        
        // 从用户转入USDT
        require(usdtToken.transferFrom(msg.sender, address(this), usdtAmount), "USDT transfer failed");
        
        // 铸造APPLUSD给用户
        _mint(msg.sender, applAmount);
        
        emit Deposit(msg.sender, usdtAmount, applAmount);
    }

    /**
     * @dev 赎回USDT（销毁APPLUSD）
     * @param applAmount 要赎回的APPLUSD数量（APPLUSD最小单位）
     */
    function redeem(uint256 applAmount) external {
        require(applAmount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= applAmount, "Insufficient APPLUSD balance");
        
        // 计算能赎回的USDT数量
        uint256 usdtAmount = getUSDTAmountForAPPL(applAmount);
        require(usdtAmount > 0, "Invalid USDT amount");
        require(usdtToken.balanceOf(address(this)) >= usdtAmount, "Insufficient USDT in contract");
        
        // 销毁用户的APPLUSD
        _burn(msg.sender, applAmount);
        
        // 转出USDT给用户
        require(usdtToken.transfer(msg.sender, usdtAmount), "USDT transfer failed");
        
        emit Redeem(msg.sender, applAmount, usdtAmount);
    }

    // ==============================================
    // 查询功能
    // ==============================================

    /**
     * @dev 获取合约中的USDT余额
     */
    function getUSDTBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }

    // ==============================================
    // 管理功能
    // ==============================================

    /**
     * @dev 更新USDT代币合约地址（仅所有者）
     * @param _newUSDTToken 新的USDT代币合约地址
     */
    function updateUSDTToken(address _newUSDTToken) external onlyOwner {
        require(_newUSDTToken != address(0), "USDT token address cannot be zero");
        usdtToken = IERC20(_newUSDTToken);
        emit USDTTokenUpdated(_newUSDTToken);
    }

    /**
     * @dev 紧急提取函数（仅所有者，用于紧急情况）
     * @param token 要提取的代币地址
     * @param amount 提取数量
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Token address cannot be zero");
        IERC20(token).transfer(owner(), amount);
    }

    /**
     * @dev 授权升级函数（UUPS代理模式要求）
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}
} 