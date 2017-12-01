pragma solidity ^0.4.18;

import "./Freezable.sol";

contract Shopfront is Freezable {

    uint private till;

    //find a cheaper way to store the string data...

    // You could choose a cheaper type. You would not want to have the whole GUI populated from the contract storage. The contract could give you an external id or hash that would direct the UI to the full localised metadata.
    struct Item {
        string name;
        uint price;
        uint quantity;
    }
    

    mapping(uint => Item) public itemsDatabase;

    event LogItemAdded(address adder, uint indexed id, string name, uint price, uint quantity);
    event LogPurchase(address buyer, uint id, string name, uint price, uint quantity);
    event LogWithdrawal(address withdrawer, uint amount);
    event LogTill(uint indexed tillBalance);
    event LogTransferOwnership(address oldOwner, address newOwner, uint timestamp, uint blockNumber, uint balance);

    function Shopfront() {}

    function addItem(uint id, string name, uint price, uint quantity)
        public
        onlyOwner
        returns (bool success)
    {
        require(id != 0);
        require(price != 0);
        require(quantity != 0);
        Item item = itemsDatabase[id];
        item.name = name;
        item.price = price;
        item.quantity = quantity;
        LogItemAdded(msg.sender, id, name, price, quantity);
        return true;
    }

    function purchaseItem(uint id, uint quantity)
        public
        payable
        freezeRay
        returns (bool success)
    {
        Item item = itemsDatabase[id];
        require(quantity <= item.quantity);
        require(msg.value == item.price * quantity);
        item.quantity -= quantity;
        till += msg.value;
        if(till > 1 ether) {
            LogTill(till);
        } else {
            LogPurchase(msg.sender, id, item.name, item.price, quantity);
        }   
        LogPurchase(msg.sender, id, item.name, item.price, quantity);
        return true;
    }

    function getTill()
        public
        view
        returns (uint tillBalance)
    {
        return till;
    }

/*     - untested
       - Could just put all this in Owned.changeOwner(), but it creates circular dependencies and moves core logic to away from Shopfront.sol. 
       - Password protected? maybe require some type of verifiable confirmation from the new owner to complete, or it throws and rolls back?
       -lock it down, new owner must unlock it.
       -check for success of most recent block / completion of any possible incoming payments. possible? Necessary or overkill? 
*/
    function transferOwnership(address _newOwner)
        public
        onlyOwner
        returns (bool success)
    {
        //find a stronger test for a valid address type?
        require(_newOwner != 0); 
        freeze(true);
        if(this.balance != 0) {
            withdrawFunds(this.balance);
        } 
        till = 0;
        LogTransferOwnership(getOwner(), _newOwner, block.timestamp, block.number, this.balance);
        changeOwner(_newOwner);
        return true;
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
        msg.sender.transfer(amount);
        return true;
    }    
}