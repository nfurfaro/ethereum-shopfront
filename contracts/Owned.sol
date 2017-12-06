pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";

contract Owned {

    using SafeMath for uint256;

    address private owner;
    bytes32 private newOwnerHash;
    uint private deadline;
    uint private timeout;


    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    event LogInitializeOwnerChange(address oldOwner, bytes32 newHash, uint _deadline);
    event LogConfirmOwnerChange(address oldOwner, address newOwner);

    function Owned()
        public
    {
        owner = msg.sender;
        timeout = 75;
    }

    function getNewOwnerHash()
        public
        view
        returns (bytes32 _hash)
    {
        return newOwnerHash;
    }

    //to be used locally only.
    function pinHasher(address newOwner, uint pin)
        public
        pure 
        returns (bytes32 hash)
    {
        require(newOwner != 0);
        return keccak256(newOwner, pin);
    }

    function getOwner()
        public
        view
        returns (address shopOwner)
    {
        return owner;
    }

    function initializeOwnerChange(bytes32 _hash)
        public
        onlyOwner
        returns (bool success) 
    {
        require(_hash != 0x0);
        deadline = block.number.add(timeout);
        newOwnerHash = _hash;
        LogInitializeOwnerChange(msg.sender, _hash, deadline);
        return true;
    }

    function confirmOwnerChange(uint pin)
        public
        returns (bool success)

    {
        require(block.number <= deadline);
        require(newOwnerHash != 0x0);
        require(keccak256(msg.sender, pin) == newOwnerHash);
        newOwnerHash = 0x0;
        LogConfirmOwnerChange(owner, msg.sender);
        owner = msg.sender;
        return true;
    }

}