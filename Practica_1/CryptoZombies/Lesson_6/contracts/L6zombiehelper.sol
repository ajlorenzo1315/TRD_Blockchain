pragma solidity ^0.4.25;

import "./L6zombiefeeding.sol";

// LECCIONES 3-5: hereda utilidades de niveles, cambios de ADN/nombre y pagos.
contract Lesson6ZombieHelper is Lesson5ZombieFeeding {
    // LECCION 4: precio por subir de nivel, expresado en ether.
    uint levelUpFee = 0.001 ether;

    // LECCION 3: verifica el nivel minimo exigido.
    modifier aboveLevel(uint _level, uint _zombieId) {
        require(zombies[_zombieId].level >= _level);
        _;
    }

    // LECCION 4: solo el administrador retira el saldo del contrato.
    function withdraw() external onlyOwner {
        address _owner = owner();
        _owner.transfer(address(this).balance);
    }

    // LECCION 4: tarifa configurable por el administrador.
    function setLevelUpFee(uint _fee) external onlyOwner {
        levelUpFee = _fee;
    }

    // LECCION 5 - CAPITULO 12: subida de nivel con .add(1) de SafeMath32; la funcion original no exige propiedad.
    function levelUp(uint _zombieId) external payable {
        require(msg.value == levelUpFee);
        // LECCION 5 - CAPITULO 12: incremento seguro de uint32.
        zombies[_zombieId].level = zombies[_zombieId].level.add(1);
    }

    // LECCION 3: exige nivel 2 y propiedad del zombi.
    function changeName(
        uint _zombieId,
        string _newName
    ) external aboveLevel(2, _zombieId) onlyOwnerOf(_zombieId) {
        zombies[_zombieId].name = _newName;
    }

    // LECCION 3: exige nivel 20 y propiedad del zombi.
    function changeDna(
        uint _zombieId,
        uint _newDna
    ) external aboveLevel(20, _zombieId) onlyOwnerOf(_zombieId) {
        zombies[_zombieId].dna = _newDna;
    }

    // LECCION 3: enumera indices de zombis asociados al propietario actual; tras transferir debe reflejar el cambio.
    function getZombiesByOwner(address _owner) external view returns (uint[]) {
        uint[] memory result = new uint[](ownerZombieCount[_owner]);
        uint counter = 0;
        for (uint i = 0; i < zombies.length; i++) {
            if (zombieToOwner[i] == _owner) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }
}
