pragma solidity ^0.4.25;

// CAPITULO 6: Importar otro archivo Solidity.
import "./zombiefactory.sol";

// CAPITULOS 10-11: Interfaz externa.
// Describe la funcion getKitty de CryptoKitties.
contract KittyInterface {
    function getKitty(
        uint256 _id
    )
        external
        view
        returns (
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

// CAPITULO 5: Herencia.
// ZombieFeeding hereda los datos y funciones
// accesibles de ZombieFactory.
contract ZombieFeeding is ZombieFactory {
    // CAPITULO 11: Referencia a otro contrato.
    KittyInterface kittyContract;

    // CAPITULO 11: Configurar la direccion externa.
    // Esta funcion no tiene control de acceso en
    // el ejercicio original: no es segura en produccion.
    function setKittyContractAddress(address _address) public {
        kittyContract = KittyInterface(_address);
    }

    // CAPITULOS 7-9: Storage, ADN y funciones.
    // CAPITULO 13: Condicionales.
    function feedAndMultiply(uint _zombieId, uint _targetDna, string _species) public {
        // CAPITULO 4: Comprobar el propietario.
        require(msg.sender == zombieToOwner[_zombieId]);

        // CAPITULO 7: storage apunta al zombi
        // almacenado en el estado del contrato.
        Zombie storage myZombie = zombies[_zombieId];

        // CAPITULO 8: Normalizar el ADN del objetivo.
        _targetDna = _targetDna % dnaModulus;

        // Mezclar el ADN del zombi y del objetivo.
        uint newDna = (myZombie.dna + _targetDna) / 2;

        // CAPITULO 13: if
        // Si la especie es kitty, el ADN termina en 99.
        if (keccak256(abi.encodePacked(_species)) == keccak256(abi.encodePacked("kitty"))) {
            newDna = newDna - (newDna % 100) + 99;
        }

        // Crear un nuevo zombi con el ADN combinado.
        _createZombie("NoName", newDna);
    }

    // CAPITULO 12: Multiples valores de retorno.
    // Consulta el ADN del CryptoKitty y lo utiliza
    // para generar un nuevo zombi.
    function feedOnKitty(uint _zombieId, uint _kittyId) public {
        uint kittyDna;

        // getKitty devuelve diez valores.
        // Solo necesitamos el ultimo: genes.
        (, , , , , , , , , kittyDna) = kittyContract.getKitty(_kittyId);

        feedAndMultiply(_zombieId, kittyDna, "kitty");
    }
}
