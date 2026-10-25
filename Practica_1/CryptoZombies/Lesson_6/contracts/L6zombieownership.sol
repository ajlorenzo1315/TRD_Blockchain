// LECCION 6 - Capítulos 3, 4 y 9: ABI, propiedad y eventos
// Este archivo conserva las instrucciones Solidity del material proporcionado.
// Solo se renombran contratos, bibliotecas, interfaces e imports para evitar colisiones.
// En la leccion 6 la novedad principal es el frontend Web3.js; no un contrato nuevo.

pragma solidity ^0.4.25;

import "./L6zombieattack.sol";
import "./L6erc721.sol";
import "./L6safemath.sol";


// LECCION 6 - Arquitectura: componente desplegable o heredado por el contrato final.
contract Lesson6ZombieOwnership is Lesson6ZombieAttack, Lesson6ERC721 {

  // LECCION 6 - SafeMath permite .add() y .sub() sin desbordamientos.
  using Lesson6SafeMath for uint256;

  mapping (uint => address) zombieApprovals;

  // LECCION 6 - consulta cuantos tokens posee una cuenta (call).
  function balanceOf(address _owner) external view returns (uint256) {
    return ownerZombieCount[_owner];
  }

  // LECCION 6 - consulta el propietario de un token (call).
  function ownerOf(uint256 _tokenId) external view returns (address) {
    return zombieToOwner[_tokenId];
  }

  // LECCION 6 - actualiza balances y emite Transfer; revisar comportamiento de msg.sender.
  function _transfer(address _from, address _to, uint256 _tokenId) private {
    ownerZombieCount[_to] = ownerZombieCount[_to].add(1);
    ownerZombieCount[msg.sender] = ownerZombieCount[msg.sender].sub(1);
    zombieToOwner[_tokenId] = _to;
    emit Transfer(_from, _to, _tokenId);
  }

  // LECCION 6 - transfiere un token: cambia estado y emite Transfer.
  function transferFrom(address _from, address _to, uint256 _tokenId) external payable {
      require (zombieToOwner[_tokenId] == msg.sender || zombieApprovals[_tokenId] == msg.sender);
      _transfer(_from, _to, _tokenId);
    }

  // LECCION 6 - autoriza a otra cuenta para transferir un token.
  function approve(address _approved, uint256 _tokenId) external payable onlyOwnerOf(_tokenId) {
      zombieApprovals[_tokenId] = _approved;
      emit Approval(msg.sender, _approved, _tokenId);
    }

}
