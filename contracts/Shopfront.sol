pragma solidity ^0.4.18;

import "./Freezable.sol";

contract Shopfront is Freezable {

    struct Item {
        string name;
        uint price;
        uint quantity;
    }
    
    mapping(address => uint) private till;
    mapping(uint => Item) private itemsDatabase;

    event LogItemAdded(address adder, uint indexed id, string name, uint price, uint quantity);
    event LogPurchase(address buyer, uint id, string name, uint price, uint quantity);
    event LogWithdrawal(address withdrawer, uint amount);
    event LogTill(uint indexed tillBalance);

    function Shopfront() public {}

    function addItem(uint id, string name, uint price, uint quantity)
        public
        onlyOwner
        returns (bool success)
    {
        require(id != 0);
        require(price != 0);
        require(quantity != 0);
        Item storage item = itemsDatabase[id];
        item.name = name;
        item.price = price;
        item.quantity = quantity;
        LogItemAdded(msg.sender, id, name, price, quantity);
        return true;
    }

    function getItem(uint id)
        public
        onlyOwner
        view
        returns (string name, uint price, uint quantity)
    {
        return (itemsDatabase[id].name, itemsDatabase[id].price, itemsDatabase[id].quantity);
    }

    function purchaseItem(uint id, uint quantity)
        public
        payable
        freezeRay
        returns (bool success)
    {
        Item storage item = itemsDatabase[id];
        require(quantity <= item.quantity);
        require(msg.value == item.price * quantity);
        item.quantity -= quantity;
        till[Owned.getOwner()] += msg.value;
        if(till[msg.sender] > 1 ether) {
            LogTill(till[msg.sender]);
        } 
        LogPurchase(msg.sender, id, item.name, item.price, quantity);
        return true;
    }

    function getTill()
        public
        onlyOwner
        view
        returns (uint tillBalance)
    {
        return till[msg.sender];
    }

    function withdrawFunds(uint amount)
        public
        returns (bool success)
    {
        require(till[msg.sender] != 0);
        require(amount != 0);
        require(amount <= till[msg.sender]);
        till[msg.sender] -= amount;
        LogWithdrawal(msg.sender, amount);
        address shopOwner = Owned.getOwner();
        shopOwner.transfer(amount);
        return true;
    }    
}