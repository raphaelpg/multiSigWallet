// Multi sig wallet smart contract
pragma solidity >=0.6.0;

contract MultiSigWallet {
	event deposit(address sender, uint value);
	event transactionAdded(address owner, uint txID, address receiver, uint amount, string);
	event transactionConfirmation(address owner, uint txID, string);
	event transactionExecuted(address owner, uint txID, address receiver, uint amount, string);
	event transactionRevoked(address owner, uint txID, string);

	address[] public owners;
	uint public minimumConfirmations;

	struct Transaction {
		address receiver;
		uint value;
		bool executed;
		mapping(address => bool) confirmed;
		uint confirmations;
	}

	Transaction[] public pendingTransactions;
	mapping(address => bool) public isOwner;
	
	constructor (address[] memory _owners, uint _minimumConfirmations) public {
		require(_owners.length <= 3, 'Too many owners');
		require(_owners.length > 0, 'Invalid owners number');
		require(_minimumConfirmations <= _owners.length, 'Invalid minimumConfirmations value');
		require(_minimumConfirmations > 0, 'Invalid minimumConfirmations value');

		for(uint i = 0; i<_owners.length; i++){
			require(_owners[i] != address(0));
			require(!isOwner[_owners[i]], 'owner already exists');

			isOwner[_owners[i]] = true;
			owners.push(_owners[i]);
		}
		minimumConfirmations = _minimumConfirmations;
	}
	
	modifier onlyOwner() {
		require(isOwner[msg.sender], "onwer only");
		_;
	}

	receive() payable external {
		emit deposit(msg.sender, msg.value);
	}

	function getOwners() public view returns(address[] memory) {
		return owners;
	}

	function getTransactionsCount() public view returns(uint) {
		return pendingTransactions.length;
	}

	function addTransaction(address payable _receiver, uint _value) public onlyOwner {
		require(_receiver != address(0), "Address 0");
		
		uint txID = pendingTransactions.length;
		
		pendingTransactions.push(Transaction({
			receiver: _receiver,
			value: _value,
			executed: false,
			confirmations: 0
		}));

		emit transactionAdded(msg.sender, txID, _receiver, _value, "New transaction added");
	}

	function confirmTransaction(uint _txID) public onlyOwner {
		require(_txID < pendingTransactions.length, "Transaction ID error");

		Transaction storage thisTransaction = pendingTransactions[_txID];
		require(!thisTransaction.executed, 'Transaction already executed');
		require(!thisTransaction.confirmed[msg.sender], 'Owner has already confirmed this transaction');

		thisTransaction.confirmed[msg.sender] = true;
		thisTransaction.confirmations += 1;
		
		emit transactionConfirmation(msg.sender, _txID, "Transaction confirmed");
	}

	function executeTransaction(uint _txID) public onlyOwner {
		require(pendingTransactions[_txID].confirmations >= 2, 'Unsufficient transaction confirmations');

		Transaction storage thisTransaction = pendingTransactions[_txID];

		require(!thisTransaction.executed, 'Transaction already executed');
		thisTransaction.executed = true;
		(bool success, ) = thisTransaction.receiver.call.value(thisTransaction.value)('');
		require(success, "Transaction failed");
	
		emit transactionExecuted(msg.sender, _txID, thisTransaction.receiver, thisTransaction.value, "Transaction executed");
	}

	function revokeTransaction(uint _txID) public onlyOwner {
		require(_txID < pendingTransactions.length, "Transaction ID error");

		Transaction storage thisTransaction = pendingTransactions[_txID];
		require(!thisTransaction.executed, 'Transaction already executed');
		require(thisTransaction.confirmed[msg.sender], 'Transaction already revoked');
		require(thisTransaction.confirmations > 0, "Confirmations already at 0");

		thisTransaction.confirmed[msg.sender] = false;
		thisTransaction.confirmations -= 1;
		
		emit transactionRevoked(msg.sender, _txID, "Transaction revoked");	
	}
}