
pragma solidity ^0.4.25;

/**
 * Contrato auxiliar exclusivo de pruebas.
 *
 * La interfaz real getKitty(uint256) devuelve diez
 * valores estaticos de 32 bytes.
 *
 * Este mock devuelve un array estatico de diez uint256
 * con la misma representacion ABI:
 * posicion 0: isGestating = false
 * posicion 1: isReady = true
 * posiciones 2-8: valores cero
 * posicion 9: genes
 *
 * El tipo de retorno no forma parte del selector
 * de la funcion getKitty(uint256).
 */
contract Lesson3MockKitty {

    function getKitty(uint256 _id)
        external
        pure
        returns (uint256[10] memory result)
    {
        result[0] = 0;
        result[1] = 1;

        result[9] = uint256(
            keccak256(abi.encodePacked(_id))
        ) % (10 ** 16);
    }
}
