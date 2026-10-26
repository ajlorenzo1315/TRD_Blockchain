pragma solidity ^0.4.25;

// LECCION 5 - CAPITULOS 1-2: interfaz de token no fungible; cada tokenId representa un zombi unico.
contract Lesson5ERC721 {
    // LECCION 5 - CAPITULO 2: evento que notifica cambios de propietario; indexed permite filtrar logs.
    event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId);
    // LECCION 5 - CAPITULO 2: evento que registra a quien se autoriza a transferir un token.
    event Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId);
    // LECCION 5 - CAPITULO 3: cantidad de zombis que posee una direccion.
    function balanceOf(address _owner) external view returns (uint256);
    // LECCION 5 - CAPITULO 3: obtiene el propietario de un tokenId.
    function ownerOf(uint256 _tokenId) external view returns (address);
    // LECCION 5 - CAPITULO 4: declara el mecanismo de transferencia; aqui no se implementa.
    function transferFrom(address _from, address _to, uint256 _tokenId) external payable;
    // LECCION 5 - CAPITULOS 6-7: declara la autorizacion de un tercero para transferir.
    function approve(address _approved, uint256 _tokenId) external payable;
}
