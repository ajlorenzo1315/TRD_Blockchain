// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

contract TokenContract {
    address public owner;
    //precio fijo por token
    uint256 public constant TOKEN_PRICE = 5 ether;

    // Eventos
    event TokensPurchased( address indexed buyer, uint256 amount);

    event TokensGifted(address indexed receiver,uint256 amount);

    struct Receivers {
        string name;
        uint256 tokens;
    }

    mapping(address => Receivers) public users;

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    constructor() {
        owner = msg.sender;
        users[owner].tokens = 100;
    }

    function double(uint _value) public pure returns (uint) {
        return _value * 2;
    }

    function register(string memory _name) public {
        users[msg.sender].name = _name;
    }

    // Transferencia interna
    function _transferTokens( address _receiver, uint256 _amount
    ) private {
        require(users[owner].tokens >= _amount,"No quedan suficientes tokens");

        users[owner].tokens -= _amount;
        users[_receiver].tokens += _amount;
    }

    function giveToken( address _receiver, uint256 _amount) public onlyOwner {
        _transferTokens(_receiver, _amount);

        emit TokensGifted( _receiver, _amount);
    }

    
    // comprar tokens con Ether
    function buyTokens(uint256 _amount) public payable {
        
        require( msg.value >= _amount * TOKEN_PRICE, "Ether insuficiente");

        require( users[owner].tokens >= _amount, "No quedan suficientes tokens");

        _transferTokens(msg.sender, _amount);

        emit TokensPurchased(msg.sender, _amount);
    }

    // Lee el estado, pero no lo modifica
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Evento 

    event TokensPurchased(address indexed buyer, uint256 amount);

}   
