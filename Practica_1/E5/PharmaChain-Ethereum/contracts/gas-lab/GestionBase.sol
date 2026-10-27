// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

// Lógica común: lotes y cadena de custodia.
abstract contract GestionBase {
    uint256 public totalLotes;

    struct Lote {
        uint256 id;
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
        require(id > 0 && id <= totalLotes, "El lote no existe");
        _;
    }

    function registrarLote(string calldata nombre, string calldata fabricante) external {
        _comprobarActivo();
        require(_esLaboratorio(msg.sender), "No eres laboratorio");
        require(bytes(nombre).length > 0, "El nombre no puede estar vacio");
        require(bytes(fabricante).length > 0, "El fabricante no puede estar vacio");

        totalLotes++;
        lotes[totalLotes] = Lote({
            id: totalLotes,
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
        require(lote.activo, "Lote inactivo");
        require(lote.propietario == msg.sender, "No eres el custodio");
        require(!transferencias[id].pendiente, "Transferencia pendiente");
        require(destino != address(0) && destino != msg.sender, "Destino invalido");
        require(_transicionValida(msg.sender, destino), "Transicion de roles invalida");

        transferencias[id] = Transferencia(msg.sender, destino, true);
        _registrarMovimiento(id, TipoMovimiento.Propuesta, msg.sender, destino);
        emit TransferenciaPropuesta(id, msg.sender, destino);
    }

    function aceptarTransferencia(uint256 id) external loteExistente(id) {
        _comprobarActivo();
        Transferencia storage t = transferencias[id];
        require(t.pendiente, "No hay transferencia pendiente");
        require(t.destino == msg.sender, "No eres el destinatario");
        require(lotes[id].activo, "Lote inactivo");
        require(lotes[id].propietario == t.origen, "Custodio inconsistente");
        require(_transicionValida(t.origen, msg.sender), "Transicion de roles invalida");

        // Guardar antes de borrar: t apunta al storage de transferencias[id].
        address origen = t.origen;
        lotes[id].propietario = msg.sender;
        delete transferencias[id];
        _registrarMovimiento(id, TipoMovimiento.Aceptacion, origen, msg.sender);
        emit TransferenciaAceptada(id, origen, msg.sender);
    }

    function cancelarTransferencia(uint256 id) external loteExistente(id) {
        Transferencia storage t = transferencias[id];
        require(t.pendiente, "No hay transferencia pendiente");
        require(msg.sender == t.origen || _esAdministrador(msg.sender), "No autorizado");
        // Conservar ambos valores antes del delete para el historial y evento.
        address origen = t.origen;
        address destino = t.destino;
        delete transferencias[id];
        _registrarMovimiento(id, TipoMovimiento.Cancelacion, origen, destino);
        emit TransferenciaCancelada(id, origen, destino);
    }

    function desactivarLote(uint256 id) external loteExistente(id) {
        require(_esAdministrador(msg.sender), "No autorizado");
        require(lotes[id].activo, "Lote ya inactivo");
        lotes[id].activo = false;
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
        require(indice < historialLotes[id].length, "Movimiento inexistente");

        return historialLotes[id][indice];
    }
}
