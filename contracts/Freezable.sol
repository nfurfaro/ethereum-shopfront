pragma solidity ^0.4.18;

import "./Owned.sol";

contract Freezable is Owned {
    
    bool private frozen;

    modifier freezeRay() {
        require(!frozen);
        _;
    }

    event LogFreeze(address sender, bool frozen);

    function isFrozen() 
        public
        view
        returns(bool isFrozen)
    {
        return frozen;
    }

    function freeze(bool _freeze)
        public
        onlyOwner
        returns (bool success) 
    {
        require(_freeze != frozen);
        frozen = _freeze;
        LogFreeze(msg.sender, _freeze);
        return true;
    }
}