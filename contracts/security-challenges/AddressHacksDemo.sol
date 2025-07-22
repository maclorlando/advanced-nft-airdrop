// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Address.sol";

contract Victim {
    event CallerCheck(address caller, bool isContract);
    event TxOriginCheck(address sender, address origin);

    function checkIsContract() external {
        bool result = Address.isContract(msg.sender); //works in OZ v4.9.x
        emit CallerCheck(msg.sender, result);
    }

    function checkTxOrigin() external {
        require(msg.sender == tx.origin, "Contracts not allowed");
        emit TxOriginCheck(msg.sender, tx.origin);
    }
}

contract ExtcodesizeBypasser {
    constructor(address target) {
        Victim(target).checkIsContract(); // will emit isContract == false
    }
}

contract TxOriginAttacker {
    constructor(address target) {
        Victim(target).checkTxOrigin(); // will revert due to tx.origin protection
    }
}
