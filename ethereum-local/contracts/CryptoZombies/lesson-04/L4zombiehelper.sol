pragma solidity ^0.4.25;

// LECCION 2 - CAPITULO 5: Herencia
// Importamos Lesson4ZombieFeeding, que tambien hereda
// de Lesson4ZombieFactory y Lesson4Ownable.
import "./L4zombiefeeding.sol";

contract Lesson4ZombieHelper is Lesson4ZombieFeeding {
    // LECCION 4 - CAPITULO 1: Funciones payable
    // Precio inicial para aumentar un nivel.
    //
    // 0.001 ether equivale a 10^15 wei.
    // Solidity utiliza wei para representar pagos.
    uint levelUpFee = 0.001 ether;

    // LECCION 3: Modificadores
    // Comprueba que el zombi tenga un nivel minimo.
    //
    // LECCION 2 - CAPITULO 4: require
    // Si no alcanza el nivel, la operacion revierte.
    modifier aboveLevel(uint _level, uint _zombieId) {
        require(zombies[_zombieId].level >= _level);
        _;
    }

    // LECCION 4 - CAPITULO 2: Withdraws
    // Permite retirar el ETH acumulado.
    //
    // onlyOwner impide que cualquier usuario
    // retire el dinero del contrato.
    function withdraw() external onlyOwner {
        // LECCION 3: Lesson4Ownable
        // Consulta quien administra el contrato.
        address _owner = owner();

        // LECCION 4: Transferencia de Ether
        // address(this).balance es el saldo
        // total del contrato inteligente.
        //
        // transfer envia el saldo al administrador.
        _owner.transfer(address(this).balance);
    }

    // LECCION 4 - CAPITULO 2: Configuracion de tarifas
    // Permite modificar el precio de subir de nivel.
    //
    // _fee se expresa en wei.
    // Solo el administrador puede cambiarlo.
    function setLevelUpFee(uint _fee) external onlyOwner {
        levelUpFee = _fee;
    }

    // LECCION 4 - CAPITULO 1: Funciones payable
    // payable permite recibir ETH.
    //
    // msg.value contiene la cantidad enviada
    // junto con la transaccion.
    function levelUp(uint _zombieId) external payable {
        // El pago debe coincidir exactamente
        // con la tarifa configurada.
        require(msg.value == levelUpFee);

        // LECCION 3: Niveles
        // Incrementa el nivel del zombi en una unidad.
        zombies[_zombieId].level++;
    }

    // LECCION 3: Modificador aboveLevel
    // Requiere nivel 2 o superior.
    //
    // LECCION 4: Modificador ownerOf
    // Reutiliza la comprobacion de propiedad
    // definida en Lesson4ZombieFeeding.
    function changeName(
        uint _zombieId,
        string _newName
    ) external aboveLevel(2, _zombieId) ownerOf(_zombieId) {
        // Modifica el nombre almacenado.
        zombies[_zombieId].name = _newName;
    }

    // LECCION 3: Modificacion del ADN
    // Requiere nivel 20 o superior.
    //
    // LECCION 4: Reutilizacion de ownerOf
    // Solo el propietario puede cambiar el ADN.
    function changeDna(
        uint _zombieId,
        uint _newDna
    ) external aboveLevel(20, _zombieId) ownerOf(_zombieId) {
        zombies[_zombieId].dna = _newDna;
    }

    // LECCION 3: Funciones view y arrays en memoria
    // Devuelve los IDs de los zombis
    // pertenecientes a una direccion.
    function getZombiesByOwner(address _owner) external view returns (uint[]) {
        // memory crea un array temporal.
        // Su longitud coincide con el numero
        // de zombis que tiene el propietario.
        uint[] memory result = new uint[](ownerZombieCount[_owner]);

        // Contador de elementos encontrados.
        uint counter = 0;

        // LECCION 1: Bucles for
        // Recorre todos los zombis almacenados.
        for (uint i = 0; i < zombies.length; i++) {
            // LECCION 2: Mappings
            // Comprueba el propietario de cada zombi.
            if (zombieToOwner[i] == _owner) {
                // Guarda el ID del zombi.
                result[counter] = i;

                // Avanza la posicion del resultado.
                counter++;
            }
        }

        // Devuelve los identificadores encontrados.
        return result;
    }
}
