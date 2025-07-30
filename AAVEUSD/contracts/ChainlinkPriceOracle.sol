// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title ChainlinkPriceOracle
 * @dev 简化的Chainlink价格预言机抽象合约
 * 基于Chainlink官方文档基础示例
 */
abstract contract ChainlinkPriceOracle is OwnableUpgradeable {
    
    AggregatorV3Interface internal priceFeed;
    
    event PriceFeedUpdated(address newPriceFeed);

    /**
     * @dev 初始化Chainlink价格预言机
     * @param _priceFeedAddress Chainlink价格聚合器地址
     */
    function __ChainlinkPriceOracle_init(address _priceFeedAddress) internal onlyInitializing {
        require(_priceFeedAddress != address(0), "Price feed address cannot be zero");
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    /**
     * @dev 获取最新价格（遵循官方示例）
     * @return 最新价格
     */
    function getLatestPrice() public view returns (int256) {
        (
            /* uint80 roundId */,
            int256 answer,
            /* uint256 startedAt */,
            /* uint256 updatedAt */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        return answer;
    }

    /**
     * @dev 更新价格聚合器地址
     * @param _newPriceFeed 新的价格聚合器地址
     */
    function updatePriceFeed(address _newPriceFeed) external onlyOwner {
        require(_newPriceFeed != address(0), "Price feed address cannot be zero");
        priceFeed = AggregatorV3Interface(_newPriceFeed);
        emit PriceFeedUpdated(_newPriceFeed);
    }

    /**
     * @dev 获取价格聚合器地址
     */
    function getPriceFeedAddress() external view returns (address) {
        return address(priceFeed);
    }

    /**
     * @dev 获取价格聚合器小数位数
     */
    function getDecimals() external view returns (uint8) {
        return priceFeed.decimals();
    }
} 