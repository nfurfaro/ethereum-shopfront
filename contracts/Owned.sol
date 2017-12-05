pragma solidity ^0.4.18;


contract Owned {

    address private owner;
    bool private changeInitialized;
    bytes32 private newOwnerHash;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    event LogInitializeOwnerChange(address oldOwner, address newOwner);
    event LogConfirmOwnerChange(address sender);

    function Owned()
        public
    {
        owner = msg.sender;
    }

    //to be used locally only.
    function hashHelper(address newOwner, uint pin)
        public
        pure 
        returns (bytes32 hash)
    {
        require(newOwner != 0);
        require(pin > 99999);
        return keccak256(newOwner, pin);
    }

    function getOwner()
        public
        view
        returns (address shopOwner)
    {
        return owner;
    }
 
    function initializeOwnerChange(address newOwner, bytes32 _hash)
        public
        onlyOwner
        returns (bool success) 
    {
        require(newOwner != 0);
        newOwnerHash = _hash;
        changeInitialized = true; 
        LogInitializeOwnerChange(owner, newOwner);
        // owner = newOwner;
        return true;
    }

    function confirmOwnerChange(uint pin)
        public
        returns (bool success)

    {
        require(changeInitialized = true);
        require(newOwnerHash != 0);
        require(keccak256(msg.sender, pin) == newOwnerHash);
        changeInitialized = false;
        newOwnerHash = bytes32(0);
        LogConfirmOwnerChange(msg.sender);
        owner = msg.sender;
        return true;
    }

}