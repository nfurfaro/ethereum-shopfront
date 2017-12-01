const Shopfront = artifacts.require("./Shopfront.sol");
const expectedExceptionPromise = require("./expected_exception_testRPC_and_geth.js");
const { should, EVMThrow } = require('./helpers');
const Promise = require("bluebird");

if (typeof web3.eth.getBlockPromise !== "function") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

contract('Shopfront', ([owner, Alice, Bob, newOwner]) => {

    let shop;
    const id = 1;
    const name = "Longsword";
    const price = 1000;
    const addedQuantity = 2;
    const purchasedQuantity = 1;

    beforeEach("setup contract for each test", () => {
        return Shopfront.new({ from: owner })
            .then(_instance => {
                shop = _instance;
            })
    });

    it("should be owned by owner", () => {
        return shop.getOwner.call()
            .then(_owner => {
                _owner.should.be.equal(owner);
            })
    });

    it("should allow the current owner to set a new owner", () => {
        return shop.changeOwner(newOwner, {from: owner})
            .then(() => {
                return shop.getOwner.call()
            })
            .then(_owner => {
                _owner.should.be.equal(newOwner);
            })
    })

    it("should throw if anyone but the owner tries to add an item to the shop", () => {
        expectedExceptionPromise(() => {
            return shop.addItem(id, name, price, addedQuantity, {from: Bob});
        });
    });

    it("should allow the owner to add an item to the shop", () => {
        let txObj;
        let product;
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(_txObj => {
                txObj = _txObj;
            })
            .then(() => {
                return shop.itemsDatabase(id, {from: owner})
            })
            .then(_product => {
                product = _product;
                txObj.logs[0].args.id.toString(10).should.be.equal(id.toString(10));
                txObj.logs[0].args.name.should.be.equal(name);
                txObj.logs[0].args.price.toString(10).should.be.equal(price.toString(10));
                txObj.logs[0].args.quantity.toString(10).should.be.equal(addedQuantity.toString(10));
                product[0].should.be.equal(name);
                product[1].toString(10).should.be.equal(price.toString(10));
                product[2].toString(10).should.be.equal(addedQuantity.toString(10));
            })
    });

    it("should correctly update the stock quantity for the item added", () => {

        let item;
        let itemAfter;
        let startQuantity;
        let endQuantity;

        return shop.itemsDatabase.call(id)
            then(_item => {
                startQuantity = _item[2];
            })
            .then(() => {
                return shop.addItem(id, name, price, addedQuantity, {from: owner}) 
            })
            .then(() => {
                return shop.itemsDatabase.call(id) 
            })
            .then(_item => {
                endQuantity = _item[2];
                endQuantity.should.be.bignumber.equal(startQuantity.add(addedQuantity));
            })  
    })

    it("should throw if a customer does not pay the correct price", () => {
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                expectedExceptionPromise(() => {
                    return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: (purchasedQuantity * price) - 1});
                });
            })
    })

    it("should throw if a customer attemps to buy more items than the shop has in stock", () => {
        const tooMany = addedQuantity + 1;
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                expectedExceptionPromise(() => {
                    return shop.purchaseItem(id, addedQuantity, {from: Alice, value: tooMany * price});
                })
            }) 
    })

    it("should allow a customer to buy an item", () => {
        let txObj;
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price})
            })
            .then(_txObj => {
                txObj = _txObj;
                txObj.logs[0].event.should.be.equal("LogPurchase");
                txObj.logs[0].args.id.toString(10).should.be.equal(id.toString(10));
                txObj.logs[0].args.name.should.be.equal(name);
                txObj.logs[0].args.price.toString(10).should.be.equal(price.toString(10));
                txObj.logs[0].args.quantity.toString(10).should.be.equal(purchasedQuantity.toString(10));
            }) 
    })

    it("should correctly update the stock quantity for the item purchased", () => {
        let startQuantity;
        let endQuantity;
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                return shop.itemsDatabase.call(id);
            })
            .then(_startQuantity => {
                startQuantity = _startQuantity
            })
            .then(() => {
                return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price});
            })
            .then(() => {
                return shop.itemsDatabase.call(id)
            })
            .then(_endQuantity => {
                endQuantity = _endQuantity;
                endQuantity[2].toString(10).should.be.equal((startQuantity[2] - purchasedQuantity).toString(10)); 
            })
    })

    it("should correctly update the till balance after a purchase", () => {
        let tillBalanceBefore;
        let tillBalanceAfter;
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                return shop.getTill.call()
            })
            .then(_balance => {
                tillBalanceBefore = _balance;
                return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price})
            })
            .then(() => {
                return shop.getTill.call()
            })
            .then(_balance => {
                tillBalanceAfter = _balance;
                tillBalanceAfter.should.be.bignumber.equal(tillBalanceBefore.add(price * purchasedQuantity));
            })
    }) 

    it("should throw if the owner tries to withdraw 0 funds", () => {
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price})
            })
            .then(() => {
                expectedExceptionPromise(() => {
                    return shop.withdrawFunds(0, {from: owner}).should.be.rejectedWith(EVMThrow);
                })
            })
    })

    it("should throw if the owner tries to withdraw more funds than are available in the till", () => {
        let moreThanAvailableFunds = purchasedQuantity * price + 1;
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
        .then(() => {
            return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price})
        })
        .then(() => {
            expectedExceptionPromise(() => {
                return shop.withdrawFunds(moreThanAvailableFunds, {from: owner});
            })
        })
    })

    it("should throw if anyone trys to make a purchase while the buyItem() is frozen", () => {
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                return shop.freeze(true, {from: owner})
            })
            .then(txObj => {
                txObj.logs[0].args.isFrozen.should.be.equal(true);
                expectedExceptionPromise(() => {
                    return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price});
                })
            })
    })

    it("should let the owner un-freeze the buyItem() function", () => {
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                return shop.freeze(true, {from: owner})
            })
            .then(txObj => {
                txObj.logs[0].args.isFrozen.should.be.equal(true);
                expectedExceptionPromise(() => {
                    return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price})
                })
            })
            .then(() => {
                return shop.freeze(false, {from: owner})
            })
            .then(txObj => {
                txObj.logs[0].args.isFrozen.should.be.equal(false);
                return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price});
            })    
    })

    it("should not let anyone but the owner use the freeze() function", () => {
        expectedExceptionPromise(() => {
            return shop.freeze(true, {from: Bob});
        })
    })

    it("should allow the owner to withdraw funds", async() => {
        let startBalance;
        let gasPrice;
        let gasUsed;
        let txFee;
        let endBalance;
        let withdrawalAmount = 500;
        await shop.addItem(id, name, price, addedQuantity, {from: owner});
        startBalance = await web3.eth.getBalancePromise(owner);
        await shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price});
        txObj = await shop.withdrawFunds(withdrawalAmount, {from: owner});
        gasUsed = txObj.receipt.gasUsed;
        tx = await web3.eth.getTransactionPromise(txObj.tx);
        gasPrice = tx.gasPrice;
        txFee = gasPrice.times(gasUsed);
        endBalance = await web3.eth.getBalancePromise(owner);
        startBalance.plus(withdrawalAmount).minus(txFee).toString(10).should.be.equal(endBalance.toString(10));
    })

    it("should allow the owner to withdraw funds", () => {

        let startBalance;
        let gasPrice;
        let gasUsed;
        let txFee;
        let tx;
        let endBalance;
        let withdrawalAmount = 500;
        
        return shop.addItem(id, name, price, addedQuantity, {from: owner})
            .then(() => {
                return web3.eth.getBalancePromise(owner)
            })
            .then(_balance => {
                startBalance = _balance; 
                return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price})
            })
            .then(() => {
                return shop.withdrawFunds(withdrawalAmount, {from: owner})
            })
            .then(_tx => {
                txObj = _tx; 
                gasUsed = txObj.receipt.gasUsed;
                return web3.eth.getTransactionPromise(txObj.tx)
            })
            .then(_tx => {
                tx = _tx; 
                gasPrice = tx.gasPrice;
                txFee = gasPrice.times(gasUsed);
                return web3.eth.getBalancePromise(owner)
            })
            .then(_balance => {
                endBalance = _balance;
                startBalance.plus(withdrawalAmount).minus(txFee).toString(10).should.be.equal(endBalance.toString(10));
            })
    })
})