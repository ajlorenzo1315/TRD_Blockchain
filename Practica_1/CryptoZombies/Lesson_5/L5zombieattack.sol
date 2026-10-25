pragma solidity ^0.4.25;

import "./L5zombiehelper.sol";

// LECCION 5 - CAPITULO 12: mantiene los combates y sustituye los incrementos por SafeMath.
contract Lesson5ZombieAttack is Lesson5ZombieHelper {
  // LECCION 4: contador usado para variar el hash de resultados pseudoaleatorios.
  uint randNonce = 0;
  // LECCION 4: umbral de victoria; con <= 70 hay 71 resultados ganadores entre 0 y 99.
  uint attackVictoryProbability = 70;

  // LECCION 5 - CAPITULO 12: incrementa randNonce con SafeMath; la aleatoriedad sigue siendo predecible.
  function randMod(uint _modulus) internal returns(uint) {
    randNonce = randNonce.add(1);
    return uint(keccak256(abi.encodePacked(now, msg.sender, randNonce))) % _modulus;
  }

  // LECCION 5 - CAPITULO 12: protege las estadisticas y el nivel frente a desbordamientos.
  function attack(uint _zombieId, uint _targetId) external onlyOwnerOf(_zombieId) {
    Zombie storage myZombie = zombies[_zombieId];
    Zombie storage enemyZombie = zombies[_targetId];
    uint rand = randMod(100);
    // LECCION 4: victoria: suma victoria/nivel, registra derrota rival y genera descendencia si cooldown lo permite.
    if (rand <= attackVictoryProbability) {
      myZombie.winCount = myZombie.winCount.add(1);
      myZombie.level = myZombie.level.add(1);
      enemyZombie.lossCount = enemyZombie.lossCount.add(1);
      feedAndMultiply(_zombieId, enemyZombie.dna, "zombie");
    // LECCION 4: derrota: actualiza marcadores y reinicia cooldown del atacante.
    } else {
      myZombie.lossCount = myZombie.lossCount.add(1);
      enemyZombie.winCount = myZombie.winCount.add(1);
      _triggerCooldown(myZombie);
    }
  }
}
