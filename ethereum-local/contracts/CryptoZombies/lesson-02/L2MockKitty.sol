pragma solidity ^0.4.25;

contract Lesson2MockKitty {
    // Genera un ADN diferente a partir del ID.
    // El mismo ID siempre produce el mismo ADN.
    function _generateKittyDna(uint256 _id) private pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(_id))) % (10 ** 16);
    }

    // Mantiene la interfaz de CryptoKitties.
    function getKitty(
        uint256 _id
    )
        external
        pure
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
        )
    {
        isGestating = false;
        isReady = true;
        cooldownIndex = 0;
        nextActionAt = 0;
        siringWithId = 0;
        birthTime = 0;
        matronId = 0;
        sireId = 0;
        generation = 0;

        genes = _generateKittyDna(_id);
    }
}
