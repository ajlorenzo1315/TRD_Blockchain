pragma solidity ^0.4.25;

/**
 * @title Lesson5Ownable
 * @dev The Lesson5Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
// LECCION 3 (REUTILIZADA EN LA 5): el propietario de este contrato es el administrador de la DApp, no el propietario de cada zombi.
contract Lesson5Ownable {
    // LECCION 3: direccion del administrador guardada de forma privada.
    address private _owner;

    // LECCION 3: registro auditable cuando cambia la administracion.
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev The Lesson5Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    // LECCION 3: el desplegador queda designado como administrador inicial.
    constructor() internal {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @return the address of the owner.
     */
    // LECCION 3: consulta publica de la direccion administradora.
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    // LECCION 3: restringe llamadas administrativas; el guion bajo ejecuta el cuerpo protegido.
    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    /**
     * @return true if `msg.sender` is the owner of the contract.
     */
    // LECCION 3: compara msg.sender con la cuenta administradora.
    function isOwner() public view returns (bool) {
        return msg.sender == _owner;
    }

    /**
     * @dev Allows the current owner to relinquish control of the contract.
     * @notice Renouncing to ownership will leave the contract without an owner.
     * It will not be possible to call the functions with the `onlyOwner`
     * modifier anymore.
     */
    // LECCION 3: deja sin administrador el contrato; las funciones onlyOwner dejaran de ser utilizables.
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    // LECCION 3: inicia la transferencia del control administrativo.
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    // LECCION 3: valida que el nuevo administrador no sea address(0).
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}
