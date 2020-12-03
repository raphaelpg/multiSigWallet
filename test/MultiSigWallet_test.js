const { expect } = require('chai')
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const MultiSigWallet = artifacts.require("MultiSigWallet")

contract("MultiSigWallet", async (accounts) => {
	const [owner1, owner2, owner3] = accounts
	const owners = accounts.splice(0, 3)
	const receiver = accounts[0]
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
		})

		it("add, confirmn execute transaction", async() => {
			await web3.eth.sendTransaction({from:owner1, to:this.MultiSigWalletInstance.address, value:"2"})
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner3})
			await this.MultiSigWalletInstance.executeTransaction(0, {from: owner1})
		})

		it("should revert execute transaction if not confirmed", async() => {
			await web3.eth.sendTransaction({from:owner1, to:this.MultiSigWalletInstance.address, value:"2"})
			await this.MultiSigWalletInstance.addTransaction(receiver, 1, {from: owner1})
			await this.MultiSigWalletInstance.confirmTransaction(0, {from: owner2})
			await expectRevert(this.MultiSigWalletInstance.executeTransaction(0, {from: owner1}), 'Unsufficient transaction confirmations')
		})
	})
})