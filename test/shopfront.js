const Shopfront = artifacts.require("./Shopfront.sol");
const { should, EVMThrow } = require('./helpers');
const Promise = require("bluebird");

if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

contract('Shopfront', ([owner, Alice, Bob, newOwner]) => {

    const id = 1;
    const name = "Longsword";
    const price = 17000;
    const quantity = 1;
    let depositAmount = 1000;

    beforeEach("setup contract for each test", async() => {
         shop = await Shopfront.new({ from: owner });
    });

    it("should be owned by owner", async() => {
        _owner = await shop.owner({from: owner});
        _owner.should.be.equal(owner);
    });

    it("should throw if anyone but the owner tries to add an item to the shop", () => {
        shop.addItem(id, name, price, quantity, {from: Bob}).should.be.rejectedWith(EVMThrow);
    });

    it("should allow the owner to add an item to the shop", async() => {
        txObj = await shop.addItem(id, name, price, quantity, {from: owner});
        product = await shop.itemsDatabase(id, {from: owner});
        txObj.logs[0].args.id.toString(10).should.be.equal(id.toString(10));
        txObj.logs[0].args.name.should.be.equal(name);
        txObj.logs[0].args.price.toString(10).should.be.equal(price.toString(10));
        txObj.logs[0].args.quantity.toString(10).should.be.equal(quantity.toString(10));
        product[0].should.be.equal(name);
        product[1].toString(10).should.be.equal(price.toString(10));
        product[2].toString(10).should.be.equal(quantity.toString(10));
    });

    it("should correctly update the stock quantity for the item added", async() => {
        let addedQuantity = 1;
        let item = await shop.itemsDatabase.call(id);
        let startQuantity = item[2];
        await shop.addItem(id, name, price, addedQuantity, {from: owner});
        let itemAfter = await shop.itemsDatabase.call(id);
        let endQuantity = itemAfter[2];
        endQuantity.should.be.bignumber.equal((startQuantity + addedQuantity));  
    })

    it("should throw if a customer does not pay the correct price", async() => {
        await shop.addItem(id, name, price, quantity, {from: owner});
        await shop.buyItem(id, quantity, {from: Alice, value: 16000}).should.be.rejectedWith(EVMThrow);
    })

    it("should throw if a customer attemps to buy more items than the shop has in stock", async() => {
        const tooMany = 2;
        await shop.addItem(id, name, price, quantity, {from: owner});
        await shop.buyItem(id, tooMany, {from: Alice, value: 17000}).should.be.rejectedWith(EVMThrow);
    })

    it("should allow a customer to buy an item", async() => {
        await shop.addItem(id, name, price, quantity, {from: owner});
        txObj = await shop.buyItem(id, quantity, {from: Alice, value: 17000});
        txObj.logs[0].event.should.be.equal("LogPurchase");
        txObj.logs[0].args.id.toString(10).should.be.equal(id.toString(10));
        txObj.logs[0].args.name.should.be.equal(name);
        txObj.logs[0].args.price.toString(10).should.be.equal(price.toString(10));
        txObj.logs[0].args.quantity.toString(10).should.be.equal(quantity.toString(10));
    })

    it("should correctly update the stock quantity for the item purchased", async() => {
        let purchaseQuantity = 1;
        await shop.addItem(id, name, price, quantity, {from: owner});
        let startQuantity = await shop.itemsDatabase.call(id);
        await shop.buyItem(id, purchaseQuantity, {from: Alice, value: 17000});
        let endQuantity = await shop.itemsDatabase.call(id);
        endQuantity[2].toString(10).should.be.equal((startQuantity[2] - purchaseQuantity).toString(10));  
    })

    it("should throw if the owner tries to deposit 0 value", () => {
        shop.depositFunds({from: owner, value: 0}).should.be.rejectedWith(EVMThrow);
    })

    it("should allow the shop-owner to deposit funds", async() => {
        let till = await shop.till();
        await shop.depositFunds({from: owner, value: depositAmount});
        let tillAfter = await shop.till();
        tillAfter.should.be.bignumber.equal(till + depositAmount)
    })

    it("should throw if anyone but the owner tries to withdraw funds", async() => {
        await shop.depositFunds({from: owner, value: depositAmount});
        shop.withdrawFunds(1000, {from: Alice}).should.be.rejectedWith(EVMThrow);
    })

    it("should throw if the owner tries to withdraw 0 funds", async() => {
        await shop.depositFunds({from: owner, value: depositAmount});
        await shop.withdrawFunds(0, {from: owner}).should.be.rejectedWith(EVMThrow);
    })

    it("should throw if the owner tries to withdraw more funds than are available in the cash register", async() => {
        let moreThanAvailableFunds = depositAmount + 1;
        await shop.depositFunds({from: owner, value: depositAmount});
        await shop.withdrawFunds(moreThanAvailableFunds, {from: owner}).should.be.rejectedWith(EVMThrow);
    })

    it("should throw if anyone trys to make a purchase while the buyItem() is frozen", async() => {
        await shop.addItem(id, name, price, quantity, {from: owner});
        await shop.freeze(true, {from: owner});
        await shop.buyItem(id, quantity, {from: Alice, value: 17000}).should.be.rejectedWith(EVMThrow);
    })

    it("should let the owner un-freeze the buyItem() function", async() => {
        await shop.addItem(id, name, price, quantity, {from: owner});
        await shop.freeze(true, {from: owner});
        await shop.buyItem(id, quantity, {from: Alice, value: 17000}).should.be.rejectedWith(EVMThrow);
        await shop.freeze(false, {from: owner});
        await shop.buyItem(id, quantity, {from: Alice, value: 17000}).should.not.be.rejectedWith(EVMThrow);
    })

    it("should not let anyone but the owner use the freeze() function", async() => {
        await shop.freeze(true, {from: Bob}).should.be.rejectedWith(EVMThrow);
    })

    it("should allow the current owner to set a new owner", async() => {
        await shop.changeOwner(newOwner, {from: owner});
        _owner = await shop.owner({from: owner});
        _owner.should.be.equal(newOwner);
    })


    it("should allow the owner to withdraw funds", async() => {

        let startBalance;
        let gasPrice;
        let gasUsed;
        let txFee;
        let endBalance;
        let withdrawalAmount = 500;

        startBalance = await web3.eth.getBalancePromise(owner);
        await shop.depositFunds({from: owner, value: depositAmount});
        txObj = await shop.withdrawFunds(withdrawalAmount, {from: owner});
        gasUsed = txObj.receipt.gasUsed;
        tx = await web3.eth.getTransactionPromise(txObj.tx);
        gasPrice = tx.gasPrice;
        txFee = gasPrice.times(gasUsed);
        endBalance = await web3.eth.getBalancePromise(owner);
        startBalance.plus(withdrawalAmount).minus(txFee).toString(10).should.be.equal(endBalance.toString(10));
    })
})