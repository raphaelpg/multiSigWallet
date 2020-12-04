const { expect } = require('chai')
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const MultiSigWallet = artifacts.require("MultiSigWallet")

contract("MultiSigWallet", async (accounts) => {
	const [owner1, owner2, owner3] = accounts
	const owners = accounts.splice(0, 3)
	const receiver = accounts[0]
	const address0 = "0x0000000000000000000000000000000000000000"
	const tooManyOwners = accounts.splice(0, 4)
	const minimumConfirmation = new BN(2)
	
	describe("MultiSigWallet deployment testing", () => {
		it("deploy contract revert on too many addresses", async() => {
			await expectRevert(MultiSigWallet.new(tooManyOwners, minimumConfirmation), 'Too many owners')
		})

		it("deploy contract revert with no addresses provided", async() => {
			const emptyArray = []
			await expectRevert(MultiSigWallet.new(emptyArray, minimumConfirmation), 'Invalid owners number')
		})

		it("deploy contract revert on too many confirmations parameter", async() => {
			await expectRevert(MultiSigWallet.new(owners, 4), 'Invalid minimumConfirmations value')
		})

		it("deploy contract revert on not enough confirmations parameter", async() => {
			await expectRevert(MultiSigWallet.new(owners, 0), 'Invalid minimumConfirmations value')
		})
		
		it("check minimumConfirmations", async () => {
			let MultiSigWalletInstance = await MultiSigWallet.new(owners, minimumConfirmation)
			let calledMinimumConfirmations = await MultiSigWalletInstance.minimumConfirmations()
			expect(calledMinimumConfirmations).to.be.bignumber.equal(minimumConfirmation)
		})

		it("check owners", async () => {
			let MultiSigWalletInstance = await MultiSigWallet.new(owners, minimumConfirmation)
			let calledOwners = await MultiSigWalletInstance.getOwners()
			expect(calledOwners).to.eql(owners)
		})
	})

	describe("MultiSigWallet functions testing", () => {
		beforeEach(async () => {
			this.MultiSigWalletInstance = await MultiSigWallet.new(owners, minimumConfirmation)
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
		})

		it("add, confirmn and execute transaction", async() => {
			await web3.eth.sendTransaction({from:owner1, to:this.MultiSigWalletInstance.address, value:"2"})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner3})
			await this.MultiSigWalletInstance.executeTransaction(0, {from: owner1})
		})

		it("revoke transaction", async() => {
			await web3.eth.sendTransaction({from:owner1, to:this.MultiSigWalletInstance.address, value:"2"})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner3})
			await this.MultiSigWalletInstance.revokeTransaction(0, {from: owner3})
			await expectRevert(this.MultiSigWalletInstance.executeTransaction(0, {from: owner1}), 'Unsufficient transaction confirmations')
		})

		it("get transaction count", async() => {
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			let txCount = await this.MultiSigWalletInstance.getTransactionsCount()
			expect(txCount).to.be.bignumber.equal(new BN(2))
		})
	})

	describe("MultiSigWallet functions reverting correctly", () => {
		beforeEach(async () => {
			this.MultiSigWalletInstance = await MultiSigWallet.new(owners, minimumConfirmation)
		})

		it("should revert if receiver is address(0)", async() => {
			await expectRevert(this.MultiSigWalletInstance.addTransaction(address0, 1, {from: owner1}), 'Address 0')
		})

		it("should revert if value is 0", async() => {
			await expectRevert(this.MultiSigWalletInstance.addTransaction(receiver, 0, {from: owner1}), 'Insufficient value')
		})

		it("should revert if transaction doesn't exist", async() => {
			await expectRevert(this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2}), 'Transaction ID error')
		})

		it("should revert confirmation if transaction already executed", async() => {
			await web3.eth.sendTransaction({from:owner1, to:this.MultiSigWalletInstance.address, value:"2"})
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner3})
			await this.MultiSigWalletInstance.executeTransaction(0, {from: owner1})
			await expectRevert(this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2}), 'Transaction already executed')
		})

		it("should revert confirmation if owner has already confirmed same transaction", async() => {
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await expectRevert(this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2}), 'Owner has already confirmed this transaction')
		})

		it("should revert execute transaction if not enough confirmations", async() => {
			await web3.eth.sendTransaction({from:owner1, to:this.MultiSigWalletInstance.address, value:"2"})
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await expectRevert(this.MultiSigWalletInstance.executeTransaction(0, {from: owner1}), 'Unsufficient transaction confirmations')
		})

		it("should revert if transaction already executed", async() => {
			await web3.eth.sendTransaction({from:owner1, to:this.MultiSigWalletInstance.address, value:"2"})
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner3})
			await this.MultiSigWalletInstance.executeTransaction(0, {from: owner1})
			await expectRevert(this.MultiSigWalletInstance.executeTransaction(0, {from: owner1}), 'Transaction already executed')
		})

		it("should revert if transaction doesn't exists", async() => {
			await expectRevert(this.MultiSigWalletInstance.revokeTransaction(0, {from: owner1}), 'Transaction ID error')
		})

		it("should revert if transaction confirmations is 0", async() => {
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			await expectRevert(this.MultiSigWalletInstance.revokeTransaction(0, {from: owner1}), 'Confirmations already at 0')
		})
		
		it("should revert if transaction not confirmed", async() => {
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await expectRevert(this.MultiSigWalletInstance.revokeTransaction(0, {from: owner1}), 'Transaction not confirmed')
		})
	})
})