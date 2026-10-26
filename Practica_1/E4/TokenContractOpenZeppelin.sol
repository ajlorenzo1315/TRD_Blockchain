// SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.8.30;
//REMIX
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract TokenContractOpenZeppelin is ERC20, Ownable {

    uint256 public constant TOKEN_PRICE = 5 ether;

    event TokensPurchased(address indexed buyer, uint256 amount);
    event TokensGifted(address indexed receiver, uint256 amount);

    struct Receivers {
        string name;
    }

    mapping(address => Receivers) public users;

    function getUser(address _user) public view returns (string memory name, uint256 tokens) {
    return ( 
        users[_user].name, 
        balanceOf(_user) /  1 ether;
    );
    }

    constructor()
        ERC20("Token Practica", "TPR")
        Ownable(msg.sender)
    {
        _mint(msg.sender, 100 * 10 ** decimals());
    }

    function double(uint256 _value) public pure returns (uint256)
    {
        return _value * 2;
    }

    function register(string memory _name) public {
        users[msg.sender].name = _name;
    }

    function _transferTokens(address _receiver, uint256 _amount) private {
        require(_amount > 0, "Cantidad invalida");
        require(_receiver != address(0), "Direccion invalida");

        uint256 units = _amount * 10 ** decimals();

        require( balanceOf(owner()) >= units, "No quedan suficientes tokens");

        //OpenZeppelin actualiza automáticamente los saldos del propietario y del receptor.
        _transfer(owner(), _receiver, units);
    }

    function giveToken( address _receiver, uint256 _amount) public onlyOwner {
        _transferTokens(_receiver, _amount);
        emit TokensGifted(_receiver, _amount);
    }

    function buyTokens(uint256 _amount) public payable {
        require(_amount > 0, "Cantidad invalida");

        require(
            msg.value == _amount * TOKEN_PRICE,
            "Ether incorrecto"
        );

        _transferTokens(msg.sender, _amount);
        emit TokensPurchased(msg.sender, _amount);
    }

    function getContractBalance() public view returns (uint256)
    {
        return address(this).balance;
    }

    function getMyTokens() public view returns (uint256)
    {
        return balanceOf(msg.sender)  / 1 ether;
    }

    // Equivalente al antiguo users[address].tokens
    // OpenZeppelin ERC-20, los saldos de los tokens ya se gestionan automáticamente mediante balanceOf(). 
    function getUserTokens(address _user) public view returns (uint256)
    {   
        // La división por 10 ** decimals() convierte las unidades mínimas en tokens enteros.
        // Ya no necesitas users[_receiver].tokens para conocer el saldo.
        // Contrato original 10 tokens → 10
        // OpenZeppelin 10 tokens → 10000000000000000000
        // OpenZeppelin ERC-20 utiliza 18 decimales. Por eso, 5 TPR aparecen como 5000000000000000000 en balanceOf().
        return balanceOf(_user) / 1 ether;

    }
}