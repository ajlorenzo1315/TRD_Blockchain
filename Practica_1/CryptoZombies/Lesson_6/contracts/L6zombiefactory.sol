pragma solidity ^0.4.25;

import "./L6ownable.sol";
import "./L6safemath.sol";

// LECCIONES 1-5: fabrica base que conserva el estado de zombis y hereda el control administrativo.
contract Lesson6ZombieFactory is Lesson6Ownable {
    // LECCION 5 - CAPITULO 10: permite escribir numero.add(1) para uint256.
    using Lesson6SafeMath for uint256;
    // LECCION 5 - CAPITULO 11: habilita operaciones seguras para uint32.
    using Lesson6SafeMath32 for uint32;
    // LECCION 5 - CAPITULO 11: habilita operaciones seguras para uint16.
    using Lesson6SafeMath16 for uint16;

    // LECCION 1: evento emitido cada vez que se crea un zombi.
    event NewZombie(uint zombieId, string name, uint dna);

    // LECCION 1: longitud del ADN representado como numero.
    uint dnaDigits = 16;
    uint dnaModulus = 10 ** dnaDigits;
    // LECCION 4: tiempo de espera entre acciones de reproduccion.
    uint cooldownTime = 1 days;

    // LECCIONES 1-4: estructura con ADN, nivel, cooldown y estadisticas.
    struct Zombie {
        string name;
        uint dna;
        uint32 level;
        uint32 readyTime;
        uint16 winCount;
        uint16 lossCount;
    }

    // LECCION 1: coleccion persistente de zombis; el indice es el tokenId de ERC721.
    Zombie[] public zombies;

    // LECCION 2: asociacion tokenId -> propietario.
    mapping(uint => address) public zombieToOwner;
    // LECCION 5 - CAPITULO 3: saldo ERC721; debe coincidir con los zombis asignados a cada direccion.
    mapping(address => uint) ownerZombieCount;

    // LECCION 5 - CAPITULO 11: alta del zombi y actualizacion segura del saldo del creador.
    function _createZombie(string _name, uint _dna) internal {
        uint id = zombies.push(Zombie(_name, _dna, 1, uint32(now + cooldownTime), 0, 0)) - 1;
        zombieToOwner[id] = msg.sender;
        // LECCION 5 - CAPITULO 11: SafeMath impide desbordamiento del contador de propiedad.
        ownerZombieCount[msg.sender] = ownerZombieCount[msg.sender].add(1);
        emit NewZombie(id, _name, _dna);
    }

    // LECCION 1: ADN derivado del nombre; no es aleatoriedad criptografica.
    function _generateRandomDna(string _str) private view returns (uint) {
        uint rand = uint(keccak256(abi.encodePacked(_str)));
        return rand % dnaModulus;
    }

    // LECCION 2: permite un primer zombi por cuenta; requiere balance inicial cero.
    function createRandomZombie(string _name) public {
        // LECCION 5 - CAPITULO 11: SafeMath impide desbordamiento del contador de propiedad.
        require(ownerZombieCount[msg.sender] == 0);
        uint randDna = _generateRandomDna(_name);
        randDna = randDna - (randDna % 100);
        _createZombie(_name, randDna);
    }
}
