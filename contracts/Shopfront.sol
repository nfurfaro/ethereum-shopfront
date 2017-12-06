pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./Freezable.sol";

contract Shopfront is Freezable {

    using SafeMath for uint256;

    struct Item {
        uint price;
        uint quantity;
    }
    
    mapping(address => uint) private balances;
    mapping(uint => Item) private itemsDatabase;

    event LogItemAdded(address adder, uint indexed id, uint price, uint quantity);
    event LogPurchase(address buyer, uint id, uint price, uint quantity);
    event LogWithdrawal(address withdrawer, uint amount);
    event LogBalance(uint indexed Balance);

    function setItem(uint id, uint price, uint quantity)
        public
        onlyOwner
        returns (bool success)
    {
        require(id != 0);
        Item storage item = itemsDatabase[id];
        item.price = price;
        item.quantity = quantity;
        LogItemAdded(msg.sender, id, price, quantity);
        return true;
    }

    function getItem(uint id)
        public
        view
        returns (uint price, uint quantity)
    {
        return (itemsDatabase[id].price, itemsDatabase[id].quantity);
    }

    function purchaseItem(uint id, uint quantity)
        public
        payable
        freezeRay
        returns (bool success)
    {
        Item storage item = itemsDatabase[id];
        require(quantity <= item.quantity);
        require(msg.value == item.price.mul(quantity));
        item.quantity = item.quantity.sub(quantity);

        balances[Owned.getOwner()] = balances[Owned.getOwner()].add(msg.value);
        if(balances[Owned.getOwner()] > 1 ether) {
            LogBalance(balances[msg.sender]);
        } 
        LogPurchase(msg.sender, id, item.price, quantity);
        return true;
    }

    function getBalanceOf(address _who)
        public
        view
        returns (uint _balance)
    {
        return balances[_who];
    }

    function withdrawFunds(uint amount)
        public
        returns (bool success)
    {
        require(balances[msg.sender] != 0);
        require(amount != 0);
        require(amount <= balances[msg.sender]);
        balances[msg.sender] = balances[msg.sender].sub(amount);
        LogWithdrawal(msg.sender, amount);
        msg.sender.transfer(amount);
        return true;
    }    
}