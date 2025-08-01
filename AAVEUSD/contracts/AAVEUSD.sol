// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./ChainlinkPriceOracle.sol";

/**
 * @title AAVEUSD
 * @dev 简化的可升级AAVEUSD代币合约
 * 支持基于Chainlink价格的存款和赎回功能
 * 使用0位小数（整数代币）
 */
contract AAVEUSD is Initializable, ERC20Upgradeable, ChainlinkPriceOracle, UUPSUpgradeable {
    // USDT代币合约
    IERC20 public usdtToken;
    
    // 事件 - 添加价格信息
    event ChainlinkPrice(uint256 timestamp, uint256 usdtAmount, int256 price, uint256 tokenAmount);
    event Deposited(address indexed user, uint256 timestamp, uint256 usdtAmount, uint256 limitPrice, uint256 expectedTokenAmount);
    event Redeemed(address indexed user, uint256 timestamp, uint256 tokenAmount, uint256 limitPrice, uint256 expectedUsdtAmount);
    event TxResult(address indexed user, bytes32 indexed txHash, uint256 status, uint256 tokenAmount, uint256 usdtAmount, uint256 averagePrice);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数
     * @param _usdtToken USDT代币合约地址
     * @param _priceFeedAddress Chainlink AAVE/USD价格聚合器地址
     */
    function initialize(address _usdtToken, address _priceFeedAddress) initializer public {
        require(_usdtToken != address(0), "USDT token address cannot be zero");
        
        __ERC20_init("AAVE USD Token", "AAVEUSD");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        // 初始化USDT代币
        usdtToken = IERC20(_usdtToken);
        
        // 初始化Chainlink价格预言机
        __ChainlinkPriceOracle_init(_priceFeedAddress);
    }

    /**
     * @dev 重写decimals函数，AAVEUSD使用0位小数（整数代币）
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /**
     * @dev 用户主动触发，存款USDT购买AAVEUSD代币
     * @param usdtAmount USDT金额（18位小数）
     * @param limitPrice 限价（18位小数）
     */
    function deposit(uint256 usdtAmount, uint256 limitPrice) external {
        // 检查参数
        require(usdtAmount > 0, "USDT amount must be greater than 0");
        require(limitPrice > 0, "Limit price must be greater than 0");
        // 检查用户USDT余额
        require(usdtToken.balanceOf(msg.sender) >= usdtAmount, "Insufficient USDT balance");
        // 检查授权额度
        require(usdtToken.allowance(msg.sender, address(this)) >= usdtAmount, "Insufficient allowance");

        // 获取当前chainlink的价格(只作为辅助) USDT有18位小数，chainlink价格有8位小数
        int256 chainlinkPrice = getLatestPrice() * 10**10;
        // require(chainlinkPrice > 0, "Invalid price");
        // 计算chainlink的价格可购买的代币数量
        uint256 chainlinkTokenAmount = usdtAmount / uint256(chainlinkPrice);
        uint256 chainlinkUsdtAmount = chainlinkTokenAmount * uint256(chainlinkPrice);
        // 记录chainlink价格
        emit ChainlinkPrice(block.timestamp, chainlinkUsdtAmount, chainlinkPrice, chainlinkTokenAmount);

        // 计算限价购买数量
        uint256 expectedTokenAmount = usdtAmount / limitPrice;
        // 计算用户实际支付的USDT数量(根据现价单)
        usdtAmount = expectedTokenAmount * limitPrice;
        // 转移USDT到合约
        require(
            usdtToken.transferFrom(msg.sender, address(this), usdtAmount),
            "USDT transfer failed"
        );
        // 记录用户存款
        emit Deposited(msg.sender, block.timestamp, usdtAmount, limitPrice, expectedTokenAmount);
    }
    
    /**
     * @dev 赎回AAVEUSD代币换取USDT
     * @param tokenAmount AAVEUSD代币数量（整数）
     */
    function redeem(uint256 tokenAmount, uint256 limitPrice) external {
        // 检查参数
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(limitPrice > 0, "Limit price must be greater than 0");
        // 检查用户代币余额
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");

        // 获取当前chainlink的价格(只作为辅助) USDT有18位小数，chainlink价格有8位小数
        int256 chainlinkPrice = getLatestPrice() * 10**10;
        // require(chainlinkPrice > 0, "Invalid price");
        // 计算chainlink的价格可赎回的USDT数量
        uint256 chainlinkUsdtAmount = tokenAmount * uint256(chainlinkPrice);
        // 记录chainlink价格
        emit ChainlinkPrice(block.timestamp, chainlinkUsdtAmount, chainlinkPrice, tokenAmount);

        // 计算可赎回的USDT数量
        uint256 expectedUsdtAmount = tokenAmount * limitPrice;
        
        // 检查合约USDT余额
        require(
            usdtToken.balanceOf(address(this)) >= expectedUsdtAmount,
            "Insufficient USDT in contract"
        );
        
        // 销毁用户的AAVEUSD代币
        _burn(msg.sender, tokenAmount);
        
        emit Redeemed(msg.sender, block.timestamp, tokenAmount, limitPrice, expectedUsdtAmount);
    }

    /**
     * @dev 所有者调用（用于处理用户存款/redeem结果，后端操作）
     * @param txHash 交易hash
     * @param user 用户地址
     * @param tokenAmount AAVEUSD代币数量（整数）
     * @param usdtAmount USDT数量（18位小数）
     */
    function tx_result(address user, bytes32 txHash, uint256 status, uint256 tokenAmount, uint256 usdtAmount, uint256 averagePrice) external onlyOwner {
        if (tokenAmount > 0) {
            _mint(user, tokenAmount);
        }
        if (usdtAmount > 0) {
            // 检查合约USDT余额
            require(
                usdtToken.balanceOf(address(this)) >= usdtAmount,
                "Insufficient USDT in contract"
            );
            // 转移/退还USDT到用户
            usdtToken.transfer(user, usdtAmount);
        }
        emit TxResult(user, txHash, status, tokenAmount, usdtAmount, averagePrice);
    }

    /**
     * @dev 计算存款指定USDT数量可获得的代币数量
     * @param usdtAmount USDT金额（6位小数）
     * @return 代币数量（0位小数，整数）
     */
    function getTokenAmountForUSDT(uint256 usdtAmount) external view returns (uint256) {
        int256 chainlinkPrice = getLatestPrice() * 10**10;
        require(chainlinkPrice > 0, "Invalid price");
        
        return usdtAmount / uint256(chainlinkPrice);
    }

    /**
     * @dev 计算赎回指定代币数量可获得的USDT数量
     * @param tokenAmount 代币数量（0位小数，整数）
     * @return USDT数量（6位小数）
     */
    function getUSDTAmountForTokens(uint256 tokenAmount) external view returns (uint256) {
        int256 chainlinkPrice = getLatestPrice() * 10**10;
        require(chainlinkPrice > 0, "Invalid price");
        
        return tokenAmount * uint256(chainlinkPrice);
    }

    /**
     * @dev 获取合约USDT余额
     */
    function getContractUSDTBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
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