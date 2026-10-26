pragma solidity ^0.4.25;

// LECCION 2 - CAPITULO 5: Herencia
// Importamos Ownable para reutilizar
// sus permisos administrativos.
import "./L4ownable.sol";

contract ZombieFactory is Ownable {
    // LECCION 1 - CAPITULO 13: Eventos
    // Notifica la creacion de un nuevo zombi.
    event NewZombie(uint zombieId, string name, uint dna);

    // LECCION 1: ADN y operaciones aritmeticas
    // Cada zombi tiene un ADN de hasta 16 digitos.
    uint dnaDigits = 16;
    uint dnaModulus = 10 ** dnaDigits;

    // LECCION 3: Unidades de tiempo
    // 1 days equivale a 86400 segundos.
    uint cooldownTime = 1 days;

    // LECCION 1: Estructuras
    // Agrupamos los atributos de cada zombi.
    struct Zombie {
        // LECCION 1: Nombre y ADN.
        string name;
        uint dna;
        // LECCION 3: Niveles y tiempo de espera.
        uint32 level;
        uint32 readyTime;
        // LECCION 4: Estadisticas de combate.
        // winCount cuenta victorias.
        // lossCount cuenta derrotas.
        //
        // uint16 permite representar valores
        // enteros sin signo de 16 bits.
        uint16 winCount;
        uint16 lossCount;
    }

    // LECCION 1: Arrays dinamicos
    // Guarda todos los zombis creados.
    //
    // public genera una funcion de lectura
    // para consultar cada elemento por su ID.
    Zombie[] public zombies;

    // LECCION 2 - CAPITULO 2: Mappings y direcciones
    // Relaciona el ID del zombi con su propietario.
    mapping(uint => address) public zombieToOwner;

    // Guarda cuantos zombis tiene cada direccion.
    mapping(address => uint) ownerZombieCount;

    // LECCION 2 - CAPITULO 3: msg.sender
    // LECCION 2 - CAPITULO 5: Herencia
    //
    // internal permite que ZombieFeeding
    // y los demas contratos derivados creen zombis.
    function _createZombie(string _name, uint _dna) internal {
        // LECCION 1: Arrays y estructuras
        // push inserta un nuevo zombi.
        //
        // LECCION 3:
        // El nivel inicial es 1.
        // readyTime se calcula con now + cooldownTime.
        //
        // LECCION 4:
        // Las victorias y derrotas empiezan en cero.
        //
        // push devuelve la nueva longitud.
        // Restamos 1 para obtener el indice del zombi.
        uint id = zombies.push(Zombie(_name, _dna, 1, uint32(now + cooldownTime), 0, 0)) - 1;

        // LECCION 2: Propiedad de zombis
        // Asigna el zombi al remitente.
        zombieToOwner[id] = msg.sender;

        // Incrementa el numero de zombis del usuario.
        ownerZombieCount[msg.sender]++;

        // LECCION 1 - CAPITULO 13: Eventos
        emit NewZombie(id, _name, _dna);
    }

    // LECCION 1: Funciones y keccak256
    //
    // keccak256 calcula un hash de la cadena.
    // abi.encodePacked prepara los datos.
    // uint convierte el hash a entero.
    //
    // El modulo limita el ADN a 16 digitos.
    //
    // IMPORTANTE:
    // No es una fuente de aleatoriedad segura.
    function _generateRandomDna(string _str) private view returns (uint) {
        uint rand = uint(keccak256(abi.encodePacked(_str)));
        return rand % dnaModulus;
    }

    // LECCION 2 - CAPITULO 4: require
    // Solo permite crear un zombi inicial por cuenta.
    function createRandomZombie(string _name) public {
        // Si ya tiene zombis, la transaccion revierte.
        require(ownerZombieCount[msg.sender] == 0);

        // LECCION 1: Generacion del ADN.
        uint randDna = _generateRandomDna(_name);

        // LECCION 3: Diferenciacion genetica
        // Los zombis iniciales terminan en 00.
        //
        // Ejemplo:
        // 1234567890123456 -> 1234567890123400
        randDna = randDna - (randDna % 100);

        // Crea el zombi y registra su propietario.
        _createZombie(_name, randDna);
    }
}
