pragma solidity ^0.4.25;

import "./L3zombiefactory.sol";


/**
 * Interfaz externa de CryptoKitties.
 *
 * Declara exclusivamente la funcion necesaria
 * para consultar los genes de un CryptoKitty.
 */

contract Lesson3KittyInterface  {
  function getKitty(uint256 _id) external view returns (
    bool isGestating,
    bool isReady,
    uint256 cooldownIndex,
    uint256 nextActionAt,
    uint256 siringWithId,
    uint256 birthTime,
    uint256 matronId,
    uint256 sireId,
    uint256 generation,
    uint256 genes
  );
}

/**
 * CryptoZombies - Leccion 3
 *
 * ZombieFeeding:
 * - Configura el contrato CryptoKitties.
 * - Combina ADN para generar descendientes.
 * - Aplica el sufijo genetico 99 a los kitty.
 */
 
contract Lesson3ZombieFeeding  is Lesson3ZombieFactory {

  Lesson3KittyInterface kittyContract;

  function setKittyContractAddress(address _address) external onlyOwner {
    kittyContract = Lesson3KittyInterface(_address);
  }

  function feedAndMultiply(uint _zombieId, uint _targetDna, string _species) public {
    require(msg.sender == zombieToOwner[_zombieId]);
    Zombie storage myZombie = zombies[_zombieId];
    _targetDna = _targetDna % dnaModulus;
    uint newDna = (myZombie.dna + _targetDna) / 2;
    if (keccak256(abi.encodePacked(_species)) == keccak256(abi.encodePacked("kitty"))) {
      newDna = newDna - newDna % 100 + 99;
    }
    _createZombie("NoName", newDna);
  }

  function feedOnKitty(uint _zombieId, uint _kittyId) public {
    uint kittyDna;
    (,,,,,,,,,kittyDna) = kittyContract.getKitty(_kittyId);
    feedAndMultiply(_zombieId, kittyDna, "kitty");
  }

}