pragma solidity ^0.4.18;


contract Owned {

    address private owner;

    event LogNewOwner(address oldOwner, address newOwner);
    event LogGetOwner(address getter, address owner);

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function Owned()
        public
    {
        owner = msg.sender;
    }

    function getOwner()
        public
        view
        returns (address shopOwner)
    {
        return owner;
    }
    // this now seems like it would be way to easy to changeOwner() to an incorrect address. Consider removing this function if transferOwnership() is kept. 
    function changeOwner(address newOwner)
        public
        onlyOwner
        returns (bool success) 
    {
        //is there a stronger test for a valid address type?
        require(newOwner != 0); 
        LogNewOwner(owner, newOwner);
        owner = newOwner;
        return true;
    }

}