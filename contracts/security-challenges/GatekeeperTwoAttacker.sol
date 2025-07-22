// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGatekeeperTwo {
    function enter(bytes8 _gateKey) external returns (bool);
}

contract GatekeeperTwoAttacker {
    constructor(address gatekeeper) {
        // Gate 1: calling from a contract → passes
        // Gate 2: extcodesize(this) == 0 → true during constructor

        // Gate 3: Craft the right key
        bytes8 key = bytes8(
            uint64(bytes8(keccak256(abi.encodePacked(address(this))))) ^ type(uint64).max
        );

        IGatekeeperTwo(gatekeeper).enter(key);
    }
}
