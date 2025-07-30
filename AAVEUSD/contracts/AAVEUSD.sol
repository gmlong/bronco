// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
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
    
    // 代币参数
    uint256 public constant INITIAL_SUPPLY = 1000000; // 100万代币（整数）
    
    // 事件 - 添加价格信息
    event Deposited(address indexed user, uint256 usdtAmount, uint256 tokenAmount, uint256 price);
    event Redeemed(address indexed user, uint256 tokenAmount, uint256 usdtAmount, uint256 price);

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
        
        // 铸造初始供应量给部署者
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev 重写decimals函数，AAVEUSD使用0位小数（整数代币）
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /**
     * @dev 存款USDT购买AAVEUSD代币
     * @param usdtAmount USDT金额（6位小数）
     */
    function deposit(uint256 usdtAmount) external {
        require(usdtAmount > 0, "USDT amount must be greater than 0");
        
        // 获取当前AAVE价格
        int256 aavePrice = getLatestPrice();
        require(aavePrice > 0, "Invalid price");
        
        // 计算可购买的代币数量
        // USDT有6位小数，AAVE价格有8位小数，AAVEUSD有0位小数
        // tokenAmount = (usdtAmount * 10^8) / aavePrice / 10^6 = (usdtAmount * 100) / aavePrice
        uint256 tokenAmount = (usdtAmount * 100) / uint256(aavePrice);
        require(tokenAmount > 0, "Token amount too small");

        usdtAmount = tokenAmount * uint256(aavePrice) / 100;
        
        // 转移USDT到合约
        require(
            usdtToken.transferFrom(msg.sender, address(this), usdtAmount),
            "USDT transfer failed"
        );
        
        // 铸造AAVEUSD代币给用户
        _mint(msg.sender, tokenAmount);
        
        emit Deposited(msg.sender, usdtAmount, tokenAmount, uint256(aavePrice));
    }

    /**
     * @dev 赎回AAVEUSD代币换取USDT
     * @param tokenAmount AAVEUSD代币数量（整数）
     */
    function redeem(uint256 tokenAmount) external {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        
        // 获取当前AAVE价格
        int256 aavePrice = getLatestPrice();
        require(aavePrice > 0, "Invalid price");
        
        // 计算可赎回的USDT数量
        // tokenAmount * aavePrice / 100 (转换为6位小数的USDT)
        uint256 usdtAmount = (tokenAmount * uint256(aavePrice)) / 100;
        require(usdtAmount > 0, "USDT amount too small");
        
        // 检查合约USDT余额
        require(
            usdtToken.balanceOf(address(this)) >= usdtAmount,
            "Insufficient USDT in contract"
        );
        
        // 销毁用户的AAVEUSD代币
        _burn(msg.sender, tokenAmount);
        
        // 转移USDT给用户
        require(
            usdtToken.transfer(msg.sender, usdtAmount),
            "USDT transfer failed"
        );
        
        emit Redeemed(msg.sender, tokenAmount, usdtAmount, uint256(aavePrice));
    }

    /**
     * @dev 计算存款指定USDT数量可获得的代币数量
     * @param usdtAmount USDT金额（6位小数）
     * @return 代币数量（0位小数，整数）
     */
    function getTokenAmountForUSDT(uint256 usdtAmount) external view returns (uint256) {
        int256 aavePrice = getLatestPrice();
        require(aavePrice > 0, "Invalid price");
        
        return (usdtAmount * 100) / uint256(aavePrice);
    }

    /**
     * @dev 计算赎回指定代币数量可获得的USDT数量
     * @param tokenAmount 代币数量（0位小数，整数）
     * @return USDT数量（6位小数）
     */
    function getUSDTAmountForTokens(uint256 tokenAmount) external view returns (uint256) {
        int256 aavePrice = getLatestPrice();
        require(aavePrice > 0, "Invalid price");
        
        return (tokenAmount * uint256(aavePrice)) / 100;
    }

    /**
     * @dev 获取当前AAVE价格
     * @return AAVE价格（8位小数）
     */
    function getCurrentPrice() external view returns (int256) {
        return getLatestPrice();
    }

    /**
     * @dev 获取合约USDT余额
     */
    function getContractUSDTBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }

    /**
     * @dev 紧急提取USDT（仅所有者）
     * @param amount 提取数量
     */
    function emergencyWithdrawUSDT(uint256 amount) external onlyOwner {
        require(
            usdtToken.transfer(msg.sender, amount),
            "USDT transfer failed"
        );
    }

    /**
     * @dev 铸造代币（仅所有者）
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // === 保持向后兼容性的别名函数 ===
    
    /**
     * @dev buyTokens函数的别名，保持向后兼容
     * @param usdtAmount USDT金额（6位小数）
     */
    function buyTokens(uint256 usdtAmount) external {
        // 内部调用新的deposit函数
        this.deposit(usdtAmount);
    }

    /**
     * @dev redeemTokens函数的别名，保持向后兼容
     * @param tokenAmount AAVEUSD代币数量（整数）
     */
    function redeemTokens(uint256 tokenAmount) external {
        // 内部调用新的redeem函数
        this.redeem(tokenAmount);
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