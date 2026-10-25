pragma solidity ^0.4.25;

// LECCION 2 - CAPITULO 5: Herencia
// Importamos la fabrica de zombis.
import "./L4zombiefactory.sol";

// LECCION 2: Interfaces con otros contratos
// Esta interfaz permite consultar datos
// de un CryptoKitty sin implementar su contrato.
contract Lesson4KittyInterface {

    // LECCION 2: Funciones externas
    // external: se invoca desde otro contrato.
    // view: consulta datos sin modificarlos.
    //
    // Se devuelven diez valores.
    // El ultimo contiene los genes del gato.
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

// LECCION 2: Herencia
// Lesson4ZombieFeeding obtiene las funciones y
// variables de Lesson4ZombieFactory y Lesson4Ownable.
contract Lesson4ZombieFeeding is Lesson4ZombieFactory {

    // LECCION 2: Referencias a contratos externos
    // Almacena la interfaz del contrato CryptoKitties.
    Lesson4KittyInterface kittyContract;

    // LECCION 4: Refactorizacion de permisos
    // Este modificador centraliza la comprobacion
    // de propiedad de un zombi.
    //
    // Se puede reutilizar en feedAndMultiply,
    // changeName, changeDna y attack.
    modifier ownerOf(uint _zombieId) {
        require(msg.sender == zombieToOwner[_zombieId]);
        _;
    }

    // LECCION 3: Lesson4Ownable y onlyOwner
    // Solo el administrador puede configurar
    // la direccion del contrato CryptoKitties.
    function setKittyContractAddress(address _address) external onlyOwner {
        kittyContract = Lesson4KittyInterface(_address);
    }

    // LECCION 4: Cooldown
    // Reinicia el tiempo de espera de un zombi.
    //
    // storage significa que se modifica el zombi
    // almacenado permanentemente en la blockchain.
    //
    // now representa el timestamp del bloque.
    function _triggerCooldown(Zombie storage _zombie) internal {
        _zombie.readyTime = uint32(now + cooldownTime);
    }

    // LECCION 4: Comprobacion del cooldown
    // Devuelve true si el zombi ya puede actuar.
    //
    // view indica que no modifica el estado.
    function _isReady(Zombie storage _zombie) internal view returns (bool) {
        return (_zombie.readyTime <= now);
    }

    // LECCION 2: Reproduccion mediante ADN
    //
    // LECCION 4:
    // La funcion pasa a ser internal.
    // Usa el modificador ownerOf.
    // Comprueba el cooldown antes de reproducirse.
    function feedAndMultiply(
        uint _zombieId,
        uint _targetDna,
        string _species
    ) internal ownerOf(_zombieId) {

        // LECCION 1: Structs
        // storage evita crear una copia independiente.
        Zombie storage myZombie = zombies[_zombieId];

        // LECCION 4: Cooldown
        // Si el zombi no esta preparado, revierte.
        require(_isReady(myZombie));

        // LECCION 1: Operador modulo
        // Limita el ADN objetivo a 16 digitos.
        _targetDna = _targetDna % dnaModulus;

        // LECCION 2: Mezcla de ADN
        // Calcula la media entera de ambos ADN.
        uint newDna = (myZombie.dna + _targetDna) / 2;

        // LECCION 2: Comparacion de cadenas
        // Compara los hashes de las especies.
        //
        // Si es kitty, los ultimos dos digitos
        // del descendiente pasan a ser 99.
        if (
            keccak256(abi.encodePacked(_species)) ==
            keccak256(abi.encodePacked("kitty"))
        ) {
            newDna = newDna - newDna % 100 + 99;
        }

        // LECCION 2: Creacion del descendiente
        // El descendiente pertenece al remitente.
        _createZombie("NoName", newDna);

        // LECCION 4: Cooldown
        // Despues de reproducirse, el progenitor
        // debe esperar antes de volver a hacerlo.
        _triggerCooldown(myZombie);
    }

    // LECCION 2: Interaccion con CryptoKitties
    // Obtiene el ADN del gato y lo utiliza
    // para generar un nuevo zombi.
    function feedOnKitty(uint _zombieId, uint _kittyId) public {

        uint kittyDna;

        // Ignora los primeros nueve resultados.
        // Guarda el decimo: genes.
        (,,,,,,,,,kittyDna) = kittyContract.getKitty(_kittyId);

        // LECCION 4:
        // Esta llamada comprueba la propiedad
        // y el cooldown mediante feedAndMultiply.
        feedAndMultiply(_zombieId, kittyDna, "kitty");
    }
}
