// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestUSDT
 */
contract TestUSDT is ERC20, Ownable {
    
    constructor() ERC20("Test USDT", "USDT") Ownable(msg.sender) {}

    /**
     * @dev 铸造代币(所有人都能铸造)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
} 