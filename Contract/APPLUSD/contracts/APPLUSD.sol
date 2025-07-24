// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PriceOracle.sol";

/**
 * @title APPLUSD
 * @dev 可升级的APPLUSD代币合约，支持USDT购买和赎回功能
 */
contract APPLUSD is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    IERC20 public usdtToken;
    PriceOracle public priceOracle;
    
    // 事件
    event Deposit(address indexed user, uint256 usdtAmount, uint256 applAmount);
    event Redeem(address indexed user, uint256 applAmount, uint256 usdtAmount);
    event USDTTokenUpdated(address newUSDTToken);
    event PriceOracleUpdated(address newPriceOracle);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev 初始化函数，替代构造函数
     * @param _usdtToken USDT代币合约地址
     * @param _priceOracle 价格预言机合约地址
     */
    function initialize(address _usdtToken, address _priceOracle) initializer public {
        __ERC20_init("Apple USD", "APPLUSD");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        require(_usdtToken != address(0), "USDT token address cannot be zero");
        require(_priceOracle != address(0), "Price oracle address cannot be zero");
        
        usdtToken = IERC20(_usdtToken);
        priceOracle = PriceOracle(_priceOracle);
    }

    /**
     * @dev 购买APPLUSD代币（存入USDT）
     * @param usdtAmount 要存入的USDT数量（USDT最小单位）
     */
    function deposit(uint256 usdtAmount) external {
        require(usdtAmount > 0, "Amount must be greater than 0");
        
        // 计算能获得的APPLUSD数量
        uint256 applAmount = priceOracle.getAPPLAmountForUSDT(usdtAmount);
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
        uint256 usdtAmount = priceOracle.getUSDTAmountForAPPL(applAmount);
        require(usdtAmount > 0, "Invalid USDT amount");
        require(usdtToken.balanceOf(address(this)) >= usdtAmount, "Insufficient USDT in contract");
        
        // 销毁用户的APPLUSD
        _burn(msg.sender, applAmount);
        
        // 转出USDT给用户
        require(usdtToken.transfer(msg.sender, usdtAmount), "USDT transfer failed");
        
        emit Redeem(msg.sender, applAmount, usdtAmount);
    }

    /**
     * @dev 获取合约中的USDT余额
     */
    function getUSDTBalance() external view returns (uint256) {
        return usdtToken.balanceOf(address(this));
    }

    /**
     * @dev 计算购买指定USDT数量能获得多少APPLUSD
     * @param usdtAmount USDT数量
     * @return APPLUSD数量
     */
    function getAPPLAmountForDeposit(uint256 usdtAmount) external view returns (uint256) {
        return priceOracle.getAPPLAmountForUSDT(usdtAmount);
    }

    /**
     * @dev 计算赎回指定APPLUSD数量能获得多少USDT
     * @param applAmount APPLUSD数量
     * @return USDT数量
     */
    function getUSDTAmountForRedeem(uint256 applAmount) external view returns (uint256) {
        return priceOracle.getUSDTAmountForAPPL(applAmount);
    }

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
     * @dev 更新价格预言机合约地址（仅所有者）
     * @param _newPriceOracle 新的价格预言机合约地址
     */
    function updatePriceOracle(address _newPriceOracle) external onlyOwner {
        require(_newPriceOracle != address(0), "Price oracle address cannot be zero");
        priceOracle = PriceOracle(_newPriceOracle);
        emit PriceOracleUpdated(_newPriceOracle);
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