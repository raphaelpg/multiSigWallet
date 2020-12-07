MultiSigWallet smart contract where number of owners and minimum confirmations can be set in the contract deployment.

constructor (address[] memory _owners, uint _minimumConfirmations)

Owners input has to be an array
_minimumConfirmations <= _owners.length