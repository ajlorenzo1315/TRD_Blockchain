// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

// Lógica común: lotes y cadena de custodia.
abstract contract GestionV6SinId {
    error NombreVacio();
    error TransicionInvalida();
    error NoDestinatario();
    error NoAutorizado();
    error FabricanteVacio();
    error TransferenciaPendiente();
    error SinTransferencia();
    error YaInactivo();
    error DestinoInvalido();
    error NoLaboratorio();
    error MovimientoInexistente();
    error NoCustodio();
    error LoteInactivo();
    error LoteInexistente();
    error CustodioInconsistente();

    uint256 public totalLotes;

    struct Lote {
        string nombre;
        string fabricante;
        address propietario;
        uint256 fechaRegistro;
        bool activo;
    }

    struct Transferencia {
        address origen;
        address destino;
        bool pendiente;
    }

    mapping(uint256 => Lote) public lotes;
    mapping(uint256 => Transferencia) public transferencias;

    event LoteRegistrado(uint256 indexed id, string nombre, address indexed propietario);
    event TransferenciaPropuesta(
        uint256 indexed id,
        address indexed origen,
        address indexed destino
    );
    event TransferenciaAceptada(
        uint256 indexed id,
        address indexed origen,
        address indexed destino
    );
    event TransferenciaCancelada(
        uint256 indexed id,
        address indexed origen,
        address indexed destino
    );
    event LoteDesactivado(uint256 indexed id);

    // Cada implementación decide cómo comprobar permisos y pausa.
    function _esLaboratorio(address usuario) internal view virtual returns (bool);
    function _esAdministrador(address usuario) internal view virtual returns (bool);
    function _transicionValida(
        address origen,
        address destino
    ) internal view virtual returns (bool);
    function _comprobarActivo() internal view virtual;

    modifier loteExistente(uint256 id) {
        if (!(id > 0 && id <= totalLotes)) revert LoteInexistente();
        _;
    }

    function registrarLote(string calldata nombre, string calldata fabricante) external {
        _comprobarActivo();
        if (!(_esLaboratorio(msg.sender))) revert NoLaboratorio();
        if (!(bytes(nombre).length > 0)) revert NombreVacio();
        if (!(bytes(fabricante).length > 0)) revert FabricanteVacio();

        unchecked {
            ++totalLotes;
        }
        lotes[totalLotes] = Lote({
            nombre: nombre,
            fabricante: fabricante,
            propietario: msg.sender,
            fechaRegistro: block.timestamp,
            activo: true
        });
        emit LoteRegistrado(totalLotes, nombre, msg.sender);
        _registrarMovimiento(totalLotes, TipoMovimiento.Registro, address(0), msg.sender);
    }

    function proponerTransferencia(uint256 id, address destino) external loteExistente(id) {
        _comprobarActivo();
        Lote storage lote = lotes[id];
        if (!(lote.activo)) revert LoteInactivo();
        if (!(lote.propietario == msg.sender)) revert NoCustodio();
        Transferencia storage t = transferencias[id];
        if (!(!t.pendiente)) revert TransferenciaPendiente();
        if (!(destino != address(0) && destino != msg.sender)) revert DestinoInvalido();
        if (!(_transicionValida(msg.sender, destino))) revert TransicionInvalida();

        t.origen = msg.sender;
        t.destino = destino;
        t.pendiente = true;
        _registrarMovimiento(id, TipoMovimiento.Propuesta, msg.sender, destino);
        emit TransferenciaPropuesta(id, msg.sender, destino);
    }

    function aceptarTransferencia(uint256 id) external loteExistente(id) {
        _comprobarActivo();
        Transferencia storage t = transferencias[id];
        if (!(t.pendiente)) revert SinTransferencia();
        if (!(t.destino == msg.sender)) revert NoDestinatario();
        Lote storage lote = lotes[id];
        if (!(lote.activo)) revert LoteInactivo();
        if (!(lote.propietario == t.origen)) revert CustodioInconsistente();
        if (!(_transicionValida(t.origen, msg.sender))) revert TransicionInvalida();

        // Guardar antes de borrar: t apunta al storage de transferencias[id].
        address origen = t.origen;
        lote.propietario = msg.sender;
        delete transferencias[id];
        _registrarMovimiento(id, TipoMovimiento.Aceptacion, origen, msg.sender);
        emit TransferenciaAceptada(id, origen, msg.sender);
    }

    function cancelarTransferencia(uint256 id) external loteExistente(id) {
        Transferencia storage t = transferencias[id];
        if (!(t.pendiente)) revert SinTransferencia();
        if (!(msg.sender == t.origen || _esAdministrador(msg.sender))) revert NoAutorizado();
        // Conservar ambos valores antes del delete para el historial y evento.
        address origen = t.origen;
        address destino = t.destino;
        delete transferencias[id];
        _registrarMovimiento(id, TipoMovimiento.Cancelacion, origen, destino);
        emit TransferenciaCancelada(id, origen, destino);
    }

    function desactivarLote(uint256 id) external loteExistente(id) {
        if (!(_esAdministrador(msg.sender))) revert NoAutorizado();
        Lote storage lote = lotes[id];
        if (!(lote.activo)) revert YaInactivo();
        lote.activo = false;
        if (transferencias[id].pendiente) {
            Transferencia storage t = transferencias[id];
            address origen = t.origen;
            address destino = t.destino;
            delete transferencias[id];
            emit TransferenciaCancelada(id, origen, destino);
        }
        emit LoteDesactivado(id);
    }

    function consultarLote(uint256 id) external view loteExistente(id) returns (Lote memory) {
        return lotes[id];
    }

    // Tipos de movimientos que puede tener un lote.
    enum TipoMovimiento {
        Registro,
        Propuesta,
        Aceptacion,
        Cancelacion
    }

    // Información de cada movimiento.
    struct Movimiento {
        TipoMovimiento tipoMovimiento;
        address origen;
        address destino;
        uint256 fecha;
    }

    // Historial completo de movimientos de cada lote.
    mapping(uint256 => Movimiento[]) private historialLotes;

    // Guarda un movimiento en el historial de un lote.
    function _registrarMovimiento(
        uint256 id,
        TipoMovimiento tipoMovimiento,
        address origen,
        address destino
    ) internal {
        historialLotes[id].push(
            Movimiento({
                tipoMovimiento: tipoMovimiento,
                origen: origen,
                destino: destino,
                fecha: block.timestamp
            })
        );
    }

    // Devuelve cuántos movimientos tiene un lote.
    function totalMovimientos(uint256 id) external view loteExistente(id) returns (uint256) {
        return historialLotes[id].length;
    }

    // Devuelve un movimiento concreto.
    function consultarMovimiento(
        uint256 id,
        uint256 indice
    ) external view loteExistente(id) returns (Movimiento memory) {
        if (!(indice < historialLotes[id].length)) revert MovimientoInexistente();

        return historialLotes[id][indice];
    }
}
