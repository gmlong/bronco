// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestUSDT
 * @dev 测试用的USDT代币合约（6位小数）
 */
contract TestUSDT is ERC20, Ownable {
    
    constructor() ERC20("Test USDT", "USDT") Ownable(msg.sender) {
        // 铸造100万个USDT给部署者
        _mint(msg.sender, 1000000 * 10**6); // 6位小数
    }

    /**
     * @dev USDT使用6位小数
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev 铸造代币（仅所有者）
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 