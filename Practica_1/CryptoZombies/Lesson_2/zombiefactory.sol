
pragma solidity ^0.4.25;

contract ZombieFactory {

    // LECCION 1 - CAPITULO 13: Eventos
    event NewZombie(uint zombieId, string name, uint dna);

    // LECCION 1: ADN y estructuras
    uint dnaDigits = 16;
    uint dnaModulus = 10 ** dnaDigits;

    struct Zombie {
        string name;
        uint dna;
    }

    Zombie[] public zombies;

    // LECCION 2 - CAPITULO 2: Mappings y direcciones
    // Relaciona el ID de un zombi con su propietario.
    mapping (uint => address) public zombieToOwner;

    // Guarda cuantos zombis tiene cada direccion.
    mapping (address => uint) ownerZombieCount;

    // LECCION 2 - CAPITULO 3: msg.sender
    // LECCION 2 - CAPITULO 5: Herencia
    // internal permite utilizar esta funcion desde
    // ZombieFeeding, que heredara de ZombieFactory.
    function _createZombie(string _name, uint _dna) internal {
        uint id = zombies.push(Zombie(_name, _dna)) - 1;

        // Asigna el zombi a quien ejecuta la transaccion.
        zombieToOwner[id] = msg.sender;
        ownerZombieCount[msg.sender]++;

        emit NewZombie(id, _name, _dna);
    }

    function _generateRandomDna(string _str)
        private view returns (uint)
    {
        uint rand = uint(keccak256(abi.encodePacked(_str)));
        return rand % dnaModulus;
    }

    // LECCION 2 - CAPITULO 4: require
    // Solo permite crear un zombi inicial por direccion.
    function createRandomZombie(string _name) public {
        require(ownerZombieCount[msg.sender] == 0);

        uint randDna = _generateRandomDna(_name);
        _createZombie(_name, randDna);
    }
}
