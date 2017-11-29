pragma solidity ^0.4.18;

import "./Freezable.sol";

contract Shopfront is Freezable {

    uint public till;

    //find a cheaper way to store the string data
    struct Item {
        string name;
        uint price;
        uint quantity;
    }

    mapping(uint => Item) public itemsDatabase;
    uint[] public productList;

    event LogItemAdded(uint id, string name, uint price, uint quantity);
    event LogPurchase(address buyer, uint id, string name, uint price, uint quantity);
    event LogDeposit(address sender, uint amount);
    event LogWithdrawal(address withdrawer, uint amount);
    event LogTillFull(uint tillBalance);

    function Shopfront() {}

    function addItem(uint id, string name, uint price, uint quantity)  
        public
        onlyOwner
        returns (bool success)
    {
        require(id != 0);
        // require(name != "");
        require(price != 0);
        require(quantity != 0);
        itemsDatabase[id].name = name;
        itemsDatabase[id].price = price;
        itemsDatabase[id].quantity = quantity;
        productList.push(id);
        LogItemAdded(id, name, price, quantity);
        return true;
    }

    function buyItem(uint id, uint quantity)
        public
        payable
        returns (bool success)
    {
        require(quantity <= itemsDatabase[id].quantity);
        require(msg.value == itemsDatabase[id].price);
        itemsDatabase[id].quantity -= quantity;
        if(till > 1 ether) {
            LogTillFull(till);
            LogPurchase(msg.sender, id, itemsDatabase[id].name, itemsDatabase[id].price, quantity);
            return true;
        } else {
            LogPurchase(msg.sender, id, itemsDatabase[id].name, itemsDatabase[id].price, quantity);
            return true;
        }
    }

    function depositFunds()
        public
        onlyOwner
        payable
        returns (bool success)
    {
        require(msg.value != 0);
        require(till + msg.value <= 0.5 ether);
        till += msg.value;
        if(till > 1 ether) {
            LogTillFull(till);
            return true;
        } else {
            LogDeposit(msg.sender, msg.value);
            return true;
        }
    }

    function withdrawFunds(uint amount)
        public
        onlyOwner
        returns (bool success)
    {
        require(amount != 0);
        require(amount <= till);
        till -= amount;
        LogWithdrawal(msg.sender, amount);
        owner.transfer(amount);
        return true;
    }    
}