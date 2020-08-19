//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.8;

import "./gsnv2/BaseRelayRecipient.sol";

contract Boxes is BaseRelayRecipient {
  mapping(address => uint256) values;

  event ValueSet(address who, uint256 value);

  constructor(address _trustedForwarder) public {
    trustedForwarder = _trustedForwarder;
  }

  function getValue(address who) public view returns (uint256) {
    return values[who];
  }

  function setValue(uint256 value) public {
    address who = _msgSender();
    values[who] = value;
    emit ValueSet(who, value);
  }
}
