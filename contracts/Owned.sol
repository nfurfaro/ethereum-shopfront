pragma solidity ^0.4.18;


contract Owned {

    address public owner;

    event LogNewOwner(address oldowner, address newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function Owned()
        public
    {
        owner = msg.sender;
    }

    function changeOwner(address newOwner)
        public
        onlyOwner
        returns (bool success) 
    {
        require(newOwner != 0);
        LogNewOwner(owner, newOwner);
        owner = newOwner;
        return true;
    }

}