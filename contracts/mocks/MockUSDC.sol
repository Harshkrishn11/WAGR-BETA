// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Fake USDC for local Hardhat testing only. Has 6 decimals like real USDC.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    /// @notice Anyone can mint unlimited tokens — for testing only
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice USDC uses 6 decimals
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
