pragma solidity ^0.4.25;

// LECCION 3 - CAPITULOS SOBRE OWNABLE:
// El contrato Lesson4Ownable gestiona quien tiene permiso
// para realizar operaciones administrativas.
//
// LECCION 4:
// Se reutiliza para proteger las funciones de pagos,
// retirada de fondos y configuracion de tarifas.

contract Lesson4Ownable {

    // LECCION 3: Variables de tipo address
    // Guarda la direccion del administrador.
    // private impide acceder directamente desde
    // otros contratos.
    address private _owner;

    // LECCION 1 - CAPITULO 13: Eventos
    // Registra los cambios de administrador.
    //
    // indexed permite filtrar los eventos por
    // propietario anterior y nuevo propietario.
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // LECCION 3: Constructores
    // Se ejecuta durante el despliegue.
    //
    // msg.sender identifica a quien despliega
    // el contrato final.
    //
    // internal: Lesson4Ownable se utiliza mediante herencia.
    constructor() internal {
        _owner = msg.sender;

        // Registra la asignacion inicial.
        // address(0) indica que no habia propietario.
        emit OwnershipTransferred(address(0), _owner);
    }

    // LECCION 1: Funciones de lectura
    // view significa que no modifica el estado.
    function owner() public view returns(address) {
        return _owner;
    }

    // LECCION 3: Modificadores
    // onlyOwner protege las funciones administrativas.
    //
    // require comprueba que se cumple la condicion.
    // Si no se cumple, la operacion revierte.
    //
    // _; representa la ejecucion del cuerpo
    // de la funcion que utiliza el modificador.
    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    // LECCION 2 - CAPITULO 3: msg.sender
    // Comprueba si quien llama es el administrador.
    function isOwner() public view returns(bool) {
        return msg.sender == _owner;
    }

    // LECCION 3: Renuncia a la propiedad
    // Solo el administrador puede ejecutarla.
    //
    // Al establecer address(0), ya no existe
    // una cuenta administradora normal.
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    // LECCION 3: Transferencia de propiedad
    // Permite asignar un nuevo administrador.
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    // LECCION 2 - CAPITULO 5: Herencia
    // internal permite reutilizar esta funcion
    // dentro de contratos derivados.
    //
    // LECCION 2 - CAPITULO 4: require
    // Impide transferir la propiedad a address(0).
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));

        emit OwnershipTransferred(_owner, newOwner);

        _owner = newOwner;
    }
}
