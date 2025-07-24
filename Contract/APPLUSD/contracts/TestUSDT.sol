// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestUSDT
 * @dev 测试用的USDT合约，任何人都可以mint
 */
contract TestUSDT is ERC20 {
    uint8 private _decimals;

    constructor() ERC20("Test USDT", "TUSDT") {
        _decimals = 6; // USDT通常使用6位小数
    }

    /**
     * @dev 返回代币的小数位数
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev 任何人都可以mint代币，用于测试
     * @param to 接收代币的地址
     * @param amount mint的数量（注意单位是最小单位）
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @dev 便捷函数：mint指定数量的完整代币
     * @param to 接收代币的地址
     * @param amount 代币数量（会自动乘以10^decimals）
     */
    function mintTokens(address to, uint256 amount) public {
        _mint(to, amount * 10**_decimals);
    }
} 