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
    const price = 1000;
    const addedQuantity = 2;
    const purchasedQuantity = 1;

    beforeEach("setup contract for each test", () => 
        Shopfront.new({ from: owner })
            .then(_instance => shop = _instance)
    );

    describe("owner", () => {
        let hash;
        let pin = 623874;

        it("should be owned by owner", () => 
            shop.getOwner()
            .then(_owner => _owner.should.be.equal(owner)));

        describe("initialize change of ownership", () => {
            
            beforeEach("get hash from pinHasher", () => {
                return shop.pinHasher(newOwner, pin)
                    .then(_hash => hash = _hash)
            })

            it("should throw if anyone but the owner tries to change the owner", () => {
                expectedExceptionPromise(() => shop.initializeOwnerChange(hash, {from: Bob, gas: 3000000}), 3000000)
            })

            it("should allow the owner to change the owner", () => {
                return shop.initializeOwnerChange(hash, {from: owner})
                    .then(() => shop.getNewOwnerHash())
                    .then(_hash => _hash.toString(10).should.be.equal(hash))   
            })
        })

        describe("confirm change of ownership", () => {

            beforeEach("get hash from pinHasher", () => {
                return shop.pinHasher(newOwner, pin)
                    .then(_hash => hash = _hash)
            })

            it("should throw if the wrong address is used to confirm the change of ownership", () => shop.initializeOwnerChange(hash, {from: owner})
                    .then(() => 
                        expectedExceptionPromise(() => shop.confirmOwnerChange(pin, {from: Bob, gas: 3000000}), 3000000)))

            it("should throw if the wrong pin is used to confirm the change of ownership", () => {
                let incorrectPin = 123456;
                return shop.initializeOwnerChange(hash, {from: owner})
                    .then(() => expectedExceptionPromise(() => shop.confirmOwnerChange(incorrectPin, {from: newOwner, gas: 3000000}), 3000000))
            })

            it("should allow confirmation of new owner", () => {
                return shop.initializeOwnerChange(hash, {from: owner})
                    .then(() => shop.confirmOwnerChange(pin, {from: newOwner}))
                    .then(() => shop.getOwner())
                    .then(_owner => _owner.should.be.equal(newOwner))
            })

            it("should let the owner reset the newOwner if no confirmation is received", () => {
                return shop.initializeOwnerChange(hash, {from: owner})
                    .then(() => shop.pinHasher(owner, pin))
                    .then(_hash => shop.initializeOwnerChange(_hash, {from: owner}))
                    .then(() => shop.getOwner())
                    .then(_owner => _owner.should.be.equal(owner))
            })
        })  
    })

    describe("setItem()", () => {

        it("should throw if anyone but the owner tries to add an item to the shop", () => {
            expectedExceptionPromise(
                () => shop.setItem(id, price, addedQuantity, {
                    from: Bob,
                    gas: 3000000}),
                    3000000
                );
        });

        it("should allow the owner to add an item to the shop", () => {
            let txObj;
            let item;
            return shop.setItem(id, price, addedQuantity, {from: owner})
                .then(_txObj => txObj = _txObj)
                .then(() => shop.getItem(id))
                .then(_item => {
                    item = _item;
                    txObj.logs[0].args.id.toString(10).should.be.equal(id.toString(10));
                    txObj.logs[0].args.price.toString(10).should.be.equal(price.toString(10));
                    txObj.logs[0].args.quantity.toString(10).should.be.equal(addedQuantity.toString(10));
                    item[0].toString(10).should.be.equal(price.toString(10));
                    item[1].toString(10).should.be.equal(addedQuantity.toString(10));
                })
        });

        it("should correctly update the stock quantity for the item added", () => {

            let item;
            let itemAfter;
            let startQuantity;
            let endQuantity;

            return shop.getItem(id)
                .then(_item => startQuantity = _item[1])
                .then(() => shop.setItem(id, price, addedQuantity, {from: owner}))
                .then(() => shop.getItem(id))
                .then(_item => {
                    endQuantity = _item[1];
                    endQuantity.should.be.bignumber.equal(startQuantity.add(addedQuantity));
                })  
        })

    })

    describe("buy an item", () => {

        beforeEach("add an item to the shop", () => shop.setItem(id,  price, addedQuantity, {from: owner}))

        it("should allow a customer to buy an item", () => {
        let txObj;
            return shop.purchaseItem(id, purchasedQuantity, {
                from: Alice, 
                value: purchasedQuantity * price})
            .then(_txObj => {
                txObj = _txObj;
                txObj.logs[0].event.should.be.equal("LogPurchase");
                txObj.logs[0].args.id.toString(10).should.be.equal(id.toString(10));
                txObj.logs[0].args.price.toString(10).should.be.equal(price.toString(10));
                txObj.logs[0].args.quantity.toString(10).should.be.equal(purchasedQuantity.toString(10));
            }) 
    })

    it("should correctly update the stock quantity for the item purchased", () => {
        let startQuantity;
        let endQuantity;
        return shop.getItem(id)
            .then(_item => startQuantity = _item[1])
            .then(() => {
                return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price});
            })
            .then(() => shop.getItem(id))
            .then(_item => {
                endQuantity = _item[1];
                endQuantity.toString(10).should.be.equal((startQuantity.minus(purchasedQuantity)).toString(10)); 
            })
    })

    it("should correctly update the balance after a purchase", () => {
        let balanceBefore;
        let balanceAfter;
        return shop.setItem(id, price, addedQuantity, {from: owner})
            .then(() => shop.getBalanceOf(owner))
            .then(_balance => {
                balanceBefore = _balance;
                return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price})
            })
            .then(() => shop.getBalanceOf(owner))
            .then(_balance => {
                balanceAfter = _balance;
                balanceAfter.should.be.bignumber.equal(balanceBefore.add(price * purchasedQuantity));
            })
        }) 

        it("should throw if a customer does not pay the correct price", () => expectedExceptionPromise(
                () => shop.purchaseItem(id, purchasedQuantity, {
                    from: Alice,
                    value: (purchasedQuantity * price) - 1,
                    gas: 3000000}),
                    3000000));

        it("should throw if a customer attemps to buy more items than the shop has in stock", () => {
            let tooMany = addedQuantity + 1;
            expectedExceptionPromise(() => {
                return shop.purchaseItem(id, tooMany, {
                    from: Alice,
                    value: tooMany * price
                });
            })
        })
    })

    describe("freezeRay", () => {

        beforeEach("add an item to the shop", () => shop.setItem(id,  price, addedQuantity, {from: owner}))

        describe("who?", () => {

            it("should throw if anyone but the owner trys to freeze the shop", () => expectedExceptionPromise(
                () => shop.freeze(true, {from: Bob, gas: 3000000}), 3000000))

            it("should allow the owner to freeze the shop", () => {
                return shop.freeze(true, {from: owner})
                    .then(txObj => txObj.logs[0].args.frozen.should.be.equal(true))
            })
        })

        describe("purchase function", () => {
            let txObj;   
    
            beforeEach("freeze it", () => {
                return shop.freeze(true, {from: owner})
                    .then(_txObj => txObj = _txObj);
            })

            it("should throw if anyone trys to make a purchase while the buyItem() is frozen", () => {
                expectedExceptionPromise(() => shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price, gas: 3000000}), 3000000)
            })


            it("should let the owner un-freeze the buyItem() function", () => {
                return shop.freeze(false, {from: owner})
                    .then(txObj => {
                        txObj.logs[0].args.frozen.should.be.equal(false);
                        return shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price});
                    })    
            })
        }) 
    })

    describe("withdrawFunds", () => {
        
        beforeEach("add an item to the shop", () => shop.setItem(id,  price, addedQuantity, {from: owner}))

        beforeEach("purchase an item from the shop", () => shop.purchaseItem(id, purchasedQuantity, {from: Alice, value: purchasedQuantity * price}))

        it("should throw if anyone but the owner tries to withdraw funds from the shop", () => {
            expectedExceptionPromise(() => {
                return shop.withdrawFunds(moreThanAvailableFunds, {from: Bob});
            })
        })

        it("should throw if the owner tries to withdraw more funds than are available in the till", () => {
            let moreThanAvailableFunds = purchasedQuantity * price + 1;
            expectedExceptionPromise(() => {
                return shop.withdrawFunds(moreThanAvailableFunds, {from: owner, gas: 3000000}, 3000000);
            })
        })


        it("should allow the owner to withdraw funds", () => {
            let startBalance;
            let gasPrice;
            let gasUsed;
            let txFee;
            let tx;
            let endBalance;
            let withdrawalAmount = 500;
            return web3.eth.getBalancePromise(owner)
                .then(_balance => {
                    startBalance = _balance;
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
})