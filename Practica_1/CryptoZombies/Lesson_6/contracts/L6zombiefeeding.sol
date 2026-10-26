pragma solidity ^0.4.25;

import "./L6zombiefactory.sol";

// LECCION 2: interfaz para consultar ADN de un CryptoKitty externo.
contract Lesson6KittyInterface {
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

// LECCIONES 2 Y 4: alimentacion y reproduccion con comprobacion de propiedad y cooldown.
contract Lesson6ZombieFeeding is Lesson6ZombieFactory {
    // LECCION 2: referencia a contrato externo de gatos.
    Lesson6KittyInterface kittyContract;

    // LECCION 4: comprueba propiedad del zombi; distinto de onlyOwner, que protege la administracion.
    modifier onlyOwnerOf(uint _zombieId) {
        require(msg.sender == zombieToOwner[_zombieId]);
        _;
    }

    // LECCION 2: solo el administrador configura la direccion de CryptoKitties.
    function setKittyContractAddress(address _address) external onlyOwner {
        kittyContract = Lesson6KittyInterface(_address);
    }

    // LECCION 4: actualiza readyTime al momento actual mas un dia.
    function _triggerCooldown(Zombie storage _zombie) internal {
        _zombie.readyTime = uint32(now + cooldownTime);
    }

    // LECCION 4: devuelve true si ya se puede reproducir.
    function _isReady(Zombie storage _zombie) internal view returns (bool) {
        return (_zombie.readyTime <= now);
    }

    // LECCION 4: exige ser propietario y que el cooldown haya terminado antes de crear descendencia.
    function feedAndMultiply(
        uint _zombieId,
        uint _targetDna,
        string _species
    ) internal onlyOwnerOf(_zombieId) {
        Zombie storage myZombie = zombies[_zombieId];
        require(_isReady(myZombie));
        _targetDna = _targetDna % dnaModulus;
        uint newDna = (myZombie.dna + _targetDna) / 2;
        if (keccak256(abi.encodePacked(_species)) == keccak256(abi.encodePacked("kitty"))) {
            newDna = newDna - (newDna % 100) + 99;
        }
        _createZombie("NoName", newDna);
        _triggerCooldown(myZombie);
    }

    // LECCION 2: consulta el ADN del gato y delega la reproduccion.
    function feedOnKitty(uint _zombieId, uint _kittyId) public {
        uint kittyDna;
        (, , , , , , , , , kittyDna) = kittyContract.getKitty(_kittyId);
        feedAndMultiply(_zombieId, kittyDna, "kitty");
    }
}
