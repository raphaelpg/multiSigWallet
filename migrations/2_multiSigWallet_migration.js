const MultiSigWallet = artifacts.require("MultiSigWallet");

module.exports = function(deployer, networks, accounts) {
	const owners = accounts.splice(0, 3);
  deployer.deploy(MultiSigWallet, owners, 2);
};
