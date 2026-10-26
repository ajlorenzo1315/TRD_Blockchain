// LECCION 6 - Capítulo 7: transacciones que modifican estado
// Este archivo conserva las instrucciones Solidity del material proporcionado.
// Solo se renombran contratos, bibliotecas, interfaces e imports para evitar colisiones.
// En la leccion 6 la novedad principal es el frontend Web3.js; no un contrato nuevo.

pragma solidity ^0.4.25;

import "./L6zombiehelper.sol";

// LECCION 5 - CAPITULO 12: mantiene los combates y sustituye los incrementos por SafeMath.
contract Lesson6ZombieAttack is Lesson6ZombieHelper {
    // LECCION 4: contador usado para variar el hash de resultados pseudoaleatorios.
    uint randNonce = 0;
    // LECCION 4: umbral de victoria; con <= 70 hay 71 resultados ganadores entre 0 y 99.
    uint attackVictoryProbability = 70;

    // LECCION 5 - CAPITULO 12: incrementa randNonce con SafeMath; la aleatoriedad sigue siendo predecible.
    function randMod(uint _modulus) internal returns (uint) {
        randNonce = randNonce.add(1);
        return uint(keccak256(abi.encodePacked(now, msg.sender, randNonce))) % _modulus;
    }

    // LECCION 6 - modifica estado: debe enviarse una transaccion.
    function attack(uint _zombieId, uint _targetId) external onlyOwnerOf(_zombieId) {
        Zombie storage myZombie = zombies[_zombieId];
        Zombie storage enemyZombie = zombies[_targetId];
        uint rand = randMod(100);
        if (rand <= attackVictoryProbability) {
            myZombie.winCount = myZombie.winCount.add(1);
            myZombie.level = myZombie.level.add(1);
            enemyZombie.lossCount = enemyZombie.lossCount.add(1);
            feedAndMultiply(_zombieId, enemyZombie.dna, "zombie");
        } else {
            myZombie.lossCount = myZombie.lossCount.add(1);
            enemyZombie.winCount = enemyZombie.winCount.add(1);
            _triggerCooldown(myZombie);
        }
    }
}
