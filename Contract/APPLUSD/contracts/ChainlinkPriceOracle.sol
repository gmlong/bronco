// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title ChainlinkPriceOracle
 * @dev 基于Chainlink的价格预言机合约，提供实时价格管理功能
 */
abstract contract ChainlinkPriceOracle is OwnableUpgradeable {
    // Chainlink价格聚合器接口
    AggregatorV3Interface internal dataFeed;
    
    // 备用价格机制相关变量
    uint256 private _fallbackPrice; // 备用价格（以USDT最小单位计算）
    bool private _useFallbackPrice; // 是否使用备用价格
    uint256 private _priceValidityDuration; // 价格有效期（秒）
    
    // 事件
    event PriceFeedUpdated(address newPriceFeed);
    event FallbackPriceEnabled(uint256 fallbackPrice);
    event FallbackPriceDisabled();
    event FallbackPriceUpdated(uint256 newFallbackPrice);
    event PriceValidityDurationUpdated(uint256 newDuration);

    /**
     * @dev 初始化Chainlink价格预言机
     * @param _priceFeedAddress Chainlink价格聚合器地址
     * @param _initialFallbackPrice 初始备用价格（USDT最小单位）
     * @param _validityDuration 价格有效期（秒，默认3600秒即1小时）
     */
    function __ChainlinkPriceOracle_init(
        address _priceFeedAddress,
        uint256 _initialFallbackPrice,
        uint256 _validityDuration
    ) internal onlyInitializing {
        require(_priceFeedAddress != address(0), "Price feed address cannot be zero");
        require(_initialFallbackPrice > 0, "Initial fallback price must be greater than 0");
        
        dataFeed = AggregatorV3Interface(_priceFeedAddress);
        _fallbackPrice = _initialFallbackPrice;
        _useFallbackPrice = false;
        _priceValidityDuration = _validityDuration > 0 ? _validityDuration : 3600; // 默认1小时
    }

    // ==============================================
    // Chainlink价格功能
    // ==============================================

    /**
     * @dev 获取Chainlink最新价格数据
     * @return price 最新价格
     * @return timestamp 价格更新时间戳
     * @return isValid 价格是否有效
     */
    function getChainlinkLatestPrice() public view returns (int256 price, uint256 timestamp, bool isValid) {
        try dataFeed.latestRoundData() returns (
            uint80 /* roundId */,
            int256 answer,
            uint256 /* startedAt */,
            uint256 updatedAt,
            uint80 /* answeredInRound */
        ) {
            // 检查价格是否在有效期内
            isValid = (block.timestamp - updatedAt) <= _priceValidityDuration && answer > 0;
            return (answer, updatedAt, isValid);
        } catch {
            return (0, 0, false);
        }
    }

    /**
     * @dev 获取Chainlink原始价格（简化版本）
     * @return 最新价格，如果获取失败返回0
     */
    function getChainlinkDataFeedLatestAnswer() public view returns (int256) {
        (int256 price, , ) = getChainlinkLatestPrice();
        return price;
    }

    /**
     * @dev 获取当前使用的价格（USDT格式，6位小数）
     * @return 当前价格
     */
    function getCurrentPrice() public view returns (uint256) {
        if (_useFallbackPrice) {
            return _fallbackPrice;
        }
        
        (int256 chainlinkPrice, , bool isValid) = getChainlinkLatestPrice();
        
        if (isValid && chainlinkPrice > 0) {
            // Chainlink价格通常是8位小数，需要转换为6位小数（USDT格式）
            uint256 decimals = dataFeed.decimals();
            if (decimals >= 6) {
                return uint256(chainlinkPrice) / (10 ** (decimals - 6));
            } else {
                return uint256(chainlinkPrice) * (10 ** (6 - decimals));
            }
        }
        
        // 如果Chainlink价格无效，自动使用备用价格
        return _fallbackPrice;
    }

    /**
     * @dev 获取价格来源信息
     * @return isUsingFallback 是否正在使用备用价格
     * @return chainlinkPrice Chainlink原始价格
     * @return chainlinkTimestamp Chainlink价格时间戳
     * @return isChainlinkValid Chainlink价格是否有效
     * @return fallbackPrice 当前备用价格
     */
    function getPriceInfo() external view returns (
        bool isUsingFallback,
        int256 chainlinkPrice,
        uint256 chainlinkTimestamp,
        bool isChainlinkValid,
        uint256 fallbackPrice
    ) {
        isUsingFallback = _useFallbackPrice;
        (chainlinkPrice, chainlinkTimestamp, isChainlinkValid) = getChainlinkLatestPrice();
        fallbackPrice = _fallbackPrice;
    }

    /**
     * @dev 获取价格聚合器的小数位数
     * @return 小数位数
     */
    function getPriceFeedDecimals() external view returns (uint8) {
        return dataFeed.decimals();
    }

    // ==============================================
    // 管理功能
    // ==============================================

    /**
     * @dev 更新Chainlink价格聚合器地址（仅所有者可调用）
     * @param _newPriceFeed 新的价格聚合器地址
     */
    function updateChainlinkPriceFeed(address _newPriceFeed) external onlyOwner {
        require(_newPriceFeed != address(0), "Price feed address cannot be zero");
        dataFeed = AggregatorV3Interface(_newPriceFeed);
        emit PriceFeedUpdated(_newPriceFeed);
    }

    /**
     * @dev 更新备用价格（仅所有者可调用）
     * @param newFallbackPrice 新的备用价格（USDT最小单位）
     */
    function updateFallbackPrice(uint256 newFallbackPrice) external onlyOwner {
        require(newFallbackPrice > 0, "Fallback price must be greater than 0");
        _fallbackPrice = newFallbackPrice;
        emit FallbackPriceUpdated(newFallbackPrice);
    }

    /**
     * @dev 启用备用价格模式（仅所有者可调用）
     */
    function enableFallbackPrice() external onlyOwner {
        _useFallbackPrice = true;
        emit FallbackPriceEnabled(_fallbackPrice);
    }

    /**
     * @dev 禁用备用价格模式，恢复使用Chainlink价格（仅所有者可调用）
     */
    function disableFallbackPrice() external onlyOwner {
        _useFallbackPrice = false;
        emit FallbackPriceDisabled();
    }

    /**
     * @dev 更新价格有效期（仅所有者可调用）
     * @param newValidityDuration 新的价格有效期（秒）
     */
    function updatePriceValidityDuration(uint256 newValidityDuration) external onlyOwner {
        require(newValidityDuration > 0, "Validity duration must be greater than 0");
        _priceValidityDuration = newValidityDuration;
        emit PriceValidityDurationUpdated(newValidityDuration);
    }

    // ==============================================
    // 内部函数（供子合约使用）
    // ==============================================

    /**
     * @dev 内部函数，检查是否正在使用备用价格（供子合约使用）
     * @return 是否使用备用价格
     */
    function _isUsingFallbackPrice() internal view returns (bool) {
        return _useFallbackPrice;
    }

    /**
     * @dev 内部函数，获取备用价格（供子合约使用）
     * @return 备用价格
     */
    function _getFallbackPrice() internal view returns (uint256) {
        return _fallbackPrice;
    }

    /**
     * @dev 内部函数，获取价格有效期（供子合约使用）
     * @return 价格有效期（秒）
     */
    function _getPriceValidityDuration() internal view returns (uint256) {
        return _priceValidityDuration;
    }

    // ==============================================
    // 兼容性函数（保持向后兼容）
    // ==============================================

    /**
     * @dev 兼容性函数：更新价格（实际更新备用价格）
     * @param newPriceInUSDT 新的价格（USDT最小单位）
     */
    function updatePrice(uint256 newPriceInUSDT) external onlyOwner {
        require(newPriceInUSDT > 0, "Fallback price must be greater than 0");
        _fallbackPrice = newPriceInUSDT;
        emit FallbackPriceUpdated(newPriceInUSDT);
    }
} 