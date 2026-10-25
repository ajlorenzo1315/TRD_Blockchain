pragma solidity ^0.4.25;

import "./L5zombieattack.sol";
import "./L5erc721.sol";
import "./L5safemath.sol";

// LECCION 5 - CAPITULO 2: contrato final que combina juego y ERC721 mediante herencia multiple.
contract Lesson5ZombieOwnership is Lesson5ZombieAttack, Lesson5ERC721 {

  // LECCION 5 - CAPITULO 10: operaciones seguras para balances ERC721.
  using Lesson5SafeMath for uint256;

  // LECCION 5 - CAPITULOS 6-7: autorizado por tokenId; el mapping no es publico.
  mapping (uint => address) zombieApprovals;

  // LECCION 5 - CAPITULO 3: devuelve el saldo ERC721 del propietario.
  function balanceOf(address _owner) external view returns (uint256) {
    return ownerZombieCount[_owner];
  }

  // LECCION 5 - CAPITULO 3: resuelve el tokenId al propietario del zombi.
  function ownerOf(uint256 _tokenId) external view returns (address) {
    return zombieToOwner[_tokenId];
  }

  // LECCION 5 - CAPITULOS 4-5: cambia saldos, propietario y emite Transfer. ATENCION: el original resta a msg.sender y no a _from.
  function _transfer(address _from, address _to, uint256 _tokenId) private {
    // LECCION 5 - CAPITULO 10: incrementa con SafeMath el balance del receptor.
    ownerZombieCount[_to] = ownerZombieCount[_to].add(1);
    // LECCION 5 - CAPITULO 10: el original resta al emisor de la llamada; un tercero aprobado puede causar revert.
    ownerZombieCount[msg.sender] = ownerZombieCount[msg.sender].sub(1);
    // LECCION 5 - CAPITULO 4: actualiza el propietario real del tokenId.
    zombieToOwner[_tokenId] = _to;
    // LECCION 5 - CAPITULO 5: notifica el movimiento para indexadores y frontends.
    emit Transfer(_from, _to, _tokenId);
  }

  // LECCION 5 - CAPITULO 5: propietario o aprobado puede invocar; el original NO verifica que _from sea el dueno real.
  function transferFrom(address _from, address _to, uint256 _tokenId) external payable {
    // LECCION 5 - CAPITULO 5: comprueba propietario o aprobado, pero no valida el parametro _from.
    require (zombieToOwner[_tokenId] == msg.sender || zombieApprovals[_tokenId] == msg.sender);
    _transfer(_from, _to, _tokenId);
  }

   // LECCION 5 - CAPITULO 7: solo el propietario aprueba a un tercero para un token.
   function approve(address _approved, uint256 _tokenId) external payable onlyOwnerOf(_tokenId) {
    // LECCION 5 - CAPITULO 7: almacena el permiso del token especifico.
    zombieApprovals[_tokenId] = _approved;
    // LECCION 5 - CAPITULO 7: registra la autorizacion.
    emit Approval(msg.sender, _approved, _tokenId);
   }

}
