// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev 价格预言机合约，提供APPL/USDT的兑换价格
 * 初期固定比例为 1 APPL = 260 USDT
 */
contract PriceOracle is Ownable {
    // 价格精度，使用18位小数
    uint256 public constant PRICE_DECIMALS = 18;
    
    // 1 APPL = 260 USDT，考虑到USDT是6位小数，APPL是18位小数
    // 所以 1 APPL (1e18) = 260 USDT (260e6)
    uint256 private _applPriceInUSDT; // 1 APPL对应多少USDT（以USDT最小单位计算）

    event PriceUpdated(uint256 newPrice, uint256 timestamp);

    constructor() Ownable(msg.sender) {
        // 初始化价格：1 APPL = 260 USDT
        // 由于USDT是6位小数，所以260 USDT = 260 * 1e6
        _applPriceInUSDT = 260 * 1e6;
    }

    /**
     * @dev 获取1个APPL对应的USDT数量（USDT最小单位）
     * @return 1 APPL对应的USDT数量
     */
    function getAPPLPriceInUSDT() external view returns (uint256) {
        return _applPriceInUSDT;
    }

    /**
     * @dev 计算指定数量APPL对应的USDT数量
     * @param applAmount APPL数量（APPL最小单位，1e18）
     * @return USDT数量（USDT最小单位，1e6）
     */
    function getUSDTAmountForAPPL(uint256 applAmount) external view returns (uint256) {
        return (applAmount * _applPriceInUSDT) / 1e18;
    }

    /**
     * @dev 计算指定数量USDT对应的APPL数量
     * @param usdtAmount USDT数量（USDT最小单位，1e6）
     * @return APPL数量（APPL最小单位，1e18）
     */
    function getAPPLAmountForUSDT(uint256 usdtAmount) external view returns (uint256) {
        return (usdtAmount * 1e18) / _applPriceInUSDT;
    }

    /**
     * @dev 更新APPL价格（仅所有者可调用）
     * @param newPriceInUSDT 新的价格（1 APPL对应的USDT数量，USDT最小单位）
     */
    function updatePrice(uint256 newPriceInUSDT) external onlyOwner {
        require(newPriceInUSDT > 0, "Price must be greater than 0");
        _applPriceInUSDT = newPriceInUSDT;
        emit PriceUpdated(newPriceInUSDT, block.timestamp);
    }

    /**
     * @dev 获取当前汇率（便于查看，返回可读格式）
     * @return applPrice 1 APPL对应的USDT价格（带6位小数）
     */
    function getCurrentRate() external view returns (uint256 applPrice) {
        applPrice = _applPriceInUSDT;
    }
} 